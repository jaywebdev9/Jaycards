import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { setSessionCookie } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { limitFromEnv, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const ip = req.headers.get("x-forwarded-for") || "local";
    const limited = rateLimit(`login:${ip}`, limitFromEnv("RATE_LIMIT_LOGIN", 10), limitFromEnv("RATE_LIMIT_WINDOW_MS", 60000));
    if (!limited.ok) throw new ApiError(429, "RATE_LIMITED", "Too many login attempts.");
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { business: true },
    });
    const valid = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !valid) {
      logger.warn("auth_failure", { email: body.email.toLowerCase() });
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    if (user.business?.status === "SUSPENDED") {
      throw new ApiError(403, "BUSINESS_SUSPENDED", "This business account is suspended.");
    }
    await setSessionCookie({
      userId: user.id,
      role: user.role,
      businessId: user.businessId,
      email: user.email,
    });
    return json(ok({ role: user.role, businessId: user.businessId }));
  });
}
