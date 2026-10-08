import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { getPricing } from "@/lib/services/pricing";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    return json(ok(await getPricing()));
  });
}

const schema = z.object({
  currency: z.string().min(3).max(3),
  customerSmsPrice: z.number().int().positive(),
  providerSmsCost: z.number().int().nonnegative(),
  minimumPurchase: z.number().int().positive(),
  lowCreditThreshold: z.number().int().nonnegative(),
  packages: z.array(z.number().int().positive()).min(1),
});

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user } = await requireAdmin();
    const body = schema.parse(await req.json());
    const updated = await prisma.pricingConfig.upsert({
      where: { id: "default" },
      update: body,
      create: { id: "default", ...body },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "PRICING_UPDATE",
        targetType: "PricingConfig",
        targetId: "default",
        metadata: body,
      },
    });
    return json(ok(updated));
  });
}
