import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { setSessionCookie } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { limitFromEnv, rateLimit } from "@/lib/rate-limit";
import { normalizeTzPhone } from "@/utils/phone";
import { logger } from "@/lib/logger";

const schema = z.object({
  businessName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(9).max(20),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const ip = req.headers.get("x-forwarded-for") || "local";
    const limited = rateLimit(`register:${ip}`, limitFromEnv("RATE_LIMIT_REGISTER", 5), limitFromEnv("RATE_LIMIT_WINDOW_MS", 60000));
    if (!limited.ok) throw new ApiError(429, "RATE_LIMITED", "Too many registration attempts.");
    const body = schema.parse(await req.json());
    const phone = normalizeTzPhone(body.phone);
    if (!phone.ok) throw new ApiError(400, "INVALID_PHONE_NUMBER", phone.error);
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new ApiError(409, "VALIDATION_ERROR", "An account with this email already exists.");
    const passwordHash = await bcrypt.hash(body.password, 12);
    const created = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: body.businessName,
          ownerName: body.ownerName,
          email,
          phone: phone.e164,
          status: "ACTIVE",
        },
      });
      const user = await tx.user.create({
        data: {
          businessId: business.id,
          email,
          name: body.ownerName,
          passwordHash,
          role: "BUSINESS_USER",
        },
      });
      await tx.wallet.create({ data: { businessId: business.id, balance: 0 } });
      return { business, user };
    });
    await setSessionCookie({
      userId: created.user.id,
      role: "BUSINESS_USER",
      businessId: created.business.id,
      email,
    });
    logger.info("business_registered", { businessId: created.business.id });
    return json(ok({ businessId: created.business.id }), 201);
  });
}
