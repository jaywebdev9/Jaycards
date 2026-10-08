import { prisma } from "@/lib/db/prisma";

export const DEFAULT_PACKAGES = [1000, 5000, 10000, 25000];

export async function getPricing() {
  const existing = await prisma.pricingConfig.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.pricingConfig.create({
    data: {
      id: "default",
      currency: "TZS",
      customerSmsPrice: 25,
      providerSmsCost: 18,
      minimumPurchase: 1000,
      lowCreditThreshold: 500,
      packages: DEFAULT_PACKAGES,
    },
  });
}

export function priceForBusiness(configPrice: number, override: number | null | undefined) {
  return override && override > 0 ? override : configPrice;
}
