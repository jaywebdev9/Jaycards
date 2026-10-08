import { NextRequest } from "next/server";
import { handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { getPaymentProvider } from "@/lib/providers/payment";
import { applyPaymentSuccess, markPaymentFailed } from "@/lib/services/wallet";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const raw = await req.text();
    const provider = getPaymentProvider();
    const valid = await provider.verifyWebhook(raw, req.headers);
    if (!valid) {
      logger.warn("payment_webhook_rejected", {});
      throw new ApiError(401, "PAYMENT_NOT_VERIFIED", "Payment webhook could not be verified.");
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON.");
    }
    const event = provider.parseWebhook(payload);
    if (!event.orderId || !event.providerTransactionId) {
      throw new ApiError(400, "PAYMENT_NOT_VERIFIED", "Webhook missing order or transaction id.");
    }
    const payment = await prisma.payment.findUnique({ where: { orderId: event.orderId } });
    if (!payment) throw new ApiError(404, "NOT_FOUND", "Payment not found.");
    if (event.amount && event.amount !== payment.amount) {
      throw new ApiError(400, "PAYMENT_NOT_VERIFIED", "Paid amount does not match the order.");
    }
    if (event.status === "SUCCESS") {
      const result = await applyPaymentSuccess({
        orderId: event.orderId,
        providerTransactionId: event.providerTransactionId,
        paymentMethod: event.paymentMethod,
        raw: event.raw,
      });
      return json(ok({ alreadyProcessed: result.alreadyProcessed, status: "SUCCESS" }));
    }
    if (event.status === "FAILED" || event.status === "CANCELLED") {
      await markPaymentFailed(event.orderId, event.status, event.raw);
      logger.info("payment_failed", { orderId: event.orderId, status: event.status });
    }
    return json(ok({ status: event.status }));
  });
}
