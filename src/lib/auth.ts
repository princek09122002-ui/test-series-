import { cache } from "react";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { credentialsSchema } from "@/lib/domain/validation";
import { AppError, rateLimit } from "@/lib/security";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db as unknown as Parameters<typeof PrismaAdapter>[0]),
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        await rateLimit(`login:${parsed.data.email}`, 12);
        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        // Constant-cost hash check for unknown users limits account timing disclosure.
        const valid = await compare(
          parsed.data.password,
          user?.passwordHash ??
            "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
        );
        if (!user || !valid || !user.passwordHash || user.disabled) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (
        account?.provider === "google" &&
        !(profile as { email_verified?: boolean })?.email_verified
      )
        return false;
      const existing = user.id
        ? await db.user.findUnique({ where: { id: user.id } })
        : null;
      return !existing?.disabled;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const current = await db.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        token.sessionId = randomUUID();
        token.sessionVersion = current.sessionVersion;
        await db.session.create({
          data: {
            sessionToken: token.sessionId,
            userId: user.id,
            expires: new Date(Date.now() + 7 * 86400000),
          },
        });
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.sessionId = token.sessionId ?? "";
      session.sessionVersion = token.sessionVersion ?? -1;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.sessionId)
        await db.session.deleteMany({
          where: { sessionToken: token.sessionId },
        });
    },
  },
};
export const currentUser = cache(async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.sessionId) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user || user.disabled || user.sessionVersion !== session.sessionVersion)
    return null;
  const record = await db.session.findUnique({
    where: { sessionToken: session.sessionId },
  });
  if (!record || record.userId !== user.id || record.expires < new Date())
    return null;
  return user;
});
export async function requireUser(page = false) {
  const user = await currentUser();
  if (!user) {
    if (page) redirect("/login");
    throw new AppError("Please sign in", 401);
  }
  return user;
}
export async function requireStaff(adminOnly = false, page = false) {
  const user = await requireUser(page);
  if (user.role !== "ADMIN" && (adminOnly || user.role !== "EDITOR")) {
    if (page) redirect("/dashboard");
    throw new AppError("You do not have permission", 403);
  }
  return user;
}
