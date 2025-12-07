import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low" | "holiday";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
  country?: string;
  source?: string;
  sourceUrl?: string;
  // Enriched metadata
  description?: string;
  whyItMatters?: string;
  frequency?: string;
  typicalReaction?: {
    higherThanExpected?: string;
    lowerThanExpected?: string;
    hawkish?: string;
    dovish?: string;
  };
  relatedAssets?: string[];
  historicalVolatility?: string;
}

interface CalendarData {
  lastUpdated: string;
  eventCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  events: EconomicEvent[];
}

// Try to load data from the public JSON file
async function loadCalendarData(): Promise<CalendarData | null> {
  try {
    // In production, this will be in the public folder
    const filePath = path.join(process.cwd(), "public", "calendar-data.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const rawData = JSON.parse(fileContent);

    // Transform the new scraper format to the expected format
    const events: EconomicEvent[] = (rawData.events || []).map((e: Record<string, unknown>, i: number) => ({
      id: `event-${i}`,
      date: e.date as string,
      time: e.time as string,
      currency: e.currency as string,
      event: e.title as string, // Map 'title' to 'event'
      impact: e.impact as "high" | "medium" | "low" | "holiday",
      forecast: e.forecast as string | null,
      previous: e.previous as string | null,
      actual: e.actual as string | null,
      category: e.category as string,
      country: e.country as string,
      source: e.source as string,
      sourceUrl: e.sourceUrl as string,
      // Enriched metadata
      description: e.description as string,
      whyItMatters: e.whyItMatters as string,
      frequency: e.frequency as string,
      typicalReaction: e.typicalReaction as EconomicEvent["typicalReaction"],
      relatedAssets: e.relatedAssets as string[],
      historicalVolatility: e.historicalVolatility as string,
    }));

    // Calculate date range
    const dates = events.map(e => e.date).sort();

    return {
      lastUpdated: rawData.lastUpdated || new Date().toISOString(),
      eventCount: events.length,
      dateRange: {
        start: dates[0] || new Date().toISOString().split("T")[0],
        end: dates[dates.length - 1] || new Date().toISOString().split("T")[0],
      },
      events,
    };
  } catch (error) {
    console.log("Could not load calendar-data.json, using fallback", error);
    return null;
  }
}

// Return empty data when calendar-data.json is not available
function getEmptyData(): CalendarData {
  const today = new Date().toISOString().split("T")[0];
  return {
    lastUpdated: new Date().toISOString(),
    eventCount: 0,
    dateRange: {
      start: today,
      end: today,
    },
    events: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Load real data from calendar-data.json
  let data = await loadCalendarData();
  const isRealData = data !== null;

  if (!data) {
    data = getEmptyData();
  }

  // Apply filters
  const currency = searchParams.get("currency");
  const impact = searchParams.get("impact");
  const category = searchParams.get("category");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  let filteredEvents = data.events;

  if (currency && currency !== "all") {
    filteredEvents = filteredEvents.filter((e) => e.currency === currency.toUpperCase());
  }

  if (impact && impact !== "all") {
    filteredEvents = filteredEvents.filter((e) => e.impact === impact);
  }

  if (category && category !== "all") {
    filteredEvents = filteredEvents.filter((e) => e.category === category);
  }

  if (startParam) {
    filteredEvents = filteredEvents.filter((e) => e.date >= startParam);
  }

  if (endParam) {
    filteredEvents = filteredEvents.filter((e) => e.date <= endParam);
  }

  return NextResponse.json({
    events: filteredEvents,
    lastUpdated: data.lastUpdated,
    isRealData,
    meta: {
      totalEvents: filteredEvents.length,
      dateRange: data.dateRange,
    },
  });
}

// Force refresh - just returns status since data comes from GitHub Actions
export async function POST() {
  const data = await loadCalendarData();

  if (data) {
    return NextResponse.json({
      success: true,
      message: "Using data from FRED API and other US sources",
      eventCount: data.eventCount,
      lastUpdated: data.lastUpdated,
    });
  } else {
    return NextResponse.json({
      success: false,
      message: "No calendar data available - run the scraper to fetch data",
      eventCount: 0,
    });
  }
}
