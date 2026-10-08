import { NextRequest } from "next/server";
import { requireBusiness } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import type { MessageStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const { businessId } = await requireBusiness();
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q") || "";
    const where: Prisma.MessageWhereInput = { businessId };
    if (status && status !== "ALL") where.status = status as MessageStatus;
    if (q) where.recipient = { contains: q };
    const rows = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(ok(rows));
  });
}
