import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    // Must match the secret NextAuth signs with (src/lib/auth.ts). Without the
    // same dev fallback, local tokens are signed with 'dev-secret' but verified
    // here with undefined, so middleware rejects every authenticated request.
    secret:
      process.env.NEXTAUTH_SECRET ||
      (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret'),
  });

  const isAdmin = token?.role === "admin";
  const isApi = pathname.startsWith("/api");
  // Admin pages AND all admin APIs must be admin-gated (previously only
  // /api/admin/gemini was, leaving every other /api/admin/* route open to any
  // authenticated user).
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  // Only allow these routes without authentication. NOTE: the Salesforce
  // partner-info / fields-explorer routes were previously public — they
  // authenticate to the live CRM with stored credentials, so they now require
  // a session like everything else.
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/api/public");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Require authentication for everything else.
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Require admin role for admin pages and admin APIs.
  if (isAdminArea && !isAdmin) {
    if (isApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}; 