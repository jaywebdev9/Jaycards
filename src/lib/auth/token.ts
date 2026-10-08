import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

export type SessionPayload = {
  userId: string;
  role: UserRole;
  businessId: string | null;
  email: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to a long random value");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.userId || !payload.role) return null;
    return {
      userId: String(payload.userId),
      role: payload.role as UserRole,
      businessId: payload.businessId ? String(payload.businessId) : null,
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}
