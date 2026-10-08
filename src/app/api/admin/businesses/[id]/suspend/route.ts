import { requireAdmin } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";

async function setStatus(id: string, status: "SUSPENDED" | "ACTIVE", actorId: string, req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) throw new ApiError(404, "NOT_FOUND", "Business not found.");
    const updated = await prisma.business.update({ where: { id }, data: { status } });
    await prisma.auditLog.create({
      data: {
        actorId,
        action: status === "SUSPENDED" ? "BUSINESS_SUSPEND" : "BUSINESS_ACTIVATE",
        targetType: "Business",
        targetId: id,
      },
    });
    return json(ok(updated));
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireAdmin();
  return setStatus(params.id, "SUSPENDED", user.id, req);
}
