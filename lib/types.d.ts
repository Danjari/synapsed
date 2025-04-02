// types/next-auth.d.ts

import { Role } from "@prisma/client";


declare module "next-auth" {
  interface Session {
    user: {
      name: string;
      email: string;
      image: string;
      role: Role; // 👈 this adds support for `session.user.role`
    };
  }

  interface User {
    role: Role; // 👈 this makes it available in the user object
  }
}

declare module "next-auth/jwt" {
  interface JWT {
     role: Role;
}
}