// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 公共路由：无需登录
const publicRoutes = [
  "/login",
  "/api",
  "/_next",
  "/favicon.ico",
  "/sitemap.xml",
  "/robots.txt",
  "/register",
];

// 检查路径是否是公共路由
function isPublicRoute(pathname: string): boolean {
  return (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/api/auth")
  );
}

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;

  // 如果是公共路由，直接放行
  if (isPublicRoute(currentPath)) {
    return NextResponse.next();
  }

  // 读取 next-auth 的会话（需要设置 NEXTAUTH_SECRET）
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // 如果用户未认证，重定向到登录页
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 如果用户已认证且试图访问登录或注册页，重定向到主页
  if (
    isAuthenticated &&
    (currentPath === "/login" || currentPath === "/register")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 匹配所有路由，但排除静态资源与常见公开文件
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
