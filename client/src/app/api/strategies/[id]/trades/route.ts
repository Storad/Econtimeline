import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch trades for a strategy
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

    // Verify access
    const strategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    if (strategy.userId !== userId && !strategy.isPublished) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isBacktest = searchParams.get("isBacktest");

    const whereClause: { strategyId: string; isBacktest?: boolean } = { strategyId: id };
    if (isBacktest !== null) {
      whereClause.isBacktest = isBacktest === "true";
    }

    const trades = await prisma.strategyTrade.findMany({
      where: whereClause,
      include: {
        trade: true, // Include linked Trade if exists
      },
      orderBy: [{ date: "desc" }, { time: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("Error fetching strategy trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategy trades" },
      { status: 500 }
    );
  }
}

// POST - Add a trade to a strategy
export async function POST(
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
    const strategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy || strategy.userId !== userId) {
      return NextResponse.json(
        { error: "Strategy not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      tradeId, // If linking an existing trade
      date,
      time,
      ticker,
      direction,
      entryPrice,
      exitPrice,
      size,
      pnl,
      notes,
      isBacktest,
    } = body;

    // If linking an existing trade
    if (tradeId) {
      // Verify the trade exists and belongs to the user
      const existingTrade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!existingTrade || existingTrade.userId !== userId) {
        return NextResponse.json(
          { error: "Trade not found or unauthorized" },
          { status: 404 }
        );
      }

      // Check if already linked
      const existingLink = await prisma.strategyTrade.findFirst({
        where: { strategyId: id, tradeId },
      });

      if (existingLink) {
        return NextResponse.json(
          { error: "Trade is already linked to this strategy" },
          { status: 400 }
        );
      }

      // Create the link using the trade's data
      const strategyTrade = await prisma.strategyTrade.create({
        data: {
          strategyId: id,
          tradeId,
          date: existingTrade.date,
          time: existingTrade.time,
          ticker: existingTrade.ticker,
          direction: existingTrade.direction,
          entryPrice: existingTrade.entryPrice,
          exitPrice: existingTrade.exitPrice,
          size: existingTrade.size,
          pnl: existingTrade.pnl,
          notes: existingTrade.notes,
          isBacktest: false, // Linked trades are live
        },
        include: {
          trade: true,
        },
      });

      return NextResponse.json({ trade: strategyTrade });
    }

    // Manual trade entry
    if (!date || !ticker || !direction || pnl === undefined) {
      return NextResponse.json(
        { error: "Date, ticker, direction, and P&L are required" },
        { status: 400 }
      );
    }

    const strategyTrade = await prisma.strategyTrade.create({
      data: {
        strategyId: id,
        date,
        time: time || null,
        ticker: ticker.toUpperCase(),
        direction: direction.toUpperCase(),
        entryPrice: entryPrice || null,
        exitPrice: exitPrice || null,
        size: size || null,
        pnl,
        notes: notes || null,
        isBacktest: isBacktest ?? false,
      },
    });

    return NextResponse.json({ trade: strategyTrade });
  } catch (error) {
    console.error("Error adding strategy trade:", error);
    return NextResponse.json(
      { error: "Failed to add strategy trade" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a trade from a strategy
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

    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get("tradeId");

    if (!tradeId) {
      return NextResponse.json(
        { error: "Trade ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership of strategy
    const strategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy || strategy.userId !== userId) {
      return NextResponse.json(
        { error: "Strategy not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete the strategy trade
    await prisma.strategyTrade.delete({
      where: { id: tradeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing strategy trade:", error);
    return NextResponse.json(
      { error: "Failed to remove strategy trade" },
      { status: 500 }
    );
  }
}
