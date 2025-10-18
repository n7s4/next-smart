import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/lib/definitions";
import bcrypt from "bcryptjs";

// POST /api/user/login - 用户登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "用户名和密码不能为空",
        },
        { status: 400 }
      );
    }

    // 查找用户（支持用户名、邮箱、手机号登录）
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }, { phone: username }],
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "用户不存在",
        },
        { status: 404 }
      );
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "密码错误",
        },
        { status: 401 }
      );
    }

    // 检查用户是否激活
    if (!user.is_active) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "账户已被禁用",
        },
        { status: 403 }
      );
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // 移除密码字段
    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: userWithoutPassword,
        message: "登录成功",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("用户登录失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
