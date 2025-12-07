import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch all trade notes for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for date query param to get a specific note
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (date) {
      // Get single note for a specific date
      const note = await prisma.tradeNote.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      });
      return NextResponse.json({ note });
    }

    // Get all notes for the user
    const notes = await prisma.tradeNote.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching trade notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch trade notes" },
      { status: 500 }
    );
  }
}

// POST - Create or update a trade note
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, trades, pnl, note } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Upsert - create if doesn't exist, update if it does
    const tradeNote = await prisma.tradeNote.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        trades: trades !== undefined ? trades : null,
        pnl: pnl !== undefined ? pnl : null,
        note: note !== undefined ? note : null,
      },
      create: {
        userId,
        date,
        trades: trades || null,
        pnl: pnl || null,
        note: note || null,
      },
    });

    return NextResponse.json({ note: tradeNote });
  } catch (error) {
    console.error("Error saving trade note:", error);
    return NextResponse.json(
      { error: "Failed to save trade note" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a trade note
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    await prisma.tradeNote.delete({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trade note:", error);
    return NextResponse.json(
      { error: "Failed to delete trade note" },
      { status: 500 }
    );
  }
}
