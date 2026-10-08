import type { DeliveryEvent, SmsProvider, SmsSendInput, SmsSendResult } from "./SmsProvider";
import { verifySignature } from "@/utils/crypto";

/**
 * Sandbox provider used until live Beem credentials are configured.
 * It does not mark messages delivered by itself. Delivery only changes
 * when a signed webhook is posted to /api/webhooks/sms.
 */
export class SandboxSmsProvider implements SmsProvider {
  name = "sandbox";

  async sendSms(input: SmsSendInput): Promise<SmsSendResult> {
    const providerMessageId = `sbx_${input.messageId}`;
    return {
      providerMessageId,
      accepted: true,
      raw: { sandbox: true, providerMessageId, to: input.to },
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    const secret = process.env.BEEM_WEBHOOK_SECRET || process.env.PAYMENT_SECRET || "";
    if (!secret) return false;
    const signature = headers.get("x-signature");
    return verifySignature(secret, rawBody, signature);
  }

  parseWebhook(payload: unknown): DeliveryEvent[] {
    const row = (payload ?? {}) as Record<string, unknown>;
    const status = String(row.status ?? "DELIVERED").toUpperCase();
    const allowed = ["SENT", "DELIVERED", "FAILED", "REJECTED", "UNKNOWN"] as const;
    return [
      {
        providerMessageId: String(row.providerMessageId ?? ""),
        status: (allowed.includes(status as (typeof allowed)[number]) ? status : "UNKNOWN") as DeliveryEvent["status"],
        recipient: row.recipient ? String(row.recipient) : undefined,
        timestamp: row.timestamp ? String(row.timestamp) : new Date().toISOString(),
        raw: payload,
      },
    ].filter((e) => e.providerMessageId);
  }
}
