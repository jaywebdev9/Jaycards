import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { WalletTxType } from "@prisma/client";

export async function applyPaymentSuccess(input: {
  orderId: string;
  providerTransactionId: string;
  paymentMethod?: string;
  raw: unknown;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { orderId: input.orderId } });
    if (!payment) throw new ApiError(404, "NOT_FOUND", "Payment not found.");
    if (payment.status === "SUCCESS") {
      logger.info("payment_webhook_duplicate", { orderId: input.orderId });
      return { alreadyProcessed: true, payment };
    }
    if (payment.status !== "PENDING") {
      return { alreadyProcessed: true, payment };
    }
    if (input.providerTransactionId) {
      const clash = await tx.payment.findUnique({
        where: { providerTransactionId: input.providerTransactionId },
      });
      if (clash && clash.id !== payment.id) {
        throw new ApiError(409, "PAYMENT_NOT_VERIFIED", "Provider transaction id already used.");
      }
    }
    const locked = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: "SUCCESS",
        providerTransactionId: input.providerTransactionId || payment.providerTransactionId,
        paymentMethod: input.paymentMethod,
        rawResponse: input.raw as object,
      },
    });
    if (locked.count !== 1) {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      return { alreadyProcessed: true, payment: current ?? payment };
    }
    const wallet = await tx.wallet.findUnique({ where: { businessId: payment.businessId } });
    if (!wallet) throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Wallet missing.");
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + payment.credits;
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });
    await tx.walletTransaction.create({
      data: {
        businessId: payment.businessId,
        type: "CREDIT_PURCHASE",
        amount: payment.credits,
        balanceBefore,
        balanceAfter,
        reference: payment.id,
        description: `Purchased ${payment.credits} SMS credits`,
      },
    });
    logger.info("payment_credited", {
      orderId: payment.orderId,
      businessId: payment.businessId,
      credits: payment.credits,
    });
    const updated = await tx.payment.findUnique({ where: { id: payment.id } });
    return { alreadyProcessed: false, payment: updated ?? payment };
  });
}

export async function markPaymentFailed(orderId: string, status: "FAILED" | "CANCELLED", raw: unknown) {
  await prisma.payment.updateMany({
    where: { orderId, status: "PENDING" },
    data: { status, rawResponse: raw as object },
  });
}

export async function adjustCredits(input: {
  businessId: string;
  amount: number;
  reason: string;
  actorId: string;
  type?: WalletTxType;
}) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Adjustment amount must be a non-zero integer.");
  }
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; balance: number }>>`
      SELECT id, balance FROM "Wallet" WHERE "businessId" = ${input.businessId} FOR UPDATE
    `;
    const wallet = rows[0];
    if (!wallet) throw new ApiError(404, "NOT_FOUND", "Wallet not found.");
    const balanceAfter = wallet.balance + input.amount;
    if (balanceAfter < 0) throw new ApiError(400, "INSUFFICIENT_CREDITS", "Adjustment would make balance negative.");
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
    const entry = await tx.walletTransaction.create({
      data: {
        businessId: input.businessId,
        type: input.type ?? "ADMIN_ADJUSTMENT",
        amount: input.amount,
        balanceBefore: wallet.balance,
        balanceAfter,
        description: input.reason,
        actorId: input.actorId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "WALLET_ADJUST",
        targetType: "Business",
        targetId: input.businessId,
        metadata: { amount: input.amount, reason: input.reason, balanceAfter },
      },
    });
    return entry;
  });
}
