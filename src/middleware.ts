import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authMiddleware } from "@/server/auth";

const AUTH_API_PREFIX = "/api/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Always allow auth API routes to pass through without any processing
  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return response;
  }

  try {
    const session = await authMiddleware();

    // Redirect to dashboard if logged in and trying to access login or signup
    if (
      (pathname.startsWith("/login") || pathname.startsWith("/signup")) &&
      session
    ) {
      return NextResponse.redirect(new URL("/calculator", request.url));
    }

    // Redirect to login if not logged in and trying to access dashboard
    if (pathname.startsWith("/calculator") && !session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // If auth check fails (e.g., database timeout), allow the request through
    // The page-level auth check will handle it
    console.error("Middleware auth error:", error);

    // Only redirect dashboard routes if auth fails
    if (pathname.startsWith("/calculator")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/calculator/:path*", "/login", "/signup"],
};
