import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader, TokenPayload } from "./jwt";
import { ApiResponse } from "./definitions";

// 扩展NextRequest接口，添加用户信息
declare module "next/server" {
  interface NextRequest {
    user?: TokenPayload;
  }
}

// 认证中间件函数
export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 从请求头中获取Authorization
      const authHeader = req.headers.get("authorization");
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "缺少认证token",
          },
          { status: 401 }
        );
      }

      // 验证token
      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "无效的token",
          },
          { status: 401 }
        );
      }

      // 检查用户是否仍然活跃
      if (!payload.isActive) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "用户账户已被禁用",
          },
          { status: 403 }
        );
      }

      // 将用户信息添加到请求对象
      req.user = payload;

      // 继续执行原始处理器
      return await handler(req);
    } catch (error) {
      console.error("认证中间件错误:", error);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "认证失败",
        },
        { status: 401 }
      );
    }
  };
}

// 可选认证中间件（token可选）
export function withOptionalAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get("authorization");
      const token = extractTokenFromHeader(authHeader);

      if (token) {
        const payload = verifyToken(token);
        if (payload && payload.isActive) {
          req.user = payload;
        }
      }

      return await handler(req);
    } catch (error) {
      console.error("可选认证中间件错误:", error);
      // 可选认证失败时不返回错误，继续执行
      return await handler(req);
    }
  };
}

// 管理员权限中间件
export function withAdminAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: NextRequest): Promise<NextResponse> => {
    if (!req.user?.isSuperuser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "需要管理员权限",
        },
        { status: 403 }
      );
    }

    return await handler(req);
  });
}

// 获取当前用户信息的辅助函数
export function getCurrentUser(req: NextRequest): TokenPayload | null {
  return req.user || null;
}

// 检查用户是否为管理员
export function isAdmin(req: NextRequest): boolean {
  return req.user?.isSuperuser || false;
}

// 检查用户是否为特定用户
export function isUser(req: NextRequest, userId: number): boolean {
  return req.user?.userId === userId;
}
