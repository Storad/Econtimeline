/**
 * US Census Bureau Economic Calendar
 *
 * Key releases:
 * - Retail Sales - HIGH IMPACT (mid-month, ~14th-16th)
 * - Housing Starts - MEDIUM IMPACT (mid-month)
 * - Building Permits - MEDIUM IMPACT (mid-month)
 * - Durable Goods Orders - MEDIUM IMPACT (late month, ~26th)
 * - New Home Sales - MEDIUM IMPACT (late month)
 * - Trade Balance - MEDIUM IMPACT (first week)
 *
 * Source: https://www.census.gov/economic-indicators/
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
 * Generate Census Bureau economic calendar events
 */
export async function scrapeCensus() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Generate for next 4 months
  for (let monthOffset = 0; monthOffset <= 4; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Retail Sales - around 14th-16th of month, 8:30 AM ET
    const retailDate = getNextWeekday(new Date(targetYear, targetMonth, 15));
    events.push({
      date: formatDate(retailDate),
      time: '13:30', // 8:30 AM ET = 13:30 UTC
      title: 'Retail Sales m/m',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/retail/index.html',
      category: 'consumer',
    });

    events.push({
      date: formatDate(retailDate),
      time: '13:30',
      title: 'Core Retail Sales m/m',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/retail/index.html',
      category: 'consumer',
    });

    // Housing Starts & Building Permits - around 17th-19th, 8:30 AM ET
    const housingDate = getNextWeekday(new Date(targetYear, targetMonth, 18));
    events.push({
      date: formatDate(housingDate),
      time: '13:30',
      title: 'Housing Starts',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/construction/nrc/index.html',
      category: 'housing',
    });

    events.push({
      date: formatDate(housingDate),
      time: '13:30',
      title: 'Building Permits',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/construction/nrc/index.html',
      category: 'housing',
    });

    // Durable Goods Orders - around 26th, 8:30 AM ET
    const durableDate = getNextWeekday(new Date(targetYear, targetMonth, 26));
    events.push({
      date: formatDate(durableDate),
      time: '13:30',
      title: 'Durable Goods Orders m/m',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/manufacturing/m3/index.html',
      category: 'manufacturing',
    });

    events.push({
      date: formatDate(durableDate),
      time: '13:30',
      title: 'Core Durable Goods Orders m/m',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/manufacturing/m3/index.html',
      category: 'manufacturing',
    });

    // New Home Sales - around 24th-26th, 10:00 AM ET
    const newHomesDate = getNextWeekday(new Date(targetYear, targetMonth, 25));
    events.push({
      date: formatDate(newHomesDate),
      time: '15:00', // 10:00 AM ET
      title: 'New Home Sales',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/construction/nrs/index.html',
      category: 'housing',
    });

    // Trade Balance - first week of month (for 2 months prior data), 8:30 AM ET
    const tradeDate = getNextWeekday(new Date(targetYear, targetMonth, 5));
    events.push({
      date: formatDate(tradeDate),
      time: '13:30',
      title: 'Trade Balance',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/foreign-trade/index.html',
      category: 'trade',
    });

    // Wholesale Inventories - around 9th, 10:00 AM ET
    const inventoryDate = getNextWeekday(new Date(targetYear, targetMonth, 9));
    events.push({
      date: formatDate(inventoryDate),
      time: '15:00',
      title: 'Wholesale Inventories m/m',
      impact: 'low',
      currency: 'USD',
      country: 'US',
      source: 'census',
      sourceUrl: 'https://www.census.gov/wholesale/index.html',
      category: 'manufacturing',
    });
  }

  // Filter to only future and recent past events
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}
