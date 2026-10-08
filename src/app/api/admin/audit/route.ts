import { requireAdmin } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { email: true } } },
    });
    return json(ok(rows));
  });
}
