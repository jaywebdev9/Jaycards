import { NextRequest } from "next/server";
import { handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { getSmsProvider } from "@/lib/providers/sms";
import { applyDeliveryEvent } from "@/lib/queue/sms-queue";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const raw = await req.text();
    const provider = getSmsProvider();
    const valid = await provider.verifyWebhook(raw, req.headers);
    if (!valid) throw new ApiError(401, "PAYMENT_NOT_VERIFIED", "SMS webhook signature rejected.");
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON.");
    }
    await prisma.smsProviderLog.create({
      data: { direction: "inbound", event: "webhook", payload: payload as object },
    });
    const events = provider.parseWebhook(payload);
    const updated = [];
    for (const event of events) {
      const message = await applyDeliveryEvent({
        providerMessageId: event.providerMessageId,
        status: event.status,
        timestamp: event.timestamp,
        errorMessage: event.errorMessage,
        raw: event.raw,
      });
      if (message) updated.push(message.id);
    }
    logger.info("sms_webhook", { count: events.length });
    return json(ok({ updated }));
  });
}
