import { NextRequest } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { normalizeTzPhone } from "@/utils/phone";

export async function GET() {
  return handle(async () => {
    const { business } = await requireBusiness();
    return json(ok(business));
  });
}

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  ownerName: z.string().min(2).max(120).optional(),
  phone: z.string().min(9).max(20).optional(),
});

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { businessId } = await requireBusiness();
    const body = schema.parse(await req.json());
    let phone: string | undefined;
    if (body.phone) {
      const normalized = normalizeTzPhone(body.phone);
      if (!normalized.ok) throw new ApiError(400, "INVALID_PHONE_NUMBER", normalized.error);
      phone = normalized.e164;
    }
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { name: body.name, ownerName: body.ownerName, phone },
    });
    return json(ok(updated));
  });
}
