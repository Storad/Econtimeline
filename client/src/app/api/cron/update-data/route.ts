import { NextResponse } from "next/server";

// FRED API configuration
const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = "https://api.stlouisfed.org/fred";

// Event to FRED series mapping
const EVENT_TO_SERIES: Record<string, { seriesId: string; unit: string; label: string }> = {
  "Non-Farm Payrolls": { seriesId: "PAYEMS", unit: "change", label: "K" },
  "Unemployment Rate": { seriesId: "UNRATE", unit: "level", label: "%" },
  "Unemployment Claims": { seriesId: "ICSA", unit: "level", label: "K" },
  "JOLTS Job Openings": { seriesId: "JTSJOL", unit: "level", label: "M" },
  "CPI m/m": { seriesId: "CPIAUCSL", unit: "pct_change", label: "%" },
  "Core CPI m/m": { seriesId: "CPILFESL", unit: "pct_change", label: "%" },
  "PPI m/m": { seriesId: "PPIACO", unit: "pct_change", label: "%" },
  "Core PCE Price Index m/m": { seriesId: "PCEPILFE", unit: "pct_change", label: "%" },
  "GDP q/q": { seriesId: "A191RL1Q225SBEA", unit: "level", label: "%" },
  "Retail Sales m/m": { seriesId: "RSAFS", unit: "pct_change", label: "%" },
  "UoM Consumer Sentiment": { seriesId: "UMCSENT", unit: "level", label: "" },
  "ISM Manufacturing PMI": { seriesId: "NAPM", unit: "level", label: "" },
  "Industrial Production m/m": { seriesId: "INDPRO", unit: "pct_change", label: "%" },
  "Durable Goods Orders m/m": { seriesId: "DGORDER", unit: "pct_change", label: "%" },
  "Empire State Manufacturing Index": { seriesId: "GACDISA066MSFRBNY", unit: "level", label: "" },
  "Housing Starts": { seriesId: "HOUST", unit: "level", label: "K" },
  "Building Permits": { seriesId: "PERMIT", unit: "level", label: "K" },
  "New Home Sales": { seriesId: "HSN1F", unit: "level", label: "K" },
  "Trade Balance": { seriesId: "BOPGSTB", unit: "level", label: "B" },
};

async function fetchSeriesData(seriesId: string) {
  try {
    const url = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`;
    const response = await fetch(url, {
      headers: { "User-Agent": "EconTimeline/2.0" },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const observations = data.observations || [];

    if (observations.length >= 2) {
      return {
        actual: observations[0].value,
        actualDate: observations[0].date,
        previous: observations[1].value,
        previousDate: observations[1].date,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function formatValue(
  value: string | null,
  previousValue: string | null,
  config: { unit: string; label: string }
): string | null {
  if (!value || value === ".") return null;

  const numValue = parseFloat(value);
  const prevValue = previousValue ? parseFloat(previousValue) : null;

  if (config.unit === "pct_change" && prevValue) {
    const pctChange = ((numValue - prevValue) / Math.abs(prevValue)) * 100;
    return `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%`;
  }

  if (config.unit === "change" && prevValue) {
    const change = numValue - prevValue;
    if (config.label === "K") {
      return `${change >= 0 ? "+" : ""}${change.toFixed(0)}K`;
    }
    return `${change >= 0 ? "+" : ""}${change.toFixed(0)}`;
  }

  if (config.label === "%") return `${numValue.toFixed(1)}%`;
  if (config.label === "K") return `${numValue.toFixed(0)}K`;
  if (config.label === "M") return `${(numValue / 1000).toFixed(1)}M`;
  if (config.label === "B") return `${(numValue / 1000).toFixed(1)}B`;

  return numValue.toFixed(1);
}

export async function GET(request: Request) {
  // Verify cron secret for security (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development or if no secret is set
    if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!FRED_API_KEY) {
    return NextResponse.json({ error: "FRED_API_KEY not configured" }, { status: 500 });
  }

  console.log("Fetching latest FRED data values...");

  const results: Record<string, unknown> = {};
  let fetchCount = 0;

  for (const [eventTitle, config] of Object.entries(EVENT_TO_SERIES)) {
    const data = await fetchSeriesData(config.seriesId);

    if (data) {
      const formattedActual = formatValue(data.actual, data.previous, config);
      const formattedPrevious =
        config.unit === "level" ? formatValue(data.previous, null, config) : null;

      results[eventTitle] = {
        seriesId: config.seriesId,
        actual: formattedActual,
        previous: formattedPrevious,
        actualDate: data.actualDate,
        previousDate: data.previousDate,
        fetchedAt: new Date().toISOString(),
      };
      fetchCount++;
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`Fetched ${fetchCount} data series`);

  // Store in KV or return for client-side caching
  return NextResponse.json({
    success: true,
    fetchedAt: new Date().toISOString(),
    seriesCount: fetchCount,
    data: results,
  });
}
