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

// Generate mock data as fallback
function generateMockData(): CalendarData {
  const events: EconomicEvent[] = [];
  const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD"];

  const eventTemplates = [
    { name: "CPI (MoM)", category: "Inflation", impact: "high" as const },
    { name: "CPI (YoY)", category: "Inflation", impact: "high" as const },
    { name: "Core CPI (MoM)", category: "Inflation", impact: "high" as const },
    { name: "Interest Rate Decision", category: "Interest Rates", impact: "high" as const },
    { name: "GDP (QoQ)", category: "GDP", impact: "high" as const },
    { name: "Non-Farm Payrolls", category: "Employment", impact: "high" as const },
    { name: "Unemployment Rate", category: "Employment", impact: "high" as const },
    { name: "Retail Sales (MoM)", category: "Consumer", impact: "medium" as const },
    { name: "PMI Manufacturing", category: "Manufacturing", impact: "medium" as const },
    { name: "PMI Services", category: "Manufacturing", impact: "medium" as const },
    { name: "Trade Balance", category: "Trade", impact: "medium" as const },
    { name: "Consumer Confidence", category: "Sentiment", impact: "medium" as const },
    { name: "Building Permits", category: "Housing", impact: "low" as const },
    { name: "Industrial Production (MoM)", category: "Manufacturing", impact: "medium" as const },
    { name: "Central Bank Governor Speaks", category: "Speeches", impact: "medium" as const },
    { name: "Crude Oil Inventories", category: "Energy", impact: "low" as const },
    { name: "Initial Jobless Claims", category: "Employment", impact: "medium" as const },
    { name: "PPI (MoM)", category: "Inflation", impact: "medium" as const },
    { name: "Existing Home Sales", category: "Housing", impact: "low" as const },
    { name: "Durable Goods Orders", category: "Manufacturing", impact: "medium" as const },
  ];

  const times = ["08:30", "09:00", "10:00", "10:30", "11:00", "13:30", "14:00", "15:00", "19:00"];

  let eventId = 0;
  const now = new Date();
  const startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayOfWeek = currentDate.getDay();

    const numEvents = dayOfWeek === 0 || dayOfWeek === 6
      ? Math.floor(Math.random() * 2)
      : Math.floor(Math.random() * 6) + 2;

    const usedTemplates = new Set<number>();

    for (let i = 0; i < numEvents; i++) {
      let templateIndex;
      do {
        templateIndex = Math.floor(Math.random() * eventTemplates.length);
      } while (usedTemplates.has(templateIndex) && usedTemplates.size < eventTemplates.length);

      usedTemplates.add(templateIndex);
      const template = eventTemplates[templateIndex];
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      const time = times[Math.floor(Math.random() * times.length)];

      const isPercent = template.name.includes("Rate") || template.name.includes("MoM") || template.name.includes("YoY") || template.name.includes("QoQ");
      const baseValue = isPercent ? (Math.random() * 5 - 1).toFixed(1) : (Math.random() * 500).toFixed(1);
      const unit = isPercent ? "%" : template.name.includes("Claims") ? "K" : template.name.includes("Balance") ? "B" : "";

      const isPast = new Date(dateStr) < new Date();

      events.push({
        id: `event-${eventId++}`,
        date: dateStr,
        time,
        currency,
        event: template.name,
        impact: template.impact,
        forecast: `${baseValue}${unit}`,
        previous: `${(parseFloat(baseValue) + (Math.random() - 0.5)).toFixed(1)}${unit}`,
        actual: isPast ? `${(parseFloat(baseValue) + (Math.random() - 0.5) * 0.5).toFixed(1)}${unit}` : null,
        category: template.category,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return {
    lastUpdated: new Date().toISOString(),
    eventCount: events.length,
    dateRange: {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    },
    events,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Try to load real data, fall back to mock
  let data = await loadCalendarData();
  const isRealData = data !== null;

  if (!data) {
    data = generateMockData();
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
      message: "Using scraped data from Forex Factory",
      eventCount: data.eventCount,
      lastUpdated: data.lastUpdated,
    });
  } else {
    return NextResponse.json({
      success: true,
      message: "Using mock data - run the scraper to get real data",
      eventCount: 0,
    });
  }
}
