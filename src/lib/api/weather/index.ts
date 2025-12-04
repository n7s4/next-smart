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
    let currentChunk = "";

    // 处理 SSE 消息边界 (\n\n)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      currentChunk += decoder.decode(value, { stream: true });

      // 处理 SSE 消息边界
      const parts = currentChunk.split("\n\n");
      currentChunk = parts.pop() || ""; // 保留不完整的最后一个部分

      parts.forEach((part) => {
        // 解析 SSE 格式：event: xxx\ndata: xxx
        const lines = part.split("\n");
        let event = "message";
        let data = "";

        lines.forEach((line) => {
          if (line.startsWith("event: ")) {
            event = line.substring(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.substring(6).trim();
          }
        });

        if (data) {
          try {
            let content: string = "";

            // 尝试解析 JSON
            try {
              const parsed = JSON.parse(data);
              if (typeof parsed === "string") {
                content = parsed;
              } else if (parsed && typeof parsed === "object") {
                if (parsed.error) {
                  onError?.(parsed.error);
                  return;
                } else {
                  content = JSON.stringify(parsed);
                }
              } else {
                content = String(parsed || "");
              }
            } catch {
              // 不是 JSON，直接使用原始数据
              content = data;
            }

            if (event === "stream" && content) {
              onChunk(content);
            } else if (event === "end") {
              onComplete?.();
            } else if (event === "error") {
              onError?.(content);
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e, data);
          }
        }
      });
    }

    // 处理最后剩余的数据
    if (currentChunk.trim()) {
      const lines = currentChunk.split("\n");
      let data = "";
      lines.forEach((line) => {
        if (line.startsWith("data: ")) {
          data = line.substring(6).trim();
        }
      });
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed === "string") {
            onChunk(parsed);
          }
        } catch {
          if (data) {
            onChunk(data);
          }
        }
      }
    }

    onComplete?.();
  } catch (error) {
    console.error("Error fetching weather response:", error);
    onError?.(
      error instanceof Error ? error.message : "抱歉，发生了错误，请稍后再试。"
    );
  }
}
