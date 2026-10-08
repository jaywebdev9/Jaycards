import { NextRequest } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth/session";
import { assertSameOrigin, handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { parseRecipients } from "@/utils/phone";
import { calculateSmsSegments } from "@/utils/sms-segments";
import { createAndQueueMessages } from "@/lib/queue/sms-queue";
import { limitFromEnv, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  recipients: z.string().min(9),
  message: z.string().min(1).max(1000),
  senderId: z.string().min(2).max(11).regex(/^[A-Za-z0-9 ]+$/),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    assertSameOrigin(req);
    const { businessId } = await requireBusiness();
    const limited = rateLimit(`send:${businessId}`, limitFromEnv("RATE_LIMIT_SEND", 10), limitFromEnv("RATE_LIMIT_WINDOW_MS", 60000));
    if (!limited.ok) throw new ApiError(429, "RATE_LIMITED", "Too many send requests. Try again shortly.");
    const body = schema.parse(await req.json());
    const parsed = parseRecipients(body.recipients);
    if (parsed.invalid.length) {
      throw new ApiError(400, "INVALID_PHONE_NUMBER", `Invalid numbers: ${parsed.invalid.slice(0, 5).join(", ")}`);
    }
    if (!parsed.valid.length) throw new ApiError(400, "INVALID_PHONE_NUMBER", "Add at least one valid Tanzanian number.");
    if (parsed.valid.length > 1000) throw new ApiError(400, "VALIDATION_ERROR", "Maximum 1000 recipients per request.");
    const segments = calculateSmsSegments(body.message);
    if (segments.segments < 1) throw new ApiError(400, "INVALID_MESSAGE", "Message is empty.");
    const result = await createAndQueueMessages({
      businessId,
      recipients: parsed.valid.map((v) => ({ e164: v.ok ? v.e164 : "" })).filter((v) => v.e164),
      body: body.message,
      senderId: body.senderId.trim(),
      segments: segments.segments,
    });
    return json(
      ok({
        queued: result.messages.length,
        creditsUsed: segments.segments * result.messages.length,
        balanceAfter: result.balanceAfter,
      }),
      201,
    );
  });
}
