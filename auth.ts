import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const user = await db.select().from(users).where(eq(users.email, credentials.email as string)).execute()

      if (!user || !user[0]) {
        throw new Error('No user found')
      }

      const passwordValid = await bcrypt.compare(credentials.password as string, user[0].passwordHash as string)
      if (!passwordValid) {
        throw new Error('Password incorrect')
      }

      return { id: user[0].id, email: user[0].email }
    }
  })],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    }
  },
  secret: process.env.AUTH_SECRET,
})
