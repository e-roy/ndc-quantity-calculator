import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authMiddleware } from "@/server/auth";

const AUTH_API_PREFIX = "/api/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.fda.gov https://rxnav.nlm.nih.gov https://api.openai.com;",
  );

  // Add HSTS header in production (HTTPS only)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

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
