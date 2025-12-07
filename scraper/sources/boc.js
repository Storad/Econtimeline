/**
 * Bank of Canada (BoC) Economic Calendar
 *
 * Key releases:
 * - BoC Interest Rate Decision - HIGH IMPACT
 * - BoC Rate Statement - HIGH IMPACT
 * - BoC Monetary Policy Report - HIGH IMPACT
 * - BoC Press Conference - HIGH IMPACT
 *
 * BoC has 8 scheduled announcement dates per year
 * Decisions announced at 09:45 ET
 *
 * Source: https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/
 */

// Known BoC announcement dates for 2025
const BOC_MEETINGS_2025 = [
  { date: '2025-01-29', hasMPR: true },
  { date: '2025-03-12', hasMPR: false },
  { date: '2025-04-16', hasMPR: true },
  { date: '2025-06-04', hasMPR: false },
  { date: '2025-07-30', hasMPR: true },
  { date: '2025-09-17', hasMPR: false },
  { date: '2025-10-29', hasMPR: true },
  { date: '2025-12-10', hasMPR: false },
];

const BOC_MEETINGS_2026 = [
  { date: '2026-01-28', hasMPR: true },
  { date: '2026-03-11', hasMPR: false },
  { date: '2026-04-15', hasMPR: true },
];

/**
 * Generate BoC economic calendar events
 */
export async function scrapeBOC() {
  const events = [];
  const allMeetings = [...BOC_MEETINGS_2025, ...BOC_MEETINGS_2026];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const meeting of allMeetings) {
    if (new Date(meeting.date) < oneWeekAgo) continue;

    // BoC Rate Decision
    events.push({
      date: meeting.date,
      time: '14:45', // 09:45 ET = 14:45 UTC
      title: 'BoC Interest Rate Decision',
      impact: 'high',
      currency: 'CAD',
      country: 'CA',
      source: 'boc',
      sourceUrl: 'https://www.bankofcanada.ca/core-functions/monetary-policy/',
      category: 'central_bank',
    });

    events.push({
      date: meeting.date,
      time: '14:45',
      title: 'BoC Rate Statement',
      impact: 'high',
      currency: 'CAD',
      country: 'CA',
      source: 'boc',
      sourceUrl: 'https://www.bankofcanada.ca/core-functions/monetary-policy/',
      category: 'central_bank',
    });

    // Monetary Policy Report (quarterly)
    if (meeting.hasMPR) {
      events.push({
        date: meeting.date,
        time: '14:45',
        title: 'BoC Monetary Policy Report',
        impact: 'high',
        currency: 'CAD',
        country: 'CA',
        source: 'boc',
        sourceUrl: 'https://www.bankofcanada.ca/publications/mpr/',
        category: 'central_bank',
      });

      // Press Conference (on MPR days)
      events.push({
        date: meeting.date,
        time: '15:30',
        title: 'BoC Press Conference',
        impact: 'high',
        currency: 'CAD',
        country: 'CA',
        source: 'boc',
        sourceUrl: 'https://www.bankofcanada.ca/core-functions/monetary-policy/',
        category: 'central_bank',
      });
    }
  }

  // Add Canada economic data releases
  events.push(...generateCanadaData());

  return events;
}

/**
 * Generate Canada economic data releases (Statistics Canada)
 */
function generateCanadaData() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Canada Employment (first Friday)
    const employmentDate = new Date(targetYear, targetMonth, 1);
    while (employmentDate.getDay() !== 5) {
      employmentDate.setDate(employmentDate.getDate() + 1);
    }
    events.push({
      date: formatDate(employmentDate),
      time: '13:30', // 08:30 ET
      title: 'Employment Change',
      impact: 'high',
      currency: 'CAD',
      country: 'CA',
      source: 'statcan',
      sourceUrl: 'https://www.statcan.gc.ca',
      category: 'employment',
    });
    events.push({
      date: formatDate(employmentDate),
      time: '13:30',
      title: 'Unemployment Rate',
      impact: 'high',
      currency: 'CAD',
      country: 'CA',
      source: 'statcan',
      sourceUrl: 'https://www.statcan.gc.ca',
      category: 'employment',
    });

    // Canada CPI (typically 3rd week Tuesday)
    const cpiDate = new Date(targetYear, targetMonth, 15);
    while (cpiDate.getDay() !== 2) {
      cpiDate.setDate(cpiDate.getDate() + 1);
    }
    events.push({
      date: formatDate(cpiDate),
      time: '13:30',
      title: 'CPI m/m',
      impact: 'high',
      currency: 'CAD',
      country: 'CA',
      source: 'statcan',
      sourceUrl: 'https://www.statcan.gc.ca',
      category: 'inflation',
    });
    events.push({
      date: formatDate(cpiDate),
      time: '13:30',
      title: 'Core CPI m/m',
      impact: 'medium',
      currency: 'CAD',
      country: 'CA',
      source: 'statcan',
      sourceUrl: 'https://www.statcan.gc.ca',
      category: 'inflation',
    });

    // Canada Retail Sales (typically 3rd week Friday)
    const retailDate = new Date(targetYear, targetMonth, 20);
    while (retailDate.getDay() !== 5) {
      retailDate.setDate(retailDate.getDate() + 1);
    }
    events.push({
      date: formatDate(retailDate),
      time: '13:30',
      title: 'Retail Sales m/m',
      impact: 'medium',
      currency: 'CAD',
      country: 'CA',
      source: 'statcan',
      sourceUrl: 'https://www.statcan.gc.ca',
      category: 'consumer',
    });

    // Canada GDP (monthly, ~2 months lag)
    const gdpDate = new Date(targetYear, targetMonth, 28);
    if (gdpDate.getDay() === 0) gdpDate.setDate(gdpDate.getDate() + 1);
    if (gdpDate.getDay() === 6) gdpDate.setDate(gdpDate.getDate() + 2);
    events.push({
      date: formatDate(gdpDate),
      time: '13:30',
      title: 'GDP m/m',
      impact: 'medium',
      currency: 'CAD',
      country: 'CA',
      source: 'statcan',
      sourceUrl: 'https://www.statcan.gc.ca',
      category: 'growth',
    });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
