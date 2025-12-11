/**
 * FRED API Source
 *
 * Fetches economic release schedules from the Federal Reserve Economic Data API.
 * Uses individual release queries to get accurate future dates.
 *
 * Key releases covered:
 * - Employment Situation (NFP) - Release ID 50
 * - Consumer Price Index (CPI) - Release ID 10
 * - Producer Price Index (PPI) - Release ID 17
 * - GDP - Release ID 53
 * - Retail Sales - Release ID 323
 * - And more...
 */

import { API_CONFIG } from '../lib/api-client.js';

// Key FRED releases with their metadata
// VERIFIED release IDs - https://fred.stlouisfed.org/releases
// NOTE: Due to 2025 government shutdown, some releases (NFP, CPI) have revised dates
// NOTE: Some indicators (CB Consumer Confidence, Chicago PMI, NAHB HMI) are proprietary and NOT in FRED
const FRED_RELEASES = [
  // HIGH IMPACT - All verified
  { id: 50, title: 'Non-Farm Payrolls', impact: 'high', category: 'employment', time: '08:30' },  // Employment Situation ✓
  { id: 10, title: 'CPI m/m', impact: 'high', category: 'inflation', time: '08:30' },  // Consumer Price Index ✓
  { id: 53, title: 'GDP q/q', impact: 'high', category: 'growth', time: '08:30' },  // Gross Domestic Product ✓
  { id: 9, title: 'Retail Sales m/m', impact: 'high', category: 'consumer', time: '08:30' },  // Advance Monthly Sales ✓
  { id: 54, title: 'Core PCE Price Index m/m', impact: 'high', category: 'inflation', time: '08:30' },  // Personal Income and Outlays ✓
  { id: 95, title: 'Durable Goods Orders m/m', impact: 'high', category: 'manufacturing', time: '08:30' },  // M3 Survey ✓
  // NOTE: ISM Manufacturing/Services PMI are NOT in FRED (proprietary) - handled in ism.js

  // MEDIUM IMPACT - All verified
  { id: 46, title: 'PPI m/m', impact: 'medium', category: 'inflation', time: '08:30' },  // Producer Price Index ✓
  { id: 13, title: 'Industrial Production m/m', impact: 'medium', category: 'manufacturing', time: '09:15' },  // G.17 Industrial Production ✓
  { id: 27, title: 'Housing Starts', impact: 'medium', category: 'housing', time: '08:30' },  // New Residential Construction ✓
  { id: 27, title: 'Building Permits', impact: 'medium', category: 'housing', time: '08:30' },  // Also in New Residential Construction ✓
  { id: 97, title: 'New Home Sales', impact: 'medium', category: 'housing', time: '10:00' },  // New Residential Sales ✓
  // NOTE: Existing Home Sales (NAR) - release 291 has no scheduled dates in FRED, handled separately
  { id: 51, title: 'Trade Balance', impact: 'medium', category: 'trade', time: '08:30' },  // U.S. International Trade ✓
  { id: 192, title: 'JOLTS Job Openings', impact: 'medium', category: 'employment', time: '10:00' },  // JOLTS ✓
  { id: 91, title: 'UoM Consumer Sentiment', impact: 'medium', category: 'sentiment', time: '10:00' },  // Surveys of Consumers ✓
  { id: 351, title: 'Philly Fed Manufacturing Index', impact: 'medium', category: 'manufacturing', time: '08:30' },  // Manufacturing Business Outlook ✓
  { id: 321, title: 'Empire State Manufacturing Index', impact: 'medium', category: 'manufacturing', time: '08:30' },  // Empire State Manufacturing ✓
  { id: 47, title: 'Nonfarm Productivity q/q', impact: 'medium', category: 'employment', time: '08:30' },  // Productivity and Costs ✓
  { id: 11, title: 'Employment Cost Index q/q', impact: 'medium', category: 'employment', time: '08:30' },  // Employment Cost Index ✓
  { id: 180, title: 'Unemployment Claims', impact: 'medium', category: 'employment', time: '08:30' },  // Unemployment Insurance Weekly Claims ✓
  { id: 25, title: 'Business Inventories m/m', impact: 'low', category: 'trade', time: '10:00' },  // Manufacturing and Trade Inventories ✓
  // NOTE: CB Consumer Confidence, Chicago PMI, NAHB HMI are NOT in FRED (proprietary)

  // LOW IMPACT - All verified
  { id: 14, title: 'Consumer Credit m/m', impact: 'low', category: 'consumer', time: '15:00' },  // G.19 Consumer Credit ✓
  { id: 188, title: 'Import Price Index m/m', impact: 'low', category: 'inflation', time: '08:30' },  // Import and Export Price Indexes ✓
  { id: 49, title: 'Current Account', impact: 'low', category: 'trade', time: '08:30' },  // U.S. International Transactions ✓
];

/**
 * Fetch release dates for a specific FRED release
 */
async function fetchReleaseDates(releaseId) {
  const url = `${API_CONFIG.fred.baseUrl}/release/dates?release_id=${releaseId}&api_key=${API_CONFIG.fred.apiKey}&file_type=json&include_release_dates_with_no_data=true`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'EconTimeline/2.0' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.release_dates || [];
  } catch (error) {
    console.error(`    Failed to fetch release ${releaseId}: ${error.message}`);
    return [];
  }
}

/**
 * Fetch economic calendar from FRED API
 */
export async function scrapeFRED() {
  const events = [];

  try {
    console.log('  Fetching FRED release schedules...');

    // Date range: 3 months back to 4 months ahead
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const fourMonthsLater = new Date(today);
    fourMonthsLater.setMonth(fourMonthsLater.getMonth() + 4);

    const startStr = threeMonthsAgo.toISOString().split('T')[0];
    const endStr = fourMonthsLater.toISOString().split('T')[0];

    console.log(`    Date range: ${startStr} to ${endStr} (including 3 months history)`);

    // Fetch each release's schedule
    let totalFetched = 0;

    for (const release of FRED_RELEASES) {
      const dates = await fetchReleaseDates(release.id);

      // Filter to date range (3 months back to 4 months ahead)
      const futureDates = dates.filter(d => d.date >= startStr && d.date <= endStr);

      for (const dateInfo of futureDates) {
        events.push({
          date: dateInfo.date,
          time: release.time,
          title: release.title,
          impact: release.impact,
          category: release.category,
          currency: 'USD',
          country: 'US',
          source: 'fred',
          sourceUrl: `https://fred.stlouisfed.org/release?rid=${release.id}`,
          fredReleaseId: release.id,
        });
      }

      totalFetched += futureDates.length;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`    Fetched ${totalFetched} events from ${FRED_RELEASES.length} releases`);

    // Deduplicate by date + title
    const seen = new Set();
    const uniqueEvents = events.filter(event => {
      const key = `${event.date}-${event.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date
    uniqueEvents.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`  Processed ${uniqueEvents.length} unique FRED events`);
    return uniqueEvents;

  } catch (error) {
    console.error('  FRED API error:', error.message);
    return [];
  }
}

export default scrapeFRED;
