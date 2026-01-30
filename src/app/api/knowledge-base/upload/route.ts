/**
 * 知识库文件上传 API
 * POST /api/knowledge-base/upload
 */

import { NextRequest, NextResponse } from "next/server";
import { knowledgeBaseManager } from "@/lib/rag/knowledge-base-manager";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const knowledgeBaseId = formData.get("knowledgeBaseId") as string;
    const knowledgeBaseName = formData.get("knowledgeBaseName") as string;
    const files = formData.getAll("files") as File[];

    if (!knowledgeBaseId || !knowledgeBaseName) {
      return NextResponse.json(
        { error: "缺少必要参数：knowledgeBaseId 或 knowledgeBaseName" },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "请至少上传一个文件" },
        { status: 400 }
      );
    }

    // 创建上传目录
    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      "knowledge-base",
      knowledgeBaseId
    );
    await mkdir(uploadDir, { recursive: true });

    // 保存文件到磁盘
    const savedFiles: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filePath = path.join(uploadDir, file.name);
      await writeFile(filePath, buffer);
      savedFiles.push(filePath);
    }

    // 确保管理器已初始化
    await knowledgeBaseManager.ensureInitialized();

    // 创建知识库并向量化文档
    await knowledgeBaseManager.createKnowledgeBase(
      knowledgeBaseId,
      knowledgeBaseName,
      savedFiles
    );

    return NextResponse.json({
      status: 1,
      message: "知识库创建成功",
      data: {
        knowledgeBaseId,
        knowledgeBaseName,
        fileCount: files.length,
        files: files.map((f) => f.name),
      },
    });
  } catch (error: any) {
    console.error("知识库上传失败:", error);
    return NextResponse.json(
      {
        status: 0,
        message: "知识库上传失败",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
