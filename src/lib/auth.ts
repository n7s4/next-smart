import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub], // 添加 GitHub 提供商
  basePath: "/api/auth", // 可选：如果你修改了 API 路由的基路径，请在此设置
  callbacks: {
    // 可在此添加自定义回调，例如在 JWT 或 Session 中添加额外信息
    async jwt({ token, account }) {
      // 登录成功后，将 OAuth 访问令牌持久化到 token 中
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // 将 access_token 从 token 发送到客户端
      session.accessToken = token.accessToken;
      return session;
    },
  },
  // 可选：自定义登录页面
  // pages: {
  //   signIn: '/auth/signin',
  // }
});
