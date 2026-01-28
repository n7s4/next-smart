# 流式 RAG 实现指南

## 🎯 功能概述

本文档说明如何实现知识库 RAG 系统的流式输出功能，包括上传时的局部 loading 和 AI 回答的流式输出。

## ✨ 新增功能

### 1. 上传文件时的局部 Loading

**效果**：

- 上传知识库时显示处理进度提示
- Modal 对话框在处理期间不可关闭
- 表单输入框被禁用，防止误操作
- 显示"正在处理文档并进行向量化"的动态提示

**实现**：

```typescript
// 添加 loading 状态
const [isCreatingKb, setIsCreatingKb] = useState(false);

// 创建知识库时设置 loading
const handleCreateKnowledgeBase = async () => {
  setIsCreatingKb(true);
  try {
    // ... 上传逻辑
  } finally {
    setIsCreatingKb(false);
  }
};

// Modal 配置
<Modal
  confirmLoading={isCreatingKb} // 确定按钮显示 loading
  maskClosable={!isCreatingKb} // 禁止点击遮罩关闭
  closable={!isCreatingKb} // 禁止点击 X 关闭
>
  {isCreatingKb && (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent" />
        <p className="text-sm text-yellow-700">
          正在处理文档并进行向量化，请稍候...
        </p>
      </div>
    </div>
  )}
</Modal>;
```

**用户体验**：

1. 点击"创建"按钮后，按钮显示 loading 状态
2. 弹窗无法关闭，输入框被禁用
3. 显示黄色提示框，带旋转动画
4. 处理完成后自动关闭弹窗

### 2. AI 回答的流式输出

**效果**：

- AI 回答逐字逐句显示，类似 ChatGPT
- 显示实时状态（检索文档、生成答案）
- 流畅的打字机效果
- 支持长文本渐进式展示

**架构**：

```
前端发送请求
    ↓
后端创建 ReadableStream
    ↓
发送事件流 (Server-Sent Events)
    ├── start: 开始
    ├── status: 状态更新
    ├── sources: 文档来源
    ├── answer: 答案片段（多次）
    ├── done: 完成
    └── error: 错误
    ↓
前端逐步更新UI
```

## 🔧 后端实现

### API 路由 (`/api/knowledge-base/query/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  const { knowledgeBaseId, question } = await request.json();

  // 创建流式响应
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. 发送开始信号
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "start" })}\n\n`)
        );

        // 2. 发送状态：检索文档
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "status",
              message: "正在检索相关文档...",
            })}\n\n`
          )
        );

        // 3. 检索文档
        const docs = await knowledgeBaseManager.searchSimilar(
          knowledgeBaseId,
          question,
          4
        );

        // 4. 发送文档来源
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "sources", sources })}\n\n`
          )
        );

        // 5. 发送状态：生成答案
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "status",
              message: "正在生成答案...",
            })}\n\n`
          )
        );

        // 6. 流式生成答案
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

        // 7. 发送完成信号
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
        controller.close();
      } catch (error: any) {
        // 8. 发送错误信息
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: error.message,
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
}
```

### 事件类型说明

| 事件类型  | 说明     | 数据格式                              |
| --------- | -------- | ------------------------------------- |
| `start`   | 开始处理 | `{ type: "start" }`                   |
| `status`  | 状态更新 | `{ type: "status", message: string }` |
| `sources` | 文档来源 | `{ type: "sources", sources: Array }` |
| `answer`  | 答案片段 | `{ type: "answer", content: string }` |
| `done`    | 处理完成 | `{ type: "done" }`                    |
| `error`   | 发生错误 | `{ type: "error", message: string }`  |

## 🎨 前端实现

### 流式数据处理

```typescript
const handleSendMessage = async () => {
  // 1. 添加用户消息
  const userMsg: ChatMessage = {
    /* ... */
  };
  setChatMessages((prev) => [...prev, userMsg]);

  // 2. 添加空的 AI 消息
  const aiMsgId = Date.now().toString();
  const aiMsg: ChatMessage = {
    id: aiMsgId,
    content: "",
    sources: [],
    // ...
  };
  setChatMessages((prev) => [...prev, aiMsg]);

  // 3. 发送请求
  const response = await fetch("/api/knowledge-base/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ knowledgeBaseId, question }),
  });

  // 4. 读取流式响应
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 解码数据
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    // 处理每一行
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));

        switch (data.type) {
          case "start":
            // 显示开始状态
            break;

          case "status":
            // 更新状态信息
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, content: data.message } : msg
              )
            );
            break;

          case "sources":
            // 设置文档来源
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, sources: data.sources } : msg
              )
            );
            fullContent = "";
            break;

          case "answer":
            // 累积答案内容
            fullContent += data.content;
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, content: fullContent } : msg
              )
            );
            break;

          case "done":
            // 完成
            break;

          case "error":
            // 显示错误
            break;
        }
      }
    }
  }
};
```

### 打字机动画

在 AI 消息内容后添加闪烁光标：

```tsx
<p className="text-sm leading-relaxed whitespace-pre-wrap">
  {msg.content}
  {msg.type === "ai" &&
    msg.content &&
    !msg.content.includes("错误") &&
    msg.content.length < 10 && (
      <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
    )}
</p>
```

## 🌊 数据流示例

### 完整的流式数据

```
data: {"type":"start"}

data: {"type":"status","message":"正在检索相关文档..."}

data: {"type":"sources","sources":[{"content":"文档片段1...","metadata":{...}}]}

data: {"type":"status","message":"正在生成答案..."}

data: {"type":"answer","content":"根据"}

data: {"type":"answer","content":"知识"}

data: {"type":"answer","content":"库中"}

data: {"type":"answer","content":"的内"}

data: {"type":"answer","content":"容，"}

...

data: {"type":"done"}
```

### 前端累积效果

```
第1次更新: "根据"
第2次更新: "根据知识"
第3次更新: "根据知识库中"
第4次更新: "根据知识库中的内"
第5次更新: "根据知识库中的内容，"
...
```

## 🎯 关键技术点

### 1. Server-Sent Events (SSE)

使用 SSE 协议实现服务器向客户端的单向推送：

```typescript
// 响应头配置
{
  "Content-Type": "text/event-stream",    // SSE 协议
  "Cache-Control": "no-cache",            // 禁用缓存
  "Connection": "keep-alive"              // 保持连接
}
```

### 2. ReadableStream

使用 Web Streams API 创建可读流：

```typescript
const stream = new ReadableStream({
  async start(controller) {
    // 推送数据
    controller.enqueue(encoder.encode("data: ...\n\n"));

    // 关闭流
    controller.close();
  },
});
```

### 3. LLM 流式输出

使用 LangChain 的 `stream()` 方法：

```typescript
const streamResponse = await llm.stream(messages);

for await (const chunk of streamResponse) {
  // 处理每个 chunk
  console.log(chunk.content);
}
```

### 4. 前端流读取

使用 Fetch API 的 ReadableStream：

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value, { stream: true });
  // 处理文本
}
```

## 🐛 常见问题

### 问题 1: 流式数据不显示

**原因**:

- 响应头配置错误
- 数据格式不符合 SSE 规范

**解决**:

```typescript
// 确保正确的响应头
"Content-Type": "text/event-stream"

// 确保正确的数据格式
"data: {...}\n\n"  // 注意两个换行符
```

### 问题 2: 中文乱码

**原因**: 编码问题

**解决**:

```typescript
// 使用 UTF-8 编解码
const encoder = new TextEncoder();
const decoder = new TextDecoder();
```

### 问题 3: 流中断

**原因**:

- 网络超时
- 错误未捕获

**解决**:

```typescript
// 捕获错误并关闭流
try {
  // 流式处理
} catch (error) {
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: "error" })}\n\n`)
  );
  controller.close();
}
```

### 问题 4: 内容闪烁

**原因**: 频繁更新导致重渲染

**解决**:

```typescript
// 使用 whitespace-pre-wrap 保持格式
<p className="whitespace-pre-wrap">{msg.content}</p>
```

## 🚀 性能优化

### 1. 批量发送

不要每个字符都发送一次：

```typescript
// ❌ 不好的做法
for (const char of text) {
  controller.enqueue(encoder.encode(`data: ${char}\n\n`));
}

// ✅ 好的做法
const chunks = text.match(/.{1,10}/g) || [];
for (const chunk of chunks) {
  controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
}
```

### 2. 缓冲处理

使用缓冲区处理不完整的行：

```typescript
let buffer = "";

for (const chunk of chunks) {
  buffer += chunk;
  const lines = buffer.split("\n\n");
  buffer = lines.pop() || "";

  // 处理完整的行
  for (const line of lines) {
    // ...
  }
}
```

### 3. 节流更新

限制 UI 更新频率：

```typescript
// 使用 requestAnimationFrame
let pending = false;

function updateUI(content: string) {
  if (pending) return;

  pending = true;
  requestAnimationFrame(() => {
    setChatMessages(/* ... */);
    pending = false;
  });
}
```

## 📝 最佳实践

1. **错误处理**: 始终捕获并处理流中的错误
2. **状态反馈**: 及时向用户展示处理状态
3. **优雅降级**: 流式失败时回退到普通请求
4. **超时控制**: 设置合理的超时时间
5. **内存管理**: 及时清理大量累积的数据

## 📚 参考资源

- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Streams API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [LangChain Streaming](https://js.langchain.com/docs/expression_language/streaming)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

## 🎉 总结

通过实现流式输出，我们实现了：

✅ **更好的用户体验**

- 实时反馈，减少等待焦虑
- 打字机效果，更自然的交互
- 状态提示，清晰的进度展示

✅ **更高的性能**

- 首字节时间更短
- 渐进式渲染
- 更好的资源利用

✅ **更强的可靠性**

- 支持长时间处理
- 错误及时反馈
- 优雅的降级处理
