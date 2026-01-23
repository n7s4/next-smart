import { NextRequest, NextResponse } from "next/server";
import { processWithToolsStream } from "@/lib/chat";

// 设置 API 路由的超时时间（Next.js 默认是 10 秒，这里设置为 120 秒）
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { userMessage, conversationId } = await request.json();

  if (!userMessage || typeof userMessage !== "string") {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  try {
    // 使用流式处理
    const stream = await processWithToolsStream(userMessage, conversationId);

    // 返回流式响应
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Error processing the message", error);

    // 提供更详细的错误信息
    const errorMessage = error?.message || "Error processing the message";
    const isTimeout =
      errorMessage.includes("timeout") || errorMessage.includes("timed out");

    return NextResponse.json(
      {
        error: isTimeout ? "请求超时，请稍后重试" : errorMessage,
      },
      { status: isTimeout ? 408 : 500 }
    );
  }
}
