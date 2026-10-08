import type { DeliveryEvent, SmsProvider, SmsSendInput, SmsSendResult } from "./SmsProvider";
import { verifySignature } from "@/utils/crypto";

function mapStatus(value: string): DeliveryEvent["status"] {
  const v = value.toLowerCase();
  if (["delivered", "delivery_success", "success"].includes(v)) return "DELIVERED";
  if (["failed", "undelivered", "expired", "rejected_network"].includes(v)) return "FAILED";
  if (["rejected"].includes(v)) return "REJECTED";
  if (["sent", "submitted", "buffered", "pending"].includes(v)) return "SENT";
  return "UNKNOWN";
}

export class BeemSmsProvider implements SmsProvider {
  name = "beem";

  async sendSms(input: SmsSendInput): Promise<SmsSendResult> {
    const apiKey = process.env.BEEM_API_KEY;
    const secret = process.env.BEEM_SECRET_KEY;
    if (!apiKey || !secret) {
      throw new Error("BEEM_API_KEY and BEEM_SECRET_KEY are required");
    }
    const url = process.env.BEEM_API_URL || "https://apisms.beem.africa/v1/send";
    const sender = input.senderId || process.env.BEEM_SENDER_ID || "INFO";
    const body = {
      source_addr: sender,
      encoding: 0,
      schedule_time: "",
      message: input.body,
      recipients: [{ recipient_id: input.messageId, dest_addr: input.to.replace(/^\+/, "") }],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Beem request failed (${res.status})`);
    }
    const requestId = String((raw as { request_id?: string | number }).request_id ?? input.messageId);
    const successful = Boolean((raw as { successful?: boolean }).successful);
    return { providerMessageId: requestId, accepted: successful || res.ok, raw };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    const secret = process.env.BEEM_WEBHOOK_SECRET;
    if (!secret) return true;
    const signature = headers.get("x-beem-signature") || headers.get("x-signature");
    return verifySignature(secret, rawBody, signature);
  }

  parseWebhook(payload: unknown): DeliveryEvent[] {
    const items = Array.isArray(payload) ? payload : [payload];
    return items.map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const providerMessageId = String(row.request_id ?? row.message_id ?? row.providerMessageId ?? "");
      const statusRaw = String(row.status ?? row.delivery_status ?? row.dlr_status ?? "UNKNOWN");
      return {
        providerMessageId,
        status: mapStatus(statusRaw),
        recipient: row.dest_addr ? String(row.dest_addr) : undefined,
        timestamp: row.timestamp ? String(row.timestamp) : undefined,
        errorMessage: row.error ? String(row.error) : undefined,
        raw: item,
      };
    }).filter((e) => e.providerMessageId);
  }
}
