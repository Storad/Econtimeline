/**
 * China Economic Calendar (NBS + PBoC)
 *
 * Key releases:
 * - PBoC Interest Rate Decision - HIGH IMPACT
 * - GDP - HIGH IMPACT (quarterly)
 * - CPI/PPI - HIGH IMPACT
 * - Trade Balance - MEDIUM IMPACT
 * - PMI (Official NBS + Caixin) - HIGH IMPACT
 * - Industrial Production - MEDIUM IMPACT
 * - Retail Sales - MEDIUM IMPACT
 * - Fixed Asset Investment - MEDIUM IMPACT
 *
 * Note: China releases are typically at unusual times (01:30 or 02:00 UTC)
 * and dates can shift around Chinese holidays
 *
 * Sources:
 * - http://www.stats.gov.cn (NBS)
 * - http://www.pbc.gov.cn (PBoC)
 */

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getNextWeekday(date) {
  const d = new Date(date);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  return d;
}

// PBoC LPR (Loan Prime Rate) fixing dates - 20th of each month
function getLPRDate(year, month) {
  const date = new Date(year, month, 20);
  return getNextWeekday(date);
}

/**
 * Generate China economic calendar events
 */
export async function scrapeChina() {
  const events = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Generate for next 4 months
  for (let monthOffset = 0; monthOffset <= 4; monthOffset++) {
    const targetMonth = (currentMonth + monthOffset) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);

    // PBoC LPR Fixing - 20th of month, 01:30 UTC (09:30 Beijing)
    const lprDate = getLPRDate(targetYear, targetMonth);
    if (lprDate >= oneWeekAgo) {
      events.push({
        date: formatDate(lprDate),
        time: '01:30',
        title: 'PBoC Loan Prime Rate',
        impact: 'high',
        currency: 'CNY',
        country: 'CN',
        source: 'pboc',
        sourceUrl: 'http://www.pbc.gov.cn/',
        category: 'central_bank',
      });
    }

    // CPI/PPI - around 9th-11th of month, 01:30 UTC
    const cpiDate = getNextWeekday(new Date(targetYear, targetMonth, 10));
    if (cpiDate >= oneWeekAgo) {
      events.push({
        date: formatDate(cpiDate),
        time: '01:30',
        title: 'CPI y/y',
        impact: 'high',
        currency: 'CNY',
        country: 'CN',
        source: 'nbs',
        sourceUrl: 'http://www.stats.gov.cn/',
        category: 'inflation',
      });

      events.push({
        date: formatDate(cpiDate),
        time: '01:30',
        title: 'PPI y/y',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'nbs',
        sourceUrl: 'http://www.stats.gov.cn/',
        category: 'inflation',
      });
    }

    // Trade Balance - around 7th-10th of month
    const tradeDate = getNextWeekday(new Date(targetYear, targetMonth, 8));
    if (tradeDate >= oneWeekAgo) {
      events.push({
        date: formatDate(tradeDate),
        time: '03:00',
        title: 'Trade Balance',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'customs',
        sourceUrl: 'http://www.customs.gov.cn/',
        category: 'trade',
      });

      events.push({
        date: formatDate(tradeDate),
        time: '03:00',
        title: 'Exports y/y',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'customs',
        sourceUrl: 'http://www.customs.gov.cn/',
        category: 'trade',
      });

      events.push({
        date: formatDate(tradeDate),
        time: '03:00',
        title: 'Imports y/y',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'customs',
        sourceUrl: 'http://www.customs.gov.cn/',
        category: 'trade',
      });
    }

    // NBS Manufacturing PMI - last day of month, 01:30 UTC
    const lastDay = new Date(targetYear, targetMonth + 1, 0);
    if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2);
    if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1);
    if (lastDay >= oneWeekAgo) {
      events.push({
        date: formatDate(lastDay),
        time: '01:30',
        title: 'NBS Manufacturing PMI',
        impact: 'high',
        currency: 'CNY',
        country: 'CN',
        source: 'nbs',
        sourceUrl: 'http://www.stats.gov.cn/',
        category: 'manufacturing',
      });

      events.push({
        date: formatDate(lastDay),
        time: '01:30',
        title: 'NBS Non-Manufacturing PMI',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'nbs',
        sourceUrl: 'http://www.stats.gov.cn/',
        category: 'services',
      });
    }

    // Caixin Manufacturing PMI - 1st business day of month
    const firstBizDay = getNextWeekday(new Date(targetYear, targetMonth, 1));
    if (firstBizDay >= oneWeekAgo) {
      events.push({
        date: formatDate(firstBizDay),
        time: '01:45',
        title: 'Caixin Manufacturing PMI',
        impact: 'high',
        currency: 'CNY',
        country: 'CN',
        source: 'caixin',
        sourceUrl: 'https://www.caixinglobal.com/',
        category: 'manufacturing',
      });
    }

    // Caixin Services PMI - 3rd business day of month
    const thirdBizDay = getNextWeekday(new Date(targetYear, targetMonth, 3));
    if (thirdBizDay >= oneWeekAgo) {
      events.push({
        date: formatDate(thirdBizDay),
        time: '01:45',
        title: 'Caixin Services PMI',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'caixin',
        sourceUrl: 'https://www.caixinglobal.com/',
        category: 'services',
      });
    }

    // Industrial Production, Retail Sales, FAI - around 15th-17th (with GDP in Q months)
    const industryDate = getNextWeekday(new Date(targetYear, targetMonth, 16));
    if (industryDate >= oneWeekAgo) {
      events.push({
        date: formatDate(industryDate),
        time: '02:00',
        title: 'Industrial Production y/y',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'nbs',
        sourceUrl: 'http://www.stats.gov.cn/',
        category: 'manufacturing',
      });

      events.push({
        date: formatDate(industryDate),
        time: '02:00',
        title: 'Retail Sales y/y',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'nbs',
        sourceUrl: 'http://www.stats.gov.cn/',
        category: 'consumer',
      });

      events.push({
        date: formatDate(industryDate),
        time: '02:00',
        title: 'Fixed Asset Investment y/y',
        impact: 'medium',
        currency: 'CNY',
        country: 'CN',
        source: 'nbs',
        sourceUrl: 'http://www.stats.gov.cn/',
        category: 'growth',
      });
    }

    // GDP - Quarterly (Jan, Apr, Jul, Oct around 15th-18th)
    if (targetMonth === 0 || targetMonth === 3 || targetMonth === 6 || targetMonth === 9) {
      const gdpDate = getNextWeekday(new Date(targetYear, targetMonth, 17));
      if (gdpDate >= oneWeekAgo) {
        events.push({
          date: formatDate(gdpDate),
          time: '02:00',
          title: 'GDP y/y',
          impact: 'high',
          currency: 'CNY',
          country: 'CN',
          source: 'nbs',
          sourceUrl: 'http://www.stats.gov.cn/',
          category: 'growth',
        });

        events.push({
          date: formatDate(gdpDate),
          time: '02:00',
          title: 'GDP q/q',
          impact: 'high',
          currency: 'CNY',
          country: 'CN',
          source: 'nbs',
          sourceUrl: 'http://www.stats.gov.cn/',
          category: 'growth',
        });
      }
    }
  }

  return events;
}
