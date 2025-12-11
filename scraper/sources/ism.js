/**
 * ISM (Institute for Supply Management) Economic Calendar
 *
 * Key releases:
 * - ISM Manufacturing PMI - HIGH IMPACT (1st business day of month)
 * - ISM Services PMI - HIGH IMPACT (3rd business day of month)
 * - ISM Manufacturing Prices - MEDIUM IMPACT
 * - ISM Manufacturing Employment - MEDIUM IMPACT
 *
 * Source: https://www.ismworld.org
 */

/**
 * Get the nth business day of a month
 */
function getNthBusinessDay(year, month, n) {
  const date = new Date(year, month, 1);
  let businessDays = 0;

  while (businessDays < n) {
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      businessDays++;
      if (businessDays === n) break;
    }
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Generate ISM economic calendar events
 */
export async function scrapeISM() {
  const events = [];
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // 3 months back to 6 months ahead
  const threeMonthsAgo = new Date(currentDate);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Generate for 3 months back to 6 months ahead
  for (let monthOffset = -3; monthOffset <= 6; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset + 12) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // ISM Manufacturing PMI - 1st business day of month, 10:00 AM ET
    const mfgDate = getNthBusinessDay(targetYear, targetMonth, 1);
    events.push({
      date: formatDate(mfgDate),
      time: '15:00', // 10:00 AM ET = 15:00 UTC
      title: 'ISM Manufacturing PMI',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'ism',
      sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/',
      category: 'manufacturing',
    });

    // ISM Manufacturing sub-indices (same day)
    events.push({
      date: formatDate(mfgDate),
      time: '15:00',
      title: 'ISM Manufacturing Prices',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'ism',
      sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/',
      category: 'manufacturing',
    });

    events.push({
      date: formatDate(mfgDate),
      time: '15:00',
      title: 'ISM Manufacturing Employment',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'ism',
      sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/',
      category: 'employment',
    });

    events.push({
      date: formatDate(mfgDate),
      time: '15:00',
      title: 'ISM Manufacturing New Orders',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'ism',
      sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/',
      category: 'manufacturing',
    });

    // ISM Services PMI - 3rd business day of month, 10:00 AM ET
    const svcDate = getNthBusinessDay(targetYear, targetMonth, 3);
    events.push({
      date: formatDate(svcDate),
      time: '15:00',
      title: 'ISM Services PMI',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'ism',
      sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/',
      category: 'services',
    });

    events.push({
      date: formatDate(svcDate),
      time: '15:00',
      title: 'ISM Services Prices',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'ism',
      sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/',
      category: 'services',
    });

    events.push({
      date: formatDate(svcDate),
      time: '15:00',
      title: 'ISM Services Employment',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'ism',
      sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/',
      category: 'employment',
    });
  }

  // Filter to date range (3 months back to 6 months ahead)
  const sixMonthsLater = new Date(currentDate);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const filtered = events.filter(e => {
    const date = new Date(e.date);
    return date >= threeMonthsAgo && date <= sixMonthsLater;
  });

  console.log(`  Generated ${filtered.length} ISM events`);
  return filtered;
}
