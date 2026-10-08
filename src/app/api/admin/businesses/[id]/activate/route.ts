import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user } = await requireAdmin();
    const business = await prisma.business.findUnique({ where: { id: params.id } });
    if (!business) throw new ApiError(404, "NOT_FOUND", "Business not found.");
    const updated = await prisma.business.update({ where: { id: params.id }, data: { status: "ACTIVE" } });
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "BUSINESS_ACTIVATE", targetType: "Business", targetId: params.id },
    });
    return json(ok(updated));
  });
}
