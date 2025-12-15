import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET - Fetch notifications for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const whereClause: {
      userId: string;
      type: string;
      status?: { in: string[] };
    } = {
      userId,
      type: "IN_APP", // Only fetch in-app notifications
    };

    if (unreadOnly) {
      whereClause.status = { in: ["SENT", "PENDING"] };
    }

    const notifications = await prisma.signalNotification.findMany({
      where: whereClause,
      include: {
        signal: {
          include: {
            strategy: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Get unread count
    const unreadCount = await prisma.signalNotification.count({
      where: {
        userId,
        type: "IN_APP",
        status: { in: ["SENT", "PENDING"] },
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all as read
      await prisma.signalNotification.updateMany({
        where: {
          userId,
          type: "IN_APP",
          status: { in: ["SENT", "PENDING"] },
        },
        data: {
          status: "READ",
          readAt: new Date(),
        },
      });
    } else if (notificationId) {
      // Mark single notification as read
      const notification = await prisma.signalNotification.findUnique({
        where: { id: notificationId },
      });

      if (!notification || notification.userId !== userId) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      await prisma.signalNotification.update({
        where: { id: notificationId },
        data: {
          status: "READ",
          readAt: new Date(),
        },
      });
    } else {
      return NextResponse.json(
        { error: "Notification ID or markAll flag is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
