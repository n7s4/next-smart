/**
 * 获取知识库列表 API
 * GET /api/knowledge-base/list
 */

import { NextResponse } from "next/server";
import { knowledgeBaseManager } from "@/lib/rag/knowledge-base-manager";

export async function GET() {
  try {
    const knowledgeBases = knowledgeBaseManager.getAllKnowledgeBases();
    return NextResponse.json({
      status: 1,
      message: "获取成功",
      data: knowledgeBases.map((kb) => ({
        id: kb.id,
        name: kb.name,
        fileCount: kb.files.length,
        createTime: kb.createTime,
        updateTime: kb.updateTime,
      })),
    });
  } catch (error: any) {
    console.error("获取知识库列表失败:", error);
    return NextResponse.json(
      {
        status: 0,
        message: "获取失败",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
