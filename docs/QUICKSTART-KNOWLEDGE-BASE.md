# 🚀 知识库 RAG 系统 - 5 分钟快速开始

## 第一步：安装依赖 (1 分钟)

```bash
# 安装所有依赖
pnpm install
```

## 第二步：配置 API Key (2 分钟)

创建 `.env.local` 文件，添加以下内容：

```env
# 阿里云通义千问 API Key (用于文档向量化)
ALIBABA_TONGYI_API_KEY=sk-xxxxxxxxxxxxxx

# DeepSeek API Key (用于 AI 对话)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxx
```

### 如何获取 API Key？

**阿里云通义千问**:

1. 访问 https://bailian.console.aliyun.com/
2. 创建应用
3. 复制 API Key

**DeepSeek**:

1. 访问 https://platform.deepseek.com/
2. 注册账号
3. 生成 API Key

## 第三步：初始化 (30 秒)

```bash
# 创建必要的目录
pnpm kb:init
```

## 第四步：启动服务 (30 秒)

```bash
# 启动开发服务器
pnpm dev
```

访问: http://localhost:3000/startbox

## 第五步：创建第一个知识库 (1 分钟)

1. 点击左侧"新建知识库"按钮
2. 输入名称，如："我的文档库"
3. 上传你的文档（PDF、Word、TXT 等）
4. 点击"创建"
5. 等待处理完成（会显示"文档已完成向量化"）

## 第六步：开始提问！

在底部输入框输入问题，例如：

```
"这个文档讲的是什么？"
"帮我总结文档的主要内容"
"文档中提到了哪些关键概念？"
```

按 Enter 发送，AI 会基于你上传的文档回答问题！

---

## 💡 小贴士

### 快捷键

- `Enter` - 发送消息
- `Shift + Enter` - 换行

### 支持的文件格式

- PDF (`.pdf`)
- Word (`.docx`)
- 文本 (`.txt`)
- Markdown (`.md`)

### 文件要求

- 单个文件 ≤ 50MB
- 建议中文文档效果更好

### 多知识库管理

- 点击左侧列表切换知识库
- 鼠标悬停显示删除按钮
- 每个知识库的聊天记录独立

---

## 🐛 遇到问题？

### 问题 1: 向量化失败

**原因**: API Key 配置错误或配额不足
**解决**: 检查 `.env.local` 文件中的 API Key 是否正确

### 问题 2: 查询无结果

**原因**: 文档内容与问题不相关
**解决**: 尝试用不同的关键词提问

### 问题 3: 上传失败

**原因**: 文件格式或大小问题
**解决**: 确认文件是 PDF/DOCX/TXT/MD，且 ≤ 50MB

---

## 📚 更多帮助

- 📖 [完整文档](./docs/knowledge-base-rag.md)
- 🛠️ [使用指南](./docs/knowledge-base-setup.md)
- 📝 [实现总结](./docs/implementation-summary.md)
- 🧪 运行测试: `pnpm kb:test`

---

**就这么简单！现在开始构建你的智能知识库吧！** 🎉
