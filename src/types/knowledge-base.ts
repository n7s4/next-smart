/**
 * 知识库相关类型定义
 */

import type { UploadFile } from "antd";

// 知识库配置
export interface KnowledgeBase {
  id: string;
  name: string;
  fileCount: number;
  files: UploadFile[];
  createTime: string;
  description?: string;
  tags?: string[];
}

// 聊天消息
export interface ChatMessage {
  id: string;
  knowledgeBaseId: string;
  type: "user" | "ai";
  content: string;
  time: string;
  sources?: string[];
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
  };
}

// API 响应类型
export interface ApiResponse<T = any> {
  status: 0 | 1;
  message: string;
  data?: T;
  error?: string;
}

// 知识库查询请求
export interface QueryRequest {
  knowledgeBaseId: string;
  question: string;
  options?: {
    k?: number; // 检索的文档数量
    temperature?: number; // LLM 温度参数
  };
}

// 知识库查询响应
export interface QueryResponse {
  answer: string;
  sources: Array<{
    content: string;
    metadata: any;
  }>;
  context: string;
}

// 文档元数据
export interface DocumentMetadata {
  source: string;
  page?: number;
  type?: string;
  uploadTime?: string;
}

// 知识库统计
export interface KnowledgeBaseStats {
  totalKnowledgeBases: number;
  totalDocuments: number;
  totalQueries: number;
  storageUsed: number; // 单位: bytes
}
