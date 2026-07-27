import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login")
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const isHttps = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const token = await getToken({
    req: request,
    secret,
    secureCookie: isHttps,
  });

  if (!token) {
    const u = new URL("/login", request.url);
    u.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(u);
  }

  if (pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/quotations", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(token.role === "admin" ? "/admin" : "/quotations", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
