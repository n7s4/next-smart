import { getTokenFromLocalStorage } from "@/lib/utils";

/**
 * @description 获取天气信息的流式响应
 * @param input 用户输入的问题
 * @param onChunk 接收到数据块时的回调函数
 * @param onError 发生错误时的回调函数
 * @param onComplete 完成时的回调函数
 * @param threadId 可选的线程ID，用于继续之前的对话
 * @returns Promise<void>
 */
export async function fetchWeatherStream(
  input: string,
  onChunk: (chunk: string) => void,
  onError?: (error: string) => void,
  onComplete?: () => void,
  threadId?: string
): Promise<void> {
  if (!input.trim()) {
    onError?.("输入不能为空");
    return;
  }

  try {
    const token = getTokenFromLocalStorage();
    const res = await fetch("/api/weather", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ input, threadId }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "请求失败");
    }

    if (!res.body) {
      throw new Error("无法读取流式数据");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // 处理 SSE 数据的辅助函数
    function processSSEData(event: string, data: string) {
      try {
        // 跳过不需要处理的事件
        if (event === "tool_call") {
          // 工具调用事件，跳过不处理
          return;
        }
        if (event === "end") {
          // 流结束事件，跳过
          return;
        }

        // 处理错误事件
        if (event === "error") {
          let errorMessage = "";
          try {
            const parsed = JSON.parse(data);
            errorMessage = parsed.error || parsed.message || data;
          } catch {
            errorMessage = data;
          }
          onError?.(errorMessage);
          return;
        }

        // 处理 stream 事件（主要的内容事件）
        if (event === "stream" || event === "message") {
          let content = "";

          // stream 事件的数据通常是纯文本，但可能被 JSON 编码
          // 首先尝试作为 JSON 解析（可能是被 JSON.stringify 编码的字符串）
          try {
            const parsed = JSON.parse(data);
            // 如果解析后是字符串，使用解析后的字符串
            if (typeof parsed === "string") {
              content = parsed;
            } else {
              // 如果是对象，尝试提取文本内容
              content = parsed.content || parsed.text || data;
            }
          } catch {
            // 不是 JSON，直接使用原始数据（纯文本，可能包含换行符）
            content = data;
          }

          // 只处理非空内容
          if (content && content.trim()) {
            console.log(
              `[SSE] Received ${event} event, content length: ${
                content.length
              }, preview: ${content.substring(0, 100)}...`
            );
            onChunk(content);
          }
          return;
        }

        // 其他未知事件类型，尝试作为文本内容处理
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed === "string") {
            onChunk(parsed);
          } else if (parsed && typeof parsed === "object" && parsed.error) {
            onError?.(parsed.error);
          }
        } catch {
          // 不是 JSON，尝试作为文本内容
          if (data && data.trim()) {
            onChunk(data);
          }
        }
      } catch (e) {
        console.error("Failed to parse SSE data:", e, { event, data });
      }
    }

    // 处理 SSE 消息边界 (\n\n)
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // 处理最后剩余的数据
        if (buffer.trim()) {
          const lines = buffer.split("\n");
          let event = "message";
          let data = "";
          let inDataBlock = false;

          lines.forEach((line) => {
            // 不 trim，保留原始格式
            if (line.startsWith("event: ")) {
              event = line.substring(7).trim();
              inDataBlock = false;
            } else if (line.startsWith("data: ")) {
              const dataValue = line.substring(6);
              if (data) {
                data += "\n" + dataValue;
              } else {
                data = dataValue;
              }
              inDataBlock = true;
            } else if (inDataBlock && !line.startsWith("event: ")) {
              // 多行 data 的延续
              data += "\n" + line;
            }
          });

          if (data) {
            processSSEData(event, data);
          }
        }
        break;
      }

      // 将新数据添加到缓冲区
      buffer += decoder.decode(value, { stream: true });

      // 处理完整的 SSE 消息（以 \n\n 分隔）
      const messages = buffer.split("\n\n");
      // 保留最后一个可能不完整的消息
      buffer = messages.pop() || "";

      // 处理每个完整的消息
      messages.forEach((message) => {
        if (!message.trim()) return;

        const lines = message.split("\n");
        let event = "message";
        let data = "";
        let inDataBlock = false;

        lines.forEach((line) => {
          // 不 trim，保留原始格式（data 内容可能包含前导空格）
          if (line.startsWith("event: ")) {
            event = line.substring(7).trim();
            inDataBlock = false;
          } else if (line.startsWith("data: ")) {
            // 处理多行 data（SSE 规范支持多行 data，每行都以 data: 开头）
            const dataValue = line.substring(6); // 保留原始内容，包括换行符
            if (data) {
              data += "\n" + dataValue;
            } else {
              data = dataValue;
            }
            inDataBlock = true;
          } else if (inDataBlock && line.trim() === "") {
            // 空行，可能是 data 内容的一部分，保留
            data += "\n";
          } else if (inDataBlock && !line.startsWith("event: ")) {
            // 如果已经在 data 块中，且不是新的事件，可能是多行 data 的延续
            // 根据 SSE 规范，多行 data 应该每行都有 data: 前缀
            // 但有些实现可能不遵循这个规范，这里兼容处理
            data += "\n" + line;
          }
        });

        if (data) {
          console.log(
            `[SSE] Processing event: ${event}, data length: ${
              data.length
            }, first 100 chars: ${data.substring(0, 100)}...`
          );
          processSSEData(event, data);
        }
      });
    }

    onComplete?.();
  } catch (error) {
    console.error("Error fetching weather response:", error);
    onError?.(
      error instanceof Error ? error.message : "抱歉，发生了错误，请稍后再试。"
    );
  }
}
