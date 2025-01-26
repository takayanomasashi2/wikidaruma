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
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  adapter: PrismaAdapter(prisma), // Prisma のアダプターを設定
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // JWT コールバック - ユーザー情報をトークンに追加
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // Google 認証後の user.id をトークンに保存
      }
      return token;
    },
    // セッションコールバック - セッションにユーザーIDを追加
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // セッション用のシークレットを設定
};

export const auth = async () => await getServerSession(authOptions);
