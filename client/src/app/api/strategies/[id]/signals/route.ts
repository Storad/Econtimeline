import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch signals for a strategy
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
    const status = searchParams.get("status");

    const whereClause: { strategyId: string; status?: string } = { strategyId: id };
    if (status) {
      whereClause.status = status;
    }

    const signals = await prisma.strategySignal.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ signals });
  } catch (error) {
    console.error("Error fetching strategy signals:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategy signals" },
      { status: 500 }
    );
  }
}

// POST - Create a new signal
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
      type,
      direction,
      ticker,
      price,
      message,
      triggerAt,
      expiresAt,
    } = body;

    if (!type || !ticker || !message) {
      return NextResponse.json(
        { error: "Type, ticker, and message are required" },
        { status: 400 }
      );
    }

    const signal = await prisma.strategySignal.create({
      data: {
        strategyId: id,
        type: type.toUpperCase(),
        direction: direction ? direction.toUpperCase() : null,
        ticker: ticker.toUpperCase(),
        price: price || null,
        message,
        triggerAt: triggerAt ? new Date(triggerAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // If strategy is published, create notifications for subscribers
    if (strategy.isPublished) {
      const subscriptions = await prisma.strategySubscription.findMany({
        where: {
          strategyId: id,
          status: "ACTIVE",
        },
      });

      // Create notifications for each subscriber
      const notifications = subscriptions.flatMap((sub) => {
        const notifs = [];
        if (sub.inApp) {
          notifs.push({
            signalId: signal.id,
            userId: sub.userId,
            type: "IN_APP",
            status: "PENDING",
          });
        }
        if (sub.email) {
          notifs.push({
            signalId: signal.id,
            userId: sub.userId,
            type: "EMAIL",
            status: "PENDING",
          });
        }
        if (sub.push) {
          notifs.push({
            signalId: signal.id,
            userId: sub.userId,
            type: "PUSH",
            status: "PENDING",
          });
        }
        return notifs;
      });

      if (notifications.length > 0) {
        await prisma.signalNotification.createMany({
          data: notifications,
        });
      }

      // Mark signal as triggered if no future trigger time
      if (!triggerAt || new Date(triggerAt) <= new Date()) {
        await prisma.strategySignal.update({
          where: { id: signal.id },
          data: {
            status: "TRIGGERED",
            triggeredAt: new Date(),
          },
        });

        // Mark in-app notifications as sent
        await prisma.signalNotification.updateMany({
          where: {
            signalId: signal.id,
            type: "IN_APP",
          },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ signal });
  } catch (error) {
    console.error("Error creating signal:", error);
    return NextResponse.json(
      { error: "Failed to create signal" },
      { status: 500 }
    );
  }
}

// PUT - Update a signal (cancel, expire, etc.)
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

    const body = await request.json();
    const { signalId, status } = body;

    if (!signalId || !status) {
      return NextResponse.json(
        { error: "Signal ID and status are required" },
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

    // Verify signal belongs to this strategy
    const existingSignal = await prisma.strategySignal.findUnique({
      where: { id: signalId },
    });

    if (!existingSignal || existingSignal.strategyId !== id) {
      return NextResponse.json(
        { error: "Signal not found" },
        { status: 404 }
      );
    }

    const signal = await prisma.strategySignal.update({
      where: { id: signalId },
      data: {
        status: status.toUpperCase(),
        triggeredAt: status === "TRIGGERED" ? new Date() : existingSignal.triggeredAt,
      },
    });

    return NextResponse.json({ signal });
  } catch (error) {
    console.error("Error updating signal:", error);
    return NextResponse.json(
      { error: "Failed to update signal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a signal
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
    const signalId = searchParams.get("signalId");

    if (!signalId) {
      return NextResponse.json(
        { error: "Signal ID is required" },
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

    await prisma.strategySignal.delete({
      where: { id: signalId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting signal:", error);
    return NextResponse.json(
      { error: "Failed to delete signal" },
      { status: 500 }
    );
  }
}
