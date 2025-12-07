/**
 * Federal Reserve Scraper
 *
 * Sources:
 * - FOMC Calendar: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 * - Fed Speeches: https://www.federalreserve.gov/newsevents/speeches.htm
 *
 * Key releases:
 * - FOMC Rate Decision - HIGH IMPACT
 * - FOMC Meeting Minutes - HIGH IMPACT
 * - Fed Chair Powell Speaks - HIGH IMPACT
 * - Beige Book - MEDIUM IMPACT
 */

import * as cheerio from 'cheerio';

const FOMC_CALENDAR_URL = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';

/**
 * Scrape FOMC meeting dates and Fed events
 */
export async function scrapeFed() {
  const events = [];

  try {
    const response = await fetch(FOMC_CALENDAR_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    // The FOMC calendar has meeting dates in panels
    // Each panel shows meeting dates, with indicators for statement releases

    // Look for meeting dates in the calendar panels
    $('.panel, .fomc-meeting, .row').each((i, elem) => {
      const text = $(elem).text();

      // Look for date patterns like "January 28-29" or "March 18-19"
      const datePattern = /([A-Z][a-z]+)\s+(\d{1,2})(?:-(\d{1,2}))?(?:,?\s*(\d{4}))?/g;
      let match;

      while ((match = datePattern.exec(text)) !== null) {
        const month = match[1];
        const startDay = match[2];
        const endDay = match[3] || startDay;
        const year = match[4] || new Date().getFullYear();

        const meetingDate = parseFedDate(month, endDay, year);
        if (meetingDate) {
          // Check if this is a meeting with a statement/projection
          const hasStatement = text.toLowerCase().includes('statement') ||
                              text.toLowerCase().includes('projection') ||
                              text.toLowerCase().includes('press conference');

          // Add FOMC Rate Decision
          events.push({
            date: meetingDate,
            time: '14:00', // FOMC announcements are at 2:00 PM ET
            title: 'FOMC Rate Decision',
            impact: 'high',
            currency: 'USD',
            country: 'US',
            source: 'fed',
            sourceUrl: FOMC_CALENDAR_URL,
            category: 'central_bank',
          });

          // If there's a press conference, add Fed Chair speaks
          if (hasStatement) {
            events.push({
              date: meetingDate,
              time: '14:30',
              title: 'Fed Chair Powell Speaks',
              impact: 'high',
              currency: 'USD',
              country: 'US',
              source: 'fed',
              sourceUrl: FOMC_CALENDAR_URL,
              category: 'central_bank',
            });
          }
        }
      }
    });

    // Remove duplicates
    const uniqueEvents = events.filter((event, index, self) =>
      index === self.findIndex(e => e.date === event.date && e.title === event.title)
    );

    // Filter to only include events within the past week or in the future
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return uniqueEvents.filter(e => new Date(e.date) >= oneWeekAgo);

  } catch (error) {
    console.error(`Fed scraper error: ${error.message}`);
    return [];
  }
}

/**
 * Parse Fed date format
 */
function parseFedDate(month, day, year) {
  const months = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };

  const monthNum = months[month.toLowerCase()];
  if (monthNum === undefined) return null;

  const date = new Date(parseInt(year), monthNum, parseInt(day));
  return date.toISOString().split('T')[0];
}

/**
 * Get FOMC meeting minutes dates (released 3 weeks after meeting)
 */
function getMinutesDate(meetingDate) {
  const date = new Date(meetingDate);
  date.setDate(date.getDate() + 21); // 3 weeks later
  return date.toISOString().split('T')[0];
}
