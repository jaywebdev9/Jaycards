import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/errors";
import { readSessionToken, signSession, type SessionPayload } from "@/lib/auth/token";

const COOKIE = "sc_session";

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) throw new ApiError(401, "UNAUTHORIZED", "You must be logged in.");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { business: true },
  });
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Session is no longer valid.");
  if (user.role === "BUSINESS_USER") {
    if (!user.business) throw new ApiError(403, "FORBIDDEN", "No business is attached to this account.");
    if (user.business.status === "SUSPENDED") {
      throw new ApiError(403, "BUSINESS_SUSPENDED", "This business account is suspended.");
    }
  }
  return { session, user };
}

export async function requireBusiness() {
  const ctx = await requireUser();
  if (ctx.user.role !== "BUSINESS_USER" || !ctx.user.businessId || !ctx.user.business) {
    throw new ApiError(403, "FORBIDDEN", "Business access required.");
  }
  return { ...ctx, business: ctx.user.business, businessId: ctx.user.businessId };
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.user.role !== "PLATFORM_ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Platform admin access required.");
  }
  return ctx;
}
