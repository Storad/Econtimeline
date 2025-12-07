/**
 * Swiss National Bank (SNB) Economic Calendar
 *
 * Key releases:
 * - SNB Interest Rate Decision - HIGH IMPACT
 * - SNB Monetary Policy Assessment - HIGH IMPACT
 * - SNB Press Conference - HIGH IMPACT
 *
 * SNB meets quarterly (March, June, September, December)
 * Decisions announced at 09:30 CET
 *
 * Source: https://www.snb.ch/en/ifor/finmkt/id/finmkt_dates
 */

// Known SNB meeting dates for 2025
const SNB_MEETINGS_2025 = [
  '2025-03-20',
  '2025-06-19',
  '2025-09-18',
  '2025-12-11',
];

const SNB_MEETINGS_2026 = [
  '2026-03-19',
  '2026-06-18',
  '2026-09-17',
  '2026-12-10',
];

/**
 * Generate SNB economic calendar events
 */
export async function scrapeSNB() {
  const events = [];
  const allMeetings = [...SNB_MEETINGS_2025, ...SNB_MEETINGS_2026];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const meetingDate of allMeetings) {
    if (new Date(meetingDate) < oneWeekAgo) continue;

    // SNB Rate Decision
    events.push({
      date: meetingDate,
      time: '08:30', // 09:30 CET = 08:30 UTC
      title: 'SNB Interest Rate Decision',
      impact: 'high',
      currency: 'CHF',
      country: 'CH',
      source: 'snb',
      sourceUrl: 'https://www.snb.ch/en/ifor/finmkt/',
      category: 'central_bank',
    });

    events.push({
      date: meetingDate,
      time: '08:30',
      title: 'SNB Monetary Policy Assessment',
      impact: 'high',
      currency: 'CHF',
      country: 'CH',
      source: 'snb',
      sourceUrl: 'https://www.snb.ch/en/ifor/finmkt/',
      category: 'central_bank',
    });

    // Press Conference
    events.push({
      date: meetingDate,
      time: '09:00',
      title: 'SNB Press Conference',
      impact: 'high',
      currency: 'CHF',
      country: 'CH',
      source: 'snb',
      sourceUrl: 'https://www.snb.ch/en/ifor/finmkt/',
      category: 'central_bank',
    });
  }

  // Add Switzerland economic data releases
  events.push(...generateSwitzerlandData());

  return events;
}

/**
 * Generate Switzerland economic data releases
 */
function generateSwitzerlandData() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Switzerland CPI (typically first week)
    const cpiDate = new Date(targetYear, targetMonth, 4);
    if (cpiDate.getDay() === 0) cpiDate.setDate(cpiDate.getDate() + 1);
    if (cpiDate.getDay() === 6) cpiDate.setDate(cpiDate.getDate() + 2);
    events.push({
      date: formatDate(cpiDate),
      time: '07:30',
      title: 'CPI m/m',
      impact: 'medium',
      currency: 'CHF',
      country: 'CH',
      source: 'bfs',
      sourceUrl: 'https://www.bfs.admin.ch',
      category: 'inflation',
    });

    // KOF Economic Barometer (end of month)
    const kofDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    if (kofDate.getDay() === 0) kofDate.setDate(kofDate.getDate() - 2);
    if (kofDate.getDay() === 6) kofDate.setDate(kofDate.getDate() - 1);
    events.push({
      date: formatDate(kofDate),
      time: '08:00',
      title: 'KOF Economic Barometer',
      impact: 'low',
      currency: 'CHF',
      country: 'CH',
      source: 'kof',
      sourceUrl: 'https://kof.ethz.ch',
      category: 'sentiment',
    });

    // Switzerland GDP (quarterly)
    if (targetMonth === 2 || targetMonth === 5 || targetMonth === 8 || targetMonth === 11) {
      const gdpDate = new Date(targetYear, targetMonth, 1);
      if (gdpDate.getDay() === 0) gdpDate.setDate(gdpDate.getDate() + 1);
      if (gdpDate.getDay() === 6) gdpDate.setDate(gdpDate.getDate() + 2);
      events.push({
        date: formatDate(gdpDate),
        time: '06:45',
        title: 'GDP q/q',
        impact: 'medium',
        currency: 'CHF',
        country: 'CH',
        source: 'seco',
        sourceUrl: 'https://www.seco.admin.ch',
        category: 'growth',
      });
    }
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
