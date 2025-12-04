import { agentExecutor } from "@/lib/mcp/index";
import { NextRequest } from "next/server";
import { isAIMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import { randomUUID } from "crypto";

// 定义 sse 所需要的 headers
const SSE_HEADERS = {
  "Content-type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// 辅助函数：将数据格式转换为 SSE 标准
const formatSseData = (
  data: string | object,
  eventType: string = "message"
): string => {
  const dataString = typeof data === "string" ? data : JSON.stringify(data);
  return `event: ${eventType}\ndata: ${dataString}\n\n`;
};

export async function POST(req: NextRequest) {
  const { input, threadId } = await req.json();
  if (!input) {
    return new Response(
      JSON.stringify({ error: "Missing 'input' query parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 1. 创建 TextEncoder 用于编码流数据
  const encoder = new TextEncoder();

  // 2. 生成或使用传入的 thread_id（用于 checkpointer）
  const currentThreadId = threadId || randomUUID();

  // 3. 创建 ReadableStream
  const readableStream = new ReadableStream({
    async start(controller) {
      const inputs = { messages: [new HumanMessage(input)] }; // 用户输入应该使用 HumanMessage

      try {
        // 4. 调用 LangGraph 的 stream 接口，传入 config 包含 thread_id
        const stream = await agentExecutor.stream(inputs, {
          configurable: {
            thread_id: currentThreadId,
          },
        });

        // 5. 迭代流并推送到 SSE
        for await (const chunk of stream) {
          // 需要遍历所有节点来提取消息
          console.log("Received chunk node names:", Object.keys(chunk));
          for (const nodeName in chunk) {
            console.log(`Processing node: ${nodeName}`);
            const nodeState = chunk[nodeName];
            // 类型检查：确保 nodeState 是对象且有 messages 属性
            if (
              nodeState === null ||
              nodeState === undefined ||
              typeof nodeState !== "object" ||
              Array.isArray(nodeState) ||
              !("messages" in nodeState)
            ) {
              continue;
            }

            const messages = (nodeState as { messages: any[] }).messages;
            if (!Array.isArray(messages) || messages.length === 0) continue;

            // 获取最后一条消息
            const latestMessage = messages[messages.length - 1];
            console.log(
              `Latest message type: ${
                (latestMessage as any)?.type ||
                (latestMessage as any)?.id?.[2] ||
                "unknown"
              }`
            );

            // 处理 AI 消息的内容
            // 注意：消息可能是序列化的格式（lc, type, id, kwargs）或直接的 AIMessage 对象
            let content: string | undefined = undefined;

            // 检查是否是序列化的 LangChain 消息格式
            if (
              latestMessage &&
              typeof latestMessage === "object" &&
              "kwargs" in latestMessage &&
              latestMessage.kwargs &&
              typeof latestMessage.kwargs === "object" &&
              "content" in latestMessage.kwargs
            ) {
              // 序列化格式：从 kwargs.content 获取
              content = latestMessage.kwargs.content;
            } else if (latestMessage && isAIMessage(latestMessage)) {
              // 直接的消息对象：从 content 获取
              const msgContent = latestMessage.content;
              if (typeof msgContent === "string") {
                content = msgContent;
              } else if (Array.isArray(msgContent)) {
                content = msgContent
                  .map((item) => {
                    if (typeof item === "string") return item;
                    if (item && typeof item === "object" && "text" in item) {
                      return item.text;
                    }
                    return "";
                  })
                  .filter(Boolean)
                  .join("");
              } else {
                content = String(msgContent || "");
              }
            }

            // 处理 content 的类型
            if (content !== undefined) {
              // content 可能是字符串或数组
              if (Array.isArray(content)) {
                // 如果是数组，提取所有文本内容
                content = content
                  .map((item) => {
                    if (typeof item === "string") return item;
                    if (item && typeof item === "object" && "text" in item) {
                      return item.text;
                    }
                    return "";
                  })
                  .filter(Boolean)
                  .join("");
              } else if (typeof content !== "string") {
                // 如果不是字符串，尝试转换为字符串
                content = String(content || "");
              }
            } else {
              content = "";
            }

            // 仅发送非空内容
            if (content && typeof content === "string" && content.trim()) {
              console.log("Sending content length:", content.length);
              // 格式化为 SSE 格式，事件类型为 'stream'
              controller.enqueue(
                encoder.encode(formatSseData(content, "stream"))
              );
            }

            // 发送工具调用信息 (可选)
            // 检查工具调用（可能在 kwargs 中）
            const toolCalls =
              (latestMessage as any).tool_calls ||
              (latestMessage as any).kwargs?.tool_calls ||
              [];
            if (toolCalls && Array.isArray(toolCalls) && toolCalls.length) {
              controller.enqueue(
                encoder.encode(
                  formatSseData(
                    {
                      tool_calls: toolCalls,
                    },
                    "tool_call"
                  )
                )
              );
            }
          }
        }

        // 6. 传输完成后关闭流
        controller.enqueue(encoder.encode(formatSseData("DONE", "end")));
        controller.close();
      } catch (e) {
        console.error("LangGraph Streaming Error:", e);
        // 发生错误时发送错误信息并关闭流
        controller.enqueue(
          encoder.encode(formatSseData({ error: e.message }, "error"))
        );
        controller.close();
      }
    },
    // 处理客户端断开连接
    cancel(reason) {
      console.log("Client closed SSE connection:", reason);
    },
  });
  // 7. 返回 Response 对象，并设置 SSE Headers
  return new Response(readableStream, { headers: SSE_HEADERS });
}
