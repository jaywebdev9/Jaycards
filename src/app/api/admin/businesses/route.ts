import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const q = req.nextUrl.searchParams.get("q") || "";
    const businesses = await prisma.business.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
        : undefined,
      include: { wallet: true, _count: { select: { messages: true, payments: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(ok(businesses));
  });
}
