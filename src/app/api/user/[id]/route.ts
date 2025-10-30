import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/lib/definitions";
import { withAuth, getCurrentUser, isUser } from "@/lib/auth-middleware";

// GET /api/user/[id] - 根据ID获取特定用户（需要认证）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest) => {
    try {
      const resolvedParams = await params;
      const targetUserId = parseInt(resolvedParams.id);
      const currentUser = getCurrentUser(req);

      // 检查权限：用户只能查看自己的信息，或者管理员可以查看任何用户
      if (!isUser(req, targetUserId) && !currentUser?.isSuperuser) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "没有权限查看该用户信息",
          },
          { status: 403 }
        );
      }

      // 根据 id 获取特定用户
      const result = await prisma.user.findUnique({
        where: {
          id: targetUserId,
        },
      });

      if (!result) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "用户不存在",
          },
          { status: 404 }
        );
      }

      // 移除密码字段
      const { password: _, ...userWithoutPassword } = result;
      return NextResponse.json<ApiResponse>({
        success: true,
        data: userWithoutPassword,
        message: "获取用户成功",
      });
    } catch (error) {
      console.error("获取用户失败:", error);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "服务器内部错误",
        },
        { status: 500 }
      );
    }
  })(request);
}
