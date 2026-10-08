import { requireUser } from "@/lib/auth/session";
import { handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";

export async function GET() {
  return handle(async () => {
    const { user } = await requireUser();
    return json(
      ok({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        business: user.business
          ? { id: user.business.id, name: user.business.name, status: user.business.status }
          : null,
      }),
    );
  });
}
