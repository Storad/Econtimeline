import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Preset tag suggestions - users can also type custom tags
const PRESET_TAGS = [
  // Setup tags
  "Breakout", "Reversal", "Trend", "Scalp", "News Play", "Range", "Fade",
  // Emotion tags
  "Confident", "Disciplined", "FOMO", "Revenge", "Anxious", "Impatient",
];

// GET - Return preset tag suggestions
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ tags: PRESET_TAGS });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
