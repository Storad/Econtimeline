/**
 * Conference Board Economic Calendar
 *
 * Key releases:
 * - Consumer Confidence Index - HIGH IMPACT (last Tuesday of month)
 * - Leading Economic Index (LEI) - MEDIUM IMPACT
 *
 * Source: https://www.conference-board.org/
 */

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get the last Tuesday of a month
 */
function getLastTuesday(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  const lastTuesday = new Date(lastDay);
  while (lastTuesday.getDay() !== 2) {
    lastTuesday.setDate(lastTuesday.getDate() - 1);
  }
  return lastTuesday;
}

/**
 * Get the third week Thursday (LEI typically released)
 */
function getThirdWeekThursday(year, month) {
  const firstDay = new Date(year, month, 1);
  let thursdayCount = 0;
  const date = new Date(firstDay);

  while (thursdayCount < 3) {
    if (date.getDay() === 4) {
      thursdayCount++;
      if (thursdayCount === 3) break;
    }
    date.setDate(date.getDate() + 1);
  }

  return date;
}

/**
 * Generate Conference Board economic calendar events
 */
export async function scrapeConferenceBoard() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Generate for next 4 months
  for (let monthOffset = 0; monthOffset <= 4; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Consumer Confidence - Last Tuesday, 10:00 AM ET
    const ccDate = getLastTuesday(targetYear, targetMonth);
    if (ccDate >= oneWeekAgo) {
      events.push({
        date: formatDate(ccDate),
        time: '15:00', // 10:00 AM ET = 15:00 UTC
        title: 'CB Consumer Confidence',
        impact: 'high',
        currency: 'USD',
        country: 'US',
        source: 'conference-board',
        sourceUrl: 'https://www.conference-board.org/topics/consumer-confidence',
        category: 'sentiment',
      });
    }

    // Leading Economic Index - third week, 10:00 AM ET
    const leiDate = getThirdWeekThursday(targetYear, targetMonth);
    if (leiDate >= oneWeekAgo) {
      events.push({
        date: formatDate(leiDate),
        time: '15:00',
        title: 'CB Leading Index m/m',
        impact: 'medium',
        currency: 'USD',
        country: 'US',
        source: 'conference-board',
        sourceUrl: 'https://www.conference-board.org/topics/us-leading-indicators',
        category: 'growth',
      });
    }
  }

  return events;
}
