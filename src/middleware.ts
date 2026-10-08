import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionToken } from "@/lib/auth/token";

const PUBLIC_PATHS = ["/", "/login", "/register", "/pay"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/internal") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  const token = req.cookies.get("sc_session")?.value;
  const session = token ? await readSessionToken(token) : null;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!session && !isPublic && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/admin") && session?.role !== "PLATFORM_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (session && (pathname === "/login" || pathname === "/register")) {
    const dest = session.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
