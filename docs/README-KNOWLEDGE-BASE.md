# 🧠 星盒 RAG - 智能知识库系统

基于 AlibabaTongyiEmbeddings 和 LangChain 的多知识库 RAG（检索增强生成）系统。

## ✨ 核心特性

- 🚀 **多知识库管理** - 支持创建、切换、删除多个独立知识库
- 📚 **多格式支持** - PDF、DOCX、TXT、MD 等多种文档格式
- 🔍 **智能检索** - 基于向量相似度的文档检索
- 💬 **上下文问答** - 基于知识库内容的精准回答
- 🎯 **实时切换** - 无缝切换不同知识库进行查询
- 📊 **来源追溯** - 显示答案的文档来源
- 🎨 **现代 UI** - 美观的用户界面和交互体验
- ⚡ **流式输出** - AI 回答逐字显示，类似 ChatGPT
- 🔄 **智能 Loading** - 上传和查询时的实时状态反馈

## 📸 功能演示

```
┌─────────────────────────────────────────────────────────┐
│  📚 知识库列表    │   💬 聊天区域    │  📊 分析面板  │
│                   │                  │                │
│  ✓ 2026Q1市场调研 │  [AI 回复]       │  高频关键词    │
│  ○ 技术文档索引   │  [用户提问]      │  知识图谱      │
│  ○ HR 政策解读    │  [AI 回复]       │  Token 使用    │
│                   │                  │                │
│  [+ 新建知识库]   │  [输入框...]     │                │
└─────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
# 阿里云通义千问 API Key (必需)
ALIBABA_TONGYI_API_KEY=sk-your-api-key

# DeepSeek API Key (必需)
DEEPSEEK_API_KEY=sk-your-api-key
```

### 3. 初始化知识库目录

```bash
pnpm kb:init
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000/startbox

## 📖 使用指南

### 创建知识库

1. 点击左侧"新建知识库"按钮
2. 输入知识库名称（如："产品文档"）
3. 上传文档文件
4. 点击"创建"按钮
5. 等待文档向量化完成

### 查询知识库

1. 在左侧列表选择要查询的知识库
2. 在底部输入框输入问题
3. 按 Enter 发送（Shift+Enter 换行）
4. 查看 AI 基于知识库生成的回答

### 管理知识库

- **切换**: 点击列表中的知识库即可切换
- **删除**: 鼠标悬停显示删除按钮，点击确认删除
- **查看**: 显示文件数量和创建时间

## 🏗️ 技术架构

```
前端 (React + Next.js + Ant Design)
    ↓
API 层 (/api/knowledge-base/*)
    ↓
知识库管理器 (KnowledgeBaseManager)
    ↓
LangChain 处理层
    ├── 文档加载 (PDFLoader, DocxLoader)
    ├── 文本分割 (RecursiveCharacterTextSplitter)
    ├── 向量化 (AlibabaTongyiEmbeddings)
    └── 存储检索 (MemoryVectorStore)
    ↓
LLM 生成 (DeepSeek Chat)
```

## 📁 项目结构

```
src/
├── app/
│   ├── startbox/page.tsx              # 知识库主页面
│   └── api/knowledge-base/            # API 路由
│       ├── upload/route.ts            # 上传文件
│       ├── list/route.ts              # 获取列表
│       ├── delete/route.ts            # 删除知识库
│       └── query/route.ts             # 查询问答
├── components/
│   └── upload/index.tsx               # 文件上传组件
├── lib/
│   └── rag/
│       ├── knowledge-base-manager.ts  # 核心管理器
│       └── test-knowledge-base.ts     # 测试脚本
└── types/
    └── knowledge-base.ts              # 类型定义

uploads/knowledge-base/                # 文件存储
docs/                                  # 文档
scripts/                               # 脚本工具
```

## 🔌 API 接口

### 上传文件创建知识库

```http
POST /api/knowledge-base/upload
Content-Type: multipart/form-data

{
  knowledgeBaseId: string
  knowledgeBaseName: string
  files: File[]
}
```

### 查询知识库

```http
POST /api/knowledge-base/query
Content-Type: application/json

{
  "knowledgeBaseId": "kb-123",
  "question": "你的问题"
}
```

### 获取知识库列表

```http
GET /api/knowledge-base/list
```

### 删除知识库

```http
DELETE /api/knowledge-base/delete?id={knowledgeBaseId}
```

## 🧪 测试

运行测试脚本：

```bash
pnpm kb:test
```

测试内容：

- ✅ 创建知识库
- ✅ 获取配置
- ✅ 文档检索
- ✅ 获取列表
- ✅ 删除知识库

## ⚙️ 配置

### 文档分割参数

```typescript
// knowledge-base-manager.ts
chunkSize: 1000; // 每个片段字符数
chunkOverlap: 200; // 片段重叠字符数
```

### 检索参数

```typescript
// 检索最相关的 4 个文档片段
await knowledgeBaseManager.searchSimilar(kbId, query, 4);
```

### LLM 参数

```typescript
// query/route.ts
const llm = createLLM({
  model: "deepseek-chat",
  temperature: 0.7, // 创造性参数 (0-1)
});
```

## 🎯 核心工作流程

### 文档处理流程

```
上传 → 保存 → 加载 → 分割 → 向量化 → 存储
```

1. **上传**: 用户选择文档文件
2. **保存**: 文件存储到 `uploads/knowledge-base/{id}/`
3. **加载**: 根据格式选择对应的 Loader
4. **分割**: 将文档切分为 1000 字符的片段
5. **向量化**: 使用通义千问嵌入模型
6. **存储**: 保存到内存向量数据库

### 查询流程

```
提问 → 向量化 → 检索 → 构建上下文 → LLM 生成 → 返回答案
```

1. **提问**: 用户输入问题
2. **向量化**: 将问题转换为向量
3. **检索**: 在向量数据库中查找相似文档
4. **构建上下文**: 将检索到的文档作为上下文
5. **LLM 生成**: DeepSeek 基于上下文生成答案
6. **返回答案**: 显示答案和引用来源

## 🚧 常见问题

### Q: 向量化失败？

**A**: 检查 `ALIBABA_TONGYI_API_KEY` 是否正确配置并有足够配额

### Q: 查询无结果？

**A**: 确认知识库包含相关文档，尝试不同关键词

### Q: 上传失败？

**A**: 确认文件格式支持（PDF/DOCX/TXT/MD）且不超过 50MB

### Q: 内存占用高？

**A**: 当前使用内存存储，生产环境建议使用 Chroma 等持久化数据库

## 📈 优化建议

### 短期

- [ ] 添加上传进度条
- [ ] 实现流式输出
- [ ] 添加查询缓存
- [ ] 支持批量操作

### 长期

- [ ] 使用持久化向量数据库（Chroma/Pinecone）
- [ ] 支持更多文档格式（Excel/PPT）
- [ ] 实现知识库分享
- [ ] 添加数据统计分析
- [ ] 知识图谱可视化

## 📚 相关文档

- [详细架构文档](./docs/knowledge-base-rag.md)
- [快速开始指南](./docs/knowledge-base-setup.md)
- [流式输出实现指南](./docs/streaming-rag-guide.md) ⭐ 新增
- [LangChain 文档](https://js.langchain.com/)
- [阿里云通义千问](https://help.aliyun.com/zh/dashscope/)
- [DeepSeek API](https://platform.deepseek.com/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

---

**提示**: 首次使用请先运行 `pnpm kb:init` 初始化目录结构
