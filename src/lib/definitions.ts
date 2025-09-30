import { ObjectId } from "mongodb";

// 用户类型定义
export interface User {
  _id?: ObjectId;
  id?: string; // 兼容 NextAuth
  username: string;
  email: string;
  password?: string; // 可选，因为 OAuth 用户可能没有密码
  image?: string | null;
  provider?: string; // 登录提供商 (credentials, github, etc.)
  providerId?: string; // 第三方提供商的用户ID
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  isActive?: boolean;
  role?: "user" | "admin";
}

// 聊天消息类型
export interface ChatMessage {
  _id?: ObjectId;
  userId: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  conversationId?: string;
}

// 会话类型
export interface Conversation {
  _id?: ObjectId;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
