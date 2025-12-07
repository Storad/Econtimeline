/**
 * BEA (Bureau of Economic Analysis) Economic Calendar
 *
 * Key releases:
 * - GDP (Advance, Preliminary, Final) - HIGH IMPACT
 * - PCE Price Index - HIGH IMPACT (Fed's preferred inflation measure)
 * - Personal Income - MEDIUM IMPACT
 * - Personal Spending - MEDIUM IMPACT
 *
 * GDP Schedule:
 * - Advance: ~4 weeks after quarter ends
 * - Preliminary (Second): ~8 weeks after quarter ends
 * - Final (Third): ~12 weeks after quarter ends
 *
 * Source: https://www.bea.gov/news/schedule
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

// GDP release schedule (approximate dates)
const GDP_RELEASES_2025 = [
  // Q4 2024
  { date: '2025-01-30', quarter: 'Q4 2024', type: 'Advance' },
  { date: '2025-02-27', quarter: 'Q4 2024', type: 'Preliminary' },
  { date: '2025-03-27', quarter: 'Q4 2024', type: 'Final' },
  // Q1 2025
  { date: '2025-04-30', quarter: 'Q1 2025', type: 'Advance' },
  { date: '2025-05-29', quarter: 'Q1 2025', type: 'Preliminary' },
  { date: '2025-06-26', quarter: 'Q1 2025', type: 'Final' },
  // Q2 2025
  { date: '2025-07-30', quarter: 'Q2 2025', type: 'Advance' },
  { date: '2025-08-28', quarter: 'Q2 2025', type: 'Preliminary' },
  { date: '2025-09-25', quarter: 'Q2 2025', type: 'Final' },
  // Q3 2025
  { date: '2025-10-30', quarter: 'Q3 2025', type: 'Advance' },
  { date: '2025-11-26', quarter: 'Q3 2025', type: 'Preliminary' },
  { date: '2025-12-23', quarter: 'Q3 2025', type: 'Final' },
];

const GDP_RELEASES_2026 = [
  // Q4 2025
  { date: '2026-01-29', quarter: 'Q4 2025', type: 'Advance' },
  { date: '2026-02-26', quarter: 'Q4 2025', type: 'Preliminary' },
  { date: '2026-03-26', quarter: 'Q4 2025', type: 'Final' },
];

/**
 * Generate BEA economic calendar events
 */
export async function scrapeBEA() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Add GDP releases
  const allGDP = [...GDP_RELEASES_2025, ...GDP_RELEASES_2026];
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const gdp of allGDP) {
    if (new Date(gdp.date) < oneWeekAgo) continue;

    events.push({
      date: gdp.date,
      time: '13:30', // 8:30 AM ET = 13:30 UTC
      title: `GDP q/q (${gdp.type})`,
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'bea',
      sourceUrl: 'https://www.bea.gov/data/gdp/gross-domestic-product',
      category: 'growth',
    });

    // GDP Price Index released with GDP
    events.push({
      date: gdp.date,
      time: '13:30',
      title: 'GDP Price Index q/q',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'bea',
      sourceUrl: 'https://www.bea.gov/data/gdp/gross-domestic-product',
      category: 'inflation',
    });
  }

  // PCE and Personal Income/Spending - last Friday of month (or close), 8:30 AM ET
  for (let monthOffset = 0; monthOffset <= 4; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Find last Friday of the month
    const lastDay = new Date(targetYear, targetMonth + 1, 0);
    const lastFriday = new Date(lastDay);
    while (lastFriday.getDay() !== 5) {
      lastFriday.setDate(lastFriday.getDate() - 1);
    }

    // PCE is typically released around the last Friday
    const pceDate = lastFriday;

    events.push({
      date: formatDate(pceDate),
      time: '13:30',
      title: 'Core PCE Price Index m/m',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'bea',
      sourceUrl: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index',
      category: 'inflation',
    });

    events.push({
      date: formatDate(pceDate),
      time: '13:30',
      title: 'Core PCE Price Index y/y',
      impact: 'high',
      currency: 'USD',
      country: 'US',
      source: 'bea',
      sourceUrl: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index',
      category: 'inflation',
    });

    events.push({
      date: formatDate(pceDate),
      time: '13:30',
      title: 'PCE Price Index m/m',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'bea',
      sourceUrl: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index',
      category: 'inflation',
    });

    events.push({
      date: formatDate(pceDate),
      time: '13:30',
      title: 'Personal Income m/m',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'bea',
      sourceUrl: 'https://www.bea.gov/data/income-saving/personal-income',
      category: 'consumer',
    });

    events.push({
      date: formatDate(pceDate),
      time: '13:30',
      title: 'Personal Spending m/m',
      impact: 'medium',
      currency: 'USD',
      country: 'US',
      source: 'bea',
      sourceUrl: 'https://www.bea.gov/data/consumer-spending/main',
      category: 'consumer',
    });
  }

  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}
