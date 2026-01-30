# ⚡ Webpack 按需加载 - 快速参考

## 🎯 核心配置

### 代码分割策略

```typescript
splitChunks: {
  chunks: "all",              // 所有 chunk 都分割
  minSize: 20000,             // 最小 20KB
  maxSize: 244000,            // 最大 244KB
  maxAsyncRequests: 30,       // 并行请求上限
}
```

### 分包优先级（从高到低）

```
30: React 核心
25: Ant Design 核心
24: Ant Design Pro
22: LangChain 核心
21: LangChain 社区
20: LangChain 集成
18: Lucide 图标
17: AI SDK
16: PDF 工具
15: 工具库
12: 应用工具
 5: 通用库
-20: 默认
```

## 📦 主要分包结果

| Chunk 名称               | 包含内容         | 预计大小 |
| ------------------------ | ---------------- | -------- |
| `vendor.react.js`        | React + ReactDOM | ~150 KB  |
| `vendor.antd-core.js`    | Ant Design UI    | ~800 KB  |
| `vendor.langchain-*.js`  | LangChain 系列   | ~1 MB    |
| `vendor.lucide-icons.js` | 图标库           | ~180 KB  |
| `vendor.utilities.js`    | 工具库           | ~120 KB  |

## 🚀 使用建议

### 1. 动态导入大组件

```typescript
import dynamic from "next/dynamic";

const FileUpload = dynamic(() => import("@/components/upload"), {
  loading: () => <div>Loading...</div>,
});
```

### 2. 条件加载重库

```typescript
const handleExport = async () => {
  const { jsPDF } = await import("jspdf");
  // 只在导出时加载
};
```

### 3. 检查打包结果

```bash
# 构建
pnpm build

# 查看 chunks
ls -lh .next/static/chunks/
```

## 🎨 实验性优化

```typescript
experimental: {
  optimizePackageImports: [
    "antd",
    "@ant-design/icons",
    "lucide-react",
  ],
}
```

自动优化包的导入路径。

## 📊 预期性能提升

| 指标       | 优化前  | 优化后 | 提升   |
| ---------- | ------- | ------ | ------ |
| 首屏 JS    | 10.8 MB | 2.5 MB | ⬇️ 77% |
| 加载时间   | 3.5s    | 1.2s   | ⬆️ 66% |
| Lighthouse | 60      | 90+    | ⬆️ 50% |

## ⚙️ 生产环境配置

```typescript
compiler: {
  removeConsole: {
    exclude: ["error", "warn"], // 保留错误日志
  },
}
```

## 🔍 验证配置

### 方法 1: 构建日志

```bash
pnpm build
```

查看输出的 chunk 列表。

### 方法 2: Bundle Analyzer

```bash
pnpm add -D @next/bundle-analyzer
ANALYZE=true pnpm build
```

可视化查看打包结果。

### 方法 3: 浏览器 Network

1. 打开 Chrome DevTools
2. 切换到 Network 标签
3. 刷新页面
4. 查看加载的 JS 文件

## 💡 常见问题

### Q: 为什么分这么多包？

**A**:

- 不同功能独立缓存
- 按需加载，不用的不加载
- 更新时只需重新加载变化的部分

### Q: 会不会请求太多？

**A**:

- HTTP/2 支持多路复用
- 并行加载，总时间更短
- 缓存后只需要加载变化的文件

### Q: 开发环境也分包吗？

**A**:

- 开发环境不分包（dev: true 时跳过）
- 保证开发体验和调试效率
- 只在生产构建时生效

## 📚 相关文档

- [详细配置指南](./docs/webpack-optimization-guide.md)
- [Next.js 优化文档](https://nextjs.org/docs/app/building-your-application/optimizing)

---

**快速修改**: 编辑 `next.config.ts` 中的 `cacheGroups` 部分  
**立即生效**: 重启开发服务器或重新构建
