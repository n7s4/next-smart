# ⚡ 知识库列表为空？快速修复指南

## 🎯 一键修复

```bash
# 1. 安装依赖（如果刚更新代码）
pnpm install

# 2. 检查知识库
pnpm kb:check

# 3. 停止并重启服务器
# 按 Ctrl+C 停止当前服务器
# 然后重新启动:
pnpm dev

# 4. 刷新浏览器页面
# 访问 http://localhost:3000/startbox
```

就这么简单！✨

## 🔧 如果还是不行？

### 方法 1: 清除 Next.js 缓存

```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next
pnpm dev

# Mac/Linux
rm -rf .next
pnpm dev
```

### 方法 2: 手动测试 API

```bash
# 测试 list 接口
curl http://localhost:3000/api/knowledge-base/list
```

应该返回你的知识库列表。

### 方法 3: 查看服务器日志

重启后应该看到：

```
📂 已加载知识库: 诗词 (1 个文件)
✅ 共加载 1 个知识库（向量存储将按需加载）
✅ 知识库管理器初始化完成
```

## 🔍 发生了什么？

系统会自动：

1. 扫描 `uploads/knowledge-base/` 目录
2. 发现没有 `config.json` 的旧知识库
3. 自动生成并保存配置文件
4. 加载所有知识库到列表

## 📝 查看日志

启动服务器后，你应该看到类似的日志：

```
⚠️  未找到配置文件，尝试从目录生成: 1738051200000
✅ 已生成并保存配置: 知识库_17380512
📂 已加载知识库: 知识库_17380512 (3 个文件)
✅ 共加载 1 个知识库（向量存储将按需加载）
```

## ❓ 仍然有问题？

### 检查目录结构

```bash
# Windows
dir uploads\knowledge-base

# Mac/Linux
ls -la uploads/knowledge-base/
```

应该看到知识库目录，例如：

```
1738051200000/
1738137600000/
```

### 检查文件

```bash
# 进入知识库目录
cd uploads/knowledge-base/1738051200000

# 查看文件
dir  # Windows
ls   # Mac/Linux
```

应该看到：

- `config.json` （修复后会自动生成）
- PDF/DOCX/TXT 等文档文件

### 手动触发重新加载

如果自动加载失败，删除 config.json 让系统重新生成：

```bash
# 删除配置文件
rm uploads/knowledge-base/*/config.json  # Mac/Linux
del uploads\knowledge-base\*\config.json  # Windows

# 重启服务器
pnpm dev
```

## 📚 详细文档

- [完整迁移指南](./docs/migration-guide.md)
- [系统架构文档](./docs/knowledge-base-rag.md)

## 💡 为什么会这样？

**v1.0**: 知识库信息只在内存中  
**v1.1**: 知识库配置保存到磁盘（更可靠）

升级后需要配置文件，所以系统会自动生成！

---

**快速帮助**: 如果上述方法都不行，请查看控制台错误日志并参考[迁移指南](./docs/migration-guide.md)
