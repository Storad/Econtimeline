import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();

  const health: {
    status: "ok" | "degraded" | "down";
    timestamp: string;
    uptime: number;
    database: "connected" | "disconnected";
    responseTime?: number;
    error?: string;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: "disconnected",
  };

  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    health.database = "connected";
  } catch (error) {
    health.status = "degraded";
    health.database = "disconnected";
    health.error = error instanceof Error ? error.message : "Database connection failed";
  }

  health.responseTime = Date.now() - startTime;

  const statusCode = health.status === "ok" ? 200 : health.status === "degraded" ? 503 : 500;

  return NextResponse.json(health, { status: statusCode });
}
