import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifiedPayment } from "./PaymentProvider";
import { verifySignature } from "@/utils/crypto";

export class SandboxPaymentProvider implements PaymentProvider {
  name = "sandbox";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return {
      checkoutUrl: `${base}/pay/checkout/${input.orderId}`,
      raw: { sandbox: true, orderId: input.orderId },
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    const secret = process.env.PAYMENT_SECRET;
    if (!secret) return false;
    return verifySignature(secret, rawBody, headers.get("x-signature"));
  }

  parseWebhook(payload: unknown): VerifiedPayment {
    const row = (payload ?? {}) as Record<string, unknown>;
    const status = String(row.status ?? "FAILED").toUpperCase();
    const allowed = ["SUCCESS", "FAILED", "CANCELLED", "PENDING"] as const;
    return {
      orderId: String(row.orderId ?? ""),
      providerTransactionId: String(row.providerTransactionId ?? ""),
      status: (allowed.includes(status as (typeof allowed)[number]) ? status : "FAILED") as VerifiedPayment["status"],
      amount: Number(row.amount ?? 0) || undefined,
      paymentMethod: "SANDBOX_MOBILE_MONEY",
      raw: payload,
    };
  }
}
