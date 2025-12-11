/**
 * US Treasury Auctions & Bond Market Events
 *
 * Key auctions:
 * - 4-Week, 8-Week Bills - Weekly (Monday)
 * - 13-Week, 26-Week Bills - Weekly (Monday)
 * - 52-Week Bills - Every 4 weeks
 * - 2-Year Notes - Monthly
 * - 5-Year Notes - Monthly
 * - 7-Year Notes - Monthly
 * - 10-Year Notes - Monthly (HIGH IMPACT)
 * - 30-Year Bonds - Monthly (HIGH IMPACT)
 * - TIPS - Quarterly
 *
 * Also includes:
 * - Treasury Budget Statement - Monthly
 *
 * Source: https://www.treasurydirect.gov/auctions/announcements-data-results/
 *
 * NOTE: 10-Year and 30-Year auctions use hardcoded dates from Treasury schedule
 * because approximate dates are often wrong.
 */

// Hardcoded 10-Year Note auction dates (from Treasury schedule)
// These are typically the Tuesday of the second week of the month
const TEN_YEAR_AUCTIONS = {
  '2025-09': '2025-09-10',
  '2025-10': '2025-10-09',
  '2025-11': '2025-11-06',
  '2025-12': '2025-12-09',
  '2026-01': '2026-01-08',
  '2026-02': '2026-02-11',
  '2026-03': '2026-03-11',
  '2026-04': '2026-04-09',
};

// Hardcoded 30-Year Bond auction dates (from Treasury schedule)
// These are typically the Thursday of the second week of the month
const THIRTY_YEAR_AUCTIONS = {
  '2025-09': '2025-09-12',
  '2025-10': '2025-10-10',
  '2025-11': '2025-11-07',
  '2025-12': '2025-12-11',
  '2026-01': '2026-01-09',
  '2026-02': '2026-02-13',
  '2026-03': '2026-03-13',
  '2026-04': '2026-04-10',
};

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getNextWeekday(date) {
  const d = new Date(date);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  return d;
}

/**
 * Get all Mondays in a month (for weekly bill auctions)
 */
function getMondaysInMonth(year, month) {
  const mondays = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    if (date.getDay() === 1) {
      mondays.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }

  return mondays;
}

/**
 * Generate Treasury auction calendar events
 */
export async function scrapeTreasury() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // 3 months back to 4 months ahead
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Generate for 3 months back to 4 months ahead
  for (let monthOffset = -3; monthOffset <= 4; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    const mondays = getMondaysInMonth(targetYear, targetMonth);

    // Weekly Bill Auctions (every Monday)
    for (const monday of mondays) {
      if (monday < threeMonthsAgo) continue;

      events.push({
        date: formatDate(monday),
        time: '16:30', // 11:30 AM ET = 16:30 UTC (results announced)
        title: '4-Week Bill Auction',
        impact: 'low',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
      });

      events.push({
        date: formatDate(monday),
        time: '16:30',
        title: '8-Week Bill Auction',
        impact: 'low',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
      });
    }

    // 2-Year Note Auction - typically late in month
    const twoYearDate = getNextWeekday(new Date(targetYear, targetMonth, 24));
    if (twoYearDate >= threeMonthsAgo) {
      events.push({
        date: formatDate(twoYearDate),
        time: '18:00', // 1:00 PM ET
        title: '2-Year Note Auction',
        impact: 'medium',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
      });
    }

    // 5-Year Note Auction
    const fiveYearDate = getNextWeekday(new Date(targetYear, targetMonth, 25));
    if (fiveYearDate >= threeMonthsAgo) {
      events.push({
        date: formatDate(fiveYearDate),
        time: '18:00',
        title: '5-Year Note Auction',
        impact: 'medium',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
      });
    }

    // 7-Year Note Auction
    const sevenYearDate = getNextWeekday(new Date(targetYear, targetMonth, 26));
    if (sevenYearDate >= threeMonthsAgo) {
      events.push({
        date: formatDate(sevenYearDate),
        time: '18:00',
        title: '7-Year Note Auction',
        impact: 'medium',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
      });
    }

    // 10-Year Note Auction - use hardcoded dates if available
    const tenYearKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const tenYearDate = TEN_YEAR_AUCTIONS[tenYearKey]
      ? new Date(TEN_YEAR_AUCTIONS[tenYearKey])
      : getNextWeekday(new Date(targetYear, targetMonth, 10)); // Fallback to approximation
    if (tenYearDate >= threeMonthsAgo) {
      events.push({
        date: TEN_YEAR_AUCTIONS[tenYearKey] || formatDate(tenYearDate),
        time: '13:00', // 1:00 PM ET
        title: '10-Year Note Auction',
        impact: 'high',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
        description: 'US Treasury auction for 10-year government notes.',
        whyItMatters: '10-year yield is benchmark for mortgages and corporate bonds. Weak auctions can spike yields.',
      });
    }

    // 30-Year Bond Auction - use hardcoded dates if available
    const thirtyYearKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const thirtyYearDate = THIRTY_YEAR_AUCTIONS[thirtyYearKey]
      ? new Date(THIRTY_YEAR_AUCTIONS[thirtyYearKey])
      : getNextWeekday(new Date(targetYear, targetMonth, 13)); // Fallback to approximation
    if (thirtyYearDate >= threeMonthsAgo) {
      events.push({
        date: THIRTY_YEAR_AUCTIONS[thirtyYearKey] || formatDate(thirtyYearDate),
        time: '12:00', // Noon ET (varies, typically 12:00-13:00)
        title: '30-Year Bond Auction',
        impact: 'high',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
        description: 'US Treasury auction for 30-year government bonds.',
        whyItMatters: 'Key indicator of demand for long-term US government debt.',
      });
    }

    // Treasury Budget Statement - around 10th-12th of month, 2:00 PM ET
    const budgetDate = getNextWeekday(new Date(targetYear, targetMonth, 11));
    if (budgetDate >= threeMonthsAgo) {
      events.push({
        date: formatDate(budgetDate),
        time: '19:00', // 2:00 PM ET
        title: 'Federal Budget Balance',
        impact: 'low',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://fiscaldata.treasury.gov/',
        category: 'fiscal',
      });
    }
  }

  return events;
}
