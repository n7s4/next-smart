import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/definitions";
import { withAuth } from "@/lib/auth-middleware";

// POST /api/user/logout - 用户退出登录
// export const POST = withAuth(async (request: NextRequest) => {
//   try {
//     // 服务器端可以在这里执行额外的登出逻辑，比如将token加入黑名单
//     // 但由于我们使用的是JWT，主要的登出操作是在客户端移除token

//     return NextResponse.json<ApiResponse>({
//       success: true,
//       data: {},
//       message: "退出登录成功",
//     });
//   } catch (error) {
//     console.error("退出登录失败:", error);
//     return NextResponse.json<ApiResponse>(
//       {
//         success: false,
//         error: "服务器内部错误",
//       },
//       { status: 500 }
//     );
//   }
// });
export const POST = async (request: NextRequest) => {
  try {
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {},
      message: "退出登录成功",
    });
  } catch (error) {
    console.error("退出登录失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
};
// 也支持GET请求以便与现有代码兼容
export const GET = POST;
