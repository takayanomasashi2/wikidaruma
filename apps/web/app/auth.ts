// app/auth.ts
import NextAuth, { getServerSession } from "next-auth";
import Google from "next-auth/providers/google";
import type { DefaultSession, AuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";


declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: {
      id?: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
  },
   callbacks: {
    // Existing callbacks
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET, // セッション用のシークレットを設定
};

export const auth = async () => await getServerSession(authOptions);
