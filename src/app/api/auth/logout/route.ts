import { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ok } from "@/lib/errors";

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    clearSessionCookie();
    return json(ok({ loggedOut: true }));
  });
}
