import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getSmsProvider } from "@/lib/providers/sms";
import type { MessageStatus } from "@prisma/client";

const memoryQueue: string[] = [];
let draining = false;

export function enqueueMessageIds(ids: string[]) {
  memoryQueue.push(...ids);
  if (!process.env.REDIS_URL) {
    setTimeout(() => {
      void drainQueue(50);
    }, 20);
  }
}

export async function drainQueue(limit = 25) {
  if (draining) return { processed: 0 };
  draining = true;
  try {
    const ids = memoryQueue.splice(0, limit);
    const pending = await prisma.message.findMany({
      where: ids.length
        ? { id: { in: ids }, status: "QUEUED" }
        : { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    let processed = 0;
    for (const message of pending) {
      await dispatchMessage(message.id);
      processed += 1;
    }
    return { processed };
  } finally {
    draining = false;
  }
}

export async function dispatchMessage(messageId: string) {
  const claimed = await prisma.message.updateMany({
    where: { id: messageId, status: "QUEUED" },
    data: { status: "SENDING" },
  });
  if (claimed.count !== 1) return;
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return;
  const provider = getSmsProvider();
  try {
    const result = await provider.sendSms({
      messageId: message.id,
      to: message.recipient,
      body: message.messageBody,
      senderId: message.senderId,
    });
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: result.accepted ? "SENT" : "FAILED",
        providerMessageId: result.providerMessageId,
        sentAt: result.accepted ? new Date() : null,
        errorMessage: result.accepted ? null : "Provider rejected the message",
        rawProviderResponse: result.raw as object,
      },
    });
    await prisma.smsProviderLog.create({
      data: {
        businessId: message.businessId,
        messageId: message.id,
        direction: "outbound",
        event: "send",
        payload: result.raw as object,
      },
    });
    logger.info("sms_provider_request", {
      messageId: message.id,
      provider: provider.name,
      accepted: result.accepted,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "SMS provider error";
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "FAILED", errorCode: "SMS_PROVIDER_ERROR", errorMessage },
    });
    await prisma.smsProviderLog.create({
      data: {
        businessId: message.businessId,
        messageId: message.id,
        direction: "outbound",
        event: "error",
        payload: { error: errorMessage },
      },
    });
    logger.error("sms_provider_error", { messageId: message.id, error: errorMessage });
  }
}

export async function applyDeliveryEvent(input: {
  providerMessageId: string;
  status: MessageStatus;
  timestamp?: string;
  errorMessage?: string;
  raw: unknown;
}) {
  const message = await prisma.message.findFirst({
    where: { providerMessageId: input.providerMessageId },
  });
  if (!message) {
    logger.warn("delivery_webhook_unknown_message", { providerMessageId: input.providerMessageId });
    return null;
  }
  const deliveredAt = input.status === "DELIVERED" ? new Date(input.timestamp || Date.now()) : message.deliveredAt;
  const updated = await prisma.message.update({
    where: { id: message.id },
    data: {
      status: input.status,
      deliveredAt,
      errorMessage: input.errorMessage ?? message.errorMessage,
      rawProviderResponse: input.raw as object,
    },
  });
  await prisma.smsProviderLog.create({
    data: {
      businessId: message.businessId,
      messageId: message.id,
      direction: "inbound",
      event: "delivery",
      payload: input.raw as object,
    },
  });
  logger.info("sms_delivery_update", { messageId: message.id, status: input.status });
  return updated;
}

export async function createAndQueueMessages(input: {
  businessId: string;
  recipients: Array<{ e164: string }>;
  body: string;
  senderId: string;
  segments: number;
}) {
  const required = input.segments * input.recipients.length;
  if (required <= 0) throw new ApiError(400, "INVALID_MESSAGE", "Message is empty.");
  if (input.body.length > 1000) throw new ApiError(400, "INVALID_MESSAGE", "Message exceeds 1000 characters.");

  const created = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; balance: number }>>`
      SELECT id, balance FROM "Wallet" WHERE "businessId" = ${input.businessId} FOR UPDATE
    `;
    const wallet = rows[0];
    if (!wallet) throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Wallet missing.");
    if (wallet.balance < required) {
      throw new ApiError(402, "INSUFFICIENT_CREDITS", "You do not have enough SMS credits.");
    }
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - required;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    await tx.walletTransaction.create({
      data: {
        businessId: input.businessId,
        type: "SMS_USAGE",
        amount: -required,
        balanceBefore,
        balanceAfter,
        description: `SMS send to ${input.recipients.length} recipient(s), ${input.segments} segment(s)`,
      },
    });
    const messages = [];
    for (const recipient of input.recipients) {
      const message = await tx.message.create({
        data: {
          businessId: input.businessId,
          recipient: recipient.e164,
          messageBody: input.body,
          senderId: input.senderId,
          status: "QUEUED",
          creditsUsed: input.segments,
          segments: input.segments,
        },
      });
      messages.push(message);
    }
    return { messages, balanceAfter };
  });

  enqueueMessageIds(created.messages.map((m) => m.id));
  return created;
}
