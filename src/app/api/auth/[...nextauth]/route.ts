import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/user/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) return null;
        const { user, token } = data.data || {};
        if (!user || !token) return null;
        return {
          id: String(user.id),
          name: user.username as string | undefined,
          email: (user.email as string | null) || undefined,
          accessToken: token as string,
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      const u = user as { accessToken?: string } | undefined;
      if (u?.accessToken)
        (token as Record<string, unknown>).accessToken = u.accessToken;
      return token;
    },
    async session({ session, token }) {
      const t = token as { accessToken?: string };
      const newSession = {
        ...session,
        accessToken: t.accessToken,
      } as typeof session & { accessToken?: string };
      return newSession;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
