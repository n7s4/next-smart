// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 读取 next-auth 的会话（需要设置 NEXTAUTH_SECRET）
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET,
  });
  console.log("token", token);
  const isLoggedIn = !!token;

  // 公共路由：无需登录
  const publicRoutes = [
    "/login",
    "/api",
    "/_next",
    "/favicon.ico",
    "/sitemap.xml",
    "/robots.txt",
  ];

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // // 未登录：拦截非公共路由 → /login
  // if (!isLoggedIn && !isPublic) {
  //   const url = new URL("/login", request.url);
  //   url.searchParams.set("from", pathname);
  //   return NextResponse.redirect(url);
  // }

  // // 已登录：访问 /login → /home
  // if (isLoggedIn && (pathname === "/login" || pathname.startsWith("/login/"))) {
  //   return NextResponse.redirect(new URL("/home", request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 匹配所有路由，但排除静态资源与常见公开文件
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
