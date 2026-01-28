/**
 * 知识库功能测试脚本
 * 用于开发和调试
 */

import { knowledgeBaseManager } from "./knowledge-base-manager";
import path from "path";

async function testKnowledgeBase() {
  console.log("🧪 开始测试知识库功能...\n");

  try {
    // 测试 1: 创建知识库
    console.log("📝 测试 1: 创建知识库");
    const testPdfPath = path.join(
      process.cwd(),
      "src",
      "assets",
      "docs",
      "EZSort.pdf"
    );

    const kbId = "test-kb-" + Date.now();
    const kbName = "测试知识库";

    await knowledgeBaseManager.createKnowledgeBase(kbId, kbName, [testPdfPath]);
    console.log("✅ 测试 1 通过: 知识库创建成功\n");

    // 测试 2: 获取知识库配置
    console.log("📝 测试 2: 获取知识库配置");
    const config = knowledgeBaseManager.getConfig(kbId);
    console.log("知识库配置:", {
      id: config?.id,
      name: config?.name,
      fileCount: config?.files.length,
    });
    console.log("✅ 测试 2 通过\n");

    // 测试 3: 检索文档
    console.log("📝 测试 3: 检索文档");
    const query = "这个文档讲的是什么？";
    const docs = await knowledgeBaseManager.searchSimilar(kbId, query, 3);
    console.log(`检索到 ${docs.length} 个相关文档片段:`);
    docs.forEach((doc, index) => {
      console.log(`\n片段 ${index + 1}:`);
      console.log(doc.pageContent.substring(0, 200) + "...");
    });
    console.log("✅ 测试 3 通过\n");

    // 测试 4: 获取所有知识库列表
    console.log("📝 测试 4: 获取所有知识库列表");
    const allKbs = knowledgeBaseManager.getAllKnowledgeBases();
    console.log(`当前共有 ${allKbs.length} 个知识库`);
    allKbs.forEach((kb) => {
      console.log(`- ${kb.name} (${kb.files.length} 个文件)`);
    });
    console.log("✅ 测试 4 通过\n");

    // 测试 5: 删除知识库
    console.log("📝 测试 5: 删除知识库");
    await knowledgeBaseManager.deleteKnowledgeBase(kbId);
    const deletedKb = knowledgeBaseManager.getConfig(kbId);
    if (!deletedKb) {
      console.log("✅ 测试 5 通过: 知识库已删除\n");
    } else {
      throw new Error("知识库删除失败");
    }

    console.log("🎉 所有测试通过！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testKnowledgeBase();
}

export { testKnowledgeBase };
