/**
 * 知识库问答 API (流式响应)
 * POST /api/knowledge-base/query
 */

import { NextRequest } from "next/server";
import { knowledgeBaseManager } from "@/lib/rag/knowledge-base-manager";
import { createLLM } from "@/lib/utils/index";
import { pull } from "langchain/hub";

export async function POST(request: NextRequest) {
  try {
    const { knowledgeBaseId, question } = await request.json();

    if (!knowledgeBaseId || !question) {
      return new Response(
        JSON.stringify({ error: "缺少必要参数：knowledgeBaseId 或 question" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始信号
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "start" })}\n\n`)
          );

          // 确保知识库已加载（懒加载）
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: "正在加载知识库...",
              })}\n\n`
            )
          );

          await knowledgeBaseManager.ensureVectorStoreLoaded(knowledgeBaseId);

          // 检索相似文档
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: "正在检索相关文档...",
              })}\n\n`
            )
          );

          const docs = await knowledgeBaseManager.searchSimilar(
            knowledgeBaseId,
            question,
            4
          );

          if (docs.length === 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "answer",
                  content: "抱歉，在知识库中没有找到与您问题相关的内容。",
                })}\n\n`
              )
            );
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
            controller.close();
            return;
          }

          // 发送检索到的文档来源
          const sources = docs.map((doc) => ({
            content: doc.pageContent.substring(0, 200) + "...",
            metadata: doc.metadata,
          }));

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "sources", sources })}\n\n`
            )
          );

          // 生成答案（流式）
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: "正在生成答案...",
              })}\n\n`
            )
          );

          const context = docs.map((doc) => doc.pageContent).join("\n");
          const promptTemplate = await pull("rlm/rag-prompt");
          const llm = createLLM({
            model: "deepseek-chat",
            temperature: 0.7,
          });

          const messages = await promptTemplate.invoke({
            question,
            context,
          });

          // 使用流式输出
          const streamResponse = await llm.stream(messages);

          for await (const chunk of streamResponse) {
            const content = chunk.content;
            if (content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "answer", content })}\n\n`
                )
              );
            }
          }

          // 发送结束信号
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (error: any) {
          console.error("流式查询失败:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: error.message || "查询失败",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("知识库查询失败:", error);
    return new Response(
      JSON.stringify({
        status: 0,
        message: "查询失败",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
