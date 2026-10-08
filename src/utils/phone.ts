export type PhoneResult =
  | { ok: true; e164: string; provider: string }
  | { ok: false; error: string };

export function normalizeTzPhone(input: string): PhoneResult {
  const raw = input.trim().replace(/[\s()-]/g, "");
  if (!raw) return { ok: false, error: "Phone number is empty" };

  let digits = raw;
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("0") && digits.length === 10) {
    digits = "255" + digits.slice(1);
  }

  if (!/^255[67]\d{8}$/.test(digits)) {
    return {
      ok: false,
      error: "Invalid Tanzanian mobile number. Use 07XXXXXXXX, 2557XXXXXXXX, or +2557XXXXXXXX.",
    };
  }

  return { ok: true, e164: `+${digits}`, provider: digits };
}

export function parseRecipients(raw: string): { valid: PhoneResult[]; invalid: string[] } {
  const parts = raw
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const valid: PhoneResult[] = [];
  const invalid: string[] = [];
  for (const part of parts) {
    const result = normalizeTzPhone(part);
    if (!result.ok) {
      invalid.push(part);
      continue;
    }
    if (seen.has(result.e164)) continue;
    seen.add(result.e164);
    valid.push(result);
  }
  return { valid, invalid };
}
