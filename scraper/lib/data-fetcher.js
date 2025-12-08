/**
 * US Economic Data Value Fetcher
 *
 * Fetches actual/previous values for economic indicators from:
 * - FRED (Federal Reserve Economic Data)
 * - EIA (Energy Information Administration)
 */

import { API_CONFIG, eiaGetCrudeOilInventories, eiaGetNaturalGasStorage } from './api-client.js';

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
 * Fetch latest observations for a FRED series
 * We fetch 3 to calculate both current and previous period changes
 */
async function fetchSeriesData(seriesId) {
  try {
    const url = `${API_CONFIG.fred.baseUrl}/series/observations?series_id=${seriesId}&api_key=${API_CONFIG.fred.apiKey}&file_type=json&sort_order=desc&limit=3`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'EconTimeline/2.0' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const observations = data.observations || [];

    if (observations.length >= 3) {
      return {
        actual: observations[0].value,
        actualDate: observations[0].date,
        previous: observations[1].value,
        previousDate: observations[1].date,
        twoPrior: observations[2].value,  // For calculating previous period's change
        twoPriorDate: observations[2].date,
      };
    } else if (observations.length >= 2) {
      return {
        actual: observations[0].value,
        actualDate: observations[0].date,
        previous: observations[1].value,
        previousDate: observations[1].date,
        twoPrior: null,
        twoPriorDate: null,
      };
    } else if (observations.length === 1) {
      return {
        actual: observations[0].value,
        actualDate: observations[0].date,
        previous: null,
        previousDate: null,
        twoPrior: null,
        twoPriorDate: null,
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
 * Fetch EIA data for energy indicators
 */
async function fetchEIAData() {
  const eiaData = {};

  try {
    // Fetch Crude Oil Inventories
    const crudeData = await eiaGetCrudeOilInventories();
    if (crudeData && crudeData.length >= 2) {
      // EIA returns weekly change in thousands of barrels
      const current = parseFloat(crudeData[0]?.value);
      const previous = parseFloat(crudeData[1]?.value);
      const twoPrior = crudeData[2] ? parseFloat(crudeData[2]?.value) : null;

      if (!isNaN(current) && !isNaN(previous)) {
        // Calculate week-over-week change in millions of barrels
        const change = (current - previous) / 1000;
        const prevChange = twoPrior ? (previous - twoPrior) / 1000 : null;

        eiaData['Crude Oil Inventories'] = {
          actual: `${change >= 0 ? '+' : ''}${change.toFixed(1)}M`,
          previous: prevChange !== null ? `${prevChange >= 0 ? '+' : ''}${prevChange.toFixed(1)}M` : null,
          actualDate: crudeData[0]?.period,
          previousDate: crudeData[1]?.period,
        };
      }
    }
  } catch (error) {
    console.error('  Failed to fetch EIA crude oil data:', error.message);
  }

  try {
    // Fetch Natural Gas Storage
    const gasData = await eiaGetNaturalGasStorage();
    if (gasData && gasData.length >= 2) {
      // EIA returns storage level in Bcf
      const current = parseFloat(gasData[0]?.value);
      const previous = parseFloat(gasData[1]?.value);
      const twoPrior = gasData[2] ? parseFloat(gasData[2]?.value) : null;

      if (!isNaN(current) && !isNaN(previous)) {
        // Calculate week-over-week change in Bcf
        const change = current - previous;
        const prevChange = twoPrior ? previous - twoPrior : null;

        eiaData['Natural Gas Storage'] = {
          actual: `${change >= 0 ? '+' : ''}${change.toFixed(0)} Bcf`,
          previous: prevChange !== null ? `${prevChange >= 0 ? '+' : ''}${prevChange.toFixed(0)} Bcf` : null,
          actualDate: gasData[0]?.period,
          previousDate: gasData[1]?.period,
        };
      }
    }
  } catch (error) {
    console.error('  Failed to fetch EIA natural gas data:', error.message);
  }

  return eiaData;
}

/**
 * Enrich calendar events with actual data values from FRED and EIA
 *
 * Logic:
 * - We fetch the LATEST actual value and the one before it (previous)
 * - For PAST events: Show both Actual and Previous (the values that were current at release time)
 * - For FUTURE events: Show "—" for Actual, show the latest value as Previous
 * - Only events with data sources (FRED/EIA mappings) get values
 */
export async function enrichEventsWithData(events) {
  console.log('  Fetching actual values from FRED and EIA...');

  const seriesCache = new Map();
  const dataCache = new Map(); // Store formatted data by event title
  let fetchCount = 0;

  // Get today's date for comparison
  const today = new Date().toISOString().split('T')[0];

  // Fetch EIA data first
  console.log('  Fetching actual values from EIA...');
  const eiaData = await fetchEIAData();
  console.log(`    Fetched EIA data for ${Object.keys(eiaData).length} series`);

  // Store EIA data in cache
  for (const [title, data] of Object.entries(eiaData)) {
    dataCache.set(title, data);
  }

  // Fetch FRED data for all unique event types
  const uniqueTitles = [...new Set(events.map(e => e.title))];
  for (const title of uniqueTitles) {
    if (dataCache.has(title)) continue; // Already have EIA data

    const config = EVENT_TO_SERIES[title];
    if (!config) continue;

    let data = seriesCache.get(config.seriesId);
    if (!data) {
      data = await fetchSeriesData(config.seriesId);
      seriesCache.set(config.seriesId, data);
      fetchCount++;

      if (fetchCount % 10 === 0) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (data) {
      // "Latest" = most recent release (this becomes "Actual" for past events, "Previous" for future)
      const formattedLatest = formatValue(data.actual, data.previous, config);
      // "Prior" = the one before latest (this becomes "Previous" for past events)
      let formattedPrior = null;
      if (config.unit === 'level') {
        formattedPrior = formatValue(data.previous, null, config);
      } else if (config.unit === 'pct_change' && data.twoPrior) {
        formattedPrior = formatValue(data.previous, data.twoPrior, config);
      } else if (config.unit === 'change' && data.twoPrior) {
        formattedPrior = formatValue(data.previous, data.twoPrior, config);
      }

      dataCache.set(title, {
        latest: formattedLatest,      // Most recent release
        prior: formattedPrior,        // The one before that
        latestDate: data.actualDate,
        priorDate: data.previousDate,
        fredSeriesId: config.seriesId,
      });
    }
  }

  console.log(`    Fetched FRED data for ${seriesCache.size} unique series`);

  // Enrich each event with the latest data values
  // We store BOTH values and let the client determine what to display
  // based on whether the event date/time has passed
  const enrichedEvents = events.map(event => {
    const data = dataCache.get(event.title);

    if (!data) {
      return { ...event, actual: null, previous: null };
    }

    // Store both the latest value and prior value
    // The client will decide what to show based on event date/time:
    // - Past events: actual = latestValue, previous = priorValue
    // - Future events: actual = null (show "—"), previous = latestValue
    return {
      ...event,
      // Store the raw data - client will interpret based on event date
      latestValue: data.latest,      // Most recent released value
      priorValue: data.prior,        // Value before that
      latestDate: data.latestDate,
      priorDate: data.priorDate,
      fredSeriesId: data.fredSeriesId || null,
      // Keep actual/previous null - let client compute
      actual: null,
      previous: null,
    };
  });

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
