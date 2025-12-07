/**
 * University of Michigan Consumer Sentiment
 *
 * Key releases:
 * - Consumer Sentiment (Preliminary) - HIGH IMPACT (2nd Friday of month)
 * - Consumer Sentiment (Final) - MEDIUM IMPACT (4th Friday of month)
 * - Inflation Expectations - HIGH IMPACT (released with sentiment)
 *
 * Source: http://www.sca.isr.umich.edu/
 */

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get the nth Friday of a month
 */
function getNthFriday(year, month, n) {
  const firstDay = new Date(year, month, 1);
  let fridayCount = 0;
  const date = new Date(firstDay);

  while (fridayCount < n) {
    if (date.getDay() === 5) {
      fridayCount++;
      if (fridayCount === n) break;
    }
    date.setDate(date.getDate() + 1);
  }

  return date;
}

/**
 * Generate UMich economic calendar events
 */
export async function scrapeUMich() {
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

    // Preliminary - 2nd Friday, 10:00 AM ET
    const prelimDate = getNthFriday(targetYear, targetMonth, 2);
    if (prelimDate >= oneWeekAgo) {
      events.push({
        date: formatDate(prelimDate),
        time: '15:00', // 10:00 AM ET = 15:00 UTC
        title: 'UoM Consumer Sentiment (Preliminary)',
        impact: 'high',
        currency: 'USD',
        country: 'US',
        source: 'umich',
        sourceUrl: 'http://www.sca.isr.umich.edu/',
        category: 'sentiment',
      });

      events.push({
        date: formatDate(prelimDate),
        time: '15:00',
        title: 'UoM Inflation Expectations',
        impact: 'high',
        currency: 'USD',
        country: 'US',
        source: 'umich',
        sourceUrl: 'http://www.sca.isr.umich.edu/',
        category: 'inflation',
      });

      events.push({
        date: formatDate(prelimDate),
        time: '15:00',
        title: 'UoM 5-Year Inflation Expectations',
        impact: 'medium',
        currency: 'USD',
        country: 'US',
        source: 'umich',
        sourceUrl: 'http://www.sca.isr.umich.edu/',
        category: 'inflation',
      });
    }

    // Final - 4th Friday, 10:00 AM ET
    const finalDate = getNthFriday(targetYear, targetMonth, 4);
    if (finalDate >= oneWeekAgo) {
      events.push({
        date: formatDate(finalDate),
        time: '15:00',
        title: 'UoM Consumer Sentiment (Final)',
        impact: 'medium',
        currency: 'USD',
        country: 'US',
        source: 'umich',
        sourceUrl: 'http://www.sca.isr.umich.edu/',
        category: 'sentiment',
      });
    }
  }

  return events;
}
