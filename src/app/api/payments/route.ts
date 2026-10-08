import { NextRequest } from "next/server";
import { requireBusiness } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const { businessId } = await requireBusiness();
    const rows = await prisma.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return json(ok(rows));
  });
}
