# 知识库 RAG 系统架构文档

## 📋 概述

本系统实现了基于 AlibabaTongyiEmbeddings 的多知识库 RAG（检索增强生成）功能，支持动态创建、切换和查询多个独立的知识库。

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                         前端层                               │
│  (startbox/page.tsx + upload/index.tsx)                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                         API 层                               │
│  • POST /api/knowledge-base/upload   (上传文件)             │
│  • GET  /api/knowledge-base/list     (获取列表)             │
│  • DELETE /api/knowledge-base/delete (删除知识库)           │
│  • POST /api/knowledge-base/query    (知识库问答)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   知识库管理器                               │
│        (knowledge-base-manager.ts)                          │
│  • 管理多个 VectorStore 实例                                │
│  • 文档加载与分割                                            │
│  • 向量化与检索                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     存储层                                   │
│  • 文件系统: uploads/knowledge-base/{id}/                   │
│  • 内存向量存储: MemoryVectorStore                          │
│  • 嵌入模型: AlibabaTongyiEmbeddings                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 核心组件

### 1. 知识库管理器 (KnowledgeBaseManager)

**位置**: `src/lib/rag/knowledge-base-manager.ts`

**功能**:

- ✅ 单例模式，全局唯一实例
- ✅ 管理多个知识库的向量存储
- ✅ 支持 PDF、DOCX、TXT、MD 等多种文档格式
- ✅ 自动文档分割（chunk size: 1000, overlap: 200）
- ✅ 使用 AlibabaTongyiEmbeddings 进行向量化
- ✅ 提供检索和问答能力

**主要方法**:

```typescript
// 创建知识库
createKnowledgeBase(id: string, name: string, files: File[]): Promise<void>

// 获取向量存储
getVectorStore(kbId: string): MemoryVectorStore | undefined

// 添加文档到现有知识库
addDocuments(kbId: string, files: File[]): Promise<void>

// 删除知识库
deleteKnowledgeBase(kbId: string): Promise<void>

// 检索相似文档
searchSimilar(kbId: string, query: string, k?: number): Promise<Document[]>

// 获取所有知识库列表
getAllKnowledgeBases(): KnowledgeBaseConfig[]
```

### 2. API 路由

#### 上传文件创建知识库

```
POST /api/knowledge-base/upload
Content-Type: multipart/form-data

Body:
- knowledgeBaseId: string
- knowledgeBaseName: string
- files: File[]

Response:
{
  status: 1,
  message: "知识库创建成功",
  data: {
    knowledgeBaseId: string,
    knowledgeBaseName: string,
    fileCount: number,
    files: string[]
  }
}
```

#### 查询知识库

```
POST /api/knowledge-base/query
Content-Type: application/json

Body:
{
  knowledgeBaseId: string,
  question: string
}

Response:
{
  status: 1,
  message: "查询成功",
  data: {
    answer: string,
    sources: Array<{
      content: string,
      metadata: any
    }>,
    context: string
  }
}
```

#### 删除知识库

```
DELETE /api/knowledge-base/delete?id={knowledgeBaseId}

Response:
{
  status: 1,
  message: "知识库已删除"
}
```

#### 获取知识库列表

```
GET /api/knowledge-base/list

Response:
{
  status: 1,
  message: "获取成功",
  data: Array<{
    id: string,
    name: string,
    fileCount: number,
    createTime: Date,
    updateTime: Date
  }>
}
```

### 3. 前端组件

#### StartBox 页面

**位置**: `src/app/startbox/page.tsx`

**功能**:

- 知识库列表展示
- 创建新知识库（带文件上传）
- 删除知识库（带确认）
- 切换知识库
- 实时问答（基于选中的知识库）
- 聊天记录管理（按知识库分组）

#### FileUpload 组件

**位置**: `src/components/upload/index.tsx`

**功能**:

- 支持拖拽上传
- 文件类型和大小校验
- 文件列表预览
- 不自动上传，由父组件统一处理

## 🔄 数据流程

### 创建知识库流程

```
1. 用户上传文件
   ↓
2. 前端收集文件列表 (UploadFile[])
   ↓
3. 点击"创建"按钮
   ↓
4. 构建 FormData，包含文件和元数据
   ↓
5. POST /api/knowledge-base/upload
   ↓
6. 服务器保存文件到磁盘
   ↓
7. KnowledgeBaseManager 处理文档
   - 加载文档内容
   - 分割文档（RecursiveCharacterTextSplitter）
   - 向量化（AlibabaTongyiEmbeddings）
   - 存储到 MemoryVectorStore
   ↓
8. 返回成功响应
   ↓
9. 前端更新状态，显示新知识库
```

### 查询流程

```
1. 用户在聊天框输入问题
   ↓
2. 前端发送请求
   POST /api/knowledge-base/query
   { knowledgeBaseId, question }
   ↓
3. 服务器获取对应的 VectorStore
   ↓
4. 执行相似度检索
   vectorStore.similaritySearch(question, k=4)
   ↓
5. 获取最相关的 4 个文档片段
   ↓
6. 构建上下文 (context)
   ↓
7. 调用 LLM 生成答案
   - 使用 RAG prompt template
   - 结合 context 和 question
   - 调用 DeepSeek Chat 模型
   ↓
8. 返回答案和来源
   ↓
9. 前端显示 AI 回复
```

### 切换知识库流程

```
1. 用户点击知识库列表中的某个知识库
   ↓
2. 更新 selectedKnowledge state
   ↓
3. 聊天记录自动过滤
   (只显示当前知识库的对话)
   ↓
4. 后续查询自动使用新的 knowledgeBaseId
   ↓
5. KnowledgeBaseManager 自动切换对应的 VectorStore
```

## 📁 文件存储结构

```
uploads/
└── knowledge-base/
    ├── {knowledgeBase1-id}/
    │   ├── document1.pdf
    │   ├── document2.docx
    │   └── document3.txt
    ├── {knowledgeBase2-id}/
    │   ├── file1.pdf
    │   └── file2.md
    └── ...
```

## 🎯 核心特性

### 1. 多知识库隔离

- 每个知识库有独立的 VectorStore
- 查询时仅在当前知识库中检索
- 不同知识库的聊天记录独立存储

### 2. 文档处理

- 支持多种格式：PDF、DOCX、TXT、MD
- 自动分割文档为 1000 字符的片段
- 片段之间有 200 字符的重叠（保证上下文连贯）

### 3. 向量化存储

- 使用阿里云通义千问的嵌入模型
- 存储在内存向量数据库（MemoryVectorStore）
- 支持快速相似度检索

### 4. RAG 检索增强

- 先检索最相关的文档片段
- 将片段作为上下文传递给 LLM
- 生成基于知识库的准确答案

## 🔧 配置说明

### 环境变量

确保设置以下环境变量：

```env
# 阿里云通义千问 API Key
ALIBABA_TONGYI_API_KEY=your_api_key

# DeepSeek API Key (用于 LLM)
DEEPSEEK_API_KEY=your_api_key
```

### 文档分割参数

在 `knowledge-base-manager.ts` 中可调整：

```typescript
this.textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000, // 每个片段的字符数
  chunkOverlap: 200, // 片段重叠字符数
});
```

### 检索参数

在查询时可指定返回的文档数量：

```typescript
// 默认返回 4 个最相关的文档
await knowledgeBaseManager.searchSimilar(kbId, query, 4);
```

## 🚀 使用示例

### 前端调用

```typescript
// 1. 创建知识库
const formData = new FormData();
formData.append("knowledgeBaseId", "kb-001");
formData.append("knowledgeBaseName", "技术文档");
formData.append("files", file1);
formData.append("files", file2);

const response = await fetch("/api/knowledge-base/upload", {
  method: "POST",
  body: formData,
});

// 2. 查询知识库
const result = await fetch("/api/knowledge-base/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    knowledgeBaseId: "kb-001",
    question: "什么是 React Hooks？",
  }),
});

// 3. 删除知识库
await fetch("/api/knowledge-base/delete?id=kb-001", {
  method: "DELETE",
});
```

## 🎨 优化建议

### 短期优化

- [ ] 添加文件上传进度条
- [ ] 支持批量删除知识库
- [ ] 添加知识库编辑功能（重命名、添加文档）
- [ ] 缓存常用查询结果

### 长期优化

- [ ] 使用 Chroma DB 等持久化向量数据库
- [ ] 支持更多文档格式（Excel、PPT 等）
- [ ] 实现知识库分享功能
- [ ] 添加文档预处理（去重、OCR 等）
- [ ] 支持流式输出答案
- [ ] 实现知识图谱可视化

## 📝 注意事项

1. **内存限制**: 当前使用 MemoryVectorStore，大量知识库会占用大量内存
2. **并发处理**: 文档处理是异步的，创建大型知识库需要时间
3. **API Key**: 需要配置阿里云和 DeepSeek 的 API Key
4. **文件大小**: 建议单个文件不超过 50MB
5. **中文支持**: 分词和嵌入模型都支持中文

## 🐛 故障排查

### 问题：向量化失败

- 检查 ALIBABA_TONGYI_API_KEY 是否正确
- 确认 API 配额是否充足

### 问题：查询无结果

- 确认知识库是否包含相关文档
- 尝试调整查询关键词
- 增加检索的文档数量（k 参数）

### 问题：上传失败

- 检查文件格式是否支持
- 确认文件大小是否超限
- 查看服务器日志

## 📚 相关文档

- [LangChain 文档](https://js.langchain.com/)
- [阿里云通义千问](https://help.aliyun.com/zh/dashscope/)
- [DeepSeek API](https://platform.deepseek.com/api-docs/)
