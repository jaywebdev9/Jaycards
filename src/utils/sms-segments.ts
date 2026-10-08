const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

export function isGsm7(message: string): boolean {
  for (const ch of message) {
    if (!GSM7_BASIC.includes(ch) && !GSM7_EXT.includes(ch)) return false;
  }
  return true;
}

export function gsm7Length(message: string): number {
  let len = 0;
  for (const ch of message) {
    len += GSM7_EXT.includes(ch) ? 2 : 1;
  }
  return len;
}

export type SegmentResult = {
  encoding: "GSM-7" | "UCS-2";
  length: number;
  segments: number;
  singleLimit: number;
  multiLimit: number;
};

export function calculateSmsSegments(message: string): SegmentResult {
  if (isGsm7(message)) {
    const length = gsm7Length(message);
    const singleLimit = 160;
    const multiLimit = 153;
    const segments = length === 0 ? 0 : length <= singleLimit ? 1 : Math.ceil(length / multiLimit);
    return { encoding: "GSM-7", length, segments, singleLimit, multiLimit };
  }
  const length = Array.from(message).length;
  const singleLimit = 70;
  const multiLimit = 67;
  const segments = length === 0 ? 0 : length <= singleLimit ? 1 : Math.ceil(length / multiLimit);
  return { encoding: "UCS-2", length, segments, singleLimit, multiLimit };
}

export function creditsRequired(message: string, recipientCount: number): number {
  const { segments } = calculateSmsSegments(message);
  return segments * recipientCount;
}
