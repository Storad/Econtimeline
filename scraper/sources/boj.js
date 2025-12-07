/**
 * Bank of Japan (BoJ) Economic Calendar
 *
 * Key releases:
 * - BoJ Interest Rate Decision - HIGH IMPACT
 * - BoJ Policy Statement - HIGH IMPACT
 * - BoJ Press Conference - HIGH IMPACT
 * - Tankan Survey - HIGH IMPACT
 *
 * BoJ meets 8 times per year
 * Decisions typically announced early morning JST
 *
 * Source: https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm
 */

// Known BoJ meeting dates for 2025
const BOJ_MEETINGS_2025 = [
  { date: '2025-01-24', hasOutlook: true },
  { date: '2025-03-14', hasOutlook: false },
  { date: '2025-05-01', hasOutlook: true },
  { date: '2025-06-13', hasOutlook: false },
  { date: '2025-07-31', hasOutlook: true },
  { date: '2025-09-19', hasOutlook: false },
  { date: '2025-10-31', hasOutlook: true },
  { date: '2025-12-19', hasOutlook: false },
];

const BOJ_MEETINGS_2026 = [
  { date: '2026-01-23', hasOutlook: true },
  { date: '2026-03-13', hasOutlook: false },
  { date: '2026-04-30', hasOutlook: true },
];

// Tankan Survey dates (quarterly - April, July, October, January)
const TANKAN_DATES_2025 = [
  '2025-04-01',
  '2025-07-01',
  '2025-10-01',
];
const TANKAN_DATES_2026 = [
  '2026-01-05',
  '2026-04-01',
];

/**
 * Generate BoJ economic calendar events
 */
export async function scrapeBOJ() {
  const events = [];
  const allMeetings = [...BOJ_MEETINGS_2025, ...BOJ_MEETINGS_2026];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const meeting of allMeetings) {
    const meetingDate = new Date(meeting.date);
    if (meetingDate < oneWeekAgo) continue;

    // BoJ Rate Decision
    events.push({
      date: meeting.date,
      time: '03:00', // ~12:00 JST = 03:00 UTC
      title: 'BoJ Interest Rate Decision',
      impact: 'high',
      currency: 'JPY',
      country: 'JP',
      source: 'boj',
      sourceUrl: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
      category: 'central_bank',
    });

    events.push({
      date: meeting.date,
      time: '03:00',
      title: 'BoJ Policy Statement',
      impact: 'high',
      currency: 'JPY',
      country: 'JP',
      source: 'boj',
      sourceUrl: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
      category: 'central_bank',
    });

    // Press Conference (later same day)
    events.push({
      date: meeting.date,
      time: '06:30', // ~15:30 JST
      title: 'BoJ Press Conference',
      impact: 'high',
      currency: 'JPY',
      country: 'JP',
      source: 'boj',
      sourceUrl: 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm',
      category: 'central_bank',
    });

    // Outlook Report (quarterly)
    if (meeting.hasOutlook) {
      events.push({
        date: meeting.date,
        time: '03:00',
        title: 'BoJ Outlook Report',
        impact: 'medium',
        currency: 'JPY',
        country: 'JP',
        source: 'boj',
        sourceUrl: 'https://www.boj.or.jp/en/mopo/outlook/index.htm',
        category: 'central_bank',
      });
    }
  }

  // Add Tankan Survey dates
  const allTankan = [...TANKAN_DATES_2025, ...TANKAN_DATES_2026];
  for (const tankanDate of allTankan) {
    if (new Date(tankanDate) < oneWeekAgo) continue;

    events.push({
      date: tankanDate,
      time: '23:50', // Released at 08:50 JST = 23:50 UTC previous day
      title: 'Tankan Manufacturing Index',
      impact: 'high',
      currency: 'JPY',
      country: 'JP',
      source: 'boj',
      sourceUrl: 'https://www.boj.or.jp/en/statistics/tk/index.htm',
      category: 'sentiment',
    });

    events.push({
      date: tankanDate,
      time: '23:50',
      title: 'Tankan Non-Manufacturing Index',
      impact: 'medium',
      currency: 'JPY',
      country: 'JP',
      source: 'boj',
      sourceUrl: 'https://www.boj.or.jp/en/statistics/tk/index.htm',
      category: 'sentiment',
    });
  }

  // Add Japan economic data releases
  events.push(...generateJapanData());

  return events;
}

/**
 * Generate Japan economic data releases
 */
function generateJapanData() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Japan CPI (typically 3rd Friday)
    const cpiDate = new Date(targetYear, targetMonth, 1);
    let fridayCount = 0;
    while (fridayCount < 3) {
      if (cpiDate.getDay() === 5) fridayCount++;
      if (fridayCount < 3) cpiDate.setDate(cpiDate.getDate() + 1);
    }
    events.push({
      date: formatDate(cpiDate),
      time: '23:30', // 08:30 JST
      title: 'National Core CPI y/y',
      impact: 'medium',
      currency: 'JPY',
      country: 'JP',
      source: 'stat.go.jp',
      sourceUrl: 'https://www.stat.go.jp/english/',
      category: 'inflation',
    });

    // Japan Trade Balance (typically mid-month)
    const tradeDate = new Date(targetYear, targetMonth, 19);
    if (tradeDate.getDay() === 0) tradeDate.setDate(tradeDate.getDate() + 1);
    if (tradeDate.getDay() === 6) tradeDate.setDate(tradeDate.getDate() + 2);
    events.push({
      date: formatDate(tradeDate),
      time: '23:50',
      title: 'Trade Balance',
      impact: 'low',
      currency: 'JPY',
      country: 'JP',
      source: 'customs.go.jp',
      sourceUrl: 'https://www.customs.go.jp/toukei/info/index_e.htm',
      category: 'trade',
    });

    // Japan GDP (typically mid-month, quarterly)
    if (targetMonth % 3 === 1) { // Feb, May, Aug, Nov
      const gdpDate = new Date(targetYear, targetMonth, 15);
      if (gdpDate.getDay() === 0) gdpDate.setDate(gdpDate.getDate() + 1);
      if (gdpDate.getDay() === 6) gdpDate.setDate(gdpDate.getDate() + 2);
      events.push({
        date: formatDate(gdpDate),
        time: '23:50',
        title: 'GDP q/q',
        impact: 'medium',
        currency: 'JPY',
        country: 'JP',
        source: 'cao.go.jp',
        sourceUrl: 'https://www.esri.cao.go.jp/en/sna/menu.html',
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
