import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { userRepository } from "./repositories/userRepository";

// 扩展Session类型以包含accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

const authOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }), // GitHub 提供商
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // 使用数据库验证用户
          const user = await userRepository.validatePassword(
            credentials.username,
            credentials.password
          );

          if (user) {
            return {
              id: user._id?.toString() || "",
              name: user.name,
              email: user.email,
              image: user.image,
            };
          }

          return null; // 验证失败
        } catch (error) {
          console.error("认证错误:", error);
          return null;
        }
      },
    }),
    Credentials({
      id: "phone",
      name: "phone",
      credentials: {
        mobile: { label: "手机号", type: "text" },
        captcha: { label: "验证码", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.mobile || !credentials?.captcha) {
          return null;
        }

        try {
          // 这里应该验证手机号和验证码
          // 示例：简单的验证码验证（生产环境中请使用短信服务）
          if (
            credentials.mobile === "13800138000" &&
            credentials.captcha === "1234"
          ) {
            // 查找或创建手机用户
            let user = await userRepository.findByEmail(
              `${credentials.mobile}@example.com`
            );

            if (!user) {
              user = await userRepository.createUser({
                name: "手机用户",
                email: `${credentials.mobile}@example.com`,
                password: "default_password", // 手机用户使用默认密码
                provider: "phone",
                providerId: credentials.mobile,
              });
            }

            return {
              id: user._id?.toString() || "",
              name: user.name,
              email: user.email,
              image: user.image,
            };
          }

          return null; // 验证失败
        } catch (error) {
          console.error("手机认证错误:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login", // 指定自定义登录页面
  },
  callbacks: {
    // 可在此添加自定义回调，例如在 JWT 或 Session 中添加额外信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({
      token,
      account,
      user,
    }: {
      token: any;
      account: any;
      user: any;
    }) {
      // 登录成功后，将 OAuth 访问令牌持久化到 token 中
      if (account) {
        token.accessToken = account.access_token;

        // 处理 OAuth 用户（如 GitHub）
        if (account.provider === "github" && user) {
          try {
            const oauthUser = await userRepository.createOrUpdateOAuthUser({
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              provider: "github",
            });
            token.userId = oauthUser._id?.toString();
          } catch (error) {
            console.error("OAuth 用户创建失败:", error);
          }
        }
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      // 将 access_token 从 token 发送到客户端
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      if (token.userId) {
        session.userId = token.userId;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
export { authOptions };
