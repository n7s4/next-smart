# 自定义消息存储扩展教程

本教程将指导你如何在现有项目中新建一套独立的消息存储系统。无论你是想增加“专家咨询”、“文档助手”还是其他垂直领域的对话，都可以遵循以下步骤。

---

## 第一步：更新数据库模型 (Prisma Schema)

首先，你需要在 `prisma/schema.prisma` 中定义新的数据模型。

### 1. 定义新模型
假设我们要增加一个名为 `ExpertConsult` (专家咨询) 的功能：

```prisma
// 专家咨询会话元数据
model ExpertConversation {
  id             String   @id @default(uuid())
  title          String?
  category       String?  // 业务特有字段：咨询分类
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  messages       ExpertMessage[]
}

// 专家咨询具体消息
model ExpertMessage {
  id             Int      @id @default(autoincrement())
  role           String   // 'user' 或 'assistant'
  content        String
  conversationId String
  conversation   ExpertConversation @relation(fields: [conversationId], references: [id])
  createdAt      DateTime @default(now())
}
```

### 2. 执行数据库迁移
在终端运行以下命令，让修改在 SQLite 数据库中生效：

```bash
npx prisma migrate dev --name add_expert_consult_models
# 或者如果你只是本地开发，可以使用
npx prisma db push
```

---

## 第二步：创建后端 API 路由

建议在 `src/app/api/` 下新建一个文件夹（如 `expert-chat`），模仿 `gptchat` 的结构：

### 1. 创建流式对话接口 (`api/expert-chat/route.ts`)
参考 `src/app/api/gptchat/route.ts`，调用你自定义的处理逻辑。

### 2. 创建管理接口 (`api/expert-chat/conversations/route.ts`)
实现获取列表和删除的逻辑。

```typescript
// 示例：获取列表
export async function GET() {
  const list = await prisma.expertConversation.findMany({
    orderBy: { updatedAt: 'desc' }
  });
  return NextResponse.json(list);
}
```

---

## 第三步：编写业务逻辑 (Library Logic)

在 `src/lib/` 下创建一个新的逻辑文件（如 `expert-logic.ts`），并实现入库逻辑。

**核心入库代码示例：**

```typescript
// 保存消息的函数
async function saveMessage(cid: string, role: string, content: string) {
  return await prisma.expertMessage.create({
    data: {
      conversationId: cid,
      role: role,
      content: content,
    }
  });
}

// 在流式处理中使用
const stream = new ReadableStream({
  async start(controller) {
    // 1. 保存用户消息
    await saveMessage(cid, 'user', input);
    
    // ... AI 生成逻辑 ...
    
    // 2. 保存 AI 消息
    await saveMessage(cid, 'assistant', fullAiResponse);
    
    // 3. 更新会话更新时间
    await prisma.expertConversation.update({
      where: { id: cid },
      data: { updatedAt: new Date() }
    });
  }
});
```

---

## 第四步：前端集成 (Frontend)

在你的新页面组件中，管理 `conversationId` 状态。

### 1. 状态管理
```tsx
const [cid, setCid] = useState<string>(crypto.randomUUID());
const [messages, setMessages] = useState<any[]>([]);
```

### 2. 生命周期加载
```tsx
// 切换对话时加载历史
useEffect(() => {
  const loadHistory = async () => {
    const res = await fetch(`/api/expert-chat/messages?cid=${cid}`);
    const data = await res.json();
    setMessages(data.map(m => ({
      role: m.role,
      content: m.content
    })));
  };
  loadHistory();
}, [cid]);
```

---

## 关键避坑指南

1.  **ID 类型一致性**：如果你在 `Conversation` 中使用 `String` 类型的 `conversationId` (UUID)，请确保在 `Message` 表中关联的字段也是 `String` 类型。
2.  **异步陷阱**：保存消息时如果不使用 `await`，请确保有 `.catch()` 处理，防止数据库报错导致 Node.js 进程崩溃。
3.  **Prisma 客户端刷新**：修改完 `schema.prisma` 后，如果 IDE 报错找不到新模型，请运行 `npx prisma generate`。
4.  **事务处理**：删除会话时，一定要使用 `prisma.$transaction` 同时删除 `Message` 和 `Conversation` 记录，否则会产生脏数据。

---

## 总结

新建存储系统的模式是固定的：
**Schema 定义 -> 数据库迁移 -> API 路由 -> Lib 入库逻辑 -> 前端状态绑定**。

你可以直接复制 `src/app/api/gptchat` 下的代码作为模板进行重命名和微调。
