import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/auth";

export async function middleware(req: NextRequest) {
  const session = await getSession();
  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/chat") ||
    req.nextUrl.pathname.startsWith("/roleplay");

  console.log("route", req.nextUrl.pathname, "session?", session);

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// Protect dashboard routes
export const config = {
  matcher: ["/dashboard", "/chat", "/roleplay"],
};
