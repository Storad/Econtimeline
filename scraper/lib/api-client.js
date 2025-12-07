/**
 * Unified API Client for Economic Data Sources
 *
 * Handles API calls to:
 * - FRED (Federal Reserve Economic Data)
 * - ECB (European Central Bank)
 * - Bank of England
 * - Bank of Canada
 */

// API Configuration
export const API_CONFIG = {
  fred: {
    baseUrl: 'https://api.stlouisfed.org/fred',
    apiKey: process.env.FRED_API_KEY || 'a6185d8f246caa3adb79602b6779b754',
  },
  ecb: {
    baseUrl: 'https://data-api.ecb.europa.eu/service',
    // No API key needed
  },
  boe: {
    baseUrl: 'https://www.bankofengland.co.uk/boeapps/database',
    // No API key needed
  },
  boc: {
    baseUrl: 'https://www.bankofcanada.ca/valet',
    // No API key needed
  },
};

/**
 * Generic fetch with retry logic
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'EconTimeline/2.0 (Economic Calendar Aggregator)',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

// ============================================
// FRED API
// ============================================

/**
 * Get all releases from FRED
 */
export async function fredGetReleases() {
  const url = `${API_CONFIG.fred.baseUrl}/releases?api_key=${API_CONFIG.fred.apiKey}&file_type=json`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return data.releases || [];
}

/**
 * Get upcoming release dates from FRED
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 */
export async function fredGetReleaseDates(options = {}) {
  const today = new Date().toISOString().split('T')[0];
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const startDate = options.startDate || today;
  const endDate = options.endDate || threeMonthsLater;

  const url = `${API_CONFIG.fred.baseUrl}/releases/dates?api_key=${API_CONFIG.fred.apiKey}&file_type=json&include_release_dates_with_no_data=true&realtime_start=${startDate}&realtime_end=${endDate}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return data.release_dates || [];
}

/**
 * Get release dates for a specific FRED release
 * @param {number} releaseId - FRED release ID
 */
export async function fredGetReleaseSchedule(releaseId) {
  const url = `${API_CONFIG.fred.baseUrl}/release/dates?release_id=${releaseId}&api_key=${API_CONFIG.fred.apiKey}&file_type=json&include_release_dates_with_no_data=true`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return data.release_dates || [];
}

/**
 * Get series data from FRED
 * @param {string} seriesId - FRED series ID (e.g., 'UNRATE', 'CPIAUCSL')
 * @param {Object} options - Query options
 */
export async function fredGetSeries(seriesId, options = {}) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: API_CONFIG.fred.apiKey,
    file_type: 'json',
    ...options,
  });

  const url = `${API_CONFIG.fred.baseUrl}/series/observations?${params}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return data.observations || [];
}

// ============================================
// ECB API (SDMX)
// ============================================

/**
 * Get ECB exchange rates
 * @param {string} currency - Currency code (e.g., 'USD', 'GBP')
 */
export async function ecbGetExchangeRates(currency = 'USD') {
  const url = `${API_CONFIG.ecb.baseUrl}/data/EXR/D.${currency}.EUR.SP00.A`;
  const response = await fetchWithRetry(url, {
    headers: { 'Accept': 'application/json' },
  });
  return response.json();
}

/**
 * Get ECB interest rate data
 */
export async function ecbGetInterestRates() {
  const url = `${API_CONFIG.ecb.baseUrl}/data/FM/M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA`;
  const response = await fetchWithRetry(url, {
    headers: { 'Accept': 'application/json' },
  });
  return response.json();
}

// ============================================
// Bank of England API
// ============================================

/**
 * Get BoE Bank Rate (Official Interest Rate)
 */
export async function boeGetBankRate() {
  const url = `${API_CONFIG.boe.baseUrl}/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2020&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y`;
  const response = await fetchWithRetry(url);
  const text = await response.text();
  return parseBoeCsv(text);
}

/**
 * Parse BoE CSV response
 */
function parseBoeCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const [date, value] = lines[i].split(',');
    if (date && value) {
      data.push({ date: date.trim(), value: parseFloat(value.trim()) });
    }
  }

  return data;
}

// ============================================
// Bank of Canada API (Valet)
// ============================================

/**
 * Get BoC policy rate
 */
export async function bocGetPolicyRate() {
  const url = `${API_CONFIG.boc.baseUrl}/observations/V39079/json?recent=20`;
  const response = await fetchWithRetry(url);
  return response.json();
}

/**
 * Get BoC exchange rates
 * @param {string} currency - Currency pair (e.g., 'FXUSDCAD')
 */
export async function bocGetExchangeRate(currency = 'FXUSDCAD') {
  const url = `${API_CONFIG.boc.baseUrl}/observations/${currency}/json?recent=30`;
  const response = await fetchWithRetry(url);
  return response.json();
}

/**
 * List all available BoC series
 */
export async function bocListSeries() {
  const url = `${API_CONFIG.boc.baseUrl}/lists/series/json`;
  const response = await fetchWithRetry(url);
  return response.json();
}

export default {
  fred: {
    getReleases: fredGetReleases,
    getReleaseDates: fredGetReleaseDates,
    getReleaseSchedule: fredGetReleaseSchedule,
    getSeries: fredGetSeries,
  },
  ecb: {
    getExchangeRates: ecbGetExchangeRates,
    getInterestRates: ecbGetInterestRates,
  },
  boe: {
    getBankRate: boeGetBankRate,
  },
  boc: {
    getPolicyRate: bocGetPolicyRate,
    getExchangeRate: bocGetExchangeRate,
    listSeries: bocListSeries,
  },
};
