/**
 * Reserve Bank of Australia (RBA) Economic Calendar
 *
 * Key releases:
 * - RBA Interest Rate Decision - HIGH IMPACT
 * - RBA Rate Statement - HIGH IMPACT
 * - RBA Meeting Minutes - MEDIUM IMPACT
 *
 * RBA meets 8 times per year (first Tuesday except January)
 * Decisions announced at 14:30 AEDT/AEST
 *
 * Source: https://www.rba.gov.au/monetary-policy/rba-board-minutes/
 */

// Known RBA meeting dates for 2025
const RBA_MEETINGS_2025 = [
  '2025-02-18',
  '2025-04-01',
  '2025-05-20',
  '2025-07-08',
  '2025-08-12',
  '2025-09-16',
  '2025-11-04',
  '2025-12-09',
];

const RBA_MEETINGS_2026 = [
  '2026-02-17',
  '2026-03-31',
  '2026-05-05',
  '2026-06-02',
];

/**
 * Generate RBA economic calendar events
 */
export async function scrapeRBA() {
  const events = [];
  const allMeetings = [...RBA_MEETINGS_2025, ...RBA_MEETINGS_2026];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const meetingDate of allMeetings) {
    if (new Date(meetingDate) < oneWeekAgo) continue;

    // RBA Rate Decision
    events.push({
      date: meetingDate,
      time: '03:30', // 14:30 AEDT = 03:30 UTC
      title: 'RBA Interest Rate Decision',
      impact: 'high',
      currency: 'AUD',
      country: 'AU',
      source: 'rba',
      sourceUrl: 'https://www.rba.gov.au/monetary-policy/',
      category: 'central_bank',
    });

    events.push({
      date: meetingDate,
      time: '03:30',
      title: 'RBA Rate Statement',
      impact: 'high',
      currency: 'AUD',
      country: 'AU',
      source: 'rba',
      sourceUrl: 'https://www.rba.gov.au/monetary-policy/',
      category: 'central_bank',
    });

    // Meeting Minutes (2 weeks after meeting)
    const minutesDate = new Date(meetingDate);
    minutesDate.setDate(minutesDate.getDate() + 14);
    // Find the Tuesday
    while (minutesDate.getDay() !== 2) {
      minutesDate.setDate(minutesDate.getDate() + 1);
    }
    events.push({
      date: formatDate(minutesDate),
      time: '00:30',
      title: 'RBA Meeting Minutes',
      impact: 'medium',
      currency: 'AUD',
      country: 'AU',
      source: 'rba',
      sourceUrl: 'https://www.rba.gov.au/monetary-policy/rba-board-minutes/',
      category: 'central_bank',
    });
  }

  // Add Australia economic data releases
  events.push(...generateAustraliaData());

  return events;
}

/**
 * Generate Australia economic data releases (ABS)
 */
function generateAustraliaData() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Australia Employment (typically 3rd Thursday)
    const employmentDate = new Date(targetYear, targetMonth, 1);
    let thursdayCount = 0;
    while (thursdayCount < 3) {
      if (employmentDate.getDay() === 4) thursdayCount++;
      if (thursdayCount < 3) employmentDate.setDate(employmentDate.getDate() + 1);
    }
    events.push({
      date: formatDate(employmentDate),
      time: '00:30', // 11:30 AEDT
      title: 'Employment Change',
      impact: 'high',
      currency: 'AUD',
      country: 'AU',
      source: 'abs',
      sourceUrl: 'https://www.abs.gov.au',
      category: 'employment',
    });
    events.push({
      date: formatDate(employmentDate),
      time: '00:30',
      title: 'Unemployment Rate',
      impact: 'high',
      currency: 'AUD',
      country: 'AU',
      source: 'abs',
      sourceUrl: 'https://www.abs.gov.au',
      category: 'employment',
    });

    // Australia CPI (quarterly - late January, April, July, October)
    if (targetMonth === 0 || targetMonth === 3 || targetMonth === 6 || targetMonth === 9) {
      const cpiDate = new Date(targetYear, targetMonth, 25);
      if (cpiDate.getDay() === 0) cpiDate.setDate(cpiDate.getDate() + 1);
      if (cpiDate.getDay() === 6) cpiDate.setDate(cpiDate.getDate() + 2);
      events.push({
        date: formatDate(cpiDate),
        time: '00:30',
        title: 'CPI q/q',
        impact: 'high',
        currency: 'AUD',
        country: 'AU',
        source: 'abs',
        sourceUrl: 'https://www.abs.gov.au',
        category: 'inflation',
      });
    }

    // Australia Retail Sales (typically first week)
    const retailDate = new Date(targetYear, targetMonth, 4);
    if (retailDate.getDay() === 0) retailDate.setDate(retailDate.getDate() + 1);
    if (retailDate.getDay() === 6) retailDate.setDate(retailDate.getDate() + 2);
    events.push({
      date: formatDate(retailDate),
      time: '00:30',
      title: 'Retail Sales m/m',
      impact: 'medium',
      currency: 'AUD',
      country: 'AU',
      source: 'abs',
      sourceUrl: 'https://www.abs.gov.au',
      category: 'consumer',
    });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
