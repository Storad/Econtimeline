/**
 * FRED Data Value Fetcher
 *
 * Fetches actual/previous values for economic indicators from FRED.
 * Maps calendar events to their corresponding FRED series IDs.
 */

import { API_CONFIG } from './api-client.js';

// Map event titles to FRED series IDs
// Using month-over-month percent change series where applicable
const EVENT_TO_SERIES = {
  // Employment - these are already in the right units
  'Non-Farm Payrolls': { seriesId: 'PAYEMS', unit: 'change', label: 'K' },  // Monthly change in thousands
  'Unemployment Rate': { seriesId: 'UNRATE', unit: 'level', label: '%' },   // Unemployment Rate (%)
  'Unemployment Claims': { seriesId: 'ICSA', unit: 'level', label: 'K' },   // Initial Claims (thousands)
  'JOLTS Job Openings': { seriesId: 'JTSJOL', unit: 'level', label: 'M' },  // Job Openings (millions)

  // Inflation - use percent change series
  'CPI m/m': { seriesId: 'CPIAUCSL', unit: 'pct_change', label: '%' },
  'Core CPI m/m': { seriesId: 'CPILFESL', unit: 'pct_change', label: '%' },
  'PPI m/m': { seriesId: 'PPIACO', unit: 'pct_change', label: '%' },
  'Core PCE Price Index m/m': { seriesId: 'PCEPILFE', unit: 'pct_change', label: '%' },

  // GDP & Growth
  'GDP q/q': { seriesId: 'A191RL1Q225SBEA', unit: 'level', label: '%' },  // Real GDP percent change

  // Consumer
  'Retail Sales m/m': { seriesId: 'RSAFS', unit: 'pct_change', label: '%' },
  'UoM Consumer Sentiment': { seriesId: 'UMCSENT', unit: 'level', label: '' },

  // Manufacturing - index values
  'ISM Manufacturing PMI': { seriesId: 'NAPM', unit: 'level', label: '' },
  // ISM Services PMI not directly on FRED - skip it
  'Industrial Production m/m': { seriesId: 'INDPRO', unit: 'pct_change', label: '%' },
  'Durable Goods Orders m/m': { seriesId: 'DGORDER', unit: 'pct_change', label: '%' },
  'Empire State Manufacturing Index': { seriesId: 'GACDISA066MSFRBNY', unit: 'level', label: '' },

  // Housing
  'Housing Starts': { seriesId: 'HOUST', unit: 'level', label: 'K' },
  'Building Permits': { seriesId: 'PERMIT', unit: 'level', label: 'K' },
  'New Home Sales': { seriesId: 'HSN1F', unit: 'level', label: 'K' },

  // Trade
  'Trade Balance': { seriesId: 'BOPGSTB', unit: 'level', label: 'B' },
};

/**
 * Fetch latest observation for a FRED series
 */
async function fetchSeriesData(seriesId) {
  try {
    const url = `${API_CONFIG.fred.baseUrl}/series/observations?series_id=${seriesId}&api_key=${API_CONFIG.fred.apiKey}&file_type=json&sort_order=desc&limit=2`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'EconTimeline/2.0' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const observations = data.observations || [];

    if (observations.length >= 2) {
      return {
        actual: observations[0].value,
        actualDate: observations[0].date,
        previous: observations[1].value,
        previousDate: observations[1].date,
      };
    } else if (observations.length === 1) {
      return {
        actual: observations[0].value,
        actualDate: observations[0].date,
        previous: null,
        previousDate: null,
      };
    }

    return null;
  } catch (error) {
    console.error(`  Failed to fetch ${seriesId}: ${error.message}`);
    return null;
  }
}

/**
 * Calculate percent change between two values
 */
function calcPercentChange(current, previous) {
  if (!current || !previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Format value based on indicator configuration
 */
function formatValue(value, previousValue, config) {
  if (value === null || value === '.' || value === undefined) {
    return null;
  }

  const numValue = parseFloat(value);
  const prevValue = previousValue ? parseFloat(previousValue) : null;

  // Handle percent change calculations (for m/m series)
  if (config.unit === 'pct_change' && prevValue) {
    const pctChange = calcPercentChange(numValue, prevValue);
    if (pctChange !== null) {
      return `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`;
    }
    return null;
  }

  // Handle monthly change (like NFP)
  if (config.unit === 'change' && prevValue) {
    const change = numValue - prevValue;
    if (config.label === 'K') {
      return `${change >= 0 ? '+' : ''}${change.toFixed(0)}K`;
    }
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}`;
  }

  // Level values with formatting
  if (config.label === '%') {
    return `${numValue.toFixed(1)}%`;
  }

  if (config.label === 'K') {
    return `${numValue.toFixed(0)}K`;
  }

  if (config.label === 'M') {
    return `${(numValue / 1000).toFixed(1)}M`;  // FRED often stores in thousands
  }

  if (config.label === 'B') {
    return `${(numValue / 1000).toFixed(1)}B`;  // Billions
  }

  // Default: just return the number
  return numValue.toFixed(1);
}

/**
 * Enrich calendar events with actual data values from FRED
 */
export async function enrichEventsWithData(events) {
  console.log('  Fetching actual values from FRED...');

  const enrichedEvents = [];
  const seriesCache = new Map();
  let fetchCount = 0;

  for (const event of events) {
    const config = EVENT_TO_SERIES[event.title];

    if (config) {
      // Check cache first
      let data = seriesCache.get(config.seriesId);

      if (!data) {
        data = await fetchSeriesData(config.seriesId);
        seriesCache.set(config.seriesId, data);
        fetchCount++;

        // Rate limiting - small delay between requests
        if (fetchCount % 10 === 0) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (data) {
        // For percent change series, we need 3 observations to show current and previous change
        const formattedActual = formatValue(data.actual, data.previous, config);
        const formattedPrevious = config.unit === 'level'
          ? formatValue(data.previous, null, config)
          : null;  // For change series, previous is implicit in calculation

        enrichedEvents.push({
          ...event,
          actual: formattedActual,
          previous: formattedPrevious,
          actualDate: data.actualDate,
          previousDate: data.previousDate,
          fredSeriesId: config.seriesId,
        });
        continue;
      }
    }

    // No data available, keep event as-is
    enrichedEvents.push({
      ...event,
      actual: null,
      previous: null,
    });
  }

  console.log(`    Fetched data for ${seriesCache.size} unique series`);
  return enrichedEvents;
}

/**
 * Get just the data values for events (for quick updates)
 */
export async function fetchDataValuesOnly() {
  console.log('Fetching latest FRED data values...');

  const results = {};

  for (const [eventTitle, config] of Object.entries(EVENT_TO_SERIES)) {
    const data = await fetchSeriesData(config.seriesId);

    if (data) {
      const formattedActual = formatValue(data.actual, data.previous, config);
      const formattedPrevious = config.unit === 'level'
        ? formatValue(data.previous, null, config)
        : null;

      results[eventTitle] = {
        seriesId: config.seriesId,
        actual: formattedActual,
        previous: formattedPrevious,
        actualDate: data.actualDate,
        previousDate: data.previousDate,
        fetchedAt: new Date().toISOString(),
      };
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`Fetched ${Object.keys(results).length} data series`);
  return results;
}

export default {
  enrichEventsWithData,
  fetchDataValuesOnly,
  EVENT_TO_SERIES,
};
