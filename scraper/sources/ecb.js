/**
 * European Central Bank (ECB) Economic Calendar
 *
 * Key releases:
 * - ECB Interest Rate Decision - HIGH IMPACT
 * - ECB Press Conference - HIGH IMPACT
 * - ECB Meeting Minutes - MEDIUM IMPACT
 *
 * ECB Governing Council meets approximately every 6 weeks
 * Monetary policy decisions announced at 14:15 CET, press conference at 14:45 CET
 *
 * Source: https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html
 */

import * as cheerio from 'cheerio';

const ECB_CALENDAR_URL = 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html';

// Known ECB meeting dates for 2025 (published in advance)
// These are Governing Council monetary policy meetings
const ECB_MEETINGS_2025 = [
  { date: '2025-01-30', hasPress: true },
  { date: '2025-03-06', hasPress: true },
  { date: '2025-04-17', hasPress: true },
  { date: '2025-06-05', hasPress: true },
  { date: '2025-07-17', hasPress: true },
  { date: '2025-09-11', hasPress: true },
  { date: '2025-10-30', hasPress: true },
  { date: '2025-12-18', hasPress: true },
];

const ECB_MEETINGS_2026 = [
  { date: '2026-01-22', hasPress: true },
  { date: '2026-03-05', hasPress: true },
  { date: '2026-04-16', hasPress: true },
  { date: '2026-06-04', hasPress: true },
];

/**
 * Generate ECB economic calendar events
 */
export async function scrapeECB() {
  const events = [];
  const allMeetings = [...ECB_MEETINGS_2025, ...ECB_MEETINGS_2026];

  // Filter to only recent/future meetings
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const meeting of allMeetings) {
    const meetingDate = new Date(meeting.date);
    if (meetingDate < oneWeekAgo) continue;

    // ECB Rate Decision
    events.push({
      date: meeting.date,
      time: '13:15', // 14:15 CET = 13:15 UTC
      title: 'ECB Interest Rate Decision',
      impact: 'high',
      currency: 'EUR',
      country: 'EU',
      source: 'ecb',
      sourceUrl: ECB_CALENDAR_URL,
      category: 'central_bank',
    });

    // ECB Press Conference
    if (meeting.hasPress) {
      events.push({
        date: meeting.date,
        time: '13:45', // 14:45 CET = 13:45 UTC
        title: 'ECB Press Conference',
        impact: 'high',
        currency: 'EUR',
        country: 'EU',
        source: 'ecb',
        sourceUrl: ECB_CALENDAR_URL,
        category: 'central_bank',
      });
    }

    // ECB Meeting Minutes (released ~4 weeks after meeting)
    const minutesDate = new Date(meetingDate);
    minutesDate.setDate(minutesDate.getDate() + 28);
    events.push({
      date: minutesDate.toISOString().split('T')[0],
      time: '12:30',
      title: 'ECB Meeting Minutes',
      impact: 'medium',
      currency: 'EUR',
      country: 'EU',
      source: 'ecb',
      sourceUrl: ECB_CALENDAR_URL,
      category: 'central_bank',
    });
  }

  // Add Eurozone economic data releases
  events.push(...generateEurozoneData());

  return events;
}

/**
 * Generate Eurozone economic data releases (Eurostat)
 */
function generateEurozoneData() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Generate for current month + 3 months
  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // Eurozone CPI Flash Estimate (end of month)
    const cpiFlashDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    if (cpiFlashDate.getDay() === 0) cpiFlashDate.setDate(cpiFlashDate.getDate() - 2);
    if (cpiFlashDate.getDay() === 6) cpiFlashDate.setDate(cpiFlashDate.getDate() - 1);
    events.push({
      date: formatDate(cpiFlashDate),
      time: '10:00',
      title: 'CPI Flash Estimate y/y',
      impact: 'high',
      currency: 'EUR',
      country: 'EU',
      source: 'eurostat',
      sourceUrl: 'https://ec.europa.eu/eurostat',
      category: 'inflation',
    });

    // German ZEW Economic Sentiment (second or third Tuesday)
    const zewDate = new Date(targetYear, targetMonth, 1);
    let tuesdayCount = 0;
    while (tuesdayCount < 2) {
      if (zewDate.getDay() === 2) tuesdayCount++;
      if (tuesdayCount < 2) zewDate.setDate(zewDate.getDate() + 1);
    }
    zewDate.setDate(zewDate.getDate() + 7); // Third Tuesday
    events.push({
      date: formatDate(zewDate),
      time: '10:00',
      title: 'German ZEW Economic Sentiment',
      impact: 'medium',
      currency: 'EUR',
      country: 'DE',
      source: 'zew',
      sourceUrl: 'https://www.zew.de',
      category: 'sentiment',
    });

    // German Ifo Business Climate (around 25th)
    const ifoDate = new Date(targetYear, targetMonth, 24);
    if (ifoDate.getDay() === 0) ifoDate.setDate(ifoDate.getDate() + 1);
    if (ifoDate.getDay() === 6) ifoDate.setDate(ifoDate.getDate() + 2);
    events.push({
      date: formatDate(ifoDate),
      time: '09:00',
      title: 'German Ifo Business Climate',
      impact: 'medium',
      currency: 'EUR',
      country: 'DE',
      source: 'ifo',
      sourceUrl: 'https://www.ifo.de',
      category: 'sentiment',
    });

    // Eurozone GDP (typically mid-month)
    const gdpDate = new Date(targetYear, targetMonth, 14);
    if (gdpDate.getDay() === 0) gdpDate.setDate(gdpDate.getDate() + 1);
    if (gdpDate.getDay() === 6) gdpDate.setDate(gdpDate.getDate() + 2);
    events.push({
      date: formatDate(gdpDate),
      time: '10:00',
      title: 'GDP q/q',
      impact: 'medium',
      currency: 'EUR',
      country: 'EU',
      source: 'eurostat',
      sourceUrl: 'https://ec.europa.eu/eurostat',
      category: 'growth',
    });
  }

  // Filter to recent/future
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return events.filter(e => new Date(e.date) >= oneWeekAgo);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}
