import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Every page and API route needs a signed-in session, except the login page and the auth routes.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (req.auth) {
    if (pathname === "/login") return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    return NextResponse.next();
  }
  if (pathname === "/login") return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
