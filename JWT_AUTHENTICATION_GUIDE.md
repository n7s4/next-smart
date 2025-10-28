# JWT 认证系统使用指南

## 概述

本项目已集成 JWT（JSON Web Token）认证系统，用户登录后会自动生成 token，用于后续 API 请求的身份验证。

## 功能特性

- ✅ 用户登录时自动生成 JWT token
- ✅ Token 验证中间件保护 API 端点
- ✅ 支持 token 刷新
- ✅ 权限控制（普通用户/管理员）
- ✅ 用户只能访问自己的数据（除非是管理员）

## API 端点

### 1. 用户登录

```
POST /api/user/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "is_active": true,
      "is_superuser": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "7d"
  },
  "message": "登录成功"
}
```

### 2. 验证 Token

```
GET /api/auth/verify
Authorization: Bearer <your_token>
```

### 3. 刷新 Token

```
POST /api/auth/refresh
Authorization: Bearer <your_token>
```

### 4. 获取用户列表（需要管理员权限）

```
GET /api/user
Authorization: Bearer <admin_token>
```

### 5. 获取特定用户信息

```
GET /api/user/[id]
Authorization: Bearer <your_token>
```

## 环境变量配置

在项目根目录创建 `.env.local` 文件：

```env
# JWT配置
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# 数据库配置
DATABASE_URL="file:./dev.db"
```

## 前端使用示例

### 登录并保存 token

```javascript
// 登录
const loginResponse = await fetch("/api/user/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username: "your_username",
    password: "your_password",
  }),
});

const loginData = await loginResponse.json();
if (loginData.success) {
  // 保存token到localStorage或状态管理
  localStorage.setItem("token", loginData.data.token);
}
```

### 使用 token 访问受保护的 API

```javascript
// 获取用户信息
const token = localStorage.getItem("token");
const userResponse = await fetch("/api/user/1", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const userData = await userResponse.json();
```

### 验证 token 有效性

```javascript
const token = localStorage.getItem("token");
const verifyResponse = await fetch("/api/auth/verify", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const verifyData = await verifyResponse.json();
if (!verifyData.success) {
  // Token无效，需要重新登录
  localStorage.removeItem("token");
  // 重定向到登录页面
}
```

## 权限控制

### 普通用户权限

- 只能查看自己的用户信息
- 无法访问用户列表

### 管理员权限

- 可以查看所有用户信息
- 可以访问用户列表
- 拥有所有 API 访问权限

## 安全建议

1. **生产环境配置**：

   - 使用强随机字符串作为 `JWT_SECRET`
   - 定期轮换 JWT 密钥
   - 使用 HTTPS 传输

2. **Token 管理**：

   - 在前端安全存储 token（考虑使用 httpOnly cookies）
   - 实现自动 token 刷新机制
   - 在用户登出时清除 token

3. **错误处理**：
   - 处理 token 过期情况
   - 实现自动重新登录机制

## 中间件说明

### withAuth

- 必需认证，token 无效时返回 401 错误
- 适用于需要登录的 API 端点

### withOptionalAuth

- 可选认证，token 无效时继续执行但不设置用户信息
- 适用于公开但支持认证的 API 端点

### withAdminAuth

- 需要管理员权限
- 适用于管理员专用 API 端点

## 故障排除

### 常见错误

1. **401 Unauthorized**

   - 检查 token 是否正确传递
   - 验证 token 是否过期
   - 确认 JWT_SECRET 配置正确

2. **403 Forbidden**

   - 检查用户权限
   - 确认是否为管理员操作

3. **Token 验证失败**
   - 检查 token 格式是否正确
   - 验证 JWT_SECRET 是否匹配
   - 确认 token 未过期
