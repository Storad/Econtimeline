/**
 * NAR (National Association of Realtors) Economic Calendar
 *
 * Key releases:
 * - Existing Home Sales - MEDIUM IMPACT (typically 3rd-4th week of month)
 *
 * Note: NAR data is not available through FRED API (proprietary)
 * Dates are approximated based on typical release patterns
 *
 * Source: https://www.nar.realtor/research-and-statistics/housing-statistics/existing-home-sales
 */

// Hardcoded Existing Home Sales dates (from NAR schedule)
// Typically released around 19th-23rd of each month
const EXISTING_HOME_SALES = {
  '2025-09': '2025-09-19',
  '2025-10': '2025-10-23',
  '2025-11': '2025-11-21',
  '2025-12': '2025-12-19',
  '2026-01': '2026-01-23',
  '2026-02': '2026-02-20',
  '2026-03': '2026-03-20',
  '2026-04': '2026-04-23',
};

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get approximate release date for Existing Home Sales
 * Typically 3rd Friday or Thursday of the month
 */
function getApproximateReleaseDate(year, month) {
  // Target around the 20th-23rd of the month
  const date = new Date(year, month, 20);
  // Move to nearest weekday
  if (date.getDay() === 0) date.setDate(date.getDate() + 1);
  if (date.getDay() === 6) date.setDate(date.getDate() + 2);
  return date;
}

/**
 * Generate NAR economic calendar events
 */
export async function scrapeNAR() {
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3 months back to 6 months ahead
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Generate for 3 months back to 6 months ahead
  for (let monthOffset = -3; monthOffset <= 6; monthOffset++) {
    const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Use hardcoded date if available, otherwise approximate
    const releaseDateStr = EXISTING_HOME_SALES[monthKey];
    const releaseDate = releaseDateStr
      ? new Date(releaseDateStr)
      : getApproximateReleaseDate(year, month);

    if (releaseDate >= threeMonthsAgo && releaseDate <= sixMonthsLater) {
      events.push({
        date: releaseDateStr || formatDate(releaseDate),
        time: '10:00',
        title: 'Existing Home Sales',
        impact: 'medium',
        category: 'housing',
        currency: 'USD',
        country: 'US',
        source: 'nar',
        sourceUrl: 'https://www.nar.realtor/research-and-statistics/housing-statistics/existing-home-sales',
        description: 'Monthly count of existing home sales from the National Association of Realtors.',
        whyItMatters: 'Key indicator of housing market health. Represents ~90% of all home sales.',
        frequency: 'Monthly (around 3rd-4th week)',
      });
    }
  }

  console.log(`  Generated ${events.length} NAR events`);
  return events;
}

export default scrapeNAR;
