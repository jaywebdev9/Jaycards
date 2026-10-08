import { NextRequest } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { signPayload } from "@/utils/crypto";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  orderId: z.string(),
  result: z.enum(["SUCCESS", "FAILED", "CANCELLED"]),
});

/**
 * Sandbox-only helper. Signs a webhook payload with PAYMENT_SECRET and posts it
 * to the real payment webhook so credits are added only after verification.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    if (process.env.PAYMENT_SANDBOX === "false" || process.env.PAYMENT_PROVIDER === "selcom") {
      throw new ApiError(403, "FORBIDDEN", "Sandbox checkout is disabled.");
    }
    const { businessId } = await requireBusiness();
    const body = schema.parse(await req.json());
    const payment = await prisma.payment.findFirst({ where: { orderId: body.orderId, businessId } });
    if (!payment) throw new ApiError(404, "NOT_FOUND", "Payment not found.");
    const secret = process.env.PAYMENT_SECRET;
    if (!secret) throw new ApiError(500, "INTERNAL_SERVER_ERROR", "PAYMENT_SECRET is not configured.");
    const payload = {
      orderId: payment.orderId,
      providerTransactionId: `sbx_${payment.orderId}`,
      status: body.result,
      amount: payment.amount,
    };
    const raw = JSON.stringify(payload);
    const signature = signPayload(secret, raw);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/webhooks/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": signature },
      body: raw,
    });
    const data = await res.json();
    return json(data, res.status);
  });
}
