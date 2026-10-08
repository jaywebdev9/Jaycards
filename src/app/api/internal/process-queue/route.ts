import { NextRequest } from "next/server";
import { handle, json } from "@/lib/http";
import { ApiError, ok } from "@/lib/errors";
import { drainQueue } from "@/lib/queue/sms-queue";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid cron secret.");
    }
    const result = await drainQueue(100);
    return json(ok(result));
  });
}
