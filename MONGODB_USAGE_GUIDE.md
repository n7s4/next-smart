# MongoDB 使用指南

本指南将教您如何在您的 Next.js 应用中使用已配置的 MongoDB 连接。

## 📋 目录

1. [项目结构](#项目结构)
2. [环境配置](#环境配置)
3. [基本使用](#基本使用)
4. [数据库操作](#数据库操作)
5. [API 路由示例](#api-路由示例)
6. [React 组件中使用](#react-组件中使用)
7. [测试数据库连接](#测试数据库连接)
8. [常见问题](#常见问题)

## 🏗️ 项目结构

```
src/
├── lib/
│   ├── mongodb.ts              # MongoDB 连接配置
│   ├── database.ts             # 数据库操作工具类
│   ├── definitions.ts          # 类型定义
│   ├── repositories/
│   │   └── userRepository.ts   # 用户数据操作
│   ├── examples/
│   │   └── databaseUsage.ts    # 使用示例
│   └── auth.ts                 # 认证配置（已集成数据库）
├── app/
│   └── api/
│       ├── users/              # 用户相关 API
│       └── db/
│           └── test/           # 数据库测试 API
```

## ⚙️ 环境配置

确保您的 `.env.local` 文件包含以下配置：

```env
# MongoDB 连接字符串
MONGODB_URI=mongodb://localhost:27017/your-database-name
# 或者使用 MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/your-database-name

# 数据库名称（可选，默认为 smart_app）
DB_NAME=smart_app

# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# GitHub OAuth（可选）
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
```

## 🚀 基本使用

### 1. 测试数据库连接

```typescript
import { testConnection } from "@/lib/database";

// 测试连接
const isConnected = await testConnection();
console.log("数据库连接状态:", isConnected);
```

### 2. 使用用户仓库

```typescript
import { userRepository } from "@/lib/repositories/userRepository";

// 创建用户
const newUser = await userRepository.createUser({
  name: "张三",
  email: "zhangsan@example.com",
  password: "password123",
});

// 查找用户
const user = await userRepository.findByEmail("zhangsan@example.com");

// 验证密码
const isValid = await userRepository.validatePassword(
  "zhangsan@example.com",
  "password123"
);
```

## 📊 数据库操作

### 基础 CRUD 操作

```typescript
import { BaseRepository } from "@/lib/database";

// 创建自定义仓库
class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super("products");
  }

  // 自定义方法
  async findByCategory(category: string) {
    return await this.findMany({ category });
  }
}

const productRepo = new ProductRepository();

// 创建
const product = await productRepo.create({
  name: "商品名称",
  price: 99.99,
  category: "电子产品",
});

// 读取
const foundProduct = await productRepo.findById(product._id?.toString() || "");
const products = await productRepo.findMany({ category: "电子产品" });

// 更新
const updatedProduct = await productRepo.updateById(
  product._id?.toString() || "",
  {
    price: 89.99,
  }
);

// 删除
const deleted = await productRepo.deleteById(product._id?.toString() || "");
```

### 高级查询

```typescript
// 分页查询
const result = await userRepository.getUsers(1, 10); // 第1页，每页10条

// 排序查询
const users = await userRepository.findMany(
  {},
  {
    sort: { createdAt: -1 }, // 按创建时间倒序
    limit: 5,
    skip: 0,
  }
);

// 统计
const count = await userRepository.count({ role: "admin" });
```

## 🔌 API 路由示例

### 获取用户列表

```typescript
// GET /api/users?page=1&limit=10
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const result = await userRepository.getUsers(page, limit);

  return NextResponse.json({
    success: true,
    data: result,
  });
}
```

### 创建用户

```typescript
// POST /api/users
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password } = body;

  const newUser = await userRepository.createUser({
    name,
    email,
    password,
  });

  return NextResponse.json(
    {
      success: true,
      data: newUser,
    },
    { status: 201 }
  );
}
```

## ⚛️ React 组件中使用

```typescript
"use client";
import { useEffect, useState } from "react";
import { User } from "@/lib/definitions";

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users");
        const result = await response.json();

        if (result.success) {
          setUsers(result.data.users);
        }
      } catch (error) {
        console.error("获取用户列表失败:", error);
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
      {users.map((user) => (
        <div key={user._id?.toString()}>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <p>角色: {user.role}</p>
        </div>
      ))}
    </div>
  );
}
```

## 🧪 测试数据库连接

访问以下 URL 来测试数据库连接：

```
GET /api/db/test
```

这个 API 会：

1. 测试数据库连接
2. 执行基本的 CRUD 操作
3. 返回测试结果

## 🔐 认证集成

您的认证系统已经集成了数据库：

- **用户名密码登录**: 验证存储在数据库中的用户凭据
- **GitHub OAuth**: 自动创建或更新用户信息
- **手机号登录**: 支持手机号验证码登录

### 登录流程

1. 用户提交登录表单
2. NextAuth 调用 `authorize` 函数
3. 使用 `userRepository.validatePassword()` 验证用户
4. 登录成功后更新最后登录时间

## 📝 类型定义

```typescript
// 用户类型
interface User {
  _id?: ObjectId;
  id?: string;
  name: string;
  email: string;
  password?: string;
  image?: string | null;
  provider?: string;
  providerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  isActive?: boolean;
  role?: "user" | "admin";
}

// API 响应类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

## 🚨 常见问题

### 1. 连接失败

**问题**: MongoDB 连接失败
**解决方案**:

- 检查 `MONGODB_URI` 环境变量
- 确保 MongoDB 服务正在运行
- 检查网络连接和防火墙设置

### 2. 认证错误

**问题**: 用户认证失败
**解决方案**:

- 确保用户存在于数据库中
- 检查密码加密是否正确
- 验证 NextAuth 配置

### 3. 类型错误

**问题**: TypeScript 类型错误
**解决方案**:

- 确保导入了正确的类型定义
- 检查 MongoDB ObjectId 类型
- 使用 `as any` 临时解决类型问题（不推荐）

### 4. 性能问题

**问题**: 数据库查询缓慢
**解决方案**:

- 添加适当的索引
- 使用分页查询
- 优化查询条件
- 考虑使用缓存

## 🔧 最佳实践

1. **连接管理**: 使用单例模式管理数据库连接
2. **错误处理**: 始终包装数据库操作在 try-catch 中
3. **类型安全**: 使用 TypeScript 类型定义
4. **密码安全**: 使用 bcrypt 加密密码
5. **数据验证**: 在 API 层验证输入数据
6. **索引优化**: 为常用查询字段添加索引
7. **环境分离**: 使用不同的数据库用于开发和生产

## 📚 更多资源

- [MongoDB 官方文档](https://docs.mongodb.com/)
- [NextAuth.js 文档](https://next-auth.js.org/)
- [MongoDB Node.js 驱动文档](https://mongodb.github.io/node-mongodb-native/)

---

现在您已经掌握了如何在您的 Next.js 应用中使用 MongoDB！如果您有任何问题，请随时询问。
