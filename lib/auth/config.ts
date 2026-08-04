import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { seedSystemCategories } from "@/lib/auth/system-categories";
import { seedStarterCollections } from "@/lib/auth/starter-collections";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/auth/email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Account takeover risk — never auto-link in production
      allowDangerousEmailAccountLinking: process.env.NODE_ENV !== "production",
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: process.env.NODE_ENV !== "production",
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = normalizeEmail(String(credentials.email));
        const { ok } = await rateLimit(`creds:${email}`, 10, 60_000, {
          failClosed: true,
        });
        // Same null as bad password — no rate-limit oracle.
        if (!ok) return null;
        // Must use the same normalised address as the rate-limit key above;
        // looking up the raw input meant anyone who registered with a capital
        // could not sign in by typing their address in lower case.
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        return valid ? user : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Relative same-app paths only (/he|/en); block external open redirects
      if (url.startsWith("/")) {
        if (/^\/(he|en)(\/|$)/.test(url) && !url.startsWith("//")) {
          return `${baseUrl}${url}`;
        }
        return `${baseUrl}/he/app`;
      }
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) {
          const path = `${target.pathname}${target.search}`;
          if (/^\/(he|en)(\/|$)/.test(path)) return url;
        }
      } catch {
        /* ignore */
      }
      return `${baseUrl}/he/app`;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await seedSystemCategories(prisma, user.id);
      await seedStarterCollections(prisma, user.id);
    },
  },
});
