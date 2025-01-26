// app/auth.ts:
import NextAuth, { getServerSession } from "next-auth"
import Google from "next-auth/providers/google"
import type { DefaultSession, AuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: {
      id?: string
    } & DefaultSession["user"]
  }
}

export const authOptions: AuthOptions = {
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}

export const auth = async () => await getServerSession(authOptions)