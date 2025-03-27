// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { User } from "@/models/schemas";

export const authOptions = {
  // Configure MongoDB Adapter - Auth.js will create the necessary collections
  adapter: MongoDBAdapter(clientPromise),
  
  // Configure authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find the user in the database
          const user = await User.findOne({ email: credentials.email });
          
          if (!user || !user.password) {
            return null;
          }
          
          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          
          if (!isPasswordValid) {
            return null;
          }
          
          // Return user object (gets encoded in JWT)
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Error in authorize function:", error);
          return null;
        }
      }
    })
  ],
  
  // Use JWT strategy
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Callbacks to customize authentication behavior
  callbacks: {
    // Add role to JWT token
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async jwt({ token, user, account, profile, trigger, session }) {
      // Initial sign in
      if (user) {
        token.role = user.role;
      }
      
      // Session update
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      
      return token;
    },
    
    // Add role information to session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role || "student"; // Default to student
      }
      return session;
    },
    
    // Handle role assignment for new Google users
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Find or create user document
          let dbUser = await User.findOne({ email: profile.email });
          
          if (!dbUser) {
            // Create new user with student role by default
            dbUser = await User.create({
              email: profile.email,
              name: profile.name,
              image: profile.picture,
              role: "student", // Default role
            });
          }
          
          // Transfer role to the sign-in user object
          user.role = dbUser.role;
          
        } catch (error) {
          console.error("Error handling Google sign in:", error);
          // Still allow sign in even if our custom logic fails
        }
      }
      
      return true;
    },
  },
  
  // Custom pages
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  
  // Useful for debugging
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };