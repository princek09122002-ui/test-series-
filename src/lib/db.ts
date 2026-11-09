import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
const globalForDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalForDb.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 8000,
    }),
  });
if (process.env.NODE_ENV !== "production") globalForDb.prisma = db;
