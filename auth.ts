import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import {prisma} from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Role } from "@prisma/client";


 
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {strategy:"jwt"},
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID! as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET! as string,

    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      if (token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } })
        if (dbUser && dbUser.role && token.role !== dbUser.role) {
          token.role = dbUser.role
          console.log(`token role : ${token.role} and dbUser role : ${dbUser.role}`)
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as Role;
        console.log("session role now ", session.user.role)
      }
      return session;
    }
  },
  
});
