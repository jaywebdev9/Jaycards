import { NextRequest } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { getPricing, priceForBusiness } from "@/lib/services/pricing";
import { getPaymentProvider } from "@/lib/providers/payment";
import { limitFromEnv, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const schema = z.object({ credits: z.number().int().positive() });

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { business, businessId } = await requireBusiness();
    const limited = rateLimit(`pay:${businessId}`, limitFromEnv("RATE_LIMIT_PAYMENT", 10), limitFromEnv("RATE_LIMIT_WINDOW_MS", 60000));
    if (!limited.ok) throw new ApiError(429, "RATE_LIMITED", "Too many payment attempts.");
    const body = schema.parse(await req.json());
    const pricing = await getPricing();
    const packages = Array.isArray(pricing.packages) ? (pricing.packages as number[]) : [];
    if (!packages.includes(body.credits)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Select a configured SMS package.");
    }
    if (body.credits < pricing.minimumPurchase) {
      throw new ApiError(400, "VALIDATION_ERROR", `Minimum purchase is ${pricing.minimumPurchase} SMS.`);
    }
    const unitPrice = priceForBusiness(pricing.customerSmsPrice, business.smsPriceOverride);
    const amount = body.credits * unitPrice;
    const orderId = `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const provider = getPaymentProvider();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const payment = await prisma.payment.create({
      data: {
        businessId,
        provider: provider.name,
        orderId,
        amount,
        currency: pricing.currency,
        credits: body.credits,
        unitPrice,
        status: "PENDING",
      },
    });
    logger.info("payment_attempt", { orderId, businessId, amount });
    try {
      const created = await provider.createPayment({
        orderId,
        amount,
        currency: pricing.currency,
        credits: body.credits,
        buyerEmail: business.email,
        buyerName: business.ownerName,
        buyerPhone: business.phone,
        webhookUrl: `${appUrl}/api/webhooks/payment`,
        redirectUrl: `${appUrl}/credits?payment=${payment.id}`,
        cancelUrl: `${appUrl}/credits?cancelled=1`,
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { rawResponse: created.raw as object, providerTransactionId: created.providerTransactionId },
      });
      return json(ok({ paymentId: payment.id, checkoutUrl: created.checkoutUrl, amount, credits: body.credits }));
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      logger.error("payment_create_failed", { orderId, message: error instanceof Error ? error.message : "error" });
      throw new ApiError(502, "PAYMENT_FAILED", "Payment provider could not start checkout.");
    }
  });
}
