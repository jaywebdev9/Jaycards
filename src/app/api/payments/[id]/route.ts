import { requireBusiness } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { businessId } = await requireBusiness();
    const payment = await prisma.payment.findFirst({ where: { id: params.id, businessId } });
    if (!payment) throw new ApiError(404, "NOT_FOUND", "Payment not found.");
    return json(ok(payment));
  });
}
