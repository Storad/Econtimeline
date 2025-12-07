/**
 * Economic Indicator Definitions
 *
 * Comprehensive metadata for each economic indicator including:
 * - Description: What the indicator measures
 * - Why it matters: Market impact explanation
 * - Frequency: How often it's released
 * - Typical reaction: How markets respond
 * - Related assets: What gets affected
 */

export const INDICATORS = {
  // ============================================
  // EMPLOYMENT INDICATORS
  // ============================================
  'Non-Farm Payrolls': {
    category: 'employment',
    description: 'Measures the change in the number of employed people in the US, excluding farm workers, government employees, private household employees, and nonprofit organization employees.',
    whyItMatters: 'The most important employment indicator. Strong job growth signals economic expansion and can lead to Fed rate hikes. Weak numbers suggest economic slowdown and potential rate cuts.',
    frequency: 'Monthly (first Friday)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, stocks mixed (good economy but higher rates), bonds bearish',
      lowerThanExpected: 'USD bearish, stocks mixed (weak economy but lower rates), bonds bullish'
    },
    relatedAssets: ['USD', 'US stocks', 'US bonds', 'Gold'],
    historicalVolatility: 'Very High',
    releaseTime: '08:30 ET',
  },

  'Unemployment Rate': {
    category: 'employment',
    description: 'The percentage of the total workforce that is unemployed but actively seeking employment.',
    whyItMatters: 'Key indicator of labor market health. The Fed targets maximum employment alongside price stability. Rising unemployment can trigger policy responses.',
    frequency: 'Monthly (first Friday)',
    typicalReaction: {
      higherThanExpected: 'USD bearish, stocks bearish, bonds bullish',
      lowerThanExpected: 'USD bullish, stocks bullish, bonds bearish'
    },
    relatedAssets: ['USD', 'US stocks', 'US bonds'],
    historicalVolatility: 'High',
    releaseTime: '08:30 ET',
  },

  'Unemployment Claims': {
    category: 'employment',
    description: 'Weekly count of individuals filing for unemployment insurance for the first time. Also called Initial Jobless Claims.',
    whyItMatters: 'High-frequency indicator of labor market conditions. Rising claims can be an early warning of economic weakness.',
    frequency: 'Weekly (Thursday)',
    typicalReaction: {
      higherThanExpected: 'USD bearish, stocks bearish',
      lowerThanExpected: 'USD bullish, stocks bullish'
    },
    relatedAssets: ['USD', 'US stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  'JOLTS Job Openings': {
    category: 'employment',
    description: 'Job Openings and Labor Turnover Survey measures the number of job openings, hires, and separations.',
    whyItMatters: 'Shows labor demand. High openings relative to unemployed workers indicates a tight labor market, which can fuel wage inflation.',
    frequency: 'Monthly (about 5 weeks lag)',
    typicalReaction: {
      higherThanExpected: 'USD bullish (tight labor market)',
      lowerThanExpected: 'USD bearish (loosening labor market)'
    },
    relatedAssets: ['USD', 'US stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '10:00 ET',
  },

  'Employment Change': {
    category: 'employment',
    description: 'Change in the number of employed people compared to the previous period.',
    whyItMatters: 'Direct measure of job creation or loss. Strong employment supports consumer spending and economic growth.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, stocks bullish',
      lowerThanExpected: 'Currency bearish, stocks bearish'
    },
    relatedAssets: ['Local currency', 'Local stocks'],
    historicalVolatility: 'High',
  },

  'Claimant Count Change': {
    category: 'employment',
    description: 'UK measure of the change in the number of people claiming unemployment benefits.',
    whyItMatters: 'Key UK employment indicator. Rising claimant count suggests weakening labor market.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'GBP bearish',
      lowerThanExpected: 'GBP bullish'
    },
    relatedAssets: ['GBP', 'FTSE'],
    historicalVolatility: 'Medium',
    releaseTime: '07:00 GMT',
  },

  'Average Earnings Index 3m/y': {
    category: 'employment',
    description: 'UK measure of wage growth over 3 months compared to a year ago.',
    whyItMatters: 'Wage growth drives inflation. Strong wage growth can lead to BoE rate hikes.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'GBP bullish (higher rate expectations)',
      lowerThanExpected: 'GBP bearish'
    },
    relatedAssets: ['GBP', 'UK Gilts'],
    historicalVolatility: 'Medium',
    releaseTime: '07:00 GMT',
  },

  // ============================================
  // INFLATION INDICATORS
  // ============================================
  'CPI m/m': {
    category: 'inflation',
    description: 'Consumer Price Index measures the monthly change in prices paid by consumers for goods and services.',
    whyItMatters: 'Primary inflation gauge that central banks target. Higher inflation typically leads to rate hikes, lower inflation to rate cuts.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish (rate hike expectations), bonds bearish, gold mixed',
      lowerThanExpected: 'Currency bearish (rate cut expectations), bonds bullish'
    },
    relatedAssets: ['Local currency', 'Government bonds', 'Gold'],
    historicalVolatility: 'Very High',
  },

  'Core CPI m/m': {
    category: 'inflation',
    description: 'CPI excluding volatile food and energy prices. Shows underlying inflation trends.',
    whyItMatters: 'Central banks often focus on core inflation as it shows persistent price pressures without temporary volatility.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, bonds bearish',
      lowerThanExpected: 'Currency bearish, bonds bullish'
    },
    relatedAssets: ['Local currency', 'Government bonds'],
    historicalVolatility: 'Very High',
  },

  'CPI y/y': {
    category: 'inflation',
    description: 'Year-over-year change in consumer prices. Shows annual inflation rate.',
    whyItMatters: 'The headline inflation number most cited in media. Central banks have explicit targets (e.g., Fed targets 2%).',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, bonds bearish',
      lowerThanExpected: 'Currency bearish, bonds bullish'
    },
    relatedAssets: ['Local currency', 'Government bonds', 'Gold'],
    historicalVolatility: 'Very High',
  },

  'CPI Flash Estimate y/y': {
    category: 'inflation',
    description: 'Eurozone preliminary inflation estimate released at month-end before final data.',
    whyItMatters: 'Early read on Eurozone inflation that can move ECB rate expectations.',
    frequency: 'Monthly (end of month)',
    typicalReaction: {
      higherThanExpected: 'EUR bullish',
      lowerThanExpected: 'EUR bearish'
    },
    relatedAssets: ['EUR', 'European bonds'],
    historicalVolatility: 'High',
    releaseTime: '10:00 CET',
  },

  'CPI q/q': {
    category: 'inflation',
    description: 'Quarterly change in consumer prices. Used in countries with quarterly CPI releases.',
    whyItMatters: 'Key inflation reading for quarterly reporting countries like Australia and New Zealand.',
    frequency: 'Quarterly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish',
      lowerThanExpected: 'Currency bearish'
    },
    relatedAssets: ['Local currency'],
    historicalVolatility: 'High',
  },

  'PPI m/m': {
    category: 'inflation',
    description: 'Producer Price Index measures prices received by domestic producers. Leading indicator of consumer inflation.',
    whyItMatters: 'Rising producer prices often get passed to consumers. Can signal future CPI direction.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency mildly bullish',
      lowerThanExpected: 'Currency mildly bearish'
    },
    relatedAssets: ['USD', 'US bonds'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  'National Core CPI y/y': {
    category: 'inflation',
    description: 'Japan\'s nationwide core CPI excluding fresh food. Key BoJ policy indicator.',
    whyItMatters: 'BoJ has struggled to achieve 2% inflation target. Rising CPI could signal end of ultra-loose policy.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'JPY bullish (rate hike speculation)',
      lowerThanExpected: 'JPY bearish'
    },
    relatedAssets: ['JPY', 'JGBs'],
    historicalVolatility: 'Medium',
  },

  // ============================================
  // CENTRAL BANK DECISIONS
  // ============================================
  'FOMC Rate Decision': {
    category: 'central_bank',
    description: 'Federal Reserve\'s decision on the federal funds target rate.',
    whyItMatters: 'The most important monetary policy decision globally. Rate changes affect borrowing costs, currency values, and asset prices worldwide.',
    frequency: '8 times per year',
    typicalReaction: {
      higherThanExpected: 'USD bullish, stocks bearish, bonds bearish',
      lowerThanExpected: 'USD bearish, stocks bullish, bonds bullish'
    },
    relatedAssets: ['USD', 'US stocks', 'US bonds', 'Gold', 'Global markets'],
    historicalVolatility: 'Very High',
    releaseTime: '14:00 ET',
  },

  'Fed Chair Powell Speaks': {
    category: 'central_bank',
    description: 'Public remarks by Federal Reserve Chair Jerome Powell.',
    whyItMatters: 'Powell\'s comments can signal future policy direction and move markets significantly.',
    frequency: 'Variable',
    typicalReaction: {
      hawkish: 'USD bullish, stocks bearish',
      dovish: 'USD bearish, stocks bullish'
    },
    relatedAssets: ['USD', 'US stocks', 'US bonds'],
    historicalVolatility: 'High',
  },

  'ECB Interest Rate Decision': {
    category: 'central_bank',
    description: 'European Central Bank\'s decision on the main refinancing rate.',
    whyItMatters: 'Key rate decision for the Eurozone. Affects EUR and European asset prices.',
    frequency: '8 times per year',
    typicalReaction: {
      higherThanExpected: 'EUR bullish, European stocks bearish',
      lowerThanExpected: 'EUR bearish, European stocks bullish'
    },
    relatedAssets: ['EUR', 'European stocks', 'European bonds'],
    historicalVolatility: 'Very High',
    releaseTime: '14:15 CET',
  },

  'ECB Press Conference': {
    category: 'central_bank',
    description: 'ECB President\'s press conference following the rate decision.',
    whyItMatters: 'Provides context for the decision and forward guidance on future policy.',
    frequency: '8 times per year',
    typicalReaction: {
      hawkish: 'EUR bullish',
      dovish: 'EUR bearish'
    },
    relatedAssets: ['EUR', 'European bonds'],
    historicalVolatility: 'Very High',
    releaseTime: '14:45 CET',
  },

  'BoE Interest Rate Decision': {
    category: 'central_bank',
    description: 'Bank of England Monetary Policy Committee\'s decision on the bank rate.',
    whyItMatters: 'Key UK rate decision. Also includes MPC vote split which shows policy direction.',
    frequency: '8 times per year',
    typicalReaction: {
      higherThanExpected: 'GBP bullish, UK stocks bearish',
      lowerThanExpected: 'GBP bearish, UK stocks bullish'
    },
    relatedAssets: ['GBP', 'FTSE', 'UK Gilts'],
    historicalVolatility: 'Very High',
    releaseTime: '12:00 GMT',
  },

  'MPC Meeting Minutes': {
    category: 'central_bank',
    description: 'Minutes from Bank of England\'s Monetary Policy Committee meeting.',
    whyItMatters: 'Shows voting split and policy discussions. Released simultaneously with rate decision.',
    frequency: '8 times per year',
    typicalReaction: {
      hawkish: 'GBP bullish',
      dovish: 'GBP bearish'
    },
    relatedAssets: ['GBP', 'UK Gilts'],
    historicalVolatility: 'High',
    releaseTime: '12:00 GMT',
  },

  'BoJ Interest Rate Decision': {
    category: 'central_bank',
    description: 'Bank of Japan\'s decision on short-term interest rates and yield curve control.',
    whyItMatters: 'BoJ policy shifts can cause significant JPY moves. Watch for changes to yield curve control.',
    frequency: '8 times per year',
    typicalReaction: {
      higherThanExpected: 'JPY bullish',
      lowerThanExpected: 'JPY bearish'
    },
    relatedAssets: ['JPY', 'JGBs', 'Nikkei'],
    historicalVolatility: 'Very High',
  },

  'BoJ Policy Statement': {
    category: 'central_bank',
    description: 'Bank of Japan\'s official statement on monetary policy.',
    whyItMatters: 'Provides guidance on future policy direction and economic outlook.',
    frequency: '8 times per year',
    typicalReaction: {
      hawkish: 'JPY bullish',
      dovish: 'JPY bearish'
    },
    relatedAssets: ['JPY', 'JGBs'],
    historicalVolatility: 'High',
  },

  'BoJ Press Conference': {
    category: 'central_bank',
    description: 'Bank of Japan Governor\'s press conference following policy decision.',
    whyItMatters: 'Governor\'s comments can clarify policy stance and move JPY significantly.',
    frequency: '8 times per year',
    typicalReaction: {
      hawkish: 'JPY bullish',
      dovish: 'JPY bearish'
    },
    relatedAssets: ['JPY'],
    historicalVolatility: 'High',
  },

  'RBA Interest Rate Decision': {
    category: 'central_bank',
    description: 'Reserve Bank of Australia\'s decision on the cash rate.',
    whyItMatters: 'Key Australian rate decision. RBA also comments on housing market and commodity outlook.',
    frequency: '8 times per year (no January meeting)',
    typicalReaction: {
      higherThanExpected: 'AUD bullish',
      lowerThanExpected: 'AUD bearish'
    },
    relatedAssets: ['AUD', 'ASX', 'Australian bonds'],
    historicalVolatility: 'High',
    releaseTime: '14:30 AEDT',
  },

  'RBA Rate Statement': {
    category: 'central_bank',
    description: 'RBA\'s statement explaining the rate decision and economic outlook.',
    whyItMatters: 'Provides forward guidance on future policy direction.',
    frequency: '8 times per year',
    typicalReaction: {
      hawkish: 'AUD bullish',
      dovish: 'AUD bearish'
    },
    relatedAssets: ['AUD'],
    historicalVolatility: 'High',
  },

  'BoC Interest Rate Decision': {
    category: 'central_bank',
    description: 'Bank of Canada\'s decision on the overnight rate.',
    whyItMatters: 'Key Canadian rate decision. BoC often moves in sync with Fed but can diverge.',
    frequency: '8 times per year',
    typicalReaction: {
      higherThanExpected: 'CAD bullish',
      lowerThanExpected: 'CAD bearish'
    },
    relatedAssets: ['CAD', 'TSX', 'Canadian bonds'],
    historicalVolatility: 'High',
    releaseTime: '09:45 ET',
  },

  'SNB Interest Rate Decision': {
    category: 'central_bank',
    description: 'Swiss National Bank\'s decision on the policy rate.',
    whyItMatters: 'SNB policy affects CHF safe-haven status. Watch for FX intervention comments.',
    frequency: 'Quarterly',
    typicalReaction: {
      higherThanExpected: 'CHF bullish',
      lowerThanExpected: 'CHF bearish'
    },
    relatedAssets: ['CHF', 'Swiss bonds'],
    historicalVolatility: 'High',
    releaseTime: '09:30 CET',
  },

  'RBNZ Interest Rate Decision': {
    category: 'central_bank',
    description: 'Reserve Bank of New Zealand\'s decision on the Official Cash Rate.',
    whyItMatters: 'RBNZ is often a policy leader. First major central bank to hike/cut in cycles.',
    frequency: '7 times per year',
    typicalReaction: {
      higherThanExpected: 'NZD bullish',
      lowerThanExpected: 'NZD bearish'
    },
    relatedAssets: ['NZD', 'NZX'],
    historicalVolatility: 'High',
    releaseTime: '14:00 NZDT',
  },

  'RBNZ Rate Statement': {
    category: 'central_bank',
    description: 'RBNZ\'s official statement explaining the rate decision and economic outlook.',
    whyItMatters: 'Provides forward guidance on future policy direction and key economic assessments.',
    frequency: '7 times per year',
    typicalReaction: {
      hawkish: 'NZD bullish',
      dovish: 'NZD bearish'
    },
    relatedAssets: ['NZD'],
    historicalVolatility: 'High',
  },

  'RBNZ Monetary Policy Statement': {
    category: 'central_bank',
    description: 'Comprehensive quarterly report on monetary policy, economic projections, and rate path.',
    whyItMatters: 'Contains detailed economic forecasts and policy guidance. Major market mover.',
    frequency: 'Quarterly',
    typicalReaction: {
      hawkish: 'NZD bullish',
      dovish: 'NZD bearish'
    },
    relatedAssets: ['NZD', 'NZ bonds'],
    historicalVolatility: 'High',
  },

  'RBNZ Press Conference': {
    category: 'central_bank',
    description: 'RBNZ Governor\'s press conference following the rate decision.',
    whyItMatters: 'Governor can clarify policy stance and respond to questions, often moving markets.',
    frequency: 'Quarterly (with MPS)',
    typicalReaction: {
      hawkish: 'NZD bullish',
      dovish: 'NZD bearish'
    },
    relatedAssets: ['NZD'],
    historicalVolatility: 'High',
  },

  'RBA Meeting Minutes': {
    category: 'central_bank',
    description: 'Minutes from the RBA Board meeting released two weeks after the decision.',
    whyItMatters: 'Provides insight into policy discussions and factors considered in the rate decision.',
    frequency: '8 times per year',
    typicalReaction: {
      hawkish: 'AUD bullish',
      dovish: 'AUD bearish'
    },
    relatedAssets: ['AUD'],
    historicalVolatility: 'Medium',
  },

  'BoC Rate Statement': {
    category: 'central_bank',
    description: 'Bank of Canada\'s statement explaining the rate decision.',
    whyItMatters: 'Contains assessment of economy and forward guidance on policy direction.',
    frequency: '8 times per year',
    typicalReaction: {
      hawkish: 'CAD bullish',
      dovish: 'CAD bearish'
    },
    relatedAssets: ['CAD'],
    historicalVolatility: 'High',
  },

  'BoC Monetary Policy Report': {
    category: 'central_bank',
    description: 'Quarterly report with detailed economic projections and policy analysis.',
    whyItMatters: 'Contains GDP, inflation, and rate path forecasts. Major policy document.',
    frequency: 'Quarterly',
    typicalReaction: {
      hawkish: 'CAD bullish',
      dovish: 'CAD bearish'
    },
    relatedAssets: ['CAD', 'Canadian bonds'],
    historicalVolatility: 'High',
  },

  'BoC Press Conference': {
    category: 'central_bank',
    description: 'BoC Governor\'s press conference following MPR release.',
    whyItMatters: 'Governor provides color on policy decisions and answers market questions.',
    frequency: 'Quarterly',
    typicalReaction: {
      hawkish: 'CAD bullish',
      dovish: 'CAD bearish'
    },
    relatedAssets: ['CAD'],
    historicalVolatility: 'High',
  },

  'SNB Monetary Policy Assessment': {
    category: 'central_bank',
    description: 'SNB\'s quarterly assessment of monetary policy and economic outlook.',
    whyItMatters: 'Contains policy rationale and comments on CHF exchange rate.',
    frequency: 'Quarterly',
    typicalReaction: {
      hawkish: 'CHF bullish',
      dovish: 'CHF bearish'
    },
    relatedAssets: ['CHF'],
    historicalVolatility: 'High',
  },

  'SNB Press Conference': {
    category: 'central_bank',
    description: 'SNB Chairman\'s press conference following rate decision.',
    whyItMatters: 'May contain comments on FX intervention and policy outlook.',
    frequency: 'Quarterly',
    typicalReaction: {
      hawkish: 'CHF bullish',
      dovish: 'CHF bearish'
    },
    relatedAssets: ['CHF'],
    historicalVolatility: 'High',
  },

  'BoE Monetary Policy Report': {
    category: 'central_bank',
    description: 'BoE\'s quarterly inflation report with economic projections.',
    whyItMatters: 'Contains fan charts for inflation and GDP, showing policy committee\'s outlook.',
    frequency: 'Quarterly',
    typicalReaction: {
      hawkish: 'GBP bullish',
      dovish: 'GBP bearish'
    },
    relatedAssets: ['GBP', 'UK Gilts'],
    historicalVolatility: 'High',
  },

  'BoJ Outlook Report': {
    category: 'central_bank',
    description: 'BoJ\'s quarterly outlook for economic activity and prices.',
    whyItMatters: 'Contains inflation and growth forecasts that guide policy decisions.',
    frequency: 'Quarterly',
    typicalReaction: {
      hawkish: 'JPY bullish',
      dovish: 'JPY bearish'
    },
    relatedAssets: ['JPY', 'JGBs'],
    historicalVolatility: 'Medium',
  },

  'Tankan Non-Manufacturing Index': {
    category: 'sentiment',
    description: 'BoJ survey of large non-manufacturing (services) companies on business conditions.',
    whyItMatters: 'Services sector is larger than manufacturing. Shows domestic economic health.',
    frequency: 'Quarterly',
    typicalReaction: {
      higherThanExpected: 'JPY mildly bullish',
      lowerThanExpected: 'JPY mildly bearish'
    },
    relatedAssets: ['JPY', 'Nikkei'],
    historicalVolatility: 'Medium',
  },

  'ECB Meeting Minutes': {
    category: 'central_bank',
    description: 'Account of the ECB Governing Council\'s monetary policy meeting.',
    whyItMatters: 'Shows debate within council and factors considered in rate decision.',
    frequency: '8 times per year (4 weeks after meeting)',
    typicalReaction: {
      hawkish: 'EUR bullish',
      dovish: 'EUR bearish'
    },
    relatedAssets: ['EUR', 'European bonds'],
    historicalVolatility: 'Medium',
  },

  'Employment Change q/q': {
    category: 'employment',
    description: 'Quarterly change in total employment.',
    whyItMatters: 'Shows labor market trends over the quarter. Used by countries with quarterly data.',
    frequency: 'Quarterly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish',
      lowerThanExpected: 'Currency bearish'
    },
    relatedAssets: ['Local currency'],
    historicalVolatility: 'High',
  },

  'Core CPI m/m': {
    category: 'inflation',
    description: 'Monthly change in core consumer prices (excluding food and energy).',
    whyItMatters: 'Shows underlying inflation trend without volatile components. Fed\'s preferred measure.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, bonds bearish',
      lowerThanExpected: 'Currency bearish, bonds bullish'
    },
    relatedAssets: ['Local currency', 'Government bonds'],
    historicalVolatility: 'Very High',
  },

  // ============================================
  // GDP & GROWTH
  // ============================================
  'GDP q/q': {
    category: 'growth',
    description: 'Quarterly change in Gross Domestic Product - the broadest measure of economic activity.',
    whyItMatters: 'Shows overall economic health. Two consecutive negative quarters typically defines recession.',
    frequency: 'Quarterly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, stocks bullish',
      lowerThanExpected: 'Currency bearish, stocks bearish'
    },
    relatedAssets: ['Local currency', 'Local stocks'],
    historicalVolatility: 'High',
  },

  'GDP m/m': {
    category: 'growth',
    description: 'Monthly GDP estimate providing more timely growth data.',
    whyItMatters: 'More frequent read on economic activity than quarterly GDP.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish',
      lowerThanExpected: 'Currency bearish'
    },
    relatedAssets: ['Local currency'],
    historicalVolatility: 'Medium',
  },

  // ============================================
  // SENTIMENT & SURVEYS
  // ============================================
  'German ZEW Economic Sentiment': {
    category: 'sentiment',
    description: 'Survey of institutional investors and analysts on 6-month economic outlook for Germany.',
    whyItMatters: 'Leading indicator for German and Eurozone economy. Highly correlated with DAX performance.',
    frequency: 'Monthly (second/third Tuesday)',
    typicalReaction: {
      higherThanExpected: 'EUR bullish, DAX bullish',
      lowerThanExpected: 'EUR bearish, DAX bearish'
    },
    relatedAssets: ['EUR', 'DAX'],
    historicalVolatility: 'Medium',
    releaseTime: '10:00 CET',
  },

  'German Ifo Business Climate': {
    category: 'sentiment',
    description: 'Survey of 7,000 German businesses on current conditions and 6-month expectations.',
    whyItMatters: 'Premier German business sentiment indicator. Germany is Europe\'s largest economy.',
    frequency: 'Monthly (around 25th)',
    typicalReaction: {
      higherThanExpected: 'EUR bullish, DAX bullish',
      lowerThanExpected: 'EUR bearish, DAX bearish'
    },
    relatedAssets: ['EUR', 'DAX'],
    historicalVolatility: 'Medium',
    releaseTime: '09:00 CET',
  },

  'Tankan Manufacturing Index': {
    category: 'sentiment',
    description: 'Bank of Japan\'s quarterly survey of large manufacturers on business conditions.',
    whyItMatters: 'Key indicator of Japanese business sentiment. Closely watched by BoJ for policy decisions.',
    frequency: 'Quarterly',
    typicalReaction: {
      higherThanExpected: 'JPY mildly bullish, Nikkei bullish',
      lowerThanExpected: 'JPY mildly bearish, Nikkei bearish'
    },
    relatedAssets: ['JPY', 'Nikkei'],
    historicalVolatility: 'Medium',
  },

  'KOF Economic Barometer': {
    category: 'sentiment',
    description: 'Swiss leading indicator combining various economic data points.',
    whyItMatters: 'Early signal of Swiss economic direction.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'CHF mildly bullish',
      lowerThanExpected: 'CHF mildly bearish'
    },
    relatedAssets: ['CHF'],
    historicalVolatility: 'Low',
  },

  // ============================================
  // CONSUMER & RETAIL
  // ============================================
  'Retail Sales m/m': {
    category: 'consumer',
    description: 'Monthly change in total value of sales at retail level.',
    whyItMatters: 'Consumer spending drives 60-70% of most economies. Shows consumer confidence and economic health.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, retail stocks bullish',
      lowerThanExpected: 'Currency bearish, retail stocks bearish'
    },
    relatedAssets: ['Local currency', 'Consumer stocks'],
    historicalVolatility: 'Medium',
  },

  // ============================================
  // TRADE
  // ============================================
  'Trade Balance': {
    category: 'trade',
    description: 'Difference between exports and imports of goods and services.',
    whyItMatters: 'Large deficits can weaken currency. Trade data affects GDP calculations.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency mildly bullish',
      lowerThanExpected: 'Currency mildly bearish'
    },
    relatedAssets: ['Local currency'],
    historicalVolatility: 'Low',
  },

  'GDT Price Index': {
    category: 'trade',
    description: 'Global Dairy Trade auction results for dairy commodity prices.',
    whyItMatters: 'Dairy is New Zealand\'s largest export. Rising prices support NZD.',
    frequency: 'Twice monthly',
    typicalReaction: {
      higherThanExpected: 'NZD bullish',
      lowerThanExpected: 'NZD bearish'
    },
    relatedAssets: ['NZD'],
    historicalVolatility: 'Low',
  },

  // ============================================
  // MANUFACTURING
  // ============================================
  'Manufacturing PMI': {
    category: 'manufacturing',
    description: 'Purchasing Managers Index based on surveys of manufacturing executives. Above 50 = expansion.',
    whyItMatters: 'Leading indicator of economic health. Manufacturing often leads business cycles.',
    frequency: 'Monthly (first business day)',
    typicalReaction: {
      higherThanExpected: 'Currency bullish',
      lowerThanExpected: 'Currency bearish'
    },
    relatedAssets: ['Local currency', 'Industrial stocks'],
    historicalVolatility: 'Medium',
  },

  // ============================================
  // ISM INDICATORS
  // ============================================
  'ISM Manufacturing PMI': {
    category: 'manufacturing',
    description: 'Institute for Supply Management survey of purchasing managers at 400+ manufacturing firms. Above 50 = expansion.',
    whyItMatters: 'Most watched US manufacturing indicator. Strong predictor of industrial production and GDP.',
    frequency: 'Monthly (first business day)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, stocks bullish',
      lowerThanExpected: 'USD bearish, stocks bearish'
    },
    relatedAssets: ['USD', 'US stocks', 'Industrial stocks'],
    historicalVolatility: 'High',
    releaseTime: '10:00 ET',
  },

  'ISM Services PMI': {
    category: 'services',
    description: 'ISM survey of service sector purchasing managers. Services represent ~80% of US economy.',
    whyItMatters: 'Services dominate the US economy. This is increasingly more important than manufacturing PMI.',
    frequency: 'Monthly (third business day)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, stocks bullish',
      lowerThanExpected: 'USD bearish, stocks bearish'
    },
    relatedAssets: ['USD', 'US stocks', 'Service stocks'],
    historicalVolatility: 'High',
    releaseTime: '10:00 ET',
  },

  'ISM Manufacturing Prices': {
    category: 'manufacturing',
    description: 'Input prices paid by manufacturers. Leading indicator of producer and consumer inflation.',
    whyItMatters: 'Rising prices signal inflation pressures building in supply chain.',
    frequency: 'Monthly (first business day)',
    typicalReaction: {
      higherThanExpected: 'USD bullish (inflation), bonds bearish',
      lowerThanExpected: 'USD bearish, bonds bullish'
    },
    relatedAssets: ['USD', 'US bonds'],
    historicalVolatility: 'Medium',
  },

  'ISM Manufacturing Employment': {
    category: 'employment',
    description: 'Employment component of ISM Manufacturing survey.',
    whyItMatters: 'Provides early read on manufacturing employment ahead of NFP.',
    frequency: 'Monthly (first business day)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD'],
    historicalVolatility: 'Medium',
  },

  'ISM Manufacturing New Orders': {
    category: 'manufacturing',
    description: 'New orders component - most forward-looking part of ISM survey.',
    whyItMatters: 'New orders lead production by 1-2 months. Strong predictor of future activity.',
    frequency: 'Monthly (first business day)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, industrial stocks bullish',
      lowerThanExpected: 'USD bearish, industrial stocks bearish'
    },
    relatedAssets: ['USD', 'Industrial stocks'],
    historicalVolatility: 'Medium',
  },

  'ISM Services Prices': {
    category: 'services',
    description: 'Prices paid component of ISM Services survey.',
    whyItMatters: 'Services inflation is stickier than goods. Key Fed watch item.',
    frequency: 'Monthly (third business day)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, bonds bearish',
      lowerThanExpected: 'USD bearish, bonds bullish'
    },
    relatedAssets: ['USD', 'US bonds'],
    historicalVolatility: 'Medium',
  },

  'ISM Services Employment': {
    category: 'employment',
    description: 'Employment component of ISM Services survey.',
    whyItMatters: 'Services employ most Americans. Key input for NFP expectations.',
    frequency: 'Monthly (third business day)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD'],
    historicalVolatility: 'Medium',
  },

  // ============================================
  // BEA - GDP & PCE
  // ============================================
  'GDP q/q (Advance)': {
    category: 'growth',
    description: 'First estimate of quarterly GDP, released about 4 weeks after quarter end.',
    whyItMatters: 'Most market-moving GDP release as it provides first look at economic growth.',
    frequency: 'Quarterly (about 30 days after quarter)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, stocks mixed',
      lowerThanExpected: 'USD bearish, stocks mixed'
    },
    relatedAssets: ['USD', 'US stocks', 'US bonds'],
    historicalVolatility: 'Very High',
    releaseTime: '08:30 ET',
  },

  'GDP q/q (Preliminary)': {
    category: 'growth',
    description: 'Second estimate of quarterly GDP with more complete data.',
    whyItMatters: 'Revisions can still move markets if significantly different from advance.',
    frequency: 'Quarterly (about 60 days after quarter)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD', 'US stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  'GDP q/q (Final)': {
    category: 'growth',
    description: 'Final estimate of quarterly GDP with all data.',
    whyItMatters: 'Usually close to preliminary. Large revisions can still move markets.',
    frequency: 'Quarterly (about 90 days after quarter)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD'],
    historicalVolatility: 'Low',
    releaseTime: '08:30 ET',
  },

  'GDP Price Index q/q': {
    category: 'inflation',
    description: 'Price deflator for GDP showing overall price changes in the economy.',
    whyItMatters: 'Broadest measure of economy-wide inflation.',
    frequency: 'Quarterly (with GDP)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, bonds bearish',
      lowerThanExpected: 'USD bearish, bonds bullish'
    },
    relatedAssets: ['USD', 'US bonds'],
    historicalVolatility: 'Medium',
  },

  'Core PCE Price Index m/m': {
    category: 'inflation',
    description: 'Personal Consumption Expenditures Price Index excluding food and energy. Fed\'s preferred inflation measure.',
    whyItMatters: 'THE inflation measure the Fed targets. More important than CPI for Fed policy.',
    frequency: 'Monthly (last week)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, bonds bearish, stocks mixed',
      lowerThanExpected: 'USD bearish, bonds bullish, stocks mixed'
    },
    relatedAssets: ['USD', 'US bonds', 'US stocks', 'Gold'],
    historicalVolatility: 'Very High',
    releaseTime: '08:30 ET',
  },

  'Core PCE Price Index y/y': {
    category: 'inflation',
    description: 'Year-over-year core PCE inflation. Fed\'s 2% target is based on this measure.',
    whyItMatters: 'Direct comparison to Fed\'s 2% target. Key driver of rate expectations.',
    frequency: 'Monthly (last week)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, bonds bearish',
      lowerThanExpected: 'USD bearish, bonds bullish'
    },
    relatedAssets: ['USD', 'US bonds', 'Fed funds futures'],
    historicalVolatility: 'Very High',
    releaseTime: '08:30 ET',
  },

  'PCE Price Index m/m': {
    category: 'inflation',
    description: 'Headline PCE including food and energy.',
    whyItMatters: 'Broader inflation measure but more volatile than core.',
    frequency: 'Monthly (last week)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD', 'US bonds'],
    historicalVolatility: 'Medium',
  },

  'Personal Income m/m': {
    category: 'consumer',
    description: 'Monthly change in total income received by individuals.',
    whyItMatters: 'Income drives spending. Strong income growth supports consumer spending.',
    frequency: 'Monthly (last week)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish, consumer stocks bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD', 'Consumer stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  'Personal Spending m/m': {
    category: 'consumer',
    description: 'Monthly change in consumer expenditures on goods and services.',
    whyItMatters: 'Consumer spending is 70% of US GDP. Key indicator of economic health.',
    frequency: 'Monthly (last week)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, retail stocks bullish',
      lowerThanExpected: 'USD bearish, retail stocks bearish'
    },
    relatedAssets: ['USD', 'Retail stocks', 'Consumer discretionary'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  // ============================================
  // CENSUS BUREAU
  // ============================================
  'Retail Sales m/m': {
    category: 'consumer',
    description: 'Monthly change in total value of sales at retail level.',
    whyItMatters: 'Consumer spending drives 70% of GDP. First look at monthly consumer activity.',
    frequency: 'Monthly (around 15th)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, retail stocks bullish',
      lowerThanExpected: 'USD bearish, retail stocks bearish'
    },
    relatedAssets: ['USD', 'US stocks', 'Retail ETFs'],
    historicalVolatility: 'High',
    releaseTime: '08:30 ET',
  },

  'Core Retail Sales m/m': {
    category: 'consumer',
    description: 'Retail sales excluding auto dealers. Less volatile than headline.',
    whyItMatters: 'Auto sales can distort headline. Core shows underlying consumer trends.',
    frequency: 'Monthly (around 15th)',
    typicalReaction: {
      higherThanExpected: 'USD bullish',
      lowerThanExpected: 'USD bearish'
    },
    relatedAssets: ['USD', 'Consumer stocks'],
    historicalVolatility: 'High',
    releaseTime: '08:30 ET',
  },

  'Housing Starts': {
    category: 'housing',
    description: 'Number of new residential construction projects begun during the month.',
    whyItMatters: 'Leading indicator of housing market and construction activity. Affects employment.',
    frequency: 'Monthly (around 17th)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish, homebuilders bullish',
      lowerThanExpected: 'USD mildly bearish, homebuilders bearish'
    },
    relatedAssets: ['USD', 'Homebuilder stocks', 'Lumber'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  'Building Permits': {
    category: 'housing',
    description: 'Number of permits issued for new construction. Leading indicator of housing starts.',
    whyItMatters: 'Permits lead starts by 1-2 months. Forward-looking housing indicator.',
    frequency: 'Monthly (around 17th)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish, homebuilders bullish',
      lowerThanExpected: 'USD mildly bearish, homebuilders bearish'
    },
    relatedAssets: ['USD', 'Homebuilder stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  'Durable Goods Orders m/m': {
    category: 'manufacturing',
    description: 'New orders for long-lasting manufactured goods (3+ year lifespan).',
    whyItMatters: 'Shows business investment intentions. Very volatile due to aircraft orders.',
    frequency: 'Monthly (around 26th)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, industrial stocks bullish',
      lowerThanExpected: 'USD bearish, industrial stocks bearish'
    },
    relatedAssets: ['USD', 'Industrial stocks', 'Defense stocks'],
    historicalVolatility: 'High',
    releaseTime: '08:30 ET',
  },

  'Core Durable Goods Orders m/m': {
    category: 'manufacturing',
    description: 'Durable goods orders excluding volatile transportation sector.',
    whyItMatters: 'Better indicator of underlying business investment than headline.',
    frequency: 'Monthly (around 26th)',
    typicalReaction: {
      higherThanExpected: 'USD bullish',
      lowerThanExpected: 'USD bearish'
    },
    relatedAssets: ['USD', 'Industrial stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '08:30 ET',
  },

  'New Home Sales': {
    category: 'housing',
    description: 'Number of newly constructed homes sold during the month.',
    whyItMatters: 'More forward-looking than existing home sales. Shows demand for new construction.',
    frequency: 'Monthly (around 25th)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish, homebuilders bullish',
      lowerThanExpected: 'USD mildly bearish, homebuilders bearish'
    },
    relatedAssets: ['USD', 'Homebuilder stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '10:00 ET',
  },

  'Wholesale Inventories m/m': {
    category: 'manufacturing',
    description: 'Monthly change in value of goods held by wholesalers.',
    whyItMatters: 'Rising inventories can signal slowing demand or building for future sales.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Mixed (depends on context)',
      lowerThanExpected: 'Mixed (depends on context)'
    },
    relatedAssets: ['USD'],
    historicalVolatility: 'Low',
  },

  // ============================================
  // CONFERENCE BOARD
  // ============================================
  'CB Consumer Confidence': {
    category: 'sentiment',
    description: 'Survey of 5,000 households on current business conditions and consumer expectations.',
    whyItMatters: 'Consumer confidence predicts spending. Includes labor market questions important to Fed.',
    frequency: 'Monthly (last Tuesday)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, consumer stocks bullish',
      lowerThanExpected: 'USD bearish, consumer stocks bearish'
    },
    relatedAssets: ['USD', 'Consumer stocks', 'Retail ETFs'],
    historicalVolatility: 'Medium',
    releaseTime: '10:00 ET',
  },

  'CB Leading Index m/m': {
    category: 'growth',
    description: 'Composite of 10 leading economic indicators designed to predict future economic activity.',
    whyItMatters: 'Designed to predict turning points in business cycle 6-12 months ahead.',
    frequency: 'Monthly (third week)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD', 'US stocks'],
    historicalVolatility: 'Low',
    releaseTime: '10:00 ET',
  },

  // ============================================
  // UNIVERSITY OF MICHIGAN
  // ============================================
  'UoM Consumer Sentiment (Preliminary)': {
    category: 'sentiment',
    description: 'University of Michigan preliminary consumer sentiment survey.',
    whyItMatters: 'More timely than Conference Board. Includes closely-watched inflation expectations.',
    frequency: 'Monthly (second Friday)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, consumer stocks bullish',
      lowerThanExpected: 'USD bearish, consumer stocks bearish'
    },
    relatedAssets: ['USD', 'Consumer stocks'],
    historicalVolatility: 'Medium',
    releaseTime: '10:00 ET',
  },

  'UoM Consumer Sentiment (Final)': {
    category: 'sentiment',
    description: 'Final University of Michigan consumer sentiment reading.',
    whyItMatters: 'Confirms or revises preliminary reading. Usually close to prelim.',
    frequency: 'Monthly (fourth Friday)',
    typicalReaction: {
      higherThanExpected: 'USD mildly bullish',
      lowerThanExpected: 'USD mildly bearish'
    },
    relatedAssets: ['USD', 'Consumer stocks'],
    historicalVolatility: 'Low',
    releaseTime: '10:00 ET',
  },

  'UoM Inflation Expectations': {
    category: 'inflation',
    description: 'Consumer expectations for inflation over the next year.',
    whyItMatters: 'Fed watches this closely. Rising expectations can become self-fulfilling.',
    frequency: 'Monthly (with consumer sentiment)',
    typicalReaction: {
      higherThanExpected: 'USD bullish (rate hike expectations), bonds bearish',
      lowerThanExpected: 'USD bearish, bonds bullish'
    },
    relatedAssets: ['USD', 'US bonds', 'TIPS'],
    historicalVolatility: 'High',
    releaseTime: '10:00 ET',
  },

  'UoM 5-Year Inflation Expectations': {
    category: 'inflation',
    description: 'Consumer expectations for inflation over the next 5-10 years.',
    whyItMatters: 'Long-term expectations are key for Fed credibility. Less volatile than 1-year.',
    frequency: 'Monthly (with consumer sentiment)',
    typicalReaction: {
      higherThanExpected: 'USD bullish, bonds bearish',
      lowerThanExpected: 'USD bearish, bonds bullish'
    },
    relatedAssets: ['USD', 'US bonds', 'TIPS'],
    historicalVolatility: 'Medium',
    releaseTime: '10:00 ET',
  },

  // ============================================
  // CHINA
  // ============================================
  'PBoC Loan Prime Rate': {
    category: 'central_bank',
    description: 'People\'s Bank of China benchmark lending rate for banks.',
    whyItMatters: 'Key Chinese policy rate. Changes signal monetary policy shifts.',
    frequency: 'Monthly (20th)',
    typicalReaction: {
      higherThanExpected: 'CNY bullish, China stocks bearish',
      lowerThanExpected: 'CNY bearish, China stocks bullish, commodities bullish'
    },
    relatedAssets: ['CNY', 'China A-shares', 'AUD', 'Copper'],
    historicalVolatility: 'High',
    releaseTime: '09:30 Beijing',
  },

  'NBS Manufacturing PMI': {
    category: 'manufacturing',
    description: 'Official Chinese manufacturing PMI from National Bureau of Statistics.',
    whyItMatters: 'China is world\'s factory. Manufacturing health affects global trade and commodities.',
    frequency: 'Monthly (last day)',
    typicalReaction: {
      higherThanExpected: 'CNY bullish, AUD bullish, commodities bullish',
      lowerThanExpected: 'CNY bearish, AUD bearish, commodities bearish'
    },
    relatedAssets: ['CNY', 'AUD', 'Copper', 'Iron ore', 'China stocks'],
    historicalVolatility: 'High',
    releaseTime: '09:30 Beijing',
  },

  'NBS Non-Manufacturing PMI': {
    category: 'services',
    description: 'Official Chinese services sector PMI.',
    whyItMatters: 'Shows domestic Chinese economy health beyond exports.',
    frequency: 'Monthly (last day)',
    typicalReaction: {
      higherThanExpected: 'CNY mildly bullish',
      lowerThanExpected: 'CNY mildly bearish'
    },
    relatedAssets: ['CNY', 'China stocks'],
    historicalVolatility: 'Medium',
  },

  'Caixin Manufacturing PMI': {
    category: 'manufacturing',
    description: 'Private survey of small/medium Chinese manufacturers by Caixin/Markit.',
    whyItMatters: 'Focuses on smaller, private firms vs NBS focus on large state firms.',
    frequency: 'Monthly (first business day)',
    typicalReaction: {
      higherThanExpected: 'CNY bullish, AUD bullish, commodities bullish',
      lowerThanExpected: 'CNY bearish, AUD bearish, commodities bearish'
    },
    relatedAssets: ['CNY', 'AUD', 'Copper', 'China stocks'],
    historicalVolatility: 'High',
  },

  'Caixin Services PMI': {
    category: 'services',
    description: 'Private survey of Chinese service sector by Caixin/Markit.',
    whyItMatters: 'Shows private sector services health in China.',
    frequency: 'Monthly (third business day)',
    typicalReaction: {
      higherThanExpected: 'CNY mildly bullish',
      lowerThanExpected: 'CNY mildly bearish'
    },
    relatedAssets: ['CNY', 'China stocks'],
    historicalVolatility: 'Medium',
  },

  'Industrial Production y/y': {
    category: 'manufacturing',
    description: 'Year-over-year change in industrial output.',
    whyItMatters: 'Direct measure of manufacturing activity. Key for commodity demand.',
    frequency: 'Monthly (around 15th)',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, commodities bullish',
      lowerThanExpected: 'Currency bearish, commodities bearish'
    },
    relatedAssets: ['Local currency', 'Commodities', 'Industrial stocks'],
    historicalVolatility: 'Medium',
  },

  'Fixed Asset Investment y/y': {
    category: 'growth',
    description: 'Year-over-year change in investment in physical assets (infrastructure, property, equipment).',
    whyItMatters: 'Shows government/corporate investment spending. Key growth driver in China.',
    frequency: 'Monthly (around 15th)',
    typicalReaction: {
      higherThanExpected: 'CNY bullish, commodities bullish',
      lowerThanExpected: 'CNY bearish, commodities bearish'
    },
    relatedAssets: ['CNY', 'Copper', 'Steel', 'China stocks'],
    historicalVolatility: 'Medium',
  },

  'Exports y/y': {
    category: 'trade',
    description: 'Year-over-year change in export value.',
    whyItMatters: 'Shows global demand for local goods and competitiveness.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish',
      lowerThanExpected: 'Currency bearish'
    },
    relatedAssets: ['Local currency', 'Exporter stocks'],
    historicalVolatility: 'Medium',
  },

  'Imports y/y': {
    category: 'trade',
    description: 'Year-over-year change in import value.',
    whyItMatters: 'Shows domestic demand. Rising imports signal stronger economy.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish (stronger economy)',
      lowerThanExpected: 'Currency bearish'
    },
    relatedAssets: ['Local currency', 'Commodities'],
    historicalVolatility: 'Medium',
  },

  'PPI y/y': {
    category: 'inflation',
    description: 'Year-over-year producer price inflation.',
    whyItMatters: 'Producer prices lead consumer inflation. Shows factory-gate pricing power.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Currency mildly bullish',
      lowerThanExpected: 'Currency mildly bearish'
    },
    relatedAssets: ['Local currency'],
    historicalVolatility: 'Medium',
  },

  'GDP y/y': {
    category: 'growth',
    description: 'Year-over-year GDP growth rate.',
    whyItMatters: 'Shows annual economic growth pace. Key for policy and market sentiment.',
    frequency: 'Quarterly',
    typicalReaction: {
      higherThanExpected: 'Currency bullish, stocks bullish',
      lowerThanExpected: 'Currency bearish, stocks bearish'
    },
    relatedAssets: ['Local currency', 'Local stocks'],
    historicalVolatility: 'High',
  },

  // ============================================
  // TREASURY AUCTIONS
  // ============================================
  '10-Year Note Auction': {
    category: 'bonds',
    description: 'US Treasury auction for 10-year government notes.',
    whyItMatters: '10-year yield is benchmark for mortgages and corporate bonds. Weak auctions can spike yields.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Strong demand = yields fall, USD mildly bullish',
      lowerThanExpected: 'Weak demand = yields rise, USD mildly bearish'
    },
    relatedAssets: ['US 10-year yield', 'USD', 'Mortgage rates'],
    historicalVolatility: 'Medium',
    releaseTime: '13:00 ET',
  },

  '30-Year Bond Auction': {
    category: 'bonds',
    description: 'US Treasury auction for 30-year government bonds.',
    whyItMatters: 'Long-end of yield curve. Sensitive to inflation expectations.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Strong demand = yields fall',
      lowerThanExpected: 'Weak demand = yields rise'
    },
    relatedAssets: ['US 30-year yield', 'USD', 'TLT ETF'],
    historicalVolatility: 'Medium',
    releaseTime: '13:00 ET',
  },

  '2-Year Note Auction': {
    category: 'bonds',
    description: 'US Treasury auction for 2-year government notes.',
    whyItMatters: 'Short-end of curve most sensitive to Fed policy expectations.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Strong demand = yields fall',
      lowerThanExpected: 'Weak demand = yields rise'
    },
    relatedAssets: ['US 2-year yield', 'Fed funds futures'],
    historicalVolatility: 'Medium',
    releaseTime: '13:00 ET',
  },

  '5-Year Note Auction': {
    category: 'bonds',
    description: 'US Treasury auction for 5-year government notes.',
    whyItMatters: 'Middle of the curve. Key benchmark for corporate bonds.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Strong demand = yields fall',
      lowerThanExpected: 'Weak demand = yields rise'
    },
    relatedAssets: ['US 5-year yield', 'Corporate bonds'],
    historicalVolatility: 'Medium',
    releaseTime: '13:00 ET',
  },

  '7-Year Note Auction': {
    category: 'bonds',
    description: 'US Treasury auction for 7-year government notes.',
    whyItMatters: 'Part of the belly of the curve.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Strong demand = yields fall',
      lowerThanExpected: 'Weak demand = yields rise'
    },
    relatedAssets: ['US Treasury yields'],
    historicalVolatility: 'Medium',
    releaseTime: '13:00 ET',
  },

  '4-Week Bill Auction': {
    category: 'bonds',
    description: 'US Treasury auction for 4-week bills.',
    whyItMatters: 'Short-term funding rate. Reflects money market conditions.',
    frequency: 'Weekly (Monday)',
    typicalReaction: {
      higherThanExpected: 'Minimal market impact',
      lowerThanExpected: 'Minimal market impact'
    },
    relatedAssets: ['T-bill rates'],
    historicalVolatility: 'Low',
  },

  '8-Week Bill Auction': {
    category: 'bonds',
    description: 'US Treasury auction for 8-week bills.',
    whyItMatters: 'Short-term funding rate.',
    frequency: 'Weekly (Monday)',
    typicalReaction: {
      higherThanExpected: 'Minimal market impact',
      lowerThanExpected: 'Minimal market impact'
    },
    relatedAssets: ['T-bill rates'],
    historicalVolatility: 'Low',
  },

  'Federal Budget Balance': {
    category: 'fiscal',
    description: 'Monthly US government budget surplus or deficit.',
    whyItMatters: 'Large deficits can affect Treasury supply and long-term rates.',
    frequency: 'Monthly',
    typicalReaction: {
      higherThanExpected: 'Minimal direct impact',
      lowerThanExpected: 'Minimal direct impact'
    },
    relatedAssets: ['US Treasury yields'],
    historicalVolatility: 'Low',
  },

  // ============================================
  // FED SPEAKERS
  // ============================================
  'Jackson Hole Symposium': {
    category: 'central_bank',
    description: 'Annual central bankers\' conference in Jackson Hole, Wyoming.',
    whyItMatters: 'Fed Chair often makes major policy announcements. Historically market-moving.',
    frequency: 'Annual (late August)',
    typicalReaction: {
      hawkish: 'USD bullish, stocks bearish, bonds bearish',
      dovish: 'USD bearish, stocks bullish, bonds bullish'
    },
    relatedAssets: ['USD', 'US stocks', 'US bonds', 'Global markets'],
    historicalVolatility: 'Very High',
  },

  'Fed Chair Powell Testifies': {
    category: 'central_bank',
    description: 'Semi-annual testimony to Congress on monetary policy.',
    whyItMatters: 'Two days of testimony can reveal policy thinking and respond to congressional questions.',
    frequency: 'Semi-annual (Feb and July)',
    typicalReaction: {
      hawkish: 'USD bullish, stocks bearish',
      dovish: 'USD bearish, stocks bullish'
    },
    relatedAssets: ['USD', 'US stocks', 'US bonds'],
    historicalVolatility: 'High',
  },
};

/**
 * Get indicator metadata by title
 */
export function getIndicatorInfo(title) {
  // Try exact match first
  if (INDICATORS[title]) {
    return INDICATORS[title];
  }

  // Try partial match
  for (const [key, value] of Object.entries(INDICATORS)) {
    if (title.includes(key) || key.includes(title)) {
      return value;
    }
  }

  // Return generic info if no match
  return {
    category: 'other',
    description: 'Economic indicator release.',
    whyItMatters: 'May affect market sentiment and currency values.',
    frequency: 'Variable',
    typicalReaction: {
      higherThanExpected: 'Varies',
      lowerThanExpected: 'Varies'
    },
    relatedAssets: [],
    historicalVolatility: 'Unknown',
  };
}

export default INDICATORS;
