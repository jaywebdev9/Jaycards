import { requireBusiness } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { getPricing, priceForBusiness } from "@/lib/services/pricing";

export async function GET() {
  return handle(async () => {
    const { business } = await requireBusiness();
    const wallet = await prisma.wallet.findUnique({ where: { businessId: business.id } });
    const pricing = await getPricing();
    const threshold = business.lowCreditThreshold ?? pricing.lowCreditThreshold;
    return json(
      ok({
        balance: wallet?.balance ?? 0,
        currency: pricing.currency,
        smsPrice: priceForBusiness(pricing.customerSmsPrice, business.smsPriceOverride),
        lowCreditThreshold: threshold,
        lowCredit: (wallet?.balance ?? 0) <= threshold,
      }),
    );
  });
}
