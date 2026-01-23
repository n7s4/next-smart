# GPT Chat 消息历史持久化技术方案深度解析

## 1. 概述 (System Overview)
本方案旨在为 `gptchat` (羽说) 页面提供完整的会话管理与消息持久化功能。通过结合 Next.js 的流式响应 (Streaming)、LangChain 的对话链管理、以及 Prisma ORM 对 SQLite 数据库的操作，实现了一个高性能、低延迟且具备状态恢复能力的对话系统。

### 技术栈
- **框架**: Next.js 14+ (App Router)
- **AI 编排**: LangChain.js
- **模型**: DeepSeek-V3 (通过 ChatDeepSeek 接入)
- **数据库**: SQLite (轻量级，适合本地/中小型应用)
- **ORM**: Prisma
- **UI 组件**: Ant Design + Tailwind CSS

---

## 2. 数据架构 (Data Schema)
在 `prisma/schema.prisma` 中定义了三个核心模型，用于支撑对话系统：

### 2.1 会话表 (Conversation)
存储对话的容器信息。
- `conversationId`: 唯一标识 (UUID)，由前端生成或后端分配。
- `title`: 会话标题，目前取首条消息的前 30 个字符。
- `pinned`: 布尔值，用于固定重要对话在列表顶部。
- `updatedAt`: 每次有新消息产生时更新，用于列表排序。

### 2.2 消息表 (ChatMessage)
存储每一条具体的对话。
- `role`: 角色标识，`user` (用户) 或 `bot` (机器人)。
- `content`: 消息文本内容。
- `conversationId`: 外键，关联所属会话。
- `createdAt`: 消息产生时间。

### 2.3 用户表 (User)
- 当前预留 `userId` 字段，支持未来多用户系统的权限隔离。

---

## 3. 全链路交互流程 (Request Lifecycle)

### 3.1 消息发送与流式保存 (Frontend -> API -> DB)
1. **标识分配**: 前端初始化时生成一个 `conversationId`。
2. **异步入库 (User)**: 
   - 后端 `lib/chat.ts` 收到请求后，**立即**触发一个 `prisma.$executeRaw` 操作保存用户消息。
   - 此操作使用 `.catch()` 捕获错误，确保数据库偶发故障不阻塞 AI 响应。
3. **流式生成 (AI)**:
   - LangChain 进入循环，检查是否需要调用工具 (Tools)。
   - 工具调用过程（如搜索、计算）在后台完成，不直接对前端流式输出，直到获得最终文本建议。
4. **流式输出 (Streaming)**:
   - 最终文本通过 `ReadableStream` 逐块 (Chunk) 发送给前端。
5. **异步入库 (Bot & Metadata)**:
   - 流式传输**结束**后，后端将完整的 AI 回复存入 `ChatMessage`。
   - 同时，使用 `INSERT OR IGNORE` 确保 `Conversation` 记录存在，并更新 `updatedAt`。

### 3.2 会话列表加载与切换
1. **列表拉取**: 侧边栏通过 `GET /api/gptchat/conversations` 获取所有记录。
2. **缓存策略**: 前端使用 `useCallback` 包装的 `fetchConversations`，在发送成功、删除会话或页面初始化时调用。
3. **状态恢复**: 点击历史会话时，前端更新 `conversationId` 并调用 `GET /api/gptchat/messages`。消息按 `createdAt` 正序排列，恢复对话语境。

---

## 4. 关键实现细节 (Implementation Details)

### 4.1 高性能持久化技巧
为了不影响 AI 响应的流畅度，我们避免了在流式传输过程中频繁使用 `await` 等待数据库写入。
- **Fire-and-forget**: 对于用户消息，采用非阻塞的异步写入。
- **Raw SQL**: 使用 `$executeRaw` 进行关键路径的插入，减少 ORM 对象的实例化开销。

### 4.2 侧边栏 UI 与操作
- **实时刷新**: 每次对话完成，侧边栏列表会自动重新获取，将最新对话推至顶端。
- **删除事务**: 删除操作在 `/api/gptchat/conversations` 中通过 `prisma.$transaction` 完成，确保消息数据不会成为“孤儿”数据。
- **平滑动画**: 结合 Tailwind 的 `animate-in` 类，使历史记录的加载和删除具有良好的视觉反馈。

### 4.3 工具调用 (Agentic Workflow)
- 后端逻辑支持最多 5 次迭代。如果 AI 认为需要搜索，它会先调用工具，将结果反馈给模型，最后才将整合后的答案流式输出。

---

## 5. API 接口定义

### 5.1 POST `/api/gptchat`
- **入参**: `{ userMessage: string, conversationId: string }`
- **返回**: `ReadableStream` (文本流)

### 5.2 GET `/api/gptchat/conversations`
- **返回**: `{ conversations: Conversation[] }`
- **排序规则**: `pinned DESC, updatedAt DESC`

### 5.3 DELETE `/api/gptchat/conversations`
- **入参**: `?conversationId=...`
- **逻辑**: 删除所有关联消息 + 删除会话元数据。

### 5.4 GET `/api/gptchat/messages`
- **入参**: `?conversationId=...`
- **返回**: `{ messages: ChatMessage[] }`

---

## 6. 未来优化建议 (Future Improvements)
1. **自动摘要标题**: 使用大模型对对话内容进行总结，生成比“首句截取”更有意义的会话标题。
2. **消息分页**: 当单次会话消息超过 50 条时，加载历史消息应支持分页（Load More）。
3. **全文搜索**: 在侧边栏增加搜索框，通过 SQL `LIKE` 或全文索引在历史对话中检索关键词。
4. **多模态支持**: 支持保存图片、文件等附件的元数据。
