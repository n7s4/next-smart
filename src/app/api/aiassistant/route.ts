import { vectorStore, llm, promptTemplate } from "@/lib/rag/index";
import { NextRequest } from "next/server";

/**
 * POST /api/aiassistant - 智能助手
 * @param request
 * @returns {Promise<Response>}
 */
export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "问题不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 直接使用 vectorStore 检索相关文档（相当于执行 retrieve 节点）
    const context = await vectorStore.similaritySearch(question);

    if (!context || !Array.isArray(context) || context.length === 0) {
      throw new Error("无法获取相关文档");
    }

    // 准备 prompt
    const docsContent = context.map((doc: any) => doc.pageContent).join("\n");
    const messages = await promptTemplate.invoke({
      question,
      context: docsContent,
    });

    // 使用 LLM 的流式方法实现真正的逐字符流式输出
    const llmStream = await llm.stream(messages);

    // 将 LLM 的流转换为 ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of llmStream) {
            // chunk 是 AIMessageChunk，包含 content 字段
            const content = chunk.content;
            if (content && typeof content === "string") {
              // 逐字符发送，实现真正的流式输出
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
