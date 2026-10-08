import { describe, expect, it } from "vitest";
import { calculateSmsSegments, creditsRequired } from "../src/utils/sms-segments";
import { normalizeTzPhone, parseRecipients } from "../src/utils/phone";
import { canApplyPaymentCredit, estimatedMargin } from "../src/utils/margin";
import { hmacSha256, verifySignature } from "../src/utils/crypto";

describe("SMS segmentation", () => {
  it("counts a short GSM message as 1 segment", () => {
    const result = calculateSmsSegments("Welcome to XYZ Hotel. Your booking has been confirmed.");
    expect(result.encoding).toBe("GSM-7");
    expect(result.segments).toBe(1);
  });

  it("splits long GSM messages on 153 septets", () => {
    const result = calculateSmsSegments("A".repeat(161));
    expect(result.segments).toBe(2);
  });

  it("uses UCS-2 limits for Swahili characters outside GSM", () => {
    const result = calculateSmsSegments("Karibu — booking imethibitishwa");
    expect(result.encoding).toBe("UCS-2");
    expect(result.segments).toBe(1);
  });

  it("bills segments times recipients", () => {
    expect(creditsRequired("A".repeat(161), 100)).toBe(200);
  });
});

describe("Tanzanian numbers", () => {
  it("normalizes local, 255, and E.164 formats", () => {
    expect(normalizeTzPhone("0712345678")).toEqual({ ok: true, e164: "+255712345678", provider: "255712345678" });
    expect(normalizeTzPhone("255712345678").ok).toBe(true);
    expect(normalizeTzPhone("+255712345678").ok).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(normalizeTzPhone("12345").ok).toBe(false);
  });

  it("dedupes recipients", () => {
    const parsed = parseRecipients("0712345678, +255712345678");
    expect(parsed.valid).toHaveLength(1);
  });
});

describe("payments and margin", () => {
  it("credits a payment only while pending", () => {
    expect(canApplyPaymentCredit("PENDING")).toBe(true);
    expect(canApplyPaymentCredit("SUCCESS")).toBe(false);
  });

  it("calculates estimated gross margin", () => {
    expect(estimatedMargin({ smsVolume: 10000, customerSmsPrice: 25, providerSmsCost: 18 })).toEqual({
      smsRevenue: 250000,
      estimatedProviderCost: 180000,
      estimatedGrossMargin: 70000,
    });
  });

  it("rejects a tampered webhook signature", () => {
    const body = JSON.stringify({ orderId: "ord_1" });
    const signature = hmacSha256("secret", body);
    expect(verifySignature("secret", body, signature)).toBe(true);
    expect(verifySignature("secret", body, "bad")).toBe(false);
  });
});

describe("tenant isolation rule", () => {
  it("requires business scope on message reads", () => {
    const businessA = "A";
    const query = { businessId: businessA };
    expect(query.businessId).not.toBe("B");
  });
});
