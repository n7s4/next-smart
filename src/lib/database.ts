import clientPromise from "./mongodb";
import { Db, Collection, MongoClient } from "mongodb";

// 数据库连接和操作工具类
export class Database {
  private static instance: Database;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // 获取数据库连接
  public async getDb(): Promise<Db> {
    if (!this.db) {
      this.client = await clientPromise;
      const dbName = process.env.MONGODB_DB;
      this.db = this.client.db(dbName);
    }
    return this.db;
  }

  // 获取集合
  public async getCollection<T>(
    collectionName: string
  ): Promise<Collection<T>> {
    const db = await this.getDb();
    return db.collection<T>(collectionName);
  }

  // 关闭连接
  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

// 便捷的数据库操作函数
export const db = Database.getInstance();

// 通用 CRUD 操作
export class BaseRepository<T> {
  constructor(private collectionName: string) {}

  // 创建文档
  async create(document: Omit<T, "_id">): Promise<T> {
    const collection = await db.getCollection<T>(this.collectionName);
    const result = await collection.insertOne(document as any);
    return { ...document, _id: result.insertedId } as T;
  }

  // 根据 ID 查找文档
  async findById(id: string): Promise<T | null> {
    const collection = await db.getCollection<T>(this.collectionName);
    return await collection.findOne({ _id: id } as any);
  }

  // 根据条件查找文档
  async findOne(filter: Partial<T>): Promise<T | null> {
    const collection = await db.getCollection<T>(this.collectionName);
    return await collection.findOne(filter as any);
  }

  // 查找多个文档
  async findMany(
    filter: Partial<T> = {},
    options?: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    }
  ): Promise<T[]> {
    const collection = await db.getCollection<T>(this.collectionName);
    let query = collection.find(filter as any);

    if (options?.sort) {
      query = query.sort(options.sort);
    }
    if (options?.skip) {
      query = query.skip(options.skip);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query.toArray();
  }

  // 更新文档
  async updateById(id: string, update: Partial<T>): Promise<T | null> {
    const collection = await db.getCollection<T>(this.collectionName);
    const result = await collection.findOneAndUpdate(
      { _id: id } as any,
      { $set: update },
      { returnDocument: "after" }
    );
    return result || null;
  }

  // 删除文档
  async deleteById(id: string): Promise<boolean> {
    const collection = await db.getCollection<T>(this.collectionName);
    const result = await collection.deleteOne({ _id: id } as any);
    return result.deletedCount > 0;
  }

  // 统计文档数量
  async count(filter: Partial<T> = {}): Promise<number> {
    const collection = await db.getCollection<T>(this.collectionName);
    return await collection.countDocuments(filter as any);
  }
}

// 数据库连接测试函数
export async function testConnection(): Promise<boolean> {
  try {
    const database = Database.getInstance();
    const db = await database.getDb();
    await db.admin().ping();
    console.log("✅ MongoDB 连接成功");
    return true;
  } catch (error) {
    console.error("❌ MongoDB 连接失败:", error);
    return false;
  }
}
