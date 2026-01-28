/**
 * 知识库初始化脚本
 * 创建必要的目录结构
 */

import fs from "fs";
import path from "path";

const dirs = ["uploads", "uploads/knowledge-base"];

console.log("🚀 开始初始化知识库目录...");

dirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  } else {
    console.log(`ℹ️  目录已存在: ${dir}`);
  }
});

// 创建 .gitkeep 文件以保留空目录结构
const gitkeepPath = path.join(
  process.cwd(),
  "uploads",
  "knowledge-base",
  ".gitkeep"
);
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, "");
  console.log("✅ 创建 .gitkeep 文件");
}

console.log("✨ 知识库目录初始化完成！");
