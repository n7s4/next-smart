/**
 * 知识库管理器
 * 负责管理多个知识库的向量存储和文档处理
 */

import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { Document } from "@langchain/core/documents";
import fs from "fs/promises";
import path from "path";

// 知识库配置接口
export interface KnowledgeBaseConfig {
  id: string;
  name: string;
  files: string[]; // 文件路径列表
  createTime: Date;
  updateTime: Date;
}

// 单例模式的知识库管理器
class KnowledgeBaseManager {
  private static instance: KnowledgeBaseManager;

  // 存储每个知识库的向量存储 Map<知识库ID, VectorStore>
  private vectorStores: Map<string, MemoryVectorStore> = new Map();

  // 知识库配置 Map<知识库ID, Config>
  private configs: Map<string, KnowledgeBaseConfig> = new Map();

  // Embeddings 实例（全局共享）
  private embeddings: AlibabaTongyiEmbeddings;

  // 文档分割器
  private textSplitter: RecursiveCharacterTextSplitter;

  // 文件上传目录
  private uploadDir: string;

  // 初始化状态
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.embeddings = new AlibabaTongyiEmbeddings({});
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    this.uploadDir = path.join(process.cwd(), "uploads", "knowledge-base");
  }

  // 获取单例实例
  public static getInstance(): KnowledgeBaseManager {
    if (!KnowledgeBaseManager.instance) {
      KnowledgeBaseManager.instance = new KnowledgeBaseManager();
    }
    return KnowledgeBaseManager.instance;
  }

  /**
   * 初始化管理器（异步加载配置）
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 如果正在初始化，等待完成
    if (this.initPromise) {
      return this.initPromise;
    }

    // 开始初始化
    this.initPromise = this.loadAllConfigs().then(() => {
      this.isInitialized = true;
      console.log("✅ 知识库管理器初始化完成");
    });

    return this.initPromise;
  }

  /**
   * 确保已初始化
   */
  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * 创建新知识库
   */
  async createKnowledgeBase(
    id: string,
    name: string,
    files: File[] | string[]
  ): Promise<void> {
    console.log(`📚 创建知识库: ${name} (ID: ${id})`);

    // 创建知识库专属目录
    const kbDir = path.join(this.uploadDir, id);
    await fs.mkdir(kbDir, { recursive: true });

    // 处理文件并获取文件路径
    const filePaths: string[] = [];
    for (const file of files) {
      if (typeof file === "string") {
        filePaths.push(file);
      } else {
        // 如果是 File 对象，保存到磁盘
        const filePath = path.join(kbDir, file.name);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        filePaths.push(filePath);
      }
    }

    // 保存配置
    const config: KnowledgeBaseConfig = {
      id,
      name,
      files: filePaths,
      createTime: new Date(),
      updateTime: new Date(),
    };
    this.configs.set(id, config);

    // 持久化配置到磁盘
    await this.saveConfig(id, config);

    // 加载并向量化文档
    await this.loadAndIndexDocuments(id, filePaths);

    console.log(`✅ 知识库创建成功: ${name}`);
  }

  /**
   * 加载并索引文档
   */
  private async loadAndIndexDocuments(
    kbId: string,
    filePaths: string[]
  ): Promise<void> {
    const allDocs: Document[] = [];

    for (const filePath of filePaths) {
      try {
        const docs = await this.loadDocument(filePath);
        allDocs.push(...docs);
        console.log(`📄 已加载文档: ${path.basename(filePath)}`);
      } catch (error) {
        console.error(`❌ 加载文档失败: ${filePath}`, error);
      }
    }

    if (allDocs.length === 0) {
      throw new Error("没有成功加载任何文档");
    }

    // 分割文档
    const splits = await this.textSplitter.splitDocuments(allDocs);
    console.log(`✂️  文档已分割为 ${splits.length} 个片段`);

    // 创建向量存储并添加文档
    const vectorStore = new MemoryVectorStore(this.embeddings);
    await vectorStore.addDocuments(splits);

    this.vectorStores.set(kbId, vectorStore);
    console.log(`🔢 文档已向量化并存储到知识库: ${kbId}`);
  }

  /**
   * 根据文件类型加载文档
   */
  private async loadDocument(filePath: string): Promise<Document[]> {
    const ext = path.extname(filePath).toLowerCase();

    let loader;
    switch (ext) {
      case ".pdf":
        loader = new PDFLoader(filePath);
        break;
      case ".txt":
      case ".md":
        loader = new TextLoader(filePath);
        break;
      case ".docx":
        loader = new DocxLoader(filePath);
        break;
      default:
        throw new Error(`不支持的文件类型: ${ext}`);
    }

    return await loader.load();
  }

  /**
   * 获取知识库的向量存储
   */
  async getVectorStore(kbId: string): Promise<MemoryVectorStore | undefined> {
    await this.ensureInitialized();
    return this.vectorStores.get(kbId);
  }

  /**
   * 获取知识库配置
   */
  async getConfig(kbId: string): Promise<KnowledgeBaseConfig | undefined> {
    await this.ensureInitialized();
    return this.configs.get(kbId);
  }

  /**
   * 向现有知识库添加文档
   */
  async addDocuments(kbId: string, files: File[] | string[]): Promise<void> {
    await this.ensureInitialized();
    const config = this.configs.get(kbId);
    if (!config) {
      throw new Error(`知识库不存在: ${kbId}`);
    }

    const vectorStore = this.vectorStores.get(kbId);
    if (!vectorStore) {
      throw new Error(`向量存储不存在: ${kbId}`);
    }

    // 保存新文件
    const kbDir = path.join(this.uploadDir, kbId);
    const newFilePaths: string[] = [];

    for (const file of files) {
      if (typeof file === "string") {
        newFilePaths.push(file);
      } else {
        const filePath = path.join(kbDir, file.name);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        newFilePaths.push(filePath);
      }
    }

    // 加载新文档
    const allDocs: Document[] = [];
    for (const filePath of newFilePaths) {
      const docs = await this.loadDocument(filePath);
      allDocs.push(...docs);
    }

    // 分割并添加到向量存储
    const splits = await this.textSplitter.splitDocuments(allDocs);
    await vectorStore.addDocuments(splits);

    // 更新配置
    config.files.push(...newFilePaths);
    config.updateTime = new Date();
    this.configs.set(kbId, config);

    console.log(`✅ 已向知识库添加 ${files.length} 个文档`);
  }

  /**
   * 删除知识库
   */
  async deleteKnowledgeBase(kbId: string): Promise<void> {
    await this.ensureInitialized();
    // 删除向量存储
    this.vectorStores.delete(kbId);

    // 删除配置
    this.configs.delete(kbId);

    // 删除配置文件
    const configPath = path.join(this.uploadDir, kbId, "config.json");
    try {
      await fs.unlink(configPath);
    } catch (error) {
      console.error(`删除配置文件失败: ${configPath}`, error);
    }

    // 删除文件目录
    const kbDir = path.join(this.uploadDir, kbId);
    try {
      await fs.rm(kbDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`删除目录失败: ${kbDir}`, error);
    }

    console.log(`🗑️  知识库已删除: ${kbId}`);
  }

  /**
   * 获取所有知识库列表
   */
  async getAllKnowledgeBases(): Promise<KnowledgeBaseConfig[]> {
    await this.ensureInitialized();
    return Array.from(this.configs.values());
  }

  /**
   * 检索相似文档
   */
  async searchSimilar(
    kbId: string,
    query: string,
    k: number = 4
  ): Promise<Document[]> {
    await this.ensureInitialized();
    const vectorStore = this.vectorStores.get(kbId);
    if (!vectorStore) {
      throw new Error(`知识库不存在: ${kbId}`);
    }

    return await vectorStore.similaritySearch(query, k);
  }

  /**
   * 保存配置到磁盘
   */
  private async saveConfig(
    kbId: string,
    config: KnowledgeBaseConfig
  ): Promise<void> {
    const kbDir = path.join(this.uploadDir, kbId);
    const configPath = path.join(kbDir, "config.json");

    try {
      await fs.mkdir(kbDir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
      console.log(`💾 配置已保存: ${configPath}`);
    } catch (error) {
      console.error(`保存配置失败: ${configPath}`, error);
      throw error;
    }
  }

  /**
   * 加载单个知识库配置
   */
  private async loadConfig(kbId: string): Promise<KnowledgeBaseConfig | null> {
    const configPath = path.join(this.uploadDir, kbId, "config.json");

    try {
      const data = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(data);

      // 转换日期字符串为 Date 对象
      config.createTime = new Date(config.createTime);
      config.updateTime = new Date(config.updateTime);

      return config;
    } catch (error) {
      console.error(`加载配置失败: ${configPath}`, error);
      return null;
    }
  }

  /**
   * 加载所有知识库配置（仅加载配置，不加载向量存储）
   */
  private async loadAllConfigs(): Promise<void> {
    try {
      // 确保上传目录存在
      await fs.mkdir(this.uploadDir, { recursive: true });

      // 读取所有知识库目录
      const dirs = await fs.readdir(this.uploadDir);

      for (const dir of dirs) {
        // 跳过隐藏文件
        if (dir.startsWith(".")) {
          continue;
        }

        const dirPath = path.join(this.uploadDir, dir);

        try {
          const stats = await fs.stat(dirPath);

          if (!stats.isDirectory()) {
            continue;
          }

          // 尝试加载配置
          let config = await this.loadConfig(dir);

          // 如果配置不存在，尝试从目录生成配置（兼容旧数据）
          if (!config) {
            console.log(`⚠️  未找到配置文件，尝试从目录生成: ${dir}`);
            config = await this.generateConfigFromDirectory(dir);

            if (config) {
              // 保存生成的配置
              await this.saveConfig(dir, config);
              console.log(`✅ 已生成并保存配置: ${config.name}`);
            }
          }

          if (config) {
            this.configs.set(dir, config);
            console.log(
              `📂 已加载知识库: ${config.name} (${config.files.length} 个文件)`
            );
          }
        } catch (error) {
          console.error(`处理目录失败: ${dir}`, error);
        }
      }

      console.log(
        `✅ 共加载 ${this.configs.size} 个知识库配置（向量存储将按需加载）`
      );
    } catch (error) {
      console.error("加载知识库配置失败:", error);
    }
  }

  /**
   * 确保知识库已加载向量存储（懒加载）
   */
  async ensureVectorStoreLoaded(kbId: string): Promise<void> {
    await this.ensureInitialized();

    // 如果已经加载，直接返回
    if (this.vectorStores.has(kbId)) {
      return;
    }

    // 获取配置
    const config = this.configs.get(kbId);
    if (!config) {
      throw new Error(`知识库不存在: ${kbId}`);
    }

    // 加载并索引文档
    console.log(`🔄 懒加载知识库: ${config.name}`);
    await this.loadAndIndexDocuments(kbId, config.files);
  }

  /**
   * 从目录生成配置（用于兼容没有 config.json 的旧数据）
   */
  private async generateConfigFromDirectory(
    kbId: string
  ): Promise<KnowledgeBaseConfig | null> {
    try {
      const dirPath = path.join(this.uploadDir, kbId);

      // 读取目录中的所有文件
      const files = await fs.readdir(dirPath);
      const filePaths: string[] = [];

      for (const file of files) {
        // 跳过配置文件和隐藏文件
        if (file === "config.json" || file.startsWith(".")) {
          continue;
        }

        const filePath = path.join(dirPath, file);

        try {
          const stats = await fs.stat(filePath);

          // 只处理文件
          if (stats.isFile()) {
            filePaths.push(filePath);
          }
        } catch (err) {
          console.error(`读取文件失败: ${filePath}`, err);
        }
      }

      if (filePaths.length === 0) {
        console.log(`⚠️  目录为空或无有效文件: ${kbId}`);
        return null;
      }

      // 尝试获取目录创建时间
      const dirStats = await fs.stat(dirPath);

      // 生成配置
      const config: KnowledgeBaseConfig = {
        id: kbId,
        name: `知识库_${kbId.substring(0, 8)}`, // 使用 ID 前缀作为名称
        files: filePaths,
        createTime: dirStats.birthtime || new Date(),
        updateTime: new Date(),
      };

      return config;
    } catch (error) {
      console.error(`从目录生成配置失败: ${kbId}`, error);
      return null;
    }
  }
}

// 导出单例实例
export const knowledgeBaseManager = KnowledgeBaseManager.getInstance();
