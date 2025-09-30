// MongoDB 使用示例
// 这个文件展示了如何在您的应用中使用 MongoDB

import { userRepository } from "../repositories/userRepository";
import { db, testConnection } from "../database";

// 示例 1: 测试数据库连接
export async function testDatabaseConnection() {
  console.log("🔍 测试数据库连接...");
  const isConnected = await testConnection();

  if (isConnected) {
    console.log("✅ 数据库连接成功！");
  } else {
    console.log("❌ 数据库连接失败！");
  }

  return isConnected;
}

// 示例 2: 用户注册
export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    console.log("👤 创建新用户...");

    // 检查邮箱是否已存在
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("邮箱已被使用");
    }

    // 创建新用户
    const newUser = await userRepository.createUser(userData);
    console.log("✅ 用户创建成功:", newUser.name);

    return newUser;
  } catch (error) {
    console.error("❌ 用户创建失败:", error);
    throw error;
  }
}

// 示例 3: 用户登录验证
export async function loginUser(email: string, password: string) {
  try {
    console.log("🔐 验证用户登录...");

    const user = await userRepository.validatePassword(email, password);

    if (user) {
      console.log("✅ 登录成功:", user.name);
      return user;
    } else {
      console.log("❌ 登录失败: 用户名或密码错误");
      return null;
    }
  } catch (error) {
    console.error("❌ 登录验证失败:", error);
    throw error;
  }
}

// 示例 4: 获取用户列表（分页）
export async function getUserList(page: number = 1, limit: number = 10) {
  try {
    console.log(`📋 获取用户列表 (第${page}页, 每页${limit}条)...`);

    const result = await userRepository.getUsers(page, limit);

    console.log(
      `✅ 获取到 ${result.users.length} 个用户，共 ${result.total} 个用户`
    );

    return result;
  } catch (error) {
    console.error("❌ 获取用户列表失败:", error);
    throw error;
  }
}

// 示例 5: 更新用户信息
export async function updateUserInfo(
  userId: string,
  updateData: {
    name?: string;
    email?: string;
    role?: "user" | "admin";
  }
) {
  try {
    console.log("✏️ 更新用户信息...");

    const updatedUser = await userRepository.updateById(userId, updateData);

    if (updatedUser) {
      console.log("✅ 用户信息更新成功:", updatedUser.name);
      return updatedUser;
    } else {
      throw new Error("用户不存在或更新失败");
    }
  } catch (error) {
    console.error("❌ 更新用户信息失败:", error);
    throw error;
  }
}

// 示例 6: 删除用户
export async function deleteUser(userId: string) {
  try {
    console.log("🗑️ 删除用户...");

    const deleted = await userRepository.deleteById(userId);

    if (deleted) {
      console.log("✅ 用户删除成功");
      return true;
    } else {
      throw new Error("用户不存在或删除失败");
    }
  } catch (error) {
    console.error("❌ 删除用户失败:", error);
    throw error;
  }
}

// 示例 7: 创建 OAuth 用户（如 GitHub 登录）
export async function createOAuthUser(profile: {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: string;
}) {
  try {
    console.log("🔗 创建/更新 OAuth 用户...");

    const user = await userRepository.createOrUpdateOAuthUser(profile);

    console.log("✅ OAuth 用户处理成功:", user.name);

    return user;
  } catch (error) {
    console.error("❌ OAuth 用户处理失败:", error);
    throw error;
  }
}

// 示例 8: 在 React 组件中使用数据库
export const ReactComponentExample = `
// 在 React 组件中使用数据库的示例

import { useEffect, useState } from 'react';
import { userRepository } from '@/lib/repositories/userRepository';
import { User } from '@/lib/definitions';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const result = await userRepository.getUsers(1, 10);
        setUsers(result.users);
      } catch (error) {
        console.error('获取用户列表失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <h2>用户列表</h2>
      {users.map(user => (
        <div key={user._id?.toString()}>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <p>角色: {user.role}</p>
        </div>
      ))}
    </div>
  );
}
`;

// 示例 9: 在 API 路由中使用数据库
export const ApiRouteExample = `
// 在 API 路由中使用数据库的示例

import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/lib/repositories/userRepository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await userRepository.getUsers(page, limit);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('API 错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器错误',
    }, { status: 500 });
  }
}
`;
