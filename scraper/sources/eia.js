/**
 * EIA Energy Data Calendar
 *
 * Tracks energy data releases from the U.S. Energy Information Administration:
 * - Crude Oil Inventories (Weekly)
 * - Natural Gas Storage (Weekly)
 * - Short-Term Energy Outlook (Monthly)
 *
 * Source: https://www.eia.gov/petroleum/supply/weekly/schedule.php
 */

/**
 * Get the next N Tuesdays (API), Wednesdays (Crude Oil) and Thursdays (Natural Gas)
 */
function getWeeklyEnergyDates(startDate, weeks) {
  const dates = { api: [], crude: [], natgas: [] };
  const current = new Date(startDate);

  // Find next Wednesday
  while (current.getDay() !== 3) {
    current.setDate(current.getDate() + 1);
  }

  for (let i = 0; i < weeks; i++) {
    const wednesday = new Date(current);
    wednesday.setDate(current.getDate() + i * 7);
    dates.crude.push(wednesday.toISOString().split('T')[0]);

    // Tuesday is day before Wednesday (API report)
    const tuesday = new Date(wednesday);
    tuesday.setDate(tuesday.getDate() - 1);
    dates.api.push(tuesday.toISOString().split('T')[0]);

    // Thursday is day after Wednesday
    const thursday = new Date(wednesday);
    thursday.setDate(thursday.getDate() + 1);
    dates.natgas.push(thursday.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Short-Term Energy Outlook - typically released on Tuesday
 * around the 7th-12th of each month
 */
function getSTEODates(year) {
  // Approximate dates - EIA publishes specific schedule
  return [
    `${year}-01-14`,
    `${year}-02-11`,
    `${year}-03-11`,
    `${year}-04-08`,
    `${year}-05-06`,
    `${year}-06-10`,
    `${year}-07-08`,
    `${year}-08-12`,
    `${year}-09-09`,
    `${year}-10-07`,
    `${year}-11-12`,
    `${year}-12-09`,
  ];
}

/**
 * Generate EIA energy calendar events
 */
export async function scrapeEIA() {
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

  // Weekly Petroleum Status Report (Crude Oil Inventories)
  // Released every Wednesday at 10:30 AM ET
  const weeklyDates = getWeeklyEnergyDates(threeMonthsAgo, 40); // ~9 months of weeks

  // API Weekly Statistical Bulletin (crude inventory estimate)
  // Released every Tuesday at 4:30 PM ET (preview of EIA data)
  weeklyDates.api.forEach(date => {
    if (isInRange(date)) {
      events.push({
        date,
        time: '16:30',
        title: 'API Weekly Crude Stock',
        impact: 'medium',
        category: 'energy',
        currency: 'USD',
        country: 'US',
        source: 'eia',
        sourceUrl: 'https://www.api.org/',
        description: 'American Petroleum Institute weekly crude oil inventory estimate. Released Tuesday evening as a preview of official EIA data.',
        whyItMatters: 'Early indicator of official EIA data. Large deviations from expectations can move oil prices in after-hours trading.',
      });
    }
  });

  weeklyDates.crude.forEach(date => {
    if (isInRange(date)) {
      events.push({
        date,
        time: '10:30',
        title: 'Crude Oil Inventories',
        impact: 'medium',
        category: 'energy',
        currency: 'USD',
        country: 'US',
        source: 'eia',
        sourceUrl: 'https://www.eia.gov/petroleum/supply/weekly/',
      });
    }
  });

  // Natural Gas Storage Report
  // Released every Thursday at 10:30 AM ET
  weeklyDates.natgas.forEach(date => {
    if (isInRange(date)) {
      events.push({
        date,
        time: '10:30',
        title: 'Natural Gas Storage',
        impact: 'low',
        category: 'energy',
        currency: 'USD',
        country: 'US',
        source: 'eia',
        sourceUrl: 'https://www.eia.gov/naturalgas/storage/',
      });
    }
  });

  // Short-Term Energy Outlook (STEO) - Monthly
  const currentYear = today.getFullYear();
  const lastYear = currentYear - 1;
  const nextYear = currentYear + 1;

  [...getSTEODates(lastYear), ...getSTEODates(currentYear), ...getSTEODates(nextYear)].forEach(date => {
    if (isInRange(date)) {
      events.push({
        date,
        time: '12:00',
        title: 'EIA Short-Term Energy Outlook',
        impact: 'low',
        category: 'energy',
        currency: 'USD',
        country: 'US',
        source: 'eia',
        sourceUrl: 'https://www.eia.gov/outlooks/steo/',
      });
    }
  });

  return events;
}

export default scrapeEIA;
