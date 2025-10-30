import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { refreshToken } from "@/lib/jwt";
import { ApiResponse } from "@/lib/definitions";

// POST /api/auth/refresh - 刷新token
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const authHeader = req.headers.get("authorization");
    const oldToken = authHeader?.replace("Bearer ", "") || "";

    // 刷新token
    const newToken = refreshToken(oldToken);

    if (!newToken) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Token刷新失败",
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          token: newToken,
          tokenType: "Bearer",
          expiresIn: "7d",
        },
        message: "Token刷新成功",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Token刷新失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Token刷新失败",
      },
      { status: 500 }
    );
  }
});
