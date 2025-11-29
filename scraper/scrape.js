import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get date range: 3 days back, 30 days forward
function getDateRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 3);
  const end = new Date(today);
  end.setDate(end.getDate() + 30);
  return { start, end };
}

// Format date for Forex Factory URL
function formatDateForUrl(date) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  return `${months[date.getMonth()]}${date.getDate()}.${date.getFullYear()}`;
}

// Parse impact from class name
function parseImpact(className) {
  if (!className) return 'low';
  if (className.includes('high') || className.includes('red')) return 'high';
  if (className.includes('medium') || className.includes('ora')) return 'medium';
  if (className.includes('low') || className.includes('yel')) return 'low';
  if (className.includes('gray') || className.includes('holiday')) return 'holiday';
  return 'low';
}

// Categorize event based on name
function categorizeEvent(eventName) {
  const name = eventName.toLowerCase();

  if (name.includes('interest rate') || name.includes('rate decision') || name.includes('monetary policy') || name.includes('fed') || name.includes('ecb') || name.includes('boe') || name.includes('boj')) {
    return 'Interest Rates';
  }
  if (name.includes('employment') || name.includes('jobless') || name.includes('payroll') || name.includes('unemployment') || name.includes('jobs') || name.includes('nfp')) {
    return 'Employment';
  }
  if (name.includes('cpi') || name.includes('inflation') || name.includes('ppi') || name.includes('price index')) {
    return 'Inflation';
  }
  if (name.includes('gdp') || name.includes('growth')) {
    return 'GDP';
  }
  if (name.includes('retail sales') || name.includes('consumer')) {
    return 'Consumer';
  }
  if (name.includes('pmi') || name.includes('manufacturing') || name.includes('industrial')) {
    return 'Manufacturing';
  }
  if (name.includes('trade') || name.includes('export') || name.includes('import') || name.includes('balance')) {
    return 'Trade';
  }
  if (name.includes('housing') || name.includes('home') || name.includes('building')) {
    return 'Housing';
  }
  if (name.includes('speak') || name.includes('conference') || name.includes('testimony') || name.includes('minutes')) {
    return 'Speeches';
  }
  if (name.includes('oil') || name.includes('inventory') || name.includes('crude') || name.includes('gas')) {
    return 'Energy';
  }
  if (name.includes('sentiment') || name.includes('confidence')) {
    return 'Sentiment';
  }

  return 'Other';
}

// Random delay to appear more human
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000));
}

async function scrapeForexFactory(retryCount = 0) {
  console.log('Starting Forex Factory scraper...');

  const { start, end } = getDateRange();
  const url = `https://www.forexfactory.com/calendar?range=${formatDateForUrl(start)}-${formatDateForUrl(end)}`;

  console.log(`Fetching: ${url}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();

    // Hide automation indicators
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the calendar
    console.log('Navigating to page...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait a bit for JavaScript to load
    await delay(5000);

    // Try multiple selectors
    const selectors = ['.calendar__table', '.calendar__row', 'table.calendar', '#calendar'];
    let foundSelector = null;

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        foundSelector = selector;
        console.log(`Found selector: ${selector}`);
        break;
      } catch (e) {
        console.log(`Selector ${selector} not found, trying next...`);
      }
    }

    if (!foundSelector) {
      // Take a screenshot for debugging
      const screenshotPath = path.join(__dirname, 'debug-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Debug screenshot saved to ${screenshotPath}`);

      // Get page content for debugging
      const content = await page.content();
      console.log('Page title:', await page.title());
      console.log('Page URL:', page.url());

      if (content.includes('Access Denied') || content.includes('blocked') || content.includes('captcha')) {
        throw new Error('Access blocked by Forex Factory');
      }

      throw new Error('Could not find calendar table on page');
    }

    // Give it more time for dynamic content
    await delay(3000);

    // Extract events
    const events = await page.evaluate(() => {
      const rows = document.querySelectorAll('.calendar__row, tr[data-eventid]');
      const results = [];
      let currentDate = '';
      let eventId = 0;

      rows.forEach(row => {
        // Check for date
        const dateCell = row.querySelector('.calendar__date span, .date');
        if (dateCell && dateCell.textContent.trim()) {
          currentDate = dateCell.textContent.trim();
        }

        // Get event data
        const currency = row.querySelector('.calendar__currency, .currency')?.textContent?.trim();
        const eventName = row.querySelector('.calendar__event span, .event')?.textContent?.trim();

        if (!currency || !eventName) return;

        // Get time
        let time = row.querySelector('.calendar__time, .time')?.textContent?.trim() || 'All Day';

        // Get impact
        const impactSpan = row.querySelector('.calendar__impact span, .impact span');
        const impactClass = impactSpan?.className || '';

        // Get values
        const forecast = row.querySelector('.calendar__forecast span, .forecast')?.textContent?.trim() || null;
        const previous = row.querySelector('.calendar__previous span, .previous')?.textContent?.trim() || null;
        const actual = row.querySelector('.calendar__actual span, .actual')?.textContent?.trim() || null;

        results.push({
          id: `event-${eventId++}`,
          dateRaw: currentDate,
          time,
          currency,
          event: eventName,
          impactClass,
          forecast: forecast === '' ? null : forecast,
          previous: previous === '' ? null : previous,
          actual: actual === '' ? null : actual
        });
      });

      return results;
    });

    console.log(`Scraped ${events.length} raw events`);

    if (events.length === 0 && retryCount < 2) {
      console.log('No events found, retrying...');
      await browser.close();
      await delay(5000);
      return scrapeForexFactory(retryCount + 1);
    }

    // Process events - parse dates and categorize
    const currentYear = new Date().getFullYear();
    const months = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    let lastParsedDate = '';

    const processedEvents = events.map(event => {
      // Parse date
      let date = lastParsedDate;
      if (event.dateRaw) {
        const match = event.dateRaw.match(/([A-Za-z]{3})\s+(\d{1,2})/);
        if (match) {
          const month = months[match[1]] || '01';
          const day = match[2].padStart(2, '0');
          date = `${currentYear}-${month}-${day}`;
          lastParsedDate = date;
        }
      }

      // Parse time - convert 12h to 24h
      let time = event.time;
      if (time && (time.includes('am') || time.includes('pm'))) {
        const isPM = time.toLowerCase().includes('pm');
        const timeParts = time.replace(/[ap]m/i, '').trim().split(':');
        let hours = parseInt(timeParts[0]);
        const minutes = timeParts[1] || '00';

        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        time = `${hours.toString().padStart(2, '0')}:${minutes}`;
      }

      return {
        id: event.id,
        date,
        time,
        currency: event.currency,
        event: event.event,
        impact: parseImpact(event.impactClass),
        forecast: event.forecast,
        previous: event.previous,
        actual: event.actual,
        category: categorizeEvent(event.event)
      };
    }).filter(event => event.date); // Remove events without valid dates

    // Sort by date and time
    processedEvents.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    console.log(`Processed ${processedEvents.length} events`);

    // Save to file
    const output = {
      lastUpdated: new Date().toISOString(),
      eventCount: processedEvents.length,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      events: processedEvents
    };

    const outputPath = path.join(__dirname, 'calendar-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Saved to ${outputPath}`);

    // Also save to client/public for easy access
    const publicPath = path.join(__dirname, '..', 'client', 'public', 'calendar-data.json');
    fs.writeFileSync(publicPath, JSON.stringify(output, null, 2));
    console.log(`Saved to ${publicPath}`);

    return output;

  } catch (error) {
    console.error('Error scraping:', error);

    if (retryCount < 2) {
      console.log(`Retry ${retryCount + 1}/2...`);
      await browser.close();
      await delay(10000);
      return scrapeForexFactory(retryCount + 1);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeForexFactory()
  .then(data => {
    console.log('Scraping complete!');
    console.log(`Total events: ${data.eventCount}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });
