/**
 * Unified API Client for US Economic Data Sources
 *
 * Handles API calls to:
 * - FRED (Federal Reserve Economic Data)
 * - EIA (Energy Information Administration)
 * - BEA (Bureau of Economic Analysis)
 * - BLS (Bureau of Labor Statistics)
 * - Census Bureau
 */

// API Configuration
export const API_CONFIG = {
  fred: {
    baseUrl: 'https://api.stlouisfed.org/fred',
    apiKey: process.env.FRED_API_KEY || 'a6185d8f246caa3adb79602b6779b754',
  },
  eia: {
    baseUrl: 'https://api.eia.gov/v2',
    apiKey: process.env.EIA_API_KEY || 'L6gsDu88jaMGHsvfFmL5Pe6PRC2lpfP8lSAnaaiu',
  },
  bea: {
    baseUrl: 'https://apps.bea.gov/api/data',
    apiKey: process.env.BEA_API_KEY || 'A29D3A0B-6D39-425C-A2CC-E83CD7447D1D',
  },
  bls: {
    baseUrl: 'https://api.bls.gov/publicAPI/v2',
    apiKey: process.env.BLS_API_KEY || '5e43db21aa1348f082d3eefac8590897',
  },
  census: {
    baseUrl: 'https://api.census.gov/data',
    apiKey: process.env.CENSUS_API_KEY || '25632bd6befdd8ab537011bfdc65149d6e9535d6',
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
// EIA API (Energy Information Administration)
// ============================================

/**
 * Get weekly crude oil inventory data
 * Series: PET.WCESTUS1.W (Weekly U.S. Ending Stocks excluding SPR of Crude Oil)
 */
export async function eiaGetCrudeOilInventories() {
  const params = new URLSearchParams({
    api_key: API_CONFIG.eia.apiKey,
    frequency: 'weekly',
    'data[0]': 'value',
    'facets[product][]': 'EPC0',  // Crude Oil
    'facets[duoarea][]': 'NUS',   // US Total
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '3',
  });
  const url = `${API_CONFIG.eia.baseUrl}/petroleum/stoc/wstk/data/?${params}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return data.response?.data || [];
}

/**
 * Get weekly natural gas storage data
 * Series: NG.NW2_EPG0_SWO_R48_BCF.W (Weekly Lower 48 States Natural Gas Working Storage)
 */
export async function eiaGetNaturalGasStorage() {
  // Use series filter for Lower 48 total working gas
  const params = new URLSearchParams({
    api_key: API_CONFIG.eia.apiKey,
    frequency: 'weekly',
    'data[0]': 'value',
    'facets[series][]': 'NW2_EPG0_SWO_R48_BCF',  // Lower 48 total
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '3',
  });
  const url = `${API_CONFIG.eia.baseUrl}/natural-gas/stor/wkly/data/?${params}`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  return data.response?.data || [];
}

export default {
  fred: {
    getReleases: fredGetReleases,
    getReleaseDates: fredGetReleaseDates,
    getReleaseSchedule: fredGetReleaseSchedule,
    getSeries: fredGetSeries,
  },
  eia: {
    getCrudeOilInventories: eiaGetCrudeOilInventories,
    getNaturalGasStorage: eiaGetNaturalGasStorage,
  },
};
