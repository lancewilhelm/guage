import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/auth";

export function middleware(req: NextRequest) {
  const session = getSession();
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// Protect dashboard routes
export const config = {
  matcher: ["/dashboard"],
};
