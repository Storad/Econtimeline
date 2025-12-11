/**
 * Proprietary Economic Indicators
 *
 * These indicators are NOT available through FRED API and require hardcoded dates.
 *
 * Includes:
 * - CB Consumer Confidence (Conference Board) - HIGH IMPACT
 * - Pending Home Sales (NAR) - MEDIUM IMPACT
 * - S&P/Case-Shiller Home Price Index - MEDIUM IMPACT
 * - Richmond Fed Manufacturing Index - MEDIUM IMPACT
 * - Chicago PMI - MEDIUM IMPACT
 * - Dallas Fed Manufacturing Index - LOW IMPACT
 *
 * Sources:
 * - Conference Board: https://www.conference-board.org/topics/consumer-confidence
 * - NAR: https://www.nar.realtor/research-and-statistics/housing-statistics/pending-home-sales
 * - S&P Dow Jones: https://www.spglobal.com/spdji/en/index-family/indicators/sp-corelogic-case-shiller/
 * - Richmond Fed: https://www.richmondfed.org/research/regional_economy/surveys_of_business_conditions
 */

// CB Consumer Confidence - Last Tuesday of the month, 10:00 AM ET
// HIGH IMPACT - Leading indicator of consumer spending
const CB_CONSUMER_CONFIDENCE = {
  '2025-09': '2025-09-30',
  '2025-10': '2025-10-28',
  '2025-11': '2025-11-25',
  '2025-12': '2025-12-23',
  '2026-01': '2026-01-27',
  '2026-02': '2026-02-24',
  '2026-03': '2026-03-31',
  '2026-04': '2026-04-28',
};

// Pending Home Sales - Last week of month (varies), 10:00 AM ET
// MEDIUM IMPACT - Leading indicator for existing home sales
const PENDING_HOME_SALES = {
  '2025-09': '2025-09-26',
  '2025-10': '2025-10-30',
  '2025-11': '2025-11-26',
  '2025-12': '2025-12-29',
  '2026-01': '2026-01-29',
  '2026-02': '2026-02-26',
  '2026-03': '2026-03-26',
  '2026-04': '2026-04-29',
};

// S&P/Case-Shiller Home Price Index - Last Tuesday of month, 9:00 AM ET
// MEDIUM IMPACT - Key measure of home price trends
const CASE_SHILLER_HPI = {
  '2025-09': '2025-09-30',
  '2025-10': '2025-10-28',
  '2025-11': '2025-11-25',
  '2025-12': '2025-12-30',
  '2026-01': '2026-01-27',
  '2026-02': '2026-02-24',
  '2026-03': '2026-03-31',
  '2026-04': '2026-04-28',
};

// Richmond Fed Manufacturing Index - 4th Tuesday of month, 10:00 AM ET
// MEDIUM IMPACT - Regional manufacturing indicator
const RICHMOND_FED = {
  '2025-09': '2025-09-23',
  '2025-10': '2025-10-28',
  '2025-11': '2025-11-25',
  '2025-12': '2025-12-23',
  '2026-01': '2026-01-28',
  '2026-02': '2026-02-24',
  '2026-03': '2026-03-24',
  '2026-04': '2026-04-28',
};

// Chicago PMI - Last business day of month, 9:45 AM ET
// MEDIUM IMPACT - Regional manufacturing indicator
const CHICAGO_PMI = {
  '2025-09': '2025-09-30',
  '2025-10': '2025-10-31',
  '2025-11': '2025-11-28',
  '2025-12': '2025-12-31',
  '2026-01': '2026-01-30',
  '2026-02': '2026-02-27',
  '2026-03': '2026-03-31',
  '2026-04': '2026-04-30',
};

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get approximate date for indicators based on typical release pattern
 */
function getLastTuesdayOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  const dayOfWeek = lastDay.getDay();
  // Days to subtract to get to Tuesday (2)
  const daysToSubtract = (dayOfWeek + 5) % 7;
  lastDay.setDate(lastDay.getDate() - daysToSubtract);
  return lastDay;
}

function getLastBusinessDayOfMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return lastDay;
}

/**
 * Generate proprietary economic calendar events
 */
export async function scrapeProprietary() {
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3 months back to 6 months ahead
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Generate for 3 months back to 6 months ahead
  for (let monthOffset = -3; monthOffset <= 6; monthOffset++) {
    const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    // CB Consumer Confidence
    const cbDate = CB_CONSUMER_CONFIDENCE[monthKey]
      ? new Date(CB_CONSUMER_CONFIDENCE[monthKey])
      : getLastTuesdayOfMonth(year, month);

    if (cbDate >= threeMonthsAgo && cbDate <= sixMonthsLater) {
      events.push({
        date: CB_CONSUMER_CONFIDENCE[monthKey] || formatDate(cbDate),
        time: '10:00',
        title: 'CB Consumer Confidence',
        impact: 'high',
        category: 'sentiment',
        source: 'conference-board',
        sourceUrl: 'https://www.conference-board.org/topics/consumer-confidence',
        description: 'Monthly survey measuring consumer attitudes about current and future economic conditions.',
        whyItMatters: 'Leading indicator of consumer spending. Higher confidence = more likely to spend.',
        frequency: 'Monthly (last Tuesday)',
      });
    }

    // Pending Home Sales
    const phsDate = PENDING_HOME_SALES[monthKey]
      ? new Date(PENDING_HOME_SALES[monthKey])
      : new Date(year, month, 28); // Approximate

    if (phsDate >= threeMonthsAgo && phsDate <= sixMonthsLater) {
      events.push({
        date: PENDING_HOME_SALES[monthKey] || formatDate(phsDate),
        time: '10:00',
        title: 'Pending Home Sales m/m',
        impact: 'medium',
        category: 'housing',
        source: 'nar',
        sourceUrl: 'https://www.nar.realtor/research-and-statistics/housing-statistics/pending-home-sales',
        description: 'Monthly index of home sales contracts signed but not yet closed.',
        whyItMatters: 'Leading indicator for existing home sales (typically close 1-2 months later).',
        frequency: 'Monthly (last week)',
      });
    }

    // S&P/Case-Shiller Home Price Index
    const csDate = CASE_SHILLER_HPI[monthKey]
      ? new Date(CASE_SHILLER_HPI[monthKey])
      : getLastTuesdayOfMonth(year, month);

    if (csDate >= threeMonthsAgo && csDate <= sixMonthsLater) {
      events.push({
        date: CASE_SHILLER_HPI[monthKey] || formatDate(csDate),
        time: '09:00',
        title: 'S&P/Case-Shiller Home Price Index',
        impact: 'medium',
        category: 'housing',
        source: 'sp-global',
        sourceUrl: 'https://www.spglobal.com/spdji/en/index-family/indicators/sp-corelogic-case-shiller/',
        description: 'Monthly measure of residential home prices in 20 major US metropolitan areas.',
        whyItMatters: 'Key indicator of housing market health and household wealth.',
        frequency: 'Monthly (last Tuesday)',
      });
    }

    // Richmond Fed Manufacturing Index
    const richDate = RICHMOND_FED[monthKey]
      ? new Date(RICHMOND_FED[monthKey])
      : getLastTuesdayOfMonth(year, month);

    if (richDate >= threeMonthsAgo && richDate <= sixMonthsLater) {
      events.push({
        date: RICHMOND_FED[monthKey] || formatDate(richDate),
        time: '10:00',
        title: 'Richmond Fed Manufacturing Index',
        impact: 'medium',
        category: 'manufacturing',
        source: 'richmond-fed',
        sourceUrl: 'https://www.richmondfed.org/research/regional_economy/surveys_of_business_conditions',
        description: 'Monthly survey of manufacturing conditions in the Fifth Federal Reserve District.',
        whyItMatters: 'Regional indicator that can signal broader manufacturing trends.',
        frequency: 'Monthly (4th Tuesday)',
      });
    }

    // Chicago PMI
    const chiDate = CHICAGO_PMI[monthKey]
      ? new Date(CHICAGO_PMI[monthKey])
      : getLastBusinessDayOfMonth(year, month);

    if (chiDate >= threeMonthsAgo && chiDate <= sixMonthsLater) {
      events.push({
        date: CHICAGO_PMI[monthKey] || formatDate(chiDate),
        time: '09:45',
        title: 'Chicago PMI',
        impact: 'medium',
        category: 'manufacturing',
        source: 'ism-chicago',
        sourceUrl: 'https://www.ismchicago.org/',
        description: 'Monthly survey of Chicago-area purchasing managers measuring business conditions.',
        whyItMatters: 'Released before national ISM PMI, can preview broader manufacturing trends.',
        frequency: 'Monthly (last business day)',
      });
    }
  }

  console.log(`  Generated ${events.length} proprietary indicator events`);
  return events;
}

export default scrapeProprietary;
