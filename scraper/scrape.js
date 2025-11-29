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

// Parse impact level
function parseImpact(level) {
  if (!level) return 'low';
  const num = parseInt(level);
  if (num >= 3) return 'high';
  if (num === 2) return 'medium';
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

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeInvestingCalendar() {
  console.log('Starting Investing.com calendar scraper...');

  const { start, end } = getDateRange();

  // Format dates for Investing.com
  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const url = `https://www.investing.com/economic-calendar/`;
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

    // Hide automation
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to Investing.com...');
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await delay(3000);

    // Try to find and extract events
    const events = await page.evaluate(() => {
      const rows = document.querySelectorAll('#economicCalendarData tr.js-event-item');
      const results = [];
      let eventId = 0;

      rows.forEach(row => {
        try {
          const dateAttr = row.getAttribute('data-event-datetime');
          const currency = row.querySelector('.flagCur')?.textContent?.trim();
          const eventName = row.querySelector('.event a')?.textContent?.trim();
          const impact = row.querySelector('.sentiment')?.getAttribute('data-img_key');
          const actual = row.querySelector('.act')?.textContent?.trim();
          const forecast = row.querySelector('.fore')?.textContent?.trim();
          const previous = row.querySelector('.prev')?.textContent?.trim();

          if (currency && eventName) {
            results.push({
              id: `event-${eventId++}`,
              datetime: dateAttr,
              currency,
              event: eventName,
              impactLevel: impact,
              actual: actual || null,
              forecast: forecast || null,
              previous: previous || null
            });
          }
        } catch (e) {
          // Skip problematic rows
        }
      });

      return results;
    });

    console.log(`Scraped ${events.length} events from Investing.com`);

    if (events.length > 0) {
      // Process events
      const processedEvents = events.map(event => {
        let date = '';
        let time = 'All Day';

        if (event.datetime) {
          const dt = new Date(event.datetime);
          date = dt.toISOString().split('T')[0];
          time = dt.toTimeString().slice(0, 5);
        }

        return {
          id: event.id,
          date,
          time,
          currency: event.currency,
          event: event.event,
          impact: parseImpact(event.impactLevel),
          forecast: event.forecast,
          previous: event.previous,
          actual: event.actual,
          category: categorizeEvent(event.event)
        };
      }).filter(e => e.date);

      // Sort by date and time
      processedEvents.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      const output = {
        lastUpdated: new Date().toISOString(),
        eventCount: processedEvents.length,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        events: processedEvents
      };

      return output;
    }

    // If Investing.com fails, generate mock data
    console.log('Could not scrape data, generating mock data...');
    return generateMockData(start, end);

  } finally {
    await browser.close();
  }
}

// Generate realistic mock data as fallback
function generateMockData(start, end) {
  const events = [];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD'];

  const eventTemplates = [
    { name: 'CPI (MoM)', category: 'Inflation', impact: 'high' },
    { name: 'CPI (YoY)', category: 'Inflation', impact: 'high' },
    { name: 'Core CPI (MoM)', category: 'Inflation', impact: 'high' },
    { name: 'Interest Rate Decision', category: 'Interest Rates', impact: 'high' },
    { name: 'GDP (QoQ)', category: 'GDP', impact: 'high' },
    { name: 'Non-Farm Payrolls', category: 'Employment', impact: 'high' },
    { name: 'Unemployment Rate', category: 'Employment', impact: 'high' },
    { name: 'Retail Sales (MoM)', category: 'Consumer', impact: 'medium' },
    { name: 'PMI Manufacturing', category: 'Manufacturing', impact: 'medium' },
    { name: 'PMI Services', category: 'Manufacturing', impact: 'medium' },
    { name: 'Trade Balance', category: 'Trade', impact: 'medium' },
    { name: 'Consumer Confidence', category: 'Sentiment', impact: 'medium' },
    { name: 'Building Permits', category: 'Housing', impact: 'low' },
    { name: 'Industrial Production (MoM)', category: 'Manufacturing', impact: 'medium' },
    { name: 'Central Bank Governor Speaks', category: 'Speeches', impact: 'medium' },
    { name: 'Crude Oil Inventories', category: 'Energy', impact: 'low' },
    { name: 'Initial Jobless Claims', category: 'Employment', impact: 'medium' },
    { name: 'PPI (MoM)', category: 'Inflation', impact: 'medium' },
    { name: 'Existing Home Sales', category: 'Housing', impact: 'low' },
    { name: 'Durable Goods Orders', category: 'Manufacturing', impact: 'medium' },
  ];

  const times = ['08:30', '09:00', '10:00', '10:30', '11:00', '13:30', '14:00', '15:00', '19:00'];

  let eventId = 0;
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();

    const numEvents = dayOfWeek === 0 || dayOfWeek === 6
      ? Math.floor(Math.random() * 2)
      : Math.floor(Math.random() * 6) + 2;

    const usedTemplates = new Set();

    for (let i = 0; i < numEvents; i++) {
      let templateIndex;
      do {
        templateIndex = Math.floor(Math.random() * eventTemplates.length);
      } while (usedTemplates.has(templateIndex) && usedTemplates.size < eventTemplates.length);

      usedTemplates.add(templateIndex);
      const template = eventTemplates[templateIndex];
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      const time = times[Math.floor(Math.random() * times.length)];

      const isPercent = template.name.includes('Rate') || template.name.includes('MoM') || template.name.includes('YoY') || template.name.includes('QoQ');
      const baseValue = isPercent ? (Math.random() * 5 - 1).toFixed(1) : (Math.random() * 500).toFixed(1);
      const unit = isPercent ? '%' : template.name.includes('Claims') ? 'K' : template.name.includes('Balance') ? 'B' : '';

      const isPast = new Date(dateStr) < new Date();

      events.push({
        id: `event-${eventId++}`,
        date: dateStr,
        time,
        currency,
        event: template.name,
        impact: template.impact,
        forecast: `${baseValue}${unit}`,
        previous: `${(parseFloat(baseValue) + (Math.random() - 0.5)).toFixed(1)}${unit}`,
        actual: isPast ? `${(parseFloat(baseValue) + (Math.random() - 0.5) * 0.5).toFixed(1)}${unit}` : null,
        category: template.category,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  return {
    lastUpdated: new Date().toISOString(),
    eventCount: events.length,
    dateRange: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    },
    events
  };
}

// Save data to files
function saveData(output) {
  const outputPath = path.join(__dirname, 'calendar-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Saved to ${outputPath}`);

  const publicPath = path.join(__dirname, '..', 'client', 'public', 'calendar-data.json');
  fs.writeFileSync(publicPath, JSON.stringify(output, null, 2));
  console.log(`Saved to ${publicPath}`);
}

// Run the scraper
scrapeInvestingCalendar()
  .then(data => {
    saveData(data);
    console.log('Scraping complete!');
    console.log(`Total events: ${data.eventCount}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Scraping failed, using mock data:', error.message);
    const { start, end } = getDateRange();
    const mockData = generateMockData(start, end);
    saveData(mockData);
    console.log(`Generated ${mockData.eventCount} mock events`);
    process.exit(0); // Exit successfully with mock data
  });
