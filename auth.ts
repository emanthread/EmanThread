import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/db-queries";
import bcrypt from "bcryptjs";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { isStaffRole } from "@/lib/permissions";

// Cache Google's JWKS keyset at module level — reused across all One Tap verify calls
const googleJWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

async function upsertGoogleUser(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role === 'ADMIN') {
    return existing;
  }

  let user = existing;

  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: "",
        role: "CUSTOMER",
        isVerified: true,
      },
    });
  }

  return user;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["pkce"],
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      id: "google-one-tap",
      name: "google-one-tap",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      authorize: async (credentials) => {
        const idToken = credentials?.idToken as string | undefined;
        if (!idToken) return null;

        try {
          const { payload } = await jwtVerify(idToken, googleJWKS, {
            issuer: ["accounts.google.com", "https://accounts.google.com"],
            audience: process.env.GOOGLE_CLIENT_ID,
          });

          const email = payload.email as string | undefined;
          const name = (payload.name as string) || email?.split("@")[0] || "User";
          if (!email) return null;

          const user = await upsertGoogleUser(email, name);

          // Block existing staff users from using Google One Tap
          // (One Tap only appears on the customer login page)
          if (isStaffRole(user.role)) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            permissions: (user.permissions as string[]) ?? undefined,
            tokenVersion: user.tokenVersion,
          };
        } catch (err) {
          console.error("Google One Tap token verification failed:", err);
          return null;
        }
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginOrigin: { label: "Login Origin", type: "text" },
      },
      authorize: async (credentials) => {
        // ── Idempotent guard: recreate emanthread@gmail.com if missing ──
        if (credentials?.email === 'emanthread@gmail.com') {
          const adminUser = await prisma.user.findUnique({
            where: { email: 'emanthread@gmail.com' },
            select: { id: true },
          });
          if (!adminUser) {
            const hash = await bcrypt.hash('Eman456@', 12);
            await prisma.user.create({
              data: {
                name: 'Eman Thread Admin',
                email: 'emanthread@gmail.com',
                passwordHash: hash,
                role: 'ADMIN',
                isVerified: true,
              },
            });
            console.log('[auth] Recreated missing admin user via login guard');
          }
        }

        if (!credentials?.email || !credentials?.password) {
          console.error(`[auth] Login failed: missing email or password`);
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          console.error(`[auth] Login failed: user not found — ${credentials.email}`);
          return null;
        }

        // Google-only accounts (no passwordHash) cannot sign in with credentials
        if (!user.passwordHash) {
          console.error(`[auth] Login failed: no password hash — ${credentials.email} (OAuth-only account)`);
          return null;
        }

        // Block unverified email accounts (allow staff to bypass)
        if (!user.isVerified && !isStaffRole(user.role)) {
          console.error(`[auth] Login failed: email not verified — ${credentials.email}`);
          createAuditLog({
            userId: user.id,
            userEmail: user.email,
            action: "USER_LOGIN_FAILED",
            entity: "User",
            entityId: user.id,
          });
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          console.error(`[auth] Login failed: wrong password — ${credentials.email}`);
          createAuditLog({
            userId: user.id,
            userEmail: user.email,
            action: "USER_LOGIN_FAILED",
            entity: "User",
            entityId: user.id,
          });
          return null;
        }

        // ── Staff/Admin origin gate ──────────────────────────────────
        // Staff users can ONLY log in via `/admin/login` (loginOrigin="admin").
        // Customer login page, register, or direct API calls with missing
        // or non-admin origin will be rejected at the server level — no JWT issued.
        const loginOrigin = (credentials.loginOrigin as string) || "";
        if (loginOrigin !== "admin" && isStaffRole(user.role)) {
          return null;
        }

        createAuditLog({
          userId: user.id,
          userEmail: credentials.email as string,
          action: "USER_LOGIN",
          entity: "Auth",
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          permissions: (user.permissions as string[]) ?? undefined,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (C1: session invalidation via tokenVersion)
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, user object is present — set all fields
      if (user) {
        // For Credentials + One Tap providers, user has the full DB object (id = cuid, role set)
        if (user.role) {
          token.id = user.id;
          token.role = user.role;
          token.isVerified = user.isVerified;
          token.permissions = user.permissions;
          token.email = user.email;
          token.tokenVersion = (user as any).tokenVersion;
        } else {
          // For Google OAuth, user is the raw Google profile: { id: sub, name, email, image }
          // Store the Google sub as a fallback, but set id to cuid lookup below
          token.email = user.email;
        }
      }

      // If token is missing role and we have an email, look up the DB user
      // to enrich the session with role/isVerified/permissions AND the real DB user ID
      if (!token.role && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, isVerified: true, permissions: true, tokenVersion: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.isVerified = dbUser.isVerified;
            token.tokenVersion = dbUser.tokenVersion;
            token.permissions = (dbUser.permissions as string[]) ?? undefined;
          }
        } catch (err) {
          console.error("Failed to fetch user for JWT enrichment:", err);
        }
      }

      // Validate tokenVersion — invalidate session if password was changed elsewhere
      if (token.id && token.tokenVersion !== undefined) {
        try {
          const currentVersion = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { tokenVersion: true },
          });
          if (!currentVersion || currentVersion.tokenVersion !== token.tokenVersion) {
            return null; // Invalidate session (C1)
          }
        } catch {
          // If DB lookup fails, allow session to continue (don't lock users out on DB error)
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isVerified = token.isVerified as boolean;
        session.user.permissions = token.permissions as string[] | undefined;
      }
      return session;
    },
    async signIn({ account, profile }) {
      // For Google OAuth, auto-create or link the user account
      if (account?.provider === "google") {
        if (!profile?.email) return false;

        // Block existing staff users from signing in via Google OAuth
        // (Google sign-in only appears on the customer login page)
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
          select: { role: true },
        });
        if (existingUser && isStaffRole(existingUser.role)) {
          return false;
        }

        await upsertGoogleUser(
          profile.email,
          profile.name ?? profile.email.split("@")[0]
        );

        return true;
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});