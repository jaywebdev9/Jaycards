import { createHmac } from "crypto";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifiedPayment } from "./PaymentProvider";
import { verifySignature } from "@/utils/crypto";

function selcomDigest(secret: string, timestamp: string, signedFields: string, payload: Record<string, unknown>) {
  const values = signedFields.split(",").map((field) => String(payload[field] ?? ""));
  const material = timestamp + values.join("");
  return createHmac("sha256", secret).update(material).digest("base64");
}

export class SelcomPaymentProvider implements PaymentProvider {
  name = "selcom";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const apiKey = process.env.PAYMENT_API_KEY;
    const secret = process.env.PAYMENT_SECRET;
    const vendor = process.env.PAYMENT_VENDOR_ID;
    const base = process.env.PAYMENT_API_URL || "https://apigw.selcommobile.com/v1";
    if (!apiKey || !secret || !vendor) {
      throw new Error("PAYMENT_API_KEY, PAYMENT_SECRET and PAYMENT_VENDOR_ID are required for Selcom");
    }
    const payload: Record<string, unknown> = {
      vendor,
      order_id: input.orderId,
      buyer_email: input.buyerEmail,
      buyer_name: input.buyerName,
      buyer_phone: input.buyerPhone.replace(/^\+/, ""),
      amount: input.amount,
      currency: input.currency,
      webhook: Buffer.from(input.webhookUrl).toString("base64"),
      redirect_url: Buffer.from(input.redirectUrl).toString("base64"),
      cancel_url: Buffer.from(input.cancelUrl).toString("base64"),
      no_of_items: 1,
      payment_methods: "ALL",
    };
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
    const signedFields = "vendor,order_id,buyer_email,buyer_name,buyer_phone,amount,currency";
    const digest = selcomDigest(secret, timestamp, signedFields, payload);
    const res = await fetch(`${base}/checkout/create-order-minimal`, {
      method: "POST",
      headers: {
        Authorization: `SELCOM ${Buffer.from(apiKey).toString("base64")}`,
        "Digest-Method": "HS256",
        Digest: digest,
        Timestamp: timestamp,
        "Signed-Fields": signedFields,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Selcom create order failed (${res.status})`);
    const data = raw as { data?: Array<{ payment_gateway_url?: string }>; payment_gateway_url?: string };
    const checkoutUrl = data.data?.[0]?.payment_gateway_url || data.payment_gateway_url;
    if (!checkoutUrl) throw new Error("Selcom did not return a checkout URL");
    return { checkoutUrl, raw };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    const secret = process.env.PAYMENT_SECRET;
    if (!secret) return false;
    const direct = headers.get("x-signature");
    if (direct && verifySignature(secret, rawBody, direct)) return true;
    const digest = headers.get("digest");
    const timestamp = headers.get("timestamp");
    const signedFields = headers.get("signed-fields");
    if (!digest || !timestamp || !signedFields) return false;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return false;
    }
    const expected = selcomDigest(secret, timestamp, signedFields, payload);
    return expected === digest;
  }

  parseWebhook(payload: unknown): VerifiedPayment {
    const row = (payload ?? {}) as Record<string, unknown>;
    const nested = Array.isArray(row.data) ? (row.data[0] as Record<string, unknown>) : undefined;
    const statusRaw = String(row.payment_status ?? nested?.payment_status ?? row.result ?? "").toUpperCase();
    let status: VerifiedPayment["status"] = "PENDING";
    if (["COMPLETED", "SUCCESS", "PAID"].includes(statusRaw)) status = "SUCCESS";
    else if (["FAILED", "REJECTED"].includes(statusRaw)) status = "FAILED";
    else if (["CANCELLED", "CANCELED"].includes(statusRaw)) status = "CANCELLED";
    return {
      orderId: String(row.order_id ?? nested?.order_id ?? ""),
      providerTransactionId: String(row.transid ?? nested?.transid ?? row.reference ?? ""),
      status,
      amount: Number(row.amount ?? nested?.amount ?? 0) || undefined,
      paymentMethod: row.channel ? String(row.channel) : nested?.channel ? String(nested.channel) : undefined,
      raw: payload,
    };
  }
}
