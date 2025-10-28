import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],
  // 需要的话可添加 session、callbacks、pages 等配置
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
