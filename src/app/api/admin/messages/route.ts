import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const businessId = req.nextUrl.searchParams.get("businessId") || undefined;
    const rows = await prisma.message.findMany({
      where: businessId ? { businessId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { business: { select: { name: true } } },
    });
    return json(ok(rows));
  });
}
