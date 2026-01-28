/**
 * 删除知识库 API
 * DELETE /api/knowledge-base/delete
 */

import { NextRequest, NextResponse } from "next/server";
import { knowledgeBaseManager } from "@/lib/rag/knowledge-base-manager";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const knowledgeBaseId = searchParams.get("id");

    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: "缺少参数：id" },
        { status: 400 }
      );
    }

    await knowledgeBaseManager.deleteKnowledgeBase(knowledgeBaseId);

    return NextResponse.json({
      status: 1,
      message: "知识库已删除",
    });
  } catch (error: any) {
    console.error("删除知识库失败:", error);
    return NextResponse.json(
      {
        status: 0,
        message: "删除失败",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
