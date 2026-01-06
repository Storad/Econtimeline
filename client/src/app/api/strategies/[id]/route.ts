import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch a single strategy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const strategy = await prisma.strategy.findUnique({
      where: { id, userId },
      include: {
        _count: {
          select: {
            trades: true,
          },
        },
      },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      strategy: {
        ...strategy,
        tradeCount: strategy._count.trades,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error("Error fetching strategy:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategy" },
      { status: 500 }
    );
  }
}

// PUT - Update a strategy
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id, userId },
    });

    if (!existingStrategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      status,
      color,
      defaultRiskPercent,
      maxDrawdownPercent,
    } = body;

    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        name: name ?? existingStrategy.name,
        description: description ?? existingStrategy.description,
        type: type ? type.toUpperCase() : existingStrategy.type,
        status: status ?? existingStrategy.status,
        color: color ?? existingStrategy.color,
        defaultRiskPercent: defaultRiskPercent ?? existingStrategy.defaultRiskPercent,
        maxDrawdownPercent: maxDrawdownPercent ?? existingStrategy.maxDrawdownPercent,
      },
    });

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Error updating strategy:", error);
    return NextResponse.json(
      { error: "Failed to update strategy" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a strategy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id, userId },
    });

    if (!existingStrategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    await prisma.strategy.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting strategy:", error);
    return NextResponse.json(
      { error: "Failed to delete strategy" },
      { status: 500 }
    );
  }
}
