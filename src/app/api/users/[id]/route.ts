import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/userRepository";
import { ApiResponse } from "@/lib/definitions";

// GET /api/users/[id] - 获取特定用户信息
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;
    const user = await userRepository.findById(userId);

    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "用户不存在",
        },
        { status: 404 }
      );
    }

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: userWithoutPassword,
      message: "获取用户信息成功",
    });
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;
    const body = await request.json();
    const { name, email, role } = body;

    // 检查用户是否存在
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "用户不存在",
        },
        { status: 404 }
      );
    }

    // 如果更新邮箱，检查是否已被其他用户使用
    if (email && email !== existingUser.email) {
      const emailExists = await userRepository.findByEmail(email);
      if (emailExists) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: "邮箱已被使用",
          },
          { status: 409 }
        );
      }
    }

    // 更新用户信息
    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const updatedUser = await userRepository.updateById(userId, updateData);

    if (!updatedUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "更新失败",
        },
        { status: 500 }
      );
    }

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: userWithoutPassword,
      message: "用户信息更新成功",
    });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;

    // 检查用户是否存在
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "用户不存在",
        },
        { status: 404 }
      );
    }

    // 删除用户
    const deleted = await userRepository.deleteById(userId);

    if (!deleted) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "删除失败",
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "用户删除成功",
    });
  } catch (error) {
    console.error("删除用户失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
