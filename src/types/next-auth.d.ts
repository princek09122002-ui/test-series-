import "next-auth";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    sessionId: string;
    sessionVersion: number;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    sessionId?: string;
    sessionVersion?: number;
  }
}
