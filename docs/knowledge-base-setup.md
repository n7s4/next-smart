# 知识库 RAG 系统 - 快速开始

## 📦 安装依赖

确保已安装所需的 npm 包：

```bash
pnpm install
```

主要依赖：

- `langchain` - LangChain 核心库
- `@langchain/community` - 社区集成（文档加载器、嵌入模型等）
- `@langchain/langgraph` - 工作流编排
- `@langchain/textsplitters` - 文本分割器

## 🔑 配置环境变量

创建 `.env.local` 文件（或修改现有的 `.env` 文件），添加以下配置：

```env
# 阿里云通义千问 API Key (必需)
ALIBABA_TONGYI_API_KEY=sk-your-tongyi-api-key

# DeepSeek API Key (必需)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# 数据库
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### 获取 API Key

1. **阿里云通义千问**:

   - 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
   - 创建应用并获取 API Key
   - 用于文档向量化（嵌入）

2. **DeepSeek**:
   - 访问 [DeepSeek 平台](https://platform.deepseek.com/)
   - 注册并获取 API Key
   - 用于 LLM 对话生成

## 🚀 初始化系统

### 1. 创建必要的目录

运行初始化脚本：

```bash
npx tsx scripts/init-knowledge-base.ts
```

这将创建：

- `uploads/` - 文件上传根目录
- `uploads/knowledge-base/` - 知识库文件存储目录

### 2. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000/startbox` 查看知识库页面。

## 📚 使用指南

### 创建知识库

1. 点击左侧边栏的"新建知识库"按钮
2. 输入知识库名称
3. 上传文档文件（支持 PDF、DOCX、TXT、MD）
4. 点击"创建"按钮
5. 等待文档处理完成（会显示加载提示）

### 切换知识库

- 在左侧边栏点击任意知识库即可切换
- 聊天记录会自动过滤为当前知识库的对话
- 查询会在当前选中的知识库中检索

### 提问与对话

1. 在底部输入框输入问题
2. 按 Enter 发送（Shift+Enter 换行）
3. AI 会基于当前知识库的文档内容回答
4. 答案会显示引用来源

### 删除知识库

1. 鼠标悬停在知识库列表项
2. 点击出现的删除图标
3. 确认删除

## 🧪 测试功能

运行测试脚本验证功能是否正常：

```bash
npx tsx src/lib/rag/test-knowledge-base.ts
```

测试内容包括：

- 创建知识库
- 获取配置
- 文档检索
- 获取列表
- 删除知识库

## 📂 项目结构

```
src/
├── app/
│   ├── startbox/
│   │   └── page.tsx              # 知识库主页面
│   └── api/
│       └── knowledge-base/       # API 路由
│           ├── upload/           # 上传文件
│           ├── list/             # 获取列表
│           ├── delete/           # 删除知识库
│           └── query/            # 查询问答
├── components/
│   └── upload/
│       └── index.tsx             # 文件上传组件
├── lib/
│   └── rag/
│       ├── knowledge-base-manager.ts  # 知识库管理器
│       ├── index.ts                   # 原始 RAG 实现
│       └── test-knowledge-base.ts     # 测试脚本
└── types/
    └── knowledge-base.ts         # 类型定义

uploads/
└── knowledge-base/               # 知识库文件存储
    ├── {kb-id-1}/
    │   ├── doc1.pdf
    │   └── doc2.docx
    └── {kb-id-2}/
        └── file.txt
```

## 🔧 API 接口

### 1. 上传文件创建知识库

```http
POST /api/knowledge-base/upload
Content-Type: multipart/form-data

knowledgeBaseId: string
knowledgeBaseName: string
files: File[]
```

### 2. 获取知识库列表

```http
GET /api/knowledge-base/list
```

### 3. 删除知识库

```http
DELETE /api/knowledge-base/delete?id={knowledgeBaseId}
```

### 4. 查询知识库

```http
POST /api/knowledge-base/query
Content-Type: application/json

{
  "knowledgeBaseId": "kb-123",
  "question": "你的问题"
}
```

## 🎯 核心功能

### 文档处理流程

```
上传文件
  ↓
保存到磁盘 (uploads/knowledge-base/{id}/)
  ↓
加载文档 (PDFLoader, DocxLoader, TextLoader)
  ↓
分割文档 (RecursiveCharacterTextSplitter)
  - chunkSize: 1000
  - chunkOverlap: 200
  ↓
向量化 (AlibabaTongyiEmbeddings)
  ↓
存储 (MemoryVectorStore)
```

### 查询流程

```
用户提问
  ↓
向量化问题 (AlibabaTongyiEmbeddings)
  ↓
相似度检索 (vectorStore.similaritySearch)
  ↓
获取最相关的 4 个文档片段
  ↓
构建提示词 (RAG Prompt Template)
  ↓
调用 LLM (DeepSeek Chat)
  ↓
返回答案 + 引用来源
```

## ⚙️ 配置参数

### 文档分割

在 `knowledge-base-manager.ts` 中修改：

```typescript
this.textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000, // 每个片段字符数
  chunkOverlap: 200, // 片段重叠字符数
});
```

### 检索数量

在查询时指定 `k` 参数：

```typescript
await knowledgeBaseManager.searchSimilar(kbId, query, 4); // 返回 4 个结果
```

### LLM 参数

在 `query/route.ts` 中修改：

```typescript
const llm = createLLM({
  model: "deepseek-chat",
  temperature: 0.7, // 调整创造性 (0-1)
});
```

## 🐛 常见问题

### 1. 向量化失败

**症状**: 创建知识库时提示"向量化失败"

**解决方案**:

- 检查 `ALIBABA_TONGYI_API_KEY` 是否正确配置
- 确认 API Key 有效且有足够配额
- 查看控制台错误日志

### 2. 查询无结果

**症状**: 提问后没有找到相关内容

**解决方案**:

- 确认知识库包含相关文档
- 尝试用不同的关键词提问
- 增加检索的文档数量 (k 参数)
- 检查文档是否成功向量化

### 3. 上传失败

**症状**: 文件上传时提示失败

**解决方案**:

- 确认文件格式是否支持 (PDF, DOCX, TXT, MD)
- 检查文件大小是否超过限制 (默认 50MB)
- 确认 `uploads/knowledge-base/` 目录存在且有写入权限
- 查看服务器日志了解详细错误

### 4. 内存占用高

**症状**: 创建多个知识库后内存占用过高

**解决方案**:

- 当前使用 MemoryVectorStore，所有数据在内存中
- 对于生产环境，建议使用持久化向量数据库：
  - Chroma DB
  - Pinecone
  - Weaviate
  - Milvus

### 5. LLM 响应慢

**症状**: 查询等待时间长

**解决方案**:

- 检查网络连接
- 考虑使用流式输出
- 优化提示词长度
- 减少检索的文档数量

## 📊 性能优化建议

### 短期优化

1. **添加缓存**

   - 缓存常见问题的答案
   - 使用 Redis 缓存向量查询结果

2. **并发控制**

   - 限制同时处理的上传任务
   - 使用队列处理文档

3. **进度反馈**
   - 添加文件上传进度条
   - 显示文档处理状态

### 长期优化

1. **使用持久化向量数据库**

   ```typescript
   import { Chroma } from "@langchain/community/vectorstores/chroma";

   const vectorStore = await Chroma.fromDocuments(docs, embeddings, {
     collectionName: kbId,
     url: "http://localhost:8000",
   });
   ```

2. **实现流式输出**

   ```typescript
   const stream = await llm.stream(messages);
   for await (const chunk of stream) {
     // 逐步返回结果
   }
   ```

3. **添加文档预处理**
   - OCR 识别图片文字
   - 清理无用内容
   - 提取关键信息

## 🔐 安全建议

1. **API Key 保护**

   - 永远不要将 API Key 提交到代码仓库
   - 使用环境变量管理敏感信息

2. **文件验证**

   - 严格校验文件类型
   - 限制文件大小
   - 扫描恶意内容

3. **访问控制**
   - 实现用户认证
   - 知识库权限管理
   - API 限流

## 📝 开发计划

- [ ] 支持更多文档格式 (Excel, PPT, HTML)
- [ ] 实现知识库分享功能
- [ ] 添加文档预览
- [ ] 支持多语言
- [ ] 实现知识图谱可视化
- [ ] 添加数据统计和分析
- [ ] 支持批量操作

## 📞 获取帮助

如遇到问题，请：

1. 查看文档: `docs/knowledge-base-rag.md`
2. 运行测试: `npx tsx src/lib/rag/test-knowledge-base.ts`
3. 查看日志: 检查控制台输出
4. 检查配置: 确认环境变量正确

## 📄 许可证

MIT
