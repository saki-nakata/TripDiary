import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedRoutes = [
  "/mypage",
  "/posts/new",
  "/settings",
  "/plans/new",
  "/notification",
];

const authRoutes = ["/login", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isProtected =
    protectedRoutes.some((route) => pathname.startsWith(route)) ||
    /^\/posts\/[^/]+\/edit$/.test(pathname) ||
    /^\/plans\/[^/]+/.test(pathname);

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authRoutes.includes(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // twemoji/ は末尾スラッシュ必須（前方一致のため。/twemoji-guide 等の将来ページを
  // 巻き込んでmiddlewareから除外してしまわないようにする）。
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|twemoji/).*)"],
};
