export function estimatedMargin(input: {
  smsVolume: number;
  customerSmsPrice: number;
  providerSmsCost: number;
}) {
  const smsRevenue = input.smsVolume * input.customerSmsPrice;
  const estimatedProviderCost = input.smsVolume * input.providerSmsCost;
  const estimatedGrossMargin = smsRevenue - estimatedProviderCost;
  return { smsRevenue, estimatedProviderCost, estimatedGrossMargin };
}

export function canApplyPaymentCredit(status: string): boolean {
  return status === "PENDING";
}
