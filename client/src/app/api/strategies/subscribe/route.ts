import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// POST - Subscribe or update subscription to a strategy
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { strategyId, inApp, email, push, action } = body;

    if (!strategyId) {
      return NextResponse.json(
        { error: "Strategy ID is required" },
        { status: 400 }
      );
    }

    // Verify strategy exists and is published
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    // Can't subscribe to own strategy
    if (strategy.userId === userId) {
      return NextResponse.json(
        { error: "Cannot subscribe to your own strategy" },
        { status: 400 }
      );
    }

    // Only published strategies can be subscribed to
    if (!strategy.isPublished) {
      return NextResponse.json(
        { error: "Strategy is not available for subscription" },
        { status: 400 }
      );
    }

    // Handle unsubscribe
    if (action === "unsubscribe") {
      await prisma.strategySubscription.deleteMany({
        where: {
          strategyId,
          userId,
        },
      });
      return NextResponse.json({ success: true, subscribed: false });
    }

    // Create or update subscription
    const subscription = await prisma.strategySubscription.upsert({
      where: {
        strategyId_userId: {
          strategyId,
          userId,
        },
      },
      update: {
        inApp: inApp ?? true,
        email: email ?? false,
        push: push ?? false,
        status: "ACTIVE",
      },
      create: {
        strategyId,
        userId,
        inApp: inApp ?? true,
        email: email ?? false,
        push: push ?? false,
      },
    });

    return NextResponse.json({ subscription, subscribed: true });
  } catch (error) {
    console.error("Error managing subscription:", error);
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 }
    );
  }
}

// GET - Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await prisma.strategySubscription.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        strategy: {
          include: {
            _count: {
              select: {
                trades: true,
                subscriptions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
