import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enable query logging in development for performance debugging
// Set PRISMA_QUERY_LOG=true in .env.local to see all queries with timing
const enableQueryLogging = process.env.NODE_ENV === "development" && process.env.PRISMA_QUERY_LOG === "true";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: enableQueryLogging
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ]
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

// Log queries with execution time in development
if (enableQueryLogging) {
  // @ts-expect-error - Prisma event typing
  prisma.$on("query", (e: { query: string; params: string; duration: number }) => {
    const duration = e.duration;
    const isSlowQuery = duration > 100; // Flag queries over 100ms

    console.log(
      `${isSlowQuery ? "\x1b[31m" : "\x1b[36m"}prisma:query\x1b[0m ${e.query} ${
        isSlowQuery ? `\x1b[31m[${duration}ms] SLOW!\x1b[0m` : `\x1b[90m[${duration}ms]\x1b[0m`
      }`
    );
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
