import { requireAdmin } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { getPricing } from "@/lib/services/pricing";
import { estimatedMargin } from "@/utils/margin";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const pricing = await getPricing();
    const [businesses, active, sent, delivered, failed, payments, usage] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { status: "ACTIVE" } }),
      prisma.message.count(),
      prisma.message.count({ where: { status: "DELIVERED" } }),
      prisma.message.count({ where: { status: "FAILED" } }),
      prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true, credits: true } }),
      prisma.walletTransaction.aggregate({ where: { type: "SMS_USAGE" }, _sum: { amount: true } }),
    ]);
    const smsVolume = Math.abs(usage._sum.amount ?? 0);
    const margin = estimatedMargin({
      smsVolume,
      customerSmsPrice: pricing.customerSmsPrice,
      providerSmsCost: pricing.providerSmsCost,
    });
    return json(
      ok({
        businesses,
        active,
        sent,
        delivered,
        failed,
        paymentVolume: payments._sum.amount ?? 0,
        creditsSold: payments._sum.credits ?? 0,
        smsVolume,
        currency: pricing.currency,
        customerSmsPrice: pricing.customerSmsPrice,
        providerSmsCost: pricing.providerSmsCost,
        ...margin,
        label: "ESTIMATED GROSS MARGIN",
      }),
    );
  });
}
