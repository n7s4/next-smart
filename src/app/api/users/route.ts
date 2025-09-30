import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/userRepository";
import { ApiResponse } from "@/lib/definitions";

// GET /api/users - 获取用户列表（需要管理员权限）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "未授权访问",
        },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // 获取用户列表
    const result = await userRepository.getUsers(page, limit);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: "获取用户列表成功",
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

// POST /api/users - 创建新用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 验证必需字段
    if (!name || !email || !password) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "缺少必需字段",
        },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "邮箱已被使用",
        },
        { status: 409 }
      );
    }

    // 创建新用户
    const newUser = await userRepository.createUser({
      name,
      email,
      password,
    });

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: userWithoutPassword,
        message: "用户创建成功",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建用户失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
