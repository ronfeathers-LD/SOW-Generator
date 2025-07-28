import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  const isAdmin = token?.role === "admin";
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isPublicRoute = request.nextUrl.pathname.startsWith("/public") || 
                       request.nextUrl.pathname.startsWith("/api/public") ||
                       request.nextUrl.pathname === "/" ||
                       request.nextUrl.pathname.startsWith("/api/auth") ||
                       request.nextUrl.pathname.startsWith("/debug") ||
                       request.nextUrl.pathname === "/sow/new" ||
                       request.nextUrl.pathname === "/dashboard";

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect non-admin users trying to access admin routes
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/sow", request.url));
  }

  // Require authentication for all other routes
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
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
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}; 