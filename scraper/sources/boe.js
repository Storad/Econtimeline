/**
 * Bank of England (BoE) Economic Calendar
 *
 * Key releases:
 * - BoE Interest Rate Decision - HIGH IMPACT
 * - BoE MPC Meeting Minutes - HIGH IMPACT
 * - BoE Monetary Policy Report - HIGH IMPACT
 * - BoE Gov Bailey Speaks - HIGH IMPACT
 *
 * MPC meets 8 times per year
 * Decisions announced at 12:00 GMT
 *
 * Source: https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates
 */

// Known BoE MPC meeting dates for 2025
const BOE_MEETINGS_2025 = [
  { date: '2025-02-06', hasReport: true },
  { date: '2025-03-20', hasReport: false },
  { date: '2025-05-08', hasReport: true },
  { date: '2025-06-19', hasReport: false },
  { date: '2025-08-07', hasReport: true },
  { date: '2025-09-18', hasReport: false },
  { date: '2025-11-06', hasReport: true },
  { date: '2025-12-18', hasReport: false },
];

const BOE_MEETINGS_2026 = [
  { date: '2026-02-05', hasReport: true },
  { date: '2026-03-19', hasReport: false },
  { date: '2026-05-07', hasReport: true },
  { date: '2026-06-18', hasReport: false },
];

/**
 * Generate BoE economic calendar events
 */
export async function scrapeBOE() {
  const events = [];
  const allMeetings = [...BOE_MEETINGS_2025, ...BOE_MEETINGS_2026];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const meeting of allMeetings) {
    const meetingDate = new Date(meeting.date);
    if (meetingDate < oneWeekAgo) continue;

    // BoE Rate Decision + Minutes (released together)
    events.push({
      date: meeting.date,
      time: '12:00',
      title: 'BoE Interest Rate Decision',
      impact: 'high',
      currency: 'GBP',
      country: 'UK',
      source: 'boe',
      sourceUrl: 'https://www.bankofengland.co.uk/monetary-policy',
      category: 'central_bank',
    });

    events.push({
      date: meeting.date,
      time: '12:00',
      title: 'MPC Meeting Minutes',
      impact: 'high',
      currency: 'GBP',
      country: 'UK',
      source: 'boe',
      sourceUrl: 'https://www.bankofengland.co.uk/monetary-policy',
      category: 'central_bank',
    });

    // Monetary Policy Report (quarterly)
    if (meeting.hasReport) {
      events.push({
        date: meeting.date,
        time: '12:00',
        title: 'BoE Monetary Policy Report',
        impact: 'high',
        currency: 'GBP',
        country: 'UK',
        source: 'boe',
        sourceUrl: 'https://www.bankofengland.co.uk/monetary-policy-report',
        category: 'central_bank',
      });
    }
  }

  // Add UK economic data releases
  events.push(...generateUKData());

  return events;
}

/**
 * Generate UK economic data releases (ONS - Office for National Statistics)
 */
function generateUKData() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // UK CPI (typically mid-month, Wednesday)
    const cpiDate = new Date(targetYear, targetMonth, 15);
    while (cpiDate.getDay() !== 3) { // Find Wednesday
      cpiDate.setDate(cpiDate.getDate() + 1);
    }
    events.push({
      date: formatDate(cpiDate),
      time: '07:00',
      title: 'CPI y/y',
      impact: 'high',
      currency: 'GBP',
      country: 'UK',
      source: 'ons',
      sourceUrl: 'https://www.ons.gov.uk',
      category: 'inflation',
    });

    // UK Employment/Claimant Count (typically Tuesday, week after CPI)
    const employmentDate = new Date(cpiDate);
    employmentDate.setDate(employmentDate.getDate() - 1); // Tuesday before CPI Wednesday
    events.push({
      date: formatDate(employmentDate),
      time: '07:00',
      title: 'Claimant Count Change',
      impact: 'medium',
      currency: 'GBP',
      country: 'UK',
      source: 'ons',
      sourceUrl: 'https://www.ons.gov.uk',
      category: 'employment',
    });
    events.push({
      date: formatDate(employmentDate),
      time: '07:00',
      title: 'Average Earnings Index 3m/y',
      impact: 'medium',
      currency: 'GBP',
      country: 'UK',
      source: 'ons',
      sourceUrl: 'https://www.ons.gov.uk',
      category: 'employment',
    });

    // UK Retail Sales (typically 3rd Friday)
    const retailDate = new Date(targetYear, targetMonth, 1);
    let fridayCount = 0;
    while (fridayCount < 3) {
      if (retailDate.getDay() === 5) fridayCount++;
      if (fridayCount < 3) retailDate.setDate(retailDate.getDate() + 1);
    }
    events.push({
      date: formatDate(retailDate),
      time: '07:00',
      title: 'Retail Sales m/m',
      impact: 'medium',
      currency: 'GBP',
      country: 'UK',
      source: 'ons',
      sourceUrl: 'https://www.ons.gov.uk',
      category: 'consumer',
    });

    // UK GDP (typically mid-month)
    const gdpDate = new Date(targetYear, targetMonth, 12);
    if (gdpDate.getDay() === 0) gdpDate.setDate(gdpDate.getDate() + 1);
    if (gdpDate.getDay() === 6) gdpDate.setDate(gdpDate.getDate() + 2);
    events.push({
      date: formatDate(gdpDate),
      time: '07:00',
      title: 'GDP m/m',
      impact: 'high',
      currency: 'GBP',
      country: 'UK',
      source: 'ons',
      sourceUrl: 'https://www.ons.gov.uk',
      category: 'growth',
    });

    // UK PMI (first business day of month)
    const pmiDate = new Date(targetYear, targetMonth, 1);
    if (pmiDate.getDay() === 0) pmiDate.setDate(pmiDate.getDate() + 1);
    if (pmiDate.getDay() === 6) pmiDate.setDate(pmiDate.getDate() + 2);
    events.push({
      date: formatDate(pmiDate),
      time: '09:30',
      title: 'Manufacturing PMI',
      impact: 'medium',
      currency: 'GBP',
      country: 'UK',
      source: 'spglobal',
      sourceUrl: 'https://www.pmi.spglobal.com',
      category: 'manufacturing',
    });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
