import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

declare module "next-auth" {
  interface Session { user: { id: number; role: string; storeId: number | null; name?: string | null; email?: string | null; image?: string | null; }; }
  interface User { role: string; storeId: number | null; }
}
declare module "next-auth/jwt" { interface JWT { id: number; role: string; storeId: number | null; } }

export const authConfig: NextAuthConfig = {
  providers: [Credentials({
    credentials: { username: {}, password: {} },
    async authorize(credentials) {
      if (!credentials?.username || !credentials?.password) return null;
      try {
        const u = await db.user.findUnique({ where: { username: (credentials.username as string) } });
        if (!u || !u.isActive) {
          console.warn(`Auth failed: User '${credentials.username}' not found or inactive.`);
          return null;
        }
        const isValidPassword = await bcrypt.compare(credentials.password as string, u.passwordHash);
        if (!isValidPassword) {
          console.warn(`Auth failed: Invalid password for user '${credentials.username}'.`);
          return null;
        }
        return { id: String(u.id), name: u.username, role: u.role as string, storeId: u.storeId ?? null };
      } catch (error) {
        console.error("Database or authentication error during authorize:", error);
        return null;
      }
    }
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
        token.role = user.role;
        token.storeId = user.storeId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).id = token.id;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).storeId = token.storeId;
      }
      return session;
    }
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
