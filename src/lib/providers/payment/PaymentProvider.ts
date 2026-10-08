export type CreatePaymentInput = {
  orderId: string;
  amount: number;
  currency: string;
  credits: number;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  webhookUrl: string;
  redirectUrl: string;
  cancelUrl: string;
};

export type CreatePaymentResult = {
  checkoutUrl: string;
  providerTransactionId?: string;
  raw: unknown;
};

export type VerifiedPayment = {
  orderId: string;
  providerTransactionId: string;
  status: "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING";
  amount?: number;
  paymentMethod?: string;
  raw: unknown;
};

export interface PaymentProvider {
  name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhook(payload: unknown): VerifiedPayment;
}
