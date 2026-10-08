import { NextRequest } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { signPayload } from "@/utils/crypto";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  messageId: z.string().uuid(),
  status: z.enum(["SENT", "DELIVERED", "FAILED"]),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    if ((process.env.SMS_PROVIDER || "sandbox") !== "sandbox") {
      throw new ApiError(403, "FORBIDDEN", "Delivery simulation is only available in SMS sandbox mode.");
    }
    const { businessId } = await requireBusiness();
    const body = schema.parse(await req.json());
    const message = await prisma.message.findFirst({ where: { id: body.messageId, businessId } });
    if (!message?.providerMessageId) throw new ApiError(404, "NOT_FOUND", "Queued provider message not found.");
    const secret = process.env.BEEM_WEBHOOK_SECRET || process.env.PAYMENT_SECRET;
    if (!secret) throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Webhook secret is not configured.");
    const payload = {
      providerMessageId: message.providerMessageId,
      status: body.status,
      recipient: message.recipient,
      timestamp: new Date().toISOString(),
    };
    const raw = JSON.stringify(payload);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/webhooks/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": signPayload(secret, raw) },
      body: raw,
    });
    const data = await res.json();
    return json(ok(data), res.status);
  });
}
