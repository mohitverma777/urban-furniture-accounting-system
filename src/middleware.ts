/**
 * src/middleware.ts
 *
 * Next.js Edge Middleware for route protection.
 *
 * Runs before every matched request to enforce:
 *  1. Authentication — redirect unauthenticated users to /auth/login
 *  2. Authorization — redirect users to their correct dashboard based on role
 *
 * NOTE: iron-session cookies are encrypted so we cannot decrypt them in Edge
 * middleware. Instead we read a lightweight plaintext role indicator cookie
 * set alongside the session. For true authorization, server actions and
 * API routes perform full iron-session verification.
 */

import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Public paths that don't require authentication
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/me",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// ---------------------------------------------------------------------------
// Role-based redirect targets
// ---------------------------------------------------------------------------

function getDashboardForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/";
    case "ACCOUNTANT":
      return "/";
    case "USER":
      return "/portal";
    default:
      return "/auth/login";
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg")
  ) {
    return NextResponse.next();
  }

  // Check for auth indicator cookie (set by login/signup actions)
  const roleCookie = request.cookies.get("uf_user_role")?.value;
  const userIdCookie = request.cookies.get("uf_user_id")?.value;

  // Not authenticated → redirect to login
  if (!userIdCookie || !roleCookie) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = roleCookie;

  // USER trying to access admin/accounting routes → redirect to portal
  if (role === "USER") {
    const isAllowed =
      pathname.startsWith("/portal") ||
      pathname.startsWith("/api/portal") ||
      pathname.startsWith("/api/auth") ||
      pathname.endsWith("/invoice-pdf");
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  // Authenticated users trying to access auth pages → redirect to dashboard
  if (pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
  }

  // Admin-only routes (/admin, /admin/users)
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Matcher — exclude static files and API internals
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
