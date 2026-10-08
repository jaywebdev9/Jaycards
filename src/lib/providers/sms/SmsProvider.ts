export type SmsSendInput = {
  messageId: string;
  to: string;
  body: string;
  senderId: string;
};

export type SmsSendResult = {
  providerMessageId: string;
  accepted: boolean;
  raw: unknown;
};

export type DeliveryEvent = {
  providerMessageId: string;
  status: "SENT" | "DELIVERED" | "FAILED" | "REJECTED" | "UNKNOWN";
  recipient?: string;
  timestamp?: string;
  errorMessage?: string;
  raw: unknown;
};

export interface SmsProvider {
  name: string;
  sendSms(input: SmsSendInput): Promise<SmsSendResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhook(payload: unknown): DeliveryEvent[];
}
