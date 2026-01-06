import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch strategies for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const strategies = await prisma.strategy.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        _count: {
          select: {
            trades: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to include counts
    const transformedStrategies = strategies.map((strategy) => ({
      ...strategy,
      tradeCount: strategy._count.trades,
      _count: undefined,
    }));

    return NextResponse.json({ strategies: transformedStrategies });
  } catch (error) {
    console.error("Error fetching strategies:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategies" },
      { status: 500 }
    );
  }
}

// POST - Create a new strategy
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      color,
      defaultRiskPercent,
      maxDrawdownPercent,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    const strategy = await prisma.strategy.create({
      data: {
        userId,
        name,
        description: description || null,
        type: type.toUpperCase(),
        color: color || "#3b82f6",
        defaultRiskPercent: defaultRiskPercent || null,
        maxDrawdownPercent: maxDrawdownPercent || null,
      },
    });

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Error creating strategy:", error);
    return NextResponse.json(
      { error: "Failed to create strategy" },
      { status: 500 }
    );
  }
}
