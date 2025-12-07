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
 */

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

    // 10-Year Note Auction - around 8th-12th of month
    const tenYearDate = getNextWeekday(new Date(targetYear, targetMonth, 10));
    if (tenYearDate >= threeMonthsAgo) {
      events.push({
        date: formatDate(tenYearDate),
        time: '18:00',
        title: '10-Year Note Auction',
        impact: 'high',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
      });
    }

    // 30-Year Bond Auction - around 12th-14th of month
    const thirtyYearDate = getNextWeekday(new Date(targetYear, targetMonth, 13));
    if (thirtyYearDate >= threeMonthsAgo) {
      events.push({
        date: formatDate(thirtyYearDate),
        time: '18:00',
        title: '30-Year Bond Auction',
        impact: 'high',
        currency: 'USD',
        country: 'US',
        source: 'treasury',
        sourceUrl: 'https://www.treasurydirect.gov/auctions/announcements-data-results/',
        category: 'bonds',
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
