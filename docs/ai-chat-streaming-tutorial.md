# AI 对话流式传输全链路教程

本教程覆盖本项目中“前端 -> 后端 -> 大模型 -> 前端”的流式对话链路，包含三条主要对话路径：

- `gptchat`（羽说）：带工具调用的多轮对话
- `chat`：轻量多轮对话 + 系统提示词切换
- `aiassistant`：RAG 检索增强 + 流式输出

> 说明：本项目采用 Next.js App Router + 原生 `ReadableStream` 进行文本流传输，前端使用 `fetch` + `ReadableStreamDefaultReader` 实时消费。

---

## 1. 总体架构与流式协议

### 1.1 传输协议
- **后端输出**：`ReadableStream` + `Content-Type: text/plain; charset=utf-8`
- **前端消费**：`fetch` 获取 `res.body.getReader()`，通过 `TextDecoder` 逐块拼接
- **特点**：无需 SSE，直接以分块文本流形式传输（`Transfer-Encoding: chunked`）

### 1.2 关键代码位置
- 后端核心
  - `src/app/api/gptchat/route.ts`
  - `src/lib/chat.ts`
  - `src/app/api/chat/route.ts`
  - `src/lib/chatbot.ts`
  - `src/app/api/aiassistant/route.ts`
- 前端核心
  - `src/app/gptchat/page.tsx`
  - `src/app/chat/page.tsx`
  - `src/app/page.tsx`

---

## 2. gptchat（羽说）全链路流式流程

### 2.1 请求入口（前端）
- 文件：`src/app/gptchat/page.tsx`
- 发送消息：`POST /api/gptchat`
- 请求体：`{ userMessage, conversationId }`

前端流程概览：
1. 追加用户消息到本地 `messages`
2. 发起 `fetch('/api/gptchat')`
3. 如果是流式响应：
   - 创建空的 AI 消息占位
   - `reader.read()` 循环追加 chunk
   - 实时刷新最后一条 AI 消息内容

### 2.2 流式接口（后端）
- 文件：`src/app/api/gptchat/route.ts`
- 逻辑：
  - 校验参数
  - 调用 `processWithToolsStream`
  - 返回 `ReadableStream`

### 2.3 核心流式实现（带工具调用）
- 文件：`src/lib/chat.ts`
- 方法：`processWithToolsStream`

核心逻辑：
1. 准备消息上下文（系统提示 + 历史 + 用户输入）
2. 先进行工具调用判断：`modelWithTools.invoke`
3. 若无需工具调用：
   - 使用 `model.stream` 得到流式输出
   - `controller.enqueue` 持续写入 chunk
   - 完成后落库（用户消息已提前异步写入）
4. 若需要工具调用：
   - 执行工具（搜索/计算）
   - 将工具结果写回消息上下文
   - 进入下一轮迭代，直到可以输出最终回答

### 2.4 数据持久化
- 采用 `prisma.$executeRaw` 进行非阻塞写入
- 存储位置：`ChatMessage`、`Conversation`
- 设计意图：不阻塞流式输出

---

## 3. chat（轻量对话）流式流程

### 3.1 请求入口（前端）
- 文件：`src/app/chat/page.tsx`
- 发送消息：`POST /api/chat`
- 请求体：`{ message, systemPrompt, conversationId }`

前端流式消费逻辑与 `gptchat` 基本一致：
- `getReader()` 逐块读取
- 拼接 `botMessage` 并更新 UI

### 3.2 流式接口（后端）
- 文件：`src/app/api/chat/route.ts`
- 调用：`getChatResponseStream`

### 3.3 核心流式实现（无工具调用）
- 文件：`src/lib/chatbot.ts`
- 方法：`getChatResponseStream`

流程：
1. 拼接系统提示 + 历史对话 + 用户输入
2. 调用 `model.stream` 获取流
3. `TextEncoder` 输出 chunk
4. 完整响应结束后保存用户消息与 AI 回复

---

## 4. aiassistant（RAG 检索增强）流式流程

### 4.1 请求入口（前端）
- 文件：`src/app/page.tsx`
- 发送问题：`POST /api/aiassistant`
- 请求体：`{ question }`

### 4.2 流式接口（后端）
- 文件：`src/app/api/aiassistant/route.ts`
- 流程：
  - 使用向量检索 `vectorStore.similaritySearch`
  - 拼接检索结果到 prompt
  - 调用 `llm.stream` 逐块输出

此路径没有工具调用，但有检索增强逻辑。

---

## 5. 前端通用流式消费模式

三处页面采用一致的流式消费模板：

1. `fetch` 请求
2. `res.body.getReader()` 获取 reader
3. `TextDecoder` 解码 chunk
4. 拼接输出并更新 UI

此模式适用于：
- 文本流式输出
- 无需 SSE 的场景
- 服务端返回纯文本流

---

## 6. 常见问题与排查

### 6.1 为什么需要 `ReadableStream` 而不是 SSE？
- 本项目只传递纯文本输出，不需要 SSE 的事件机制
- 浏览器原生支持更轻量的文本分块流式传输

### 6.2 为什么要把用户消息先写入数据库？
- 提前落库保证数据完整性
- 使用非阻塞写入避免影响首屏响应

### 6.3 流式输出断了怎么办？
- 前端 `reader.read()` 结束时应当停更 UI
- 后端异常时会直接关闭流，前端需兜底提示

---

## 7. 推荐阅读的源码入口

- 流式对话主链路：`src/lib/chat.ts`
- 轻量对话流式：`src/lib/chatbot.ts`
- gptchat 前端页面：`src/app/gptchat/page.tsx`
- chat 前端页面：`src/app/chat/page.tsx`
- aiassistant 前端页面：`src/app/page.tsx`

---

## 8. 可选扩展方向

- 将流式协议升级为 SSE（适合多事件/状态输出）
- 添加“流式节流”与“输出速度控制”
- 引入队列 + 更细的工具调用过程可视化
- 输出 token 统计与耗时监控
