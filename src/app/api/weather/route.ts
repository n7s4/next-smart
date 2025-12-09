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
// 根据 SSE 规范，多行 data 应该每行都以 data: 开头
const formatSseData = (
  data: string | object,
  eventType: string = "message"
): string => {
  let dataString: string;
  if (typeof data === "string") {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  // 如果数据包含换行符，按照 SSE 规范，每行都应该以 data: 开头
  const lines = dataString.split("\n");
  const formattedData = lines.map((line) => `data: ${line}`).join("\n");

  return `event: ${eventType}\n${formattedData}\n\n`;
};

// 辅助函数：将内容拆分成小块进行流式输出
async function sendContentInChunks(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  content: string,
  chunkSize: number = 50, // 增大块大小，减少网络请求次数
  delayMs: number = 5 // 减少延迟，提升响应速度
): Promise<void> {
  if (!content || content.length === 0) return;

  // 如果内容很短，直接发送，不拆分
  if (content.length <= chunkSize) {
    controller.enqueue(encoder.encode(formatSseData(content, "stream")));
    return;
  }

  // 将内容拆分成小块
  for (let i = 0; i < content.length; i += chunkSize) {
    const chunk = content.substring(i, i + chunkSize);
    controller.enqueue(encoder.encode(formatSseData(chunk, "stream")));
    // 只在不是最后一块时添加延迟，最后一块立即发送
    if (i + chunkSize < content.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

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
      let lastSentContent = ""; // 跟踪已发送的内容

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
          for (const nodeName in chunk) {
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

            // 仅发送非空内容，并且只发送新增的部分
            if (content && typeof content === "string" && content.trim()) {
              // 检查是否是相同消息的增量更新
              if (
                lastSentContent &&
                content.startsWith(lastSentContent) &&
                content.length > lastSentContent.length
              ) {
                // 增量更新：只发送新增部分
                // LangGraph 的流式输出本身就是增量的，直接发送即可
                const newContent = content.substring(lastSentContent.length);
                if (newContent) {
                  // 直接发送增量部分，不拆分，保持 LangGraph 的原始流式特性
                  controller.enqueue(
                    encoder.encode(formatSseData(newContent, "stream"))
                  );
                  lastSentContent = content;
                }
              } else if (content !== lastSentContent) {
                // 全新的内容（可能是工具调用后的新回复，或者完全不同的消息）
                if (!lastSentContent || !content.includes(lastSentContent)) {
                  // 计算需要发送的新内容
                  let contentToSend = content;
                  if (lastSentContent && content.includes(lastSentContent)) {
                    // 如果新内容包含旧内容，只发送新增部分
                    const lastIndex = content.indexOf(lastSentContent);
                    if (lastIndex !== -1) {
                      contentToSend = content.substring(
                        lastIndex + lastSentContent.length
                      );
                    }
                  }

                  // 将内容拆分成小块进行流式输出
                  await sendContentInChunks(
                    controller,
                    encoder,
                    contentToSend,
                    50, // 每次发送50个字符
                    5 // 延迟5ms，提升响应速度
                  );
                  lastSentContent = content;
                } else {
                  // 新内容包含旧内容，但顺序不同，发送完整内容（流式）
                  await sendContentInChunks(
                    controller,
                    encoder,
                    content,
                    50,
                    5
                  );
                  lastSentContent = content;
                }
              }
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
