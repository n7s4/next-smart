import { BaseRepository } from "../database";
import { User } from "../definitions";
import bcrypt from "bcrypt";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("users");
  }

  // 根据邮箱查找用户
  async findByEmail(email: string): Promise<User | null> {
    return await this.findOne({ email });
  }

  // 根据用户名查找用户
  async findByUsername(username: string): Promise<User | null> {
    return await this.findOne({ name: username });
  }

  // 创建新用户（带密码加密）
  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    provider?: string;
    providerId?: string;
  }): Promise<User> {
    // 加密密码
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user: Omit<User, "_id"> = {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      provider: userData.provider || "credentials",
      providerId: userData.providerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      role: "user",
    };

    return await this.create(user);
  }

  // 验证用户密码
  async validatePassword(
    email: string,
    password: string
  ): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.password) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    // 更新最后登录时间
    await this.updateLastLogin(user._id?.toString() || "");
    return user;
  }

  // 更新最后登录时间
  async updateLastLogin(userId: string): Promise<void> {
    await this.updateById(userId, {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 创建或更新 OAuth 用户
  async createOrUpdateOAuthUser(profile: {
    id: string;
    name: string;
    email: string;
    image?: string;
    provider: string;
  }): Promise<User> {
    const existingUser = await this.findOne({
      email: profile.email,
      provider: profile.provider,
    });

    if (existingUser) {
      // 更新现有用户
      await this.updateById(existingUser._id?.toString() || "", {
        name: profile.name,
        image: profile.image,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });
      return existingUser;
    } else {
      // 创建新用户
      const user: Omit<User, "_id"> = {
        name: profile.name,
        email: profile.email,
        image: profile.image,
        provider: profile.provider,
        providerId: profile.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
        role: "user",
      };

      return await this.create(user);
    }
  }

  // 获取所有用户（分页）
  async getUsers(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const users = await this.findMany({}, { skip, limit });
    const total = await this.count();
    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      totalPages,
    };
  }

  // 更新用户角色
  async updateUserRole(
    userId: string,
    role: "user" | "admin"
  ): Promise<User | null> {
    return await this.updateById(userId, {
      role,
      updatedAt: new Date(),
    });
  }

  // 激活/停用用户
  async toggleUserStatus(userId: string): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    return await this.updateById(userId, {
      isActive: !user.isActive,
      updatedAt: new Date(),
    });
  }
}

// 导出单例实例
export const userRepository = new UserRepository();
