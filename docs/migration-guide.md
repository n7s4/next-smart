# 知识库系统迁移指南

## 问题背景

如果你在 v1.0 版本创建了知识库，但升级到 v1.1 后发现知识库列表为空，这是因为：

1. **v1.0 版本没有保存配置文件** - 知识库信息只存在于内存中
2. **v1.1 版本需要 `config.json`** - 系统通过配置文件加载知识库

## 🔧 自动修复（推荐）

系统已经内置了自动修复功能！只需：

### 1. 检查现有知识库

```bash
pnpm kb:check
```

这个命令会显示：

- 所有知识库目录
- 是否有配置文件
- 文档文件列表

### 2. 重启开发服务器

```bash
# 停止当前服务
Ctrl + C

# 重新启动
pnpm dev
```

**系统会自动：**

1. 扫描 `uploads/knowledge-base/` 目录
2. 发现没有 `config.json` 的目录
3. 自动生成配置文件
4. 保存到对应目录

### 3. 刷新页面

访问 http://localhost:3000/startbox

你应该能看到所有知识库了！

## 📋 工作原理

### 自动配置生成

当系统启动时，`KnowledgeBaseManager` 会：

```typescript
// 1. 扫描目录
const dirs = await fs.readdir(uploadDir);

// 2. 对于每个目录
for (const dir of dirs) {
  // 尝试加载配置
  let config = await this.loadConfig(dir);

  // 如果没有配置，自动生成
  if (!config) {
    config = await this.generateConfigFromDirectory(dir);
    await this.saveConfig(dir, config); // 保存配置
  }
}
```

### 生成的配置格式

```json
{
  "id": "1234567890",
  "name": "知识库_12345678",
  "files": [
    "/path/to/uploads/knowledge-base/1234567890/document1.pdf",
    "/path/to/uploads/knowledge-base/1234567890/document2.docx"
  ],
  "createTime": "2026-01-27T10:30:00.000Z",
  "updateTime": "2026-01-27T10:30:00.000Z"
}
```

## 🛠️ 手动修复（可选）

如果自动修复失败，可以手动创建配置文件：

### 步骤 1: 找到知识库目录

```bash
cd uploads/knowledge-base
ls -la
```

### 步骤 2: 为每个目录创建 config.json

例如，目录名为 `1738051200000`：

```bash
cd 1738051200000
```

创建 `config.json`：

```json
{
  "id": "1738051200000",
  "name": "我的知识库",
  "files": [
    "/完整路径/uploads/knowledge-base/1738051200000/document1.pdf",
    "/完整路径/uploads/knowledge-base/1738051200000/document2.pdf"
  ],
  "createTime": "2026-01-26T10:00:00.000Z",
  "updateTime": "2026-01-26T10:00:00.000Z"
}
```

**注意**：

- `id` 必须与目录名一致
- `files` 需要使用完整的绝对路径
- 列出目录中的所有文档文件

### 步骤 3: 重启服务器

```bash
pnpm dev
```

## 🎯 验证修复

### 方法 1: 查看控制台日志

启动服务器后，应该看到：

```
📂 已加载知识库: 我的知识库 (3 个文件)
📂 已加载知识库: 技术文档 (5 个文件)
✅ 共加载 2 个知识库（向量存储将按需加载）
```

### 方法 2: 访问页面

1. 打开 http://localhost:3000/startbox
2. 左侧应该显示所有知识库
3. 点击知识库，应该能正常提问

### 方法 3: 调用 API

```bash
curl http://localhost:3000/api/knowledge-base/list
```

应该返回：

```json
{
  "status": 1,
  "message": "获取成功",
  "data": [
    {
      "id": "1738051200000",
      "name": "我的知识库",
      "fileCount": 3,
      "createTime": "2026-01-26T10:00:00.000Z",
      "updateTime": "2026-01-26T10:00:00.000Z"
    }
  ]
}
```

## 🔍 故障排查

### 问题 1: 自动生成失败

**症状**: 重启后仍然看不到知识库

**解决**:

1. 检查目录权限
2. 查看服务器日志中的错误信息
3. 手动创建 config.json

### 问题 2: 文件路径错误

**症状**: 知识库显示但查询失败

**解决**:

1. 检查 config.json 中的文件路径是否正确
2. 确保路径是绝对路径
3. 确认文件确实存在

```bash
# 检查文件
ls -la uploads/knowledge-base/1738051200000/
```

### 问题 3: 配置文件格式错误

**症状**: 启动时报错或知识库不显示

**解决**:

1. 验证 JSON 格式是否正确
2. 使用 JSON 验证工具检查
3. 删除配置文件，让系统重新生成

```bash
# 删除错误的配置
rm uploads/knowledge-base/1738051200000/config.json

# 重启服务器，系统会重新生成
pnpm dev
```

## 📊 目录结构

正确的知识库目录结构：

```
uploads/
└── knowledge-base/
    ├── 1738051200000/
    │   ├── config.json          ✅ 配置文件
    │   ├── document1.pdf         ✅ 文档文件
    │   └── document2.docx        ✅ 文档文件
    ├── 1738137600000/
    │   ├── config.json          ✅ 配置文件
    │   ├── manual.pdf            ✅ 文档文件
    │   └── guide.txt             ✅ 文档文件
    └── .gitkeep
```

## 🎉 升级后的新特性

### 1. 持久化存储

- ✅ 知识库配置保存到磁盘
- ✅ 重启后自动恢复
- ✅ 不会丢失数据

### 2. 懒加载

- ✅ 启动时只加载配置
- ✅ 首次查询时加载向量
- ✅ 更快的启动速度

### 3. 自动迁移

- ✅ 自动识别旧数据
- ✅ 自动生成配置
- ✅ 无需手动干预

## 💡 最佳实践

### 1. 定期检查

```bash
# 每周运行一次检查
pnpm kb:check
```

### 2. 备份配置

```bash
# 备份所有配置文件
cp -r uploads/knowledge-base /path/to/backup/
```

### 3. 监控日志

启动服务器时注意观察：

- 加载了多少个知识库
- 是否有错误信息
- 向量化是否成功

## 📞 获取帮助

如果遇到问题：

1. **查看日志**: 服务器控制台输出
2. **运行检查**: `pnpm kb:check`
3. **查看文档**: `docs/knowledge-base-rag.md`
4. **提交 Issue**: 附上错误日志和目录结构

## 🔄 回滚

如果需要回滚到 v1.0：

1. 删除所有 config.json 文件
2. 切换到 v1.0 分支
3. 重启服务器

**注意**: 回滚后需要重新创建知识库

---

**更新日期**: 2026-01-27  
**适用版本**: v1.1.0+
