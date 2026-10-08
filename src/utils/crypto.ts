import { createHmac, timingSafeEqual } from "crypto";

export function hmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signPayload(secret: string, payload: string): string {
  return hmacSha256(secret, payload);
}

export function verifySignature(secret: string, payload: string, signature: string | null): boolean {
  if (!secret || !signature) return false;
  const expected = hmacSha256(secret, payload);
  return safeEqual(expected, signature.trim());
}
