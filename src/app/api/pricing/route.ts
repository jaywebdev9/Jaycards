import { requireBusiness } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { getPricing, priceForBusiness } from "@/lib/services/pricing";

export async function GET() {
  return handle(async () => {
    const { business } = await requireBusiness();
    const pricing = await getPricing();
    const unitPrice = priceForBusiness(pricing.customerSmsPrice, business.smsPriceOverride);
    const packages = (Array.isArray(pricing.packages) ? pricing.packages : []) as number[];
    return json(
      ok({
        currency: pricing.currency,
        unitPrice,
        minimumPurchase: pricing.minimumPurchase,
        lowCreditThreshold: business.lowCreditThreshold ?? pricing.lowCreditThreshold,
        packages: packages.map((credits) => ({ credits, amount: credits * unitPrice, currency: pricing.currency })),
      }),
    );
  });
}
