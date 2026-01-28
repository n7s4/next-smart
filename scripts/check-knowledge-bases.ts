/**
 * 检查知识库目录和配置的脚本
 */

import fs from "fs/promises";
import path from "path";

async function checkKnowledgeBases() {
  console.log("🔍 开始检查知识库目录...\n");

  const uploadDir = path.join(process.cwd(), "uploads", "knowledge-base");

  try {
    // 检查上传目录是否存在
    try {
      await fs.access(uploadDir);
      console.log(`✅ 上传目录存在: ${uploadDir}\n`);
    } catch {
      console.log(`❌ 上传目录不存在: ${uploadDir}`);
      return;
    }

    // 读取所有子目录
    const dirs = await fs.readdir(uploadDir);
    console.log(`📂 找到 ${dirs.length} 个条目\n`);

    for (const dir of dirs) {
      if (dir.startsWith(".")) {
        console.log(`⏭️  跳过隐藏文件: ${dir}`);
        continue;
      }

      const dirPath = path.join(uploadDir, dir);
      const stats = await fs.stat(dirPath);

      if (!stats.isDirectory()) {
        console.log(`⏭️  跳过非目录: ${dir}`);
        continue;
      }

      console.log(`\n📁 知识库目录: ${dir}`);
      console.log(`   创建时间: ${stats.birthtime.toLocaleString("zh-CN")}`);

      // 检查配置文件
      const configPath = path.join(dirPath, "config.json");
      try {
        await fs.access(configPath);
        const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
        console.log(`   ✅ 配置文件存在`);
        console.log(`   名称: ${config.name}`);
        console.log(`   文件数: ${config.files?.length || 0}`);
      } catch {
        console.log(`   ⚠️  配置文件不存在 - 将自动生成`);
      }

      // 列出文件
      const files = await fs.readdir(dirPath);
      const documentFiles = files.filter(
        (f) => f !== "config.json" && !f.startsWith(".")
      );
      console.log(`   文档文件: ${documentFiles.length} 个`);
      documentFiles.forEach((f) => {
        console.log(`      - ${f}`);
      });
    }

    console.log("\n✅ 检查完成！");
    console.log(
      "\n💡 提示: 如果有知识库没有 config.json，系统会在启动时自动生成"
    );
  } catch (error) {
    console.error("❌ 检查失败:", error);
  }
}

// 运行检查
checkKnowledgeBases();
