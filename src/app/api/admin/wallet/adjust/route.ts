import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";
import { adjustCredits } from "@/lib/services/wallet";

const schema = z.object({
  businessId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(3).max(300),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { user } = await requireAdmin();
    const body = schema.parse(await req.json());
    const entry = await adjustCredits({
      businessId: body.businessId,
      amount: body.amount,
      reason: body.reason,
      actorId: user.id,
    });
    return json(ok(entry));
  });
}
