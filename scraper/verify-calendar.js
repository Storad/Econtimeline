/**
 * Calendar Verification Script
 *
 * Fetches economic calendar from Investing.com widget and compares
 * to our calendar-data.json to identify missing or mismatched events.
 *
 * Usage:
 *   node verify-calendar.js              # Verify current week
 *   node verify-calendar.js --next-week  # Verify next week
 *   node verify-calendar.js --high-only  # Only check high impact events
 */

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Investing.com widget URL
const INVESTING_URL = 'https://sslecal2.investing.com/';

// Country code for US
const US_COUNTRY_CODE = 5;

// Importance levels
const IMPORTANCE = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// Timezone (UTC = 0, EST = 8)
const TIMEZONE_UTC = 0;

// Calendar type
const CALENDAR_TYPE = {
  DAILY: 'day',
  WEEKLY: 'week',
};

/**
 * Fetch events from Investing.com via their AJAX endpoint
 */
async function fetchInvestingCalendar(options = {}) {
  const { startDate, endDate } = options;

  // Calculate date range (default: this week)
  const today = new Date();
  const start = startDate || new Date(today.setDate(today.getDate() - today.getDay()));
  const end = endDate || new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Use their AJAX calendar endpoint
  const url = 'https://www.investing.com/economic-calendar/Service/getCalendarFilteredData';

  const formData = new URLSearchParams();
  formData.append('country[]', '5'); // US
  formData.append('dateFrom', formatDate(start));
  formData.append('dateTo', formatDate(end));
  formData.append('timeZone', '8'); // EST
  formData.append('timeFilter', 'timeRemain');
  formData.append('currentTab', 'custom');
  formData.append('submitFilters', '1');
  formData.append('limit_from', '0');

  console.log(`Fetching: ${formatDate(start)} to ${formatDate(end)}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://www.investing.com',
      'Referer': 'https://www.investing.com/economic-calendar/',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    // If AJAX fails, try the widget approach
    console.log(`AJAX endpoint returned ${response.status}, trying widget...`);
    return fetchFromWidget(options);
  }

  const json = await response.json();
  const html = json.data || '';
  const $ = cheerio.load(html);

  const events = [];

  $('tr[id^="eventRowId_"]').each((_, tr) => {
    const $tr = $(tr);
    const event = parseEventRow($, $tr);
    if (event.name) {
      events.push(event);
    }
  });

  return events;
}

/**
 * Fallback: fetch from widget
 */
async function fetchFromWidget(options = {}) {
  const { calType = 'week', importance = [1, 2, 3] } = options;

  const url = new URL(INVESTING_URL);
  url.searchParams.set('countries', String(US_COUNTRY_CODE));
  url.searchParams.set('importance', importance.join(','));
  url.searchParams.set('calType', calType);
  url.searchParams.set('timeZone', String(TIMEZONE_UTC));
  url.searchParams.set('lang', '1');

  console.log(`Fetching widget: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.investing.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const events = [];
  let currentDate = null;

  $('#ecEventsTable tbody tr').each((_, tr) => {
    const $tr = $(tr);

    // Check for date header row
    const dateCell = $tr.find('td.theDay');
    if (dateCell.length > 0) {
      const timestamp = dateCell.attr('id')?.replace('theDay', '');
      if (timestamp) {
        currentDate = new Date(parseInt(timestamp, 10) * 1000);
      }
      return;
    }

    // Check for event row
    if ($tr.attr('id')?.includes('eventRowId')) {
      const event = parseEventRow($, $tr);
      event.date = currentDate ? currentDate.toISOString().split('T')[0] : null;
      if (event.name && event.date) {
        events.push(event);
      }
    }
  });

  return events;
}

/**
 * Parse a single event row
 */
function parseEventRow($, $tr) {
  const event = {
    date: $tr.attr('data-event-datetime')?.split(' ')[0] || null,
    time: $tr.find('td.time, td.first.left.time').text().trim() || null,
    name: $tr.find('td.event, td.left.event').text().trim(),
    currency: $tr.find('td.flagCur').text().trim(),
    country: $tr.find('td.flagCur span').first().attr('title') || 'United States',
    actual: $tr.find('td.act, td.bold.act').text().trim() || null,
    forecast: $tr.find('td.fore').text().trim() || null,
    previous: $tr.find('td.prev').text().trim() || null,
    importance: 'low',
  };

  // Determine importance from bull icons
  const bullIcons = $tr.find('td.sentiment i.grayFullBullishIcon').length;
  if (bullIcons >= 3) event.importance = 'high';
  else if (bullIcons === 2) event.importance = 'medium';
  else event.importance = 'low';

  return event;
}

/**
 * Normalize event name for comparison
 */
function normalizeEventName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Event name mappings (Investing.com -> Our calendar)
 */
const NAME_MAPPINGS = {
  'nonfarm payrolls': 'non-farm payrolls',
  'core cpi mm': 'cpi mm',
  'core pce price index mm': 'core pce price index mm',
  'ism manufacturing pmi': 'ism manufacturing pmi',
  'ism services pmi': 'ism services pmi',
  'retail sales mm': 'retail sales mm',
  'gdp growth rate qoq adv': 'gdp qq',
  'gdp growth rate qoq 2nd': 'gdp qq',
  'gdp growth rate qoq final': 'gdp qq',
  'initial jobless claims': 'unemployment claims',
  'continuing jobless claims': 'unemployment claims',
  'michigan consumer sentiment': 'uom consumer sentiment',
  'michigan consumer sentiment final': 'uom consumer sentiment',
  'existing home sales': 'existing home sales',
  'new home sales': 'new home sales',
  'building permits': 'building permits',
  'housing starts': 'housing starts',
  'durable goods orders': 'durable goods orders mm',
  'core durable goods orders': 'durable goods orders mm',
  'ppi mm': 'ppi mm',
  'core ppi mm': 'ppi mm',
  'industrial production mm': 'industrial production mm',
  'fomc interest rate decision': 'fomc rate decision',
  'fed interest rate decision': 'fomc rate decision',
  '10year note auction': '10-year note auction',
  '30year bond auction': '30-year bond auction',
  'jolts job openings': 'jolts job openings',
  'trade balance': 'trade balance',
  'consumer credit': 'consumer credit mm',
  'employment cost index': 'employment cost index qq',
  'nonfarm productivity': 'nonfarm productivity qq',
  'import prices mm': 'import price index mm',
  'philly fed manufacturing index': 'philly fed manufacturing index',
  'empire state manufacturing index': 'empire state manufacturing index',
  'business inventories mm': 'business inventories mm',
  'eia crude oil stocks change': 'crude oil inventories',
  'eia natural gas storage change': 'natural gas storage',
};

/**
 * Compare events and find discrepancies
 */
function compareEvents(investingEvents, ourEvents) {
  const results = {
    matched: [],
    missingFromOurs: [],
    missingFromInvesting: [],
    timeMismatch: [],
    dateMismatch: [],
  };

  // Create lookup maps
  const ourEventsByDate = {};
  for (const event of ourEvents) {
    const key = event.date;
    if (!ourEventsByDate[key]) ourEventsByDate[key] = [];
    ourEventsByDate[key].push(event);
  }

  // Check each Investing.com event
  for (const invEvent of investingEvents) {
    const invName = normalizeEventName(invEvent.name);
    const mappedName = NAME_MAPPINGS[invName] || invName;

    const dateEvents = ourEventsByDate[invEvent.date] || [];

    // Find matching event in our calendar
    const match = dateEvents.find(e => {
      const ourName = normalizeEventName(e.title);
      return ourName === mappedName || ourName.includes(mappedName) || mappedName.includes(ourName);
    });

    if (match) {
      // Check time match (convert to comparable format)
      const invTime = invEvent.time?.replace(':', '') || '';
      const ourTime = match.time?.replace(':', '') || '';

      if (invTime && ourTime && invTime !== ourTime) {
        results.timeMismatch.push({
          name: invEvent.name,
          date: invEvent.date,
          investingTime: invEvent.time,
          ourTime: match.time,
          importance: invEvent.importance,
        });
      } else {
        results.matched.push({
          name: invEvent.name,
          date: invEvent.date,
          importance: invEvent.importance,
        });
      }
    } else {
      results.missingFromOurs.push({
        name: invEvent.name,
        date: invEvent.date,
        time: invEvent.time,
        importance: invEvent.importance,
      });
    }
  }

  return results;
}

/**
 * Main verification function
 */
async function verify() {
  const args = process.argv.slice(2);
  const highOnly = args.includes('--high-only');
  const nextWeek = args.includes('--next-week');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     EconTimeline - Calendar Verification                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Load our calendar data
  const calendarPath = path.join(__dirname, 'calendar-data.json');
  const ourData = JSON.parse(fs.readFileSync(calendarPath, 'utf-8'));
  console.log(`Loaded ${ourData.events.length} events from our calendar\n`);

  // Fetch from Investing.com
  console.log('Fetching from Investing.com...');
  const importance = highOnly ? [3] : [1, 2, 3];
  const investingEvents = await fetchInvestingCalendar({ importance });
  console.log(`Fetched ${investingEvents.length} events from Investing.com\n`);

  // Filter to high impact if requested
  let eventsToCompare = investingEvents;
  if (highOnly) {
    eventsToCompare = investingEvents.filter(e => e.importance === 'high');
    console.log(`Filtered to ${eventsToCompare.length} high-impact events\n`);
  }

  // Get date range
  const dates = eventsToCompare.map(e => e.date).filter(Boolean);
  const minDate = dates.length ? dates.reduce((a, b) => a < b ? a : b) : null;
  const maxDate = dates.length ? dates.reduce((a, b) => a > b ? a : b) : null;

  console.log(`Date range: ${minDate} to ${maxDate}\n`);

  // Filter our events to same date range
  const ourEventsInRange = ourData.events.filter(e =>
    e.date >= minDate && e.date <= maxDate
  );

  // Compare
  const results = compareEvents(eventsToCompare, ourEventsInRange);

  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('VERIFICATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Matched: ${results.matched.length} events`);
  console.log(`❌ Missing from our calendar: ${results.missingFromOurs.length} events`);
  console.log(`⚠️  Time mismatches: ${results.timeMismatch.length} events\n`);

  if (results.missingFromOurs.length > 0) {
    console.log('--- MISSING FROM OUR CALENDAR ---');
    const highMissing = results.missingFromOurs.filter(e => e.importance === 'high');
    const mediumMissing = results.missingFromOurs.filter(e => e.importance === 'medium');

    if (highMissing.length > 0) {
      console.log('\n🔴 HIGH IMPACT:');
      for (const e of highMissing) {
        console.log(`  ${e.date} ${e.time || '     '} | ${e.name}`);
      }
    }

    if (mediumMissing.length > 0 && !highOnly) {
      console.log('\n🟡 MEDIUM IMPACT:');
      for (const e of mediumMissing) {
        console.log(`  ${e.date} ${e.time || '     '} | ${e.name}`);
      }
    }
  }

  if (results.timeMismatch.length > 0) {
    console.log('\n--- TIME MISMATCHES ---');
    for (const e of results.timeMismatch) {
      const imp = e.importance === 'high' ? '🔴' : e.importance === 'medium' ? '🟡' : '⚪';
      console.log(`  ${imp} ${e.date} | ${e.name}`);
      console.log(`      Investing.com: ${e.investingTime} | Ours: ${e.ourTime}`);
    }
  }

  if (results.missingFromOurs.length === 0 && results.timeMismatch.length === 0) {
    console.log('🎉 All events verified successfully!');
  }

  console.log('\n✅ Verification complete!');
}

verify().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
