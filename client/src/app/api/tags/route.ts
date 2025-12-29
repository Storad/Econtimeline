import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// Default system tags - colors match preset palette
const DEFAULT_TAGS = [
  // Setup tags
  { name: "Breakout", type: "SETUP", color: "#3b82f6" },
  { name: "Reversal", type: "SETUP", color: "#8b5cf6" },
  { name: "Trend", type: "SETUP", color: "#06b6d4" },
  { name: "Scalp", type: "SETUP", color: "#f97316" },
  { name: "News Play", type: "SETUP", color: "#ef4444" },
  { name: "Range", type: "SETUP", color: "#22c55e" },
  { name: "Fade", type: "SETUP", color: "#ec4899" },
  // Emotion tags
  { name: "Confident", type: "EMOTION", color: "#22c55e" },
  { name: "Disciplined", type: "EMOTION", color: "#06b6d4" },
  { name: "FOMO", type: "EMOTION", color: "#ef4444" },
  { name: "Revenge", type: "EMOTION", color: "#ef4444" },
  { name: "Anxious", type: "EMOTION", color: "#f97316" },
  { name: "Impatient", type: "EMOTION", color: "#eab308" },
];

// Initialize default tags if they don't exist
async function ensureDefaultTags() {
  const existingSystemTags = await prisma.tag.findMany({
    where: { userId: null },
  });

  if (existingSystemTags.length === 0) {
    await prisma.tag.createMany({
      data: DEFAULT_TAGS.map((tag) => ({
        ...tag,
        userId: null,
      })),
    });
  }
}

// GET - Fetch all tags (system + user custom)
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure default tags exist
    await ensureDefaultTags();

    // Get system tags (userId = null) and user's custom tags
    const tags = await prisma.tag.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST - Create a custom tag
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    // Check if tag already exists for this user
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: name.trim(),
        OR: [{ userId: null }, { userId }],
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "Tag already exists" },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        userId,
        name: name.trim(),
        type: "CUSTOM",
        color: color || "#6b7280",
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom tag (only user's own tags)
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
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    // Verify it's a user's custom tag
    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    if (existingTag.userId === null) {
      return NextResponse.json(
        { error: "Cannot delete system tags" },
        { status: 403 }
      );
    }

    if (existingTag.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
