import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/lib/definitions";
import bcrypt from "bcryptjs";

// GET /api/user - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // 获取用户列表
    const result = await prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
    });

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

// POST /api/user - 创建新用户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body || {};

    if (!username || !email || !password) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "缺少必须字段",
        },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUserByUsername) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "用户名已被使用",
        },
        { status: 409 }
      );
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "邮箱已被使用",
        },
        { status: 409 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // 移除密码字段
    const { password: _password, ...userWithoutPassword } = newUser;

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
