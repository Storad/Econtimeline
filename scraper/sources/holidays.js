/**
 * US Market Holidays Calendar
 *
 * Automatically generates NYSE/NASDAQ market holidays.
 * Uses algorithmic calculation so it never needs manual updates.
 */

/**
 * Get the nth occurrence of a weekday in a month
 */
function getNthWeekday(year, month, weekday, n) {
  if (n === 5) {
    // Last occurrence of weekday in month
    const lastDay = new Date(year, month + 1, 0);
    let date = lastDay.getDate();
    while (lastDay.getDay() !== weekday) {
      lastDay.setDate(--date);
    }
    return lastDay;
  }

  const firstDay = new Date(year, month, 1);
  let diff = weekday - firstDay.getDay();
  if (diff < 0) diff += 7;

  const day = 1 + diff + (n - 1) * 7;
  return new Date(year, month, day);
}

/**
 * Calculate Easter Sunday using the Anonymous Gregorian algorithm
 */
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * If holiday falls on weekend, get observed date (Friday or Monday)
 */
function getObservedDate(date) {
  const day = date.getDay();
  if (day === 0) return addDays(date, 1); // Sunday -> Monday
  if (day === 6) return addDays(date, -1); // Saturday -> Friday
  return date;
}

/**
 * Generate US market holidays for a given year
 */
function getUSHolidays(year) {
  const holidays = [];

  // New Year's Day - January 1 (observed)
  const newYear = getObservedDate(new Date(year, 0, 1));
  holidays.push({ date: formatDate(newYear), title: "New Year's Day" });

  // Martin Luther King Jr. Day - 3rd Monday of January
  const mlk = getNthWeekday(year, 0, 1, 3);
  holidays.push({ date: formatDate(mlk), title: 'Martin Luther King Jr. Day' });

  // Presidents' Day - 3rd Monday of February
  const presidents = getNthWeekday(year, 1, 1, 3);
  holidays.push({ date: formatDate(presidents), title: "Presidents' Day" });

  // Good Friday - Friday before Easter
  const easter = getEasterSunday(year);
  const goodFriday = addDays(easter, -2);
  holidays.push({ date: formatDate(goodFriday), title: 'Good Friday' });

  // Memorial Day - Last Monday of May
  const memorial = getNthWeekday(year, 4, 1, 5);
  holidays.push({ date: formatDate(memorial), title: 'Memorial Day' });

  // Juneteenth - June 19 (observed)
  const juneteenth = getObservedDate(new Date(year, 5, 19));
  holidays.push({ date: formatDate(juneteenth), title: 'Juneteenth' });

  // Independence Day - July 4 (observed)
  const july4 = getObservedDate(new Date(year, 6, 4));
  holidays.push({ date: formatDate(july4), title: 'Independence Day' });

  // Labor Day - 1st Monday of September
  const labor = getNthWeekday(year, 8, 1, 1);
  holidays.push({ date: formatDate(labor), title: 'Labor Day' });

  // Thanksgiving - 4th Thursday of November
  const thanksgiving = getNthWeekday(year, 10, 4, 4);
  holidays.push({ date: formatDate(thanksgiving), title: 'Thanksgiving Day' });

  // Christmas - December 25 (observed)
  const christmas = getObservedDate(new Date(year, 11, 25));
  holidays.push({ date: formatDate(christmas), title: 'Christmas Day' });

  return holidays.map(h => ({ ...h, country: 'US', currency: 'USD' }));
}

/**
 * Generate US market holiday events
 * Automatically generates for current year and next year
 */
export async function scrapeHolidays() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  const allHolidays = [];

  for (const year of years) {
    allHolidays.push(...getUSHolidays(year));
  }

  // Filter to recent/future holidays only
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const events = allHolidays
    .filter(h => new Date(h.date) >= oneWeekAgo)
    .map(h => ({
      date: h.date,
      time: 'All Day',
      title: `${h.title} (Market Closed)`,
      impact: 'holiday',
      currency: 'USD',
      country: 'US',
      source: 'holidays',
      sourceUrl: 'https://www.nyse.com/markets/hours-calendars',
      category: 'holiday',
    }));

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  return events;
}

export default scrapeHolidays;
