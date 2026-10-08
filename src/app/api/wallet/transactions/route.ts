import { NextRequest } from "next/server";
import { requireBusiness } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const { businessId } = await requireBusiness();
    const take = Math.min(Number(req.nextUrl.searchParams.get("take") || 50), 100);
    const rows = await prisma.walletTransaction.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take,
    });
    return json(ok(rows));
  });
}
