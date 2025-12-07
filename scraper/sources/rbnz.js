/**
 * Reserve Bank of New Zealand (RBNZ) Economic Calendar
 *
 * Key releases:
 * - RBNZ Interest Rate Decision - HIGH IMPACT
 * - RBNZ Rate Statement - HIGH IMPACT
 * - RBNZ Monetary Policy Statement - HIGH IMPACT
 * - RBNZ Press Conference - HIGH IMPACT
 *
 * RBNZ meets 7 times per year
 * Decisions announced at 14:00 NZDT/NZST
 *
 * Source: https://www.rbnz.govt.nz/monetary-policy/official-cash-rate-decisions
 */

// Known RBNZ meeting dates for 2025
const RBNZ_MEETINGS_2025 = [
  { date: '2025-02-19', hasMPS: true },
  { date: '2025-04-09', hasMPS: false },
  { date: '2025-05-28', hasMPS: true },
  { date: '2025-07-09', hasMPS: false },
  { date: '2025-08-20', hasMPS: true },
  { date: '2025-10-08', hasMPS: false },
  { date: '2025-11-26', hasMPS: true },
];

const RBNZ_MEETINGS_2026 = [
  { date: '2026-02-18', hasMPS: true },
  { date: '2026-04-08', hasMPS: false },
  { date: '2026-05-27', hasMPS: true },
];

/**
 * Generate RBNZ economic calendar events
 */
export async function scrapeRBNZ() {
  const events = [];
  const allMeetings = [...RBNZ_MEETINGS_2025, ...RBNZ_MEETINGS_2026];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const meeting of allMeetings) {
    if (new Date(meeting.date) < oneWeekAgo) continue;

    // RBNZ Rate Decision
    events.push({
      date: meeting.date,
      time: '01:00', // 14:00 NZDT = 01:00 UTC
      title: 'RBNZ Interest Rate Decision',
      impact: 'high',
      currency: 'NZD',
      country: 'NZ',
      source: 'rbnz',
      sourceUrl: 'https://www.rbnz.govt.nz/monetary-policy/',
      category: 'central_bank',
    });

    events.push({
      date: meeting.date,
      time: '01:00',
      title: 'RBNZ Rate Statement',
      impact: 'high',
      currency: 'NZD',
      country: 'NZ',
      source: 'rbnz',
      sourceUrl: 'https://www.rbnz.govt.nz/monetary-policy/',
      category: 'central_bank',
    });

    // Monetary Policy Statement (quarterly)
    if (meeting.hasMPS) {
      events.push({
        date: meeting.date,
        time: '01:00',
        title: 'RBNZ Monetary Policy Statement',
        impact: 'high',
        currency: 'NZD',
        country: 'NZ',
        source: 'rbnz',
        sourceUrl: 'https://www.rbnz.govt.nz/monetary-policy/',
        category: 'central_bank',
      });

      // Press Conference (on MPS days)
      events.push({
        date: meeting.date,
        time: '02:00',
        title: 'RBNZ Press Conference',
        impact: 'high',
        currency: 'NZD',
        country: 'NZ',
        source: 'rbnz',
        sourceUrl: 'https://www.rbnz.govt.nz/monetary-policy/',
        category: 'central_bank',
      });
    }
  }

  // Add New Zealand economic data releases
  events.push(...generateNewZealandData());

  return events;
}

/**
 * Generate New Zealand economic data releases (Stats NZ)
 */
function generateNewZealandData() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // NZ Employment (quarterly - Feb, May, Aug, Nov)
    if (targetMonth === 1 || targetMonth === 4 || targetMonth === 7 || targetMonth === 10) {
      const employmentDate = new Date(targetYear, targetMonth, 5);
      while (employmentDate.getDay() !== 3) { // Wednesday
        employmentDate.setDate(employmentDate.getDate() + 1);
      }
      events.push({
        date: formatDate(employmentDate),
        time: '21:45', // 10:45 NZDT = 21:45 UTC previous day
        title: 'Employment Change q/q',
        impact: 'high',
        currency: 'NZD',
        country: 'NZ',
        source: 'statsnz',
        sourceUrl: 'https://www.stats.govt.nz',
        category: 'employment',
      });
      events.push({
        date: formatDate(employmentDate),
        time: '21:45',
        title: 'Unemployment Rate',
        impact: 'high',
        currency: 'NZD',
        country: 'NZ',
        source: 'statsnz',
        sourceUrl: 'https://www.stats.govt.nz',
        category: 'employment',
      });
    }

    // NZ CPI (quarterly - Jan, Apr, Jul, Oct)
    if (targetMonth === 0 || targetMonth === 3 || targetMonth === 6 || targetMonth === 9) {
      const cpiDate = new Date(targetYear, targetMonth, 18);
      if (cpiDate.getDay() === 0) cpiDate.setDate(cpiDate.getDate() + 1);
      if (cpiDate.getDay() === 6) cpiDate.setDate(cpiDate.getDate() + 2);
      events.push({
        date: formatDate(cpiDate),
        time: '21:45',
        title: 'CPI q/q',
        impact: 'high',
        currency: 'NZD',
        country: 'NZ',
        source: 'statsnz',
        sourceUrl: 'https://www.stats.govt.nz',
        category: 'inflation',
      });
    }

    // NZ Trade Balance (monthly, ~4th week)
    const tradeDate = new Date(targetYear, targetMonth, 26);
    if (tradeDate.getDay() === 0) tradeDate.setDate(tradeDate.getDate() + 1);
    if (tradeDate.getDay() === 6) tradeDate.setDate(tradeDate.getDate() + 2);
    events.push({
      date: formatDate(tradeDate),
      time: '21:45',
      title: 'Trade Balance',
      impact: 'low',
      currency: 'NZD',
      country: 'NZ',
      source: 'statsnz',
      sourceUrl: 'https://www.stats.govt.nz',
      category: 'trade',
    });

    // NZ GDP (quarterly)
    if (targetMonth === 2 || targetMonth === 5 || targetMonth === 8 || targetMonth === 11) {
      const gdpDate = new Date(targetYear, targetMonth, 19);
      if (gdpDate.getDay() === 0) gdpDate.setDate(gdpDate.getDate() + 1);
      if (gdpDate.getDay() === 6) gdpDate.setDate(gdpDate.getDate() + 2);
      events.push({
        date: formatDate(gdpDate),
        time: '21:45',
        title: 'GDP q/q',
        impact: 'high',
        currency: 'NZD',
        country: 'NZ',
        source: 'statsnz',
        sourceUrl: 'https://www.stats.govt.nz',
        category: 'growth',
      });
    }

    // GDT Price Index (twice monthly dairy auction)
    // First and third Tuesday of each month
    const firstTuesday = new Date(targetYear, targetMonth, 1);
    while (firstTuesday.getDay() !== 2) {
      firstTuesday.setDate(firstTuesday.getDate() + 1);
    }
    events.push({
      date: formatDate(firstTuesday),
      time: '14:00',
      title: 'GDT Price Index',
      impact: 'low',
      currency: 'NZD',
      country: 'NZ',
      source: 'gdt',
      sourceUrl: 'https://www.globaldairytrade.info',
      category: 'trade',
    });

    const thirdTuesday = new Date(firstTuesday);
    thirdTuesday.setDate(thirdTuesday.getDate() + 14);
    events.push({
      date: formatDate(thirdTuesday),
      time: '14:00',
      title: 'GDT Price Index',
      impact: 'low',
      currency: 'NZD',
      country: 'NZ',
      source: 'gdt',
      sourceUrl: 'https://www.globaldairytrade.info',
      category: 'trade',
    });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
