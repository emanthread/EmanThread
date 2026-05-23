import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isVerified: boolean;
      permissions?: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    isVerified: boolean;
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    isVerified?: boolean;
    permissions?: string[];
  }
}
