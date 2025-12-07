/**
 * EconTimeline - US Economic Data Aggregator v2.0
 *
 * API-based architecture focused on US economic data:
 * - FRED API for US economic release schedules + actual values
 * - FOMC calendar for Fed rate decisions
 * - Treasury auctions
 * - EIA energy data
 * - US market holidays
 *
 * Usage:
 *   node index.js              # Full scrape with data values
 *   node index.js --no-data    # Skip fetching actual values (faster)
 *   node index.js --data-only  # Only update data values (quick refresh)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// US Data Sources
import { scrapeFRED } from './sources/fred.js';
import { scrapeCentralBanks } from './sources/central-banks.js';
import { scrapeTreasury } from './sources/treasury.js';
import { scrapeFedSpeakers } from './sources/fed-speakers.js';
import { scrapeEIA } from './sources/eia.js';
import { scrapeHolidays } from './sources/holidays.js';

// Data value fetcher
import { enrichEventsWithData, fetchDataValuesOnly } from './lib/data-fetcher.js';

// Import indicator metadata
import { getIndicatorInfo } from './lib/indicators.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
const sourceArg = args.find(a => a.startsWith('--source='));
const specificSource = sourceArg ? sourceArg.split('=')[1] : null;
const skipData = args.includes('--no-data');
const dataOnly = args.includes('--data-only');

// All US data sources
const dataSources = {
  fred: {
    name: 'FRED API (US Economic Data)',
    scraper: scrapeFRED,
  },
  fomc: {
    name: 'FOMC Calendar (Fed Rate Decisions + Minutes)',
    scraper: scrapeCentralBanks,
  },
  treasury: {
    name: 'US Treasury Auctions',
    scraper: scrapeTreasury,
  },
  'fed-events': {
    name: 'Fed Events (Beige Book, Testimony, Jackson Hole)',
    scraper: scrapeFedSpeakers,
  },
  eia: {
    name: 'EIA Energy Data (Crude Oil, Natural Gas)',
    scraper: scrapeEIA,
  },
  holidays: {
    name: 'US Market Holidays',
    scraper: scrapeHolidays,
  },
};

// Quick data refresh mode
async function quickDataRefresh() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     EconTimeline - Quick Data Refresh                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const outputPath = path.join(__dirname, 'calendar-data.json');
  const clientOutputPath = path.join(__dirname, '..', 'client', 'public', 'calendar-data.json');

  // Load existing calendar data
  let existingData;
  try {
    existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  } catch (error) {
    console.error('No existing calendar-data.json found. Run full scrape first.');
    process.exit(1);
  }

  // Fetch fresh data values
  const dataValues = await fetchDataValuesOnly();

  // Update events with new data
  const updatedEvents = existingData.events.map(event => {
    const data = dataValues[event.title];
    if (data) {
      return {
        ...event,
        actual: data.actual,
        previous: data.previous,
        actualDate: data.actualDate,
        previousDate: data.previousDate,
        fredSeriesId: data.seriesId,
        dataUpdatedAt: data.fetchedAt,
      };
    }
    return event;
  });

  // Save updated data
  const output = {
    ...existingData,
    lastUpdated: new Date().toISOString(),
    dataRefreshedAt: new Date().toISOString(),
    events: updatedEvents,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${outputPath}`);

  const clientPublicDir = path.dirname(clientOutputPath);
  if (fs.existsSync(clientPublicDir)) {
    fs.writeFileSync(clientOutputPath, JSON.stringify(output, null, 2));
    console.log(`Saved to ${clientOutputPath}`);
  }

  console.log('\n✅ Data refresh complete!');
}

// Full scrape mode
async function fullScrape() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        EconTimeline v2.0 - US Economic Calendar            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const allEvents = [];
  const sourcesToRun = specificSource ? [specificSource] : Object.keys(dataSources);

  console.log(`Running ${sourcesToRun.length} sources...\n`);

  // Process each source
  for (const sourceKey of sourcesToRun) {
    const source = dataSources[sourceKey];
    if (!source) {
      console.error(`Unknown source: ${sourceKey}`);
      continue;
    }

    console.log(`📊 Fetching from ${source.name}...`);

    try {
      const events = await source.scraper();

      // Add metadata to each event
      const enrichedEvents = events.map(event => {
        const indicatorInfo = getIndicatorInfo(event.title);
        return {
          ...event,
          currency: 'USD',
          country: 'US',
          source: event.source || sourceKey,
          // Add indicator metadata
          description: event.description || indicatorInfo.description,
          whyItMatters: event.whyItMatters || indicatorInfo.whyItMatters,
          frequency: event.frequency || indicatorInfo.frequency,
          typicalReaction: event.typicalReaction || indicatorInfo.typicalReaction,
          relatedAssets: event.relatedAssets || indicatorInfo.relatedAssets,
          historicalVolatility: event.historicalVolatility || indicatorInfo.historicalVolatility,
        };
      });

      allEvents.push(...enrichedEvents);
      console.log(`   └─ Found ${events.length} events\n`);
    } catch (error) {
      console.error(`   └─ Error: ${error.message}\n`);
    }
  }

  // Sort by date and time
  allEvents.sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.time || '00:00').localeCompare(b.time || '00:00');
  });

  // Remove duplicates (same event, same date)
  const seen = new Set();
  let uniqueEvents = allEvents.filter(event => {
    const key = `${event.date}-${event.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log('════════════════════════════════════════════════════════════════');
  console.log(`Total unique events: ${uniqueEvents.length}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  // Fetch actual data values from FRED (unless skipped)
  if (!skipData) {
    console.log('📈 Enriching events with actual data values...');
    uniqueEvents = await enrichEventsWithData(uniqueEvents);
    console.log('');
  }

  // Save to files
  const outputPath = path.join(__dirname, 'calendar-data.json');
  const clientOutputPath = path.join(__dirname, '..', 'client', 'public', 'calendar-data.json');

  const output = {
    lastUpdated: new Date().toISOString(),
    version: '2.0',
    region: 'US',
    sources: Object.keys(dataSources),
    dataIncluded: !skipData,
    events: uniqueEvents,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Saved to ${outputPath}`);

  // Also save to client public folder if it exists
  const clientPublicDir = path.dirname(clientOutputPath);
  if (fs.existsSync(clientPublicDir)) {
    fs.writeFileSync(clientOutputPath, JSON.stringify(output, null, 2));
    console.log(`Saved to ${clientOutputPath}`);
  }

  // Print summary by source
  console.log('\n--- Events by Source ---');
  const bySource = {};
  uniqueEvents.forEach(e => {
    const src = e.source || 'unknown';
    if (!bySource[src]) bySource[src] = 0;
    bySource[src]++;
  });
  Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`  ${src}: ${count} events`);
  });

  // Print summary by category
  console.log('\n--- Events by Category ---');
  const byCategory = {};
  uniqueEvents.forEach(e => {
    const cat = e.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = 0;
    byCategory[cat]++;
  });
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} events`);
  });

  // Print upcoming high impact events with data
  console.log('\n--- Upcoming High Impact Events (Next 10) ---');
  const today = new Date();
  const highImpact = uniqueEvents
    .filter(e => e.impact === 'high' && new Date(e.date) >= today)
    .slice(0, 10);

  if (highImpact.length === 0) {
    console.log('  No upcoming high-impact events found.');
  } else {
    highImpact.forEach(e => {
      const dataStr = e.previous ? ` | Prev: ${e.previous}` : '';
      console.log(`  ${e.date} ${e.time || '     '} | ${e.title}${dataStr}`);
    });
  }

  console.log('\n✅ Done!');
}

// Main entry point
async function main() {
  if (dataOnly) {
    await quickDataRefresh();
  } else {
    await fullScrape();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
