import { clearChatHistory } from "@/lib/chatbot";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const conversationId: string | undefined = body?.conversationId;
  try {
    clearChatHistory();
    if (conversationId) {
      try {
        await prisma.$executeRaw`DELETE FROM ChatMessage WHERE conversationId = ${conversationId}`;
      } catch (e) {
        // 仅记录日志，不阻塞清空内存
        console.error("Failed to delete chat messages:", e);
      }
    }
    return NextResponse.json(
      { message: "Chat history cleared" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
