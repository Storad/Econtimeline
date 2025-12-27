import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch trades for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereClause: { userId: string; date?: string | { gte?: string; lte?: string } } = { userId };

    if (date) {
      // Get trades for a specific date
      whereClause.date = date;
    } else if (startDate && endDate) {
      // Get trades for a date range
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const trades = await prisma.trade.findMany({
      where: whereClause,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { time: "desc" }, { createdAt: "desc" }],
    });

    // Transform to flatten tags
    const transformedTrades = trades.map((trade) => ({
      ...trade,
      tags: trade.tags.map((tt) => tt.tag),
    }));

    return NextResponse.json({ trades: transformedTrades });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

// POST - Create a new trade
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      date, time, ticker, direction, entryPrice, exitPrice, size, pnl, notes, tagIds,
      // New fields
      assetType, status, closeDate,
      // Options fields
      optionType, strikePrice, expirationDate, premium, underlyingTicker
    } = body;

    // For open trades, P&L is optional. For closed trades, P&L is required.
    const tradeStatus = status || "CLOSED";
    if (!date || !ticker || !direction) {
      return NextResponse.json(
        { error: "Date, ticker, and direction are required" },
        { status: 400 }
      );
    }
    if (tradeStatus === "CLOSED" && pnl === undefined) {
      return NextResponse.json(
        { error: "P&L is required for closed trades" },
        { status: 400 }
      );
    }

    // Create trade with tags
    const trade = await prisma.trade.create({
      data: {
        userId,
        date,
        time: time || null,
        ticker: ticker.toUpperCase(),
        direction: direction.toUpperCase(),
        entryPrice: entryPrice || null,
        exitPrice: exitPrice || null,
        size: size || null,
        pnl: pnl ?? 0,
        notes: notes || null,
        // New fields
        assetType: assetType || "STOCK",
        status: tradeStatus,
        closeDate: closeDate || null,
        // Options fields
        optionType: optionType || null,
        strikePrice: strikePrice || null,
        expirationDate: expirationDate || null,
        premium: premium || null,
        underlyingTicker: underlyingTicker || null,
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId: string) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      trade: {
        ...trade,
        tags: trade.tags.map((tt) => tt.tag),
      },
    });
  } catch (error) {
    console.error("Error creating trade:", error);
    return NextResponse.json(
      { error: "Failed to create trade" },
      { status: 500 }
    );
  }
}

// PUT - Update a trade
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id, date, time, ticker, direction, entryPrice, exitPrice, size, pnl, notes, tagIds,
      // New fields
      assetType, status, closeDate,
      // Options fields
      optionType, strikePrice, expirationDate, premium, underlyingTicker
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Trade ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingTrade = await prisma.trade.findUnique({
      where: { id },
    });

    if (!existingTrade || existingTrade.userId !== userId) {
      return NextResponse.json(
        { error: "Trade not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update trade and replace tags
    const trade = await prisma.$transaction(async (tx) => {
      // Delete existing tags
      await tx.tradeTag.deleteMany({
        where: { tradeId: id },
      });

      // Update trade and create new tags
      return tx.trade.update({
        where: { id },
        data: {
          date: date || existingTrade.date,
          time: time !== undefined ? time : existingTrade.time,
          ticker: ticker ? ticker.toUpperCase() : existingTrade.ticker,
          direction: direction ? direction.toUpperCase() : existingTrade.direction,
          entryPrice: entryPrice !== undefined ? entryPrice : existingTrade.entryPrice,
          exitPrice: exitPrice !== undefined ? exitPrice : existingTrade.exitPrice,
          size: size !== undefined ? size : existingTrade.size,
          pnl: pnl !== undefined ? pnl : existingTrade.pnl,
          notes: notes !== undefined ? notes : existingTrade.notes,
          // New fields
          assetType: assetType !== undefined ? assetType : existingTrade.assetType,
          status: status !== undefined ? status : existingTrade.status,
          closeDate: closeDate !== undefined ? closeDate : existingTrade.closeDate,
          // Options fields
          optionType: optionType !== undefined ? optionType : existingTrade.optionType,
          strikePrice: strikePrice !== undefined ? strikePrice : existingTrade.strikePrice,
          expirationDate: expirationDate !== undefined ? expirationDate : existingTrade.expirationDate,
          premium: premium !== undefined ? premium : existingTrade.premium,
          underlyingTicker: underlyingTicker !== undefined ? underlyingTicker : existingTrade.underlyingTicker,
          tags: tagIds?.length
            ? {
                create: tagIds.map((tagId: string) => ({
                  tagId,
                })),
              }
            : undefined,
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      trade: {
        ...trade,
        tags: trade.tags.map((tt) => tt.tag),
      },
    });
  } catch (error) {
    console.error("Error updating trade:", error);
    return NextResponse.json(
      { error: "Failed to update trade" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a trade
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Trade ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingTrade = await prisma.trade.findUnique({
      where: { id },
    });

    if (!existingTrade || existingTrade.userId !== userId) {
      return NextResponse.json(
        { error: "Trade not found or unauthorized" },
        { status: 404 }
      );
    }

    await prisma.trade.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trade:", error);
    return NextResponse.json(
      { error: "Failed to delete trade" },
      { status: 500 }
    );
  }
}
