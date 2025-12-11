/**
 * Federal Reserve Speakers & Events Calendar
 *
 * Tracks:
 * - Jackson Hole Symposium
 * - Congressional Testimony (Semi-annual)
 * - Beige Book releases
 * - FOMC Member speeches (scraped from Fed calendar)
 *
 * Source: https://www.federalreserve.gov/newsevents/calendar.htm
 */

import * as cheerio from 'cheerio';

// Jackson Hole Symposium - always late August (Thursday-Saturday)
const JACKSON_HOLE = {
  2024: { start: '2024-08-22', powell: '2024-08-23' },
  2025: { start: '2025-08-21', powell: '2025-08-22' },
  2026: { start: '2026-08-20', powell: '2026-08-21' },
};

// Semi-annual Monetary Policy Testimony (Humphrey-Hawkins)
// Typically February and July
const CONGRESSIONAL_TESTIMONY = {
  2024: [
    { date: '2024-03-06', chamber: 'House' },
    { date: '2024-03-07', chamber: 'Senate' },
    { date: '2024-07-09', chamber: 'Senate' },
    { date: '2024-07-10', chamber: 'House' },
  ],
  2025: [
    { date: '2025-02-11', chamber: 'Senate' },
    { date: '2025-02-12', chamber: 'House' },
    { date: '2025-07-15', chamber: 'Senate' },
    { date: '2025-07-16', chamber: 'House' },
  ],
  2026: [
    { date: '2026-02-10', chamber: 'Senate' },
    { date: '2026-02-11', chamber: 'House' },
    { date: '2026-07-14', chamber: 'Senate' },
    { date: '2026-07-15', chamber: 'House' },
  ],
};

// Beige Book - released 8 times per year, 2 weeks before FOMC
const BEIGE_BOOK_2024 = [
  '2024-01-17',
  '2024-03-06',
  '2024-04-17',
  '2024-05-29',
  '2024-07-17',
  '2024-09-04',
  '2024-10-23',
  '2024-12-04',
];

const BEIGE_BOOK_2025 = [
  '2025-01-15',
  '2025-03-05',
  '2025-04-23',
  '2025-06-04',
  '2025-07-16',
  '2025-09-03',
  '2025-10-22',
  '2025-12-03',
];

const BEIGE_BOOK_2026 = [
  '2026-01-14',
  '2026-03-04',
  '2026-04-22',
  '2026-06-03',
  '2026-07-15',
  '2026-09-02',
  '2026-10-21',
  '2026-12-02',
];

/**
 * Generate Fed speaker and event calendar
 */
export async function scrapeFedSpeakers() {
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3 months back to 6 months ahead
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const isInRange = (dateStr) => {
    const date = new Date(dateStr);
    return date >= threeMonthsAgo && date <= sixMonthsLater;
  };

  // Jackson Hole Symposium
  Object.entries(JACKSON_HOLE).forEach(([year, dates]) => {
    if (isInRange(dates.start)) {
      events.push({
        date: dates.start,
        time: '08:00',
        title: 'Jackson Hole Symposium Begins',
        impact: 'medium',
        category: 'central_bank',
        description: 'Annual Federal Reserve economic policy symposium in Jackson Hole, Wyoming.',
        frequency: 'Annual (late August)',
      });
    }
    if (isInRange(dates.powell)) {
      events.push({
        date: dates.powell,
        time: '10:00',
        title: 'Fed Chair Powell Speaks at Jackson Hole',
        impact: 'high',
        category: 'central_bank',
        description: 'Fed Chair\'s keynote speech at Jackson Hole. Historically used to signal major policy shifts.',
        typicalReaction: {
          hawkish: 'USD bullish, stocks bearish, bonds bearish',
          dovish: 'USD bearish, stocks bullish, bonds bullish'
        },
        frequency: 'Annual (late August)',
      });
    }
  });

  // Congressional Testimony
  Object.entries(CONGRESSIONAL_TESTIMONY).forEach(([year, testimonies]) => {
    testimonies.forEach(t => {
      if (isInRange(t.date)) {
        events.push({
          date: t.date,
          time: '10:00',
          title: `Fed Chair Powell Testifies (${t.chamber})`,
          impact: 'high',
          category: 'central_bank',
          description: `Semi-annual monetary policy testimony to the ${t.chamber}. Two days of Q&A on Fed policy.`,
          typicalReaction: {
            hawkish: 'USD bullish, stocks bearish',
            dovish: 'USD bearish, stocks bullish'
          },
          frequency: 'Semi-annual (Feb and Jul)',
        });
      }
    });
  });

  // Beige Book
  [...BEIGE_BOOK_2024, ...BEIGE_BOOK_2025, ...BEIGE_BOOK_2026].forEach(date => {
    if (isInRange(date)) {
      events.push({
        date,
        time: '14:00',
        title: 'Fed Beige Book',
        impact: 'medium',
        category: 'central_bank',
        description: 'Summary of economic conditions across the 12 Federal Reserve districts based on anecdotal reports.',
        typicalReaction: {
          hawkish: 'USD mildly bullish',
          dovish: 'USD mildly bearish'
        },
        frequency: '8 times per year (2 weeks before FOMC)',
      });
    }
  });

  // Add common metadata
  const enrichedEvents = events.map(e => ({
    ...e,
    currency: 'USD',
    country: 'US',
    source: 'fed',
    sourceUrl: 'https://www.federalreserve.gov/newsevents/calendar.htm',
  }));

  // Scrape upcoming Fed speeches from the Fed calendar
  const scrapedSpeeches = await scrapeFedCalendar();
  enrichedEvents.push(...scrapedSpeeches);

  return enrichedEvents;
}

/**
 * Scrape FOMC member speeches from Fed calendar
 */
async function scrapeFedCalendar() {
  const events = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Scrape current and next 2 months
  const monthsToScrape = [];
  for (let i = 0; i <= 2; i++) {
    const targetDate = new Date(currentYear, currentMonth + i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    monthsToScrape.push({ year, month });
  }

  for (const { year, month } of monthsToScrape) {
    try {
      const url = `https://www.federalreserve.gov/newsevents/${year}-${month}.htm`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'EconTimeline/2.0' }
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      // Parse speech entries
      $('.panel, .row, .eventlist__event, .calendar__event').each((i, elem) => {
        const text = $(elem).text();

        // Look for FOMC member names
        const fomcMembers = [
          'Powell', 'Bowman', 'Waller', 'Jefferson', 'Cook', 'Kugler', 'Barr',
          'Williams', 'Goolsbee', 'Harker', 'Bostic', 'Daly', 'Musalem',
          'Hammack', 'Kashkari', 'Collins', 'Barkin', 'Logan', 'Schmid'
        ];

        for (const member of fomcMembers) {
          if (text.includes(member) && (text.toLowerCase().includes('speak') || text.toLowerCase().includes('remarks') || text.toLowerCase().includes('speech'))) {
            // Try to extract date from nearby elements or text
            const dateMatch = text.match(/([A-Z][a-z]+)\s+(\d{1,2})/);
            if (dateMatch) {
              const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'];
              const monthIndex = monthNames.indexOf(dateMatch[1].toLowerCase());
              if (monthIndex !== -1) {
                const eventDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dateMatch[2]).padStart(2, '0')}`;

                // Extract time if available
                const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i);
                let time = '10:00'; // Default
                if (timeMatch) {
                  let hours = parseInt(timeMatch[1]);
                  if (timeMatch[3].toLowerCase().includes('p') && hours !== 12) hours += 12;
                  if (timeMatch[3].toLowerCase().includes('a') && hours === 12) hours = 0;
                  time = `${String(hours).padStart(2, '0')}:${timeMatch[2]}`;
                }

                events.push({
                  date: eventDate,
                  time,
                  title: `FOMC Member ${member} Speaks`,
                  impact: member === 'Powell' ? 'high' : 'medium',
                  category: 'central_bank',
                  currency: 'USD',
                  country: 'US',
                  source: 'fed',
                  sourceUrl: url,
                  description: `Federal Reserve official ${member} speaking engagement.`,
                  typicalReaction: {
                    hawkish: 'USD bullish, stocks bearish',
                    dovish: 'USD bearish, stocks bullish'
                  },
                });
              }
            }
          }
        }
      });

      // Small delay between requests
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`  Error scraping Fed calendar for ${month} ${year}: ${error.message}`);
    }
  }

  // Deduplicate
  const seen = new Set();
  return events.filter(e => {
    const key = `${e.date}-${e.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default scrapeFedSpeakers;
