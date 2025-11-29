import * as cheerio from "cheerio";

export interface EconomicEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or "All Day" or "Tentative"
  currency: string;
  event: string;
  impact: "high" | "medium" | "low" | "holiday";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  category: string;
}

// Map Forex Factory impact classes to our impact levels
function parseImpact(impactClass: string): EconomicEvent["impact"] {
  if (impactClass.includes("red") || impactClass.includes("high")) return "high";
  if (impactClass.includes("ora") || impactClass.includes("medium")) return "medium";
  if (impactClass.includes("yel") || impactClass.includes("low")) return "low";
  if (impactClass.includes("gra") || impactClass.includes("holiday")) return "holiday";
  return "low";
}

// Categorize events based on keywords
function categorizeEvent(eventName: string): string {
  const name = eventName.toLowerCase();

  if (name.includes("interest rate") || name.includes("rate decision") || name.includes("monetary policy")) {
    return "Interest Rates";
  }
  if (name.includes("employment") || name.includes("jobless") || name.includes("payroll") || name.includes("unemployment") || name.includes("jobs")) {
    return "Employment";
  }
  if (name.includes("cpi") || name.includes("inflation") || name.includes("ppi") || name.includes("price index")) {
    return "Inflation";
  }
  if (name.includes("gdp") || name.includes("growth")) {
    return "GDP";
  }
  if (name.includes("retail sales") || name.includes("consumer")) {
    return "Consumer";
  }
  if (name.includes("pmi") || name.includes("manufacturing") || name.includes("industrial")) {
    return "Manufacturing";
  }
  if (name.includes("trade") || name.includes("export") || name.includes("import") || name.includes("balance")) {
    return "Trade";
  }
  if (name.includes("housing") || name.includes("home") || name.includes("building")) {
    return "Housing";
  }
  if (name.includes("speak") || name.includes("conference") || name.includes("testimony") || name.includes("minutes")) {
    return "Speeches";
  }
  if (name.includes("oil") || name.includes("inventory") || name.includes("crude")) {
    return "Energy";
  }
  if (name.includes("sentiment") || name.includes("confidence")) {
    return "Sentiment";
  }

  return "Other";
}

// Parse date from Forex Factory format
function parseForexFactoryDate(dateStr: string, year: number): string {
  // Forex Factory uses formats like "Mon Jan 15" or just continues from previous date
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  };

  const match = dateStr.match(/([A-Za-z]{3})\s+(\d{1,2})/);
  if (match) {
    const month = months[match[1]] || "01";
    const day = match[2].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

// Generate a URL for Forex Factory calendar
function getForexFactoryUrl(startDate: Date, endDate: Date): string {
  const formatDate = (d: Date) => {
    const month = d.toLocaleString("en-US", { month: "short" }).toLowerCase();
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month}${day}.${year}`;
  };

  return `https://www.forexfactory.com/calendar?range=${formatDate(startDate)}-${formatDate(endDate)}`;
}

export async function scrapeForexFactory(startDate: Date, endDate: Date): Promise<EconomicEvent[]> {
  const url = getForexFactoryUrl(startDate, endDate);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: EconomicEvent[] = [];

    let currentDate = "";
    let currentYear = startDate.getFullYear();
    let eventId = 0;

    // Forex Factory calendar table rows
    $(".calendar__row").each((_, row) => {
      const $row = $(row);

      // Check for date cell
      const dateCell = $row.find(".calendar__date span");
      if (dateCell.length && dateCell.text().trim()) {
        const dateText = dateCell.text().trim();
        const parsedDate = parseForexFactoryDate(dateText, currentYear);
        if (parsedDate) {
          currentDate = parsedDate;
          // Handle year rollover
          if (parsedDate.includes("-01-") && currentDate.includes("-12-")) {
            currentYear++;
            currentDate = parseForexFactoryDate(dateText, currentYear);
          }
        }
      }

      // Skip if no date context
      if (!currentDate) return;

      // Get event data
      const currency = $row.find(".calendar__currency").text().trim();
      const eventName = $row.find(".calendar__event span").text().trim();

      if (!currency || !eventName) return;

      // Get time
      let time = $row.find(".calendar__time").text().trim();
      if (!time || time === "") time = "All Day";

      // Convert 12h to 24h format
      if (time.includes("am") || time.includes("pm")) {
        const isPM = time.includes("pm");
        const timeParts = time.replace(/[ap]m/i, "").trim().split(":");
        let hours = parseInt(timeParts[0]);
        const minutes = timeParts[1] || "00";

        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        time = `${hours.toString().padStart(2, "0")}:${minutes}`;
      }

      // Get impact
      const impactSpan = $row.find(".calendar__impact span");
      const impactClass = impactSpan.attr("class") || "";
      const impact = parseImpact(impactClass);

      // Get forecast, previous, actual
      const forecast = $row.find(".calendar__forecast span").text().trim() || null;
      const previous = $row.find(".calendar__previous span").text().trim() || null;
      const actual = $row.find(".calendar__actual span").text().trim() || null;

      events.push({
        id: `event-${eventId++}`,
        date: currentDate,
        time,
        currency,
        event: eventName,
        impact,
        forecast,
        previous,
        actual,
        category: categorizeEvent(eventName),
      });
    });

    return events;
  } catch (error) {
    console.error("Error scraping Forex Factory:", error);
    throw error;
  }
}

// Generate mock data for development/fallback
export function generateMockData(startDate: Date, endDate: Date): EconomicEvent[] {
  const events: EconomicEvent[] = [];
  const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD"];
  const impacts: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];

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
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayOfWeek = currentDate.getDay();

    // Skip weekends (fewer events)
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

      // Generate realistic forecast/previous values
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

  // Sort by date and time
  return events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
}
