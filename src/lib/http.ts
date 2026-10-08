import { NextRequest, NextResponse } from "next/server";
import { ApiError, errorBody } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function handle(fn: () => Promise<NextResponse>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      return json(errorBody(error.code, error.message), error.status);
    }
    logger.error("unhandled_api_error", { message: error instanceof Error ? error.message : "unknown" });
    return json(errorBody("INTERNAL_SERVER_ERROR", "Something went wrong."), 500);
  }
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const host = req.headers.get("host");
  const allowed = new Set<string>();
  if (appUrl) allowed.add(new URL(appUrl).origin);
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  if (!allowed.has(origin)) {
    throw new ApiError(403, "FORBIDDEN", "Cross-origin request rejected.");
  }
}
