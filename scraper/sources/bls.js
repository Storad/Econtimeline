/**
 * Bureau of Labor Statistics (BLS) Economic Calendar
 *
 * BLS blocks automated scraping, so we generate the schedule programmatically
 * based on known release patterns:
 *
 * - Employment Situation (NFP): First Friday of the month @ 8:30 AM ET
 * - CPI: ~10th-15th of the month @ 8:30 AM ET
 * - PPI: Usually day after CPI @ 8:30 AM ET
 * - Jobless Claims: Every Thursday @ 8:30 AM ET
 * - JOLTS: ~First week of month @ 10:00 AM ET
 *
 * Source: https://www.bls.gov/schedule/
 */

/**
 * Generate BLS economic calendar events
 */
export async function scrapeBLS() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Generate events for current month + next 3 months
  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Non-Farm Payrolls & Unemployment Rate (First Friday of the month)
    const nfpDate = getFirstFriday(targetYear, targetMonth);
    events.push({
      date: formatDate(nfpDate),
      time: '08:30',
      title: 'Non-Farm Payrolls',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'bls',
      sourceUrl: 'https://www.bls.gov/schedule/news_release/empsit.htm',
      category: 'employment',
    });
    events.push({
      date: formatDate(nfpDate),
      time: '08:30',
      title: 'Unemployment Rate',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'bls',
      sourceUrl: 'https://www.bls.gov/schedule/news_release/empsit.htm',
      category: 'employment',
    });

    // CPI (typically around the 10th-15th)
    const cpiDate = new Date(targetYear, targetMonth, 12);
    // Adjust to nearest weekday
    if (cpiDate.getDay() === 0) cpiDate.setDate(cpiDate.getDate() + 1);
    if (cpiDate.getDay() === 6) cpiDate.setDate(cpiDate.getDate() + 2);
    events.push({
      date: formatDate(cpiDate),
      time: '08:30',
      title: 'CPI m/m',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'bls',
      sourceUrl: 'https://www.bls.gov/schedule/news_release/cpi.htm',
      category: 'inflation',
    });
    events.push({
      date: formatDate(cpiDate),
      time: '08:30',
      title: 'Core CPI m/m',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'bls',
      sourceUrl: 'https://www.bls.gov/schedule/news_release/cpi.htm',
      category: 'inflation',
    });

    // PPI (typically day after CPI)
    const ppiDate = new Date(cpiDate);
    ppiDate.setDate(ppiDate.getDate() + 1);
    if (ppiDate.getDay() === 0) ppiDate.setDate(ppiDate.getDate() + 1);
    if (ppiDate.getDay() === 6) ppiDate.setDate(ppiDate.getDate() + 2);
    events.push({
      date: formatDate(ppiDate),
      time: '08:30',
      title: 'PPI m/m',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'bls',
      sourceUrl: 'https://www.bls.gov/schedule/news_release/ppi.htm',
      category: 'inflation',
    });

    // JOLTS (first Tuesday or Wednesday of month, ~5 weeks after reference period)
    const joltsDate = new Date(targetYear, targetMonth, 7);
    while (joltsDate.getDay() !== 2) { // Find Tuesday
      joltsDate.setDate(joltsDate.getDate() + 1);
    }
    events.push({
      date: formatDate(joltsDate),
      time: '10:00',
      title: 'JOLTS Job Openings',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'bls',
      sourceUrl: 'https://www.bls.gov/schedule/news_release/jolts.htm',
      category: 'employment',
    });

    // Weekly Jobless Claims (every Thursday)
    const firstThursday = new Date(targetYear, targetMonth, 1);
    while (firstThursday.getDay() !== 4) {
      firstThursday.setDate(firstThursday.getDate() + 1);
    }

    // Add all Thursdays in the month
    const thursday = new Date(firstThursday);
    while (thursday.getMonth() === targetMonth) {
      events.push({
        date: formatDate(thursday),
        time: '08:30',
        title: 'Unemployment Claims',
        impact: 'medium',
        currency: 'USD',
        country: 'US',
        source: 'bls',
        sourceUrl: 'https://www.bls.gov/ui/home.htm',
        category: 'employment',
      });
      thursday.setDate(thursday.getDate() + 7);
    }
  }

  // Filter to only include future events or events within the past week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}

/**
 * Get the first Friday of a given month
 */
function getFirstFriday(year, month) {
  const date = new Date(year, month, 1);
  while (date.getDay() !== 5) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}
