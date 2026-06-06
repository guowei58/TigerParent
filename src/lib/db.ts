import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when Prisma schema changes so dev hot-reload picks up a fresh client. */
const PRISMA_CLIENT_VERSION = 4;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaVersion: number | undefined;
  pgPool: Pool | undefined;
};

function createPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const useSsl =
    connectionString.includes("sslmode=require") ||
    connectionString.includes("render.com");

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pgPool ?? createPgPool();
  globalForPrisma.pgPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && globalForPrisma.prismaVersion === PRISMA_CLIENT_VERSION) {
    return cached;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaVersion = PRISMA_CLIENT_VERSION;
  return client;
}

export const prisma: PrismaClient = getPrismaClient();
