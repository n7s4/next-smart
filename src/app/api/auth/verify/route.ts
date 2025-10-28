import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { ApiResponse } from "@/lib/definitions";

// GET /api/auth/verify - 验证token
export const GET = withAuth(async (req: NextRequest) => {
  try {
    // 如果中间件执行到这里，说明token是有效的
    const user = req.user!; // 中间件已经验证了token，所以user一定存在

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          user: {
            userId: user.userId,
            username: user.username,
            email: user.email,
            isActive: user.isActive,
            isSuperuser: user.isSuperuser,
          },
          valid: true,
        },
        message: "Token有效",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token验证失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Token验证失败",
      },
      { status: 500 }
    );
  }
});
