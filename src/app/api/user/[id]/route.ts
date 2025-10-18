import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/lib/definitions";

// GET /api/user/[id] - 根据ID获取特定用户
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // 根据 id 获取特定用户
    const result = await prisma.user.findUnique({
      where: {
        id: parseInt(resolvedParams.id),
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
    const { password: _password, ...userWithoutPassword } = result;
    return NextResponse.json<ApiResponse>({
      success: true,
      data: userWithoutPassword,
      message: "获取用户成功",
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
