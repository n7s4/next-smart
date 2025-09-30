import { NextResponse } from "next/server";
import { testConnection } from "@/lib/database";
import { userRepository } from "@/lib/repositories/userRepository";
import { ApiResponse } from "@/lib/definitions";

// GET /api/db/test - 测试数据库连接和基本操作
export async function GET() {
  try {
    // 测试数据库连接
    const isConnected = await testConnection();

    if (!isConnected) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "数据库连接失败",
        },
        { status: 500 }
      );
    }

    // 测试基本数据库操作
    const testResults = {
      connection: true,
      operations: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
    };

    try {
      // 创建测试用户
      const testUser = await userRepository.createUser({
        name: "测试用户",
        email: `test_${Date.now()}@example.com`,
        password: "test123456",
      });
      testResults.operations.create = true;

      // 读取用户
      const foundUser = await userRepository.findById(
        testUser._id?.toString() || ""
      );
      testResults.operations.read = !!foundUser;

      // 更新用户
      const updatedUser = await userRepository.updateById(
        testUser._id?.toString() || "",
        {
          name: "更新后的测试用户",
        }
      );
      testResults.operations.update = !!updatedUser;

      // 删除用户
      const deleted = await userRepository.deleteById(
        testUser._id?.toString() || ""
      );
      testResults.operations.delete = deleted;
    } catch (operationError) {
      console.error("数据库操作测试失败:", operationError);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: testResults,
      message: "数据库测试完成",
    });
  } catch (error) {
    console.error("数据库测试失败:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "数据库测试失败",
      },
      { status: 500 }
    );
  }
}
