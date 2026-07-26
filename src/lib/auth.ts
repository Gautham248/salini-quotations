import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

declare module "next-auth" {
  interface Session { user: { id: number; role: string; name?: string | null; email?: string | null; image?: string | null; }; }
  interface User { role: string; }
}
declare module "next-auth/jwt" { interface JWT { id: number; role: string; } }

export const authConfig: NextAuthConfig = {
  providers: [Credentials({
    credentials: { username: {}, password: {} },
    async authorize(credentials) {
      if (!credentials?.username || !credentials?.password) return null;
      const u = await db.user.findUnique({ where: { username: (credentials.username as string) } });
      if (!u || !u.isActive) return null;
      if (!await bcrypt.compare(credentials.password as string, u.passwordHash)) return null;
      return { id: String(u.id), name: u.username, role: u.role as string };
    }
  })],
  callbacks: {
    jwt({ token, user }) { if (user) { token.id = Number(user.id); token.role = user.role; } return token; },
    session({ session, token }) {
      if (session.user) { (session.user as unknown as Record<string, unknown>).id = token.id; (session.user as unknown as Record<string, unknown>).role = token.role; }
      return session;
    }
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
