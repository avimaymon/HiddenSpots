import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
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
  },
  events: {
    async createUser({ user }) {
      // Seed system categories for new users
      if (!user.id) return;
      await prisma.category.createMany({
        data: SYSTEM_CATEGORIES.map((c) => ({ ...c, userId: user.id, isSystem: true })),
        skipDuplicates: true,
      });
    },
  },
});

const SYSTEM_CATEGORIES = [
  { name: "Spring", icon: "droplets", color: "#06b6d4" },
  { name: "Waterfall", icon: "waves", color: "#3b82f6" },
  { name: "Viewpoint", icon: "eye", color: "#8b5cf6" },
  { name: "Hiking Trail", icon: "footprints", color: "#22c55e" },
  { name: "Beach", icon: "umbrella", color: "#f59e0b" },
  { name: "Picnic Area", icon: "trees", color: "#84cc16" },
  { name: "Camping Site", icon: "tent", color: "#f97316" },
  { name: "Bike Trail", icon: "bike", color: "#ec4899" },
  { name: "Photography Spot", icon: "camera", color: "#a855f7" },
  { name: "Fishing Spot", icon: "fish", color: "#0891b2" },
  { name: "Sunrise", icon: "sunrise", color: "#fb923c" },
  { name: "Sunset", icon: "sunset", color: "#f43f5e" },
  { name: "Hidden Gem", icon: "gem", color: "#14b8a6" },
  { name: "Other", icon: "map-pin", color: "#6b7280" },
];
