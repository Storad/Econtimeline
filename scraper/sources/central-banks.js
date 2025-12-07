/**
 * FOMC Calendar (Federal Reserve)
 *
 * Tracks Federal Open Market Committee meetings, rate decisions, and minutes.
 * Source: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 */

// FOMC 2025 Meeting Dates
// Minutes are released 3 weeks after each meeting
const FOMC_2025 = [
  { date: '2025-01-29', hasPresser: true, hasSEP: false, minutesDate: '2025-02-19' },
  { date: '2025-03-19', hasPresser: true, hasSEP: true, minutesDate: '2025-04-09' },
  { date: '2025-05-07', hasPresser: true, hasSEP: false, minutesDate: '2025-05-28' },
  { date: '2025-06-18', hasPresser: true, hasSEP: true, minutesDate: '2025-07-09' },
  { date: '2025-07-30', hasPresser: true, hasSEP: false, minutesDate: '2025-08-20' },
  { date: '2025-09-17', hasPresser: true, hasSEP: true, minutesDate: '2025-10-08' },
  { date: '2025-11-05', hasPresser: true, hasSEP: false, minutesDate: '2025-11-26' },
  { date: '2025-12-17', hasPresser: true, hasSEP: true, minutesDate: '2026-01-07' },
];

// FOMC 2026 Meeting Dates
const FOMC_2026 = [
  { date: '2026-01-28', hasPresser: true, hasSEP: false, minutesDate: '2026-02-18' },
  { date: '2026-03-18', hasPresser: true, hasSEP: true, minutesDate: '2026-04-08' },
  { date: '2026-05-06', hasPresser: true, hasSEP: false, minutesDate: '2026-05-27' },
  { date: '2026-06-17', hasPresser: true, hasSEP: true, minutesDate: '2026-07-08' },
  { date: '2026-07-29', hasPresser: true, hasSEP: false, minutesDate: '2026-08-19' },
  { date: '2026-09-16', hasPresser: true, hasSEP: true, minutesDate: '2026-10-07' },
  { date: '2026-11-04', hasPresser: true, hasSEP: false, minutesDate: '2026-11-25' },
  { date: '2026-12-16', hasPresser: true, hasSEP: true, minutesDate: '2027-01-06' },
];

/**
 * Generate FOMC events
 */
export function scrapeCentralBanks() {
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoffDate = new Date(today);
  cutoffDate.setMonth(cutoffDate.getMonth() + 6); // 6 months ahead

  const isInRange = (dateStr) => {
    const date = new Date(dateStr);
    return date >= today && date <= cutoffDate;
  };

  [...FOMC_2025, ...FOMC_2026].forEach(meeting => {
    // FOMC Rate Decision
    if (isInRange(meeting.date)) {
      events.push({
        date: meeting.date,
        time: '14:00',
        title: 'FOMC Rate Decision',
        impact: 'high',
        category: 'central_bank',
        currency: 'USD',
        country: 'US',
        source: 'fed',
        sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
      });

      // Fed Chair Press Conference
      if (meeting.hasPresser) {
        events.push({
          date: meeting.date,
          time: '14:30',
          title: 'Fed Chair Press Conference',
          impact: 'high',
          category: 'central_bank',
          currency: 'USD',
          country: 'US',
          source: 'fed',
          sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
        });
      }

      // Summary of Economic Projections (dot plot)
      if (meeting.hasSEP) {
        events.push({
          date: meeting.date,
          time: '14:00',
          title: 'FOMC Economic Projections',
          impact: 'high',
          category: 'central_bank',
          currency: 'USD',
          country: 'US',
          source: 'fed',
          sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
        });
      }
    }

    // FOMC Meeting Minutes (released 3 weeks after meeting)
    if (meeting.minutesDate && isInRange(meeting.minutesDate)) {
      events.push({
        date: meeting.minutesDate,
        time: '14:00',
        title: 'FOMC Meeting Minutes',
        impact: 'medium',
        category: 'central_bank',
        currency: 'USD',
        country: 'US',
        source: 'fed',
        sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
      });
    }
  });

  console.log(`  Generated ${events.length} FOMC events`);
  return events;
}

export default scrapeCentralBanks;
