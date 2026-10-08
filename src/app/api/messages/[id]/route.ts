import { requireBusiness } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { businessId } = await requireBusiness();
    const message = await prisma.message.findFirst({ where: { id: params.id, businessId } });
    if (!message) throw new ApiError(404, "NOT_FOUND", "Message not found.");
    return json(ok(message));
  });
}
