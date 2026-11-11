import { Candle, ChartDrawing, MarketAsset, OrderBookEntry, Timeframe } from '../types/market';

export const INITIAL_ASSETS: MarketAsset[] = [
  // --- GOLD & PRECIOUS METALS SUITE (មាស និងលោហៈមានតម្លៃ) ---
  {
    symbol: 'XAU/USD',
    binanceSymbol: 'PAXGUSDT',
    name: 'Spot Gold / US Dollar (1 Troy Oz)',
    khmerName: 'មាសអន្តរជាតិ Spot (១ អោន)',
    assetClass: 'gold',
    exchange: 'LBMA / SPOT',
    unitLabel: '$/oz',
    basePrice: 2684.5,
    price: 2684.5,
    change24h: 1.24,
    high24h: 2701.8,
    low24h: 2652.0,
    volume24h: 64200000000,
    volatility1m: 0.14,
  },
  {
    symbol: 'GOLD-KH',
    name: 'Cambodia Gold 99.99% (1 Damleung = 37.5g)',
    khmerName: 'ហាងឆេងមាសគីឡូភ្នំពេញ (១ ដំឡឹង)',
    assetClass: 'gold',
    exchange: 'PHNOM PENH',
    unitLabel: '$/ដំឡឹង',
    basePrice: 3236.6,
    price: 3236.6,
    change24h: 1.24,
    high24h: 3258.0,
    low24h: 3198.0,
    volume24h: 850000000,
    volatility1m: 0.13,
  },
  {
    symbol: 'PAXG/USDT',
    binanceSymbol: 'PAXGUSDT',
    name: 'PAX Gold Tokenized Physical Gold',
    khmerName: 'មាសឌីជីថល PAX Gold (Binance)',
    assetClass: 'gold',
    exchange: 'BINANCE',
    unitLabel: 'USDT/oz',
    basePrice: 2686.0,
    price: 2686.0,
    change24h: 1.28,
    high24h: 2704.0,
    low24h: 2650.0,
    volume24h: 142000000,
    volatility1m: 0.15,
  },
  {
    symbol: 'XAUT/USDT',
    name: 'Tether Gold (1 Fine Troy Ounce)',
    khmerName: 'មាសឌីជីថល Tether Gold (XAUt)',
    assetClass: 'gold',
    exchange: 'GLOBAL',
    unitLabel: 'USDT/oz',
    basePrice: 2683.2,
    price: 2683.2,
    change24h: 1.19,
    high24h: 2699.5,
    low24h: 2649.0,
    volume24h: 98000000,
    volatility1m: 0.13,
  },
  {
    symbol: 'COMEX-GC',
    name: 'COMEX Gold Futures (Front Month)',
    khmerName: 'មាសអនាគតអាមេរិក (COMEX Futures)',
    assetClass: 'gold',
    exchange: 'COMEX / CME',
    unitLabel: '$/oz',
    basePrice: 2698.4,
    price: 2698.4,
    change24h: 1.31,
    high24h: 2716.0,
    low24h: 2665.2,
    volume24h: 39500000000,
    volatility1m: 0.15,
  },
  {
    symbol: 'GLD-ETF',
    name: 'SPDR Gold Shares Trust ETF',
    khmerName: 'មូលនិធិភាគហ៊ុនមាសអាមេរិក (GLD ETF)',
    assetClass: 'gold',
    exchange: 'NYSE ARCA',
    unitLabel: '$/ហ៊ុន',
    basePrice: 248.15,
    price: 248.15,
    change24h: 1.21,
    high24h: 249.8,
    low24h: 245.1,
    volume24h: 1920000000,
    volatility1m: 0.11,
  },
  {
    symbol: 'XAG/USD',
    name: 'Spot Silver / US Dollar (1 Troy Oz)',
    khmerName: 'ប្រាក់អន្តរជាតិ Spot Silver (១ អោន)',
    assetClass: 'gold',
    subCategory: 'gold',
    exchange: 'LBMA / SPOT',
    unitLabel: '$/oz',
    basePrice: 31.42,
    price: 31.42,
    change24h: 2.08,
    high24h: 31.95,
    low24h: 30.65,
    volume24h: 14800000000,
    volatility1m: 0.24,
  },
  // --- SMART OIL & GLOBAL ENERGY SUITE (ប្រេងឆៅ USOIL និងថាមពលអន្តរជាតិ) ---
  {
    symbol: 'USOIL',
    name: 'WTI Crude Oil Spot (US Oil / Barrel)',
    khmerName: 'ប្រេងឆៅអាមេរិក WTI (USOIL / បារ៉ែល)',
    assetClass: 'gold',
    subCategory: 'energy',
    exchange: 'NYMEX / WTI',
    unitLabel: '$/បារ៉ែល',
    basePrice: 69.85,
    price: 69.85,
    change24h: 1.86,
    high24h: 71.15,
    low24h: 68.4,
    volume24h: 48500000000,
    volatility1m: 0.22,
  },
  {
    symbol: 'UKOIL',
    name: 'Brent Crude Oil Global Benchmark',
    khmerName: 'ប្រេងឆៅអន្តរជាតិ Brent (UKOIL / បារ៉ែល)',
    assetClass: 'gold',
    subCategory: 'energy',
    exchange: 'ICE / BRENT',
    unitLabel: '$/បារ៉ែល',
    basePrice: 73.65,
    price: 73.65,
    change24h: 1.74,
    high24h: 74.9,
    low24h: 72.1,
    volume24h: 36200000000,
    volatility1m: 0.21,
  },
  {
    symbol: 'NATGAS',
    name: 'US Henry Hub Natural Gas Futures',
    khmerName: 'ឧស្ម័នធម្មជាតិអាមេរិក (Natural Gas)',
    assetClass: 'gold',
    subCategory: 'energy',
    exchange: 'NYMEX',
    unitLabel: '$/MMBtu',
    basePrice: 2.945,
    price: 2.945,
    change24h: 2.65,
    high24h: 3.04,
    low24h: 2.83,
    volume24h: 9400000000,
    volatility1m: 0.28,
  },
  // --- CRYPTOCURRENCIES (រូបិយប័ណ្ណគ្រីបតូ) ---
  {
    symbol: 'BTC/USDT',
    binanceSymbol: 'BTCUSDT',
    name: 'Bitcoin / Tether US',
    khmerName: 'ប៊ីតខوين (Bitcoin)',
    assetClass: 'crypto',
    exchange: 'BINANCE',
    basePrice: 91450.0,
    price: 91450.0,
    change24h: 3.42,
    high24h: 92380.0,
    low24h: 88120.0,
    volume24h: 42850000000,
    volatility1m: 0.18,
  },
  {
    symbol: 'ETH/USDT',
    binanceSymbol: 'ETHUSDT',
    name: 'Ethereum / Tether US',
    khmerName: 'អ៊ីធឺរៀម (Ethereum)',
    assetClass: 'crypto',
    exchange: 'BINANCE',
    basePrice: 3125.5,
    price: 3125.5,
    change24h: 2.15,
    high24h: 3190.0,
    low24h: 3040.0,
    volume24h: 18400000000,
    volatility1m: 0.21,
  },
  {
    symbol: 'SOL/USDT',
    binanceSymbol: 'SOLUSDT',
    name: 'Solana / Tether US',
    khmerName: 'សូឡាណា (Solana)',
    assetClass: 'crypto',
    exchange: 'BINANCE',
    basePrice: 194.8,
    price: 194.8,
    change24h: 5.68,
    high24h: 199.4,
    low24h: 182.1,
    volume24h: 6920000000,
    volatility1m: 0.34,
  },
  {
    symbol: 'BNB/USDT',
    binanceSymbol: 'BNBUSDT',
    name: 'BNB / Tether US',
    khmerName: 'ប៊ីអិនប៊ី (BNB)',
    assetClass: 'crypto',
    exchange: 'BINANCE',
    basePrice: 642.3,
    price: 642.3,
    change24h: 1.12,
    high24h: 651.0,
    low24h: 633.5,
    volume24h: 1650000000,
    volatility1m: 0.14,
  },
  {
    symbol: 'XRP/USDT',
    binanceSymbol: 'XRPUSDT',
    name: 'XRP / Tether US',
    khmerName: 'រីផល (XRP)',
    assetClass: 'crypto',
    exchange: 'BINANCE',
    basePrice: 1.482,
    price: 1.482,
    change24h: -1.84,
    high24h: 1.545,
    low24h: 1.441,
    volume24h: 5120000000,
    volatility1m: 0.29,
  },
  // --- STOCKS (ភាគហ៊ុនអន្តរជាតិ និងកម្ពុជា CSX) ---
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    khmerName: 'ភាគហ៊ុន NVIDIA',
    assetClass: 'stock',
    exchange: 'NASDAQ',
    basePrice: 141.8,
    price: 141.8,
    change24h: 2.89,
    high24h: 143.9,
    low24h: 138.2,
    volume24h: 5890000000,
    volatility1m: 0.16,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    khmerName: 'ភាគហ៊ុន Apple',
    assetClass: 'stock',
    exchange: 'NASDAQ',
    basePrice: 229.4,
    price: 229.4,
    change24h: 0.94,
    high24h: 231.2,
    low24h: 227.1,
    volume24h: 3420000000,
    volatility1m: 0.09,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    khmerName: 'ភាគហ៊ុន Tesla',
    assetClass: 'stock',
    exchange: 'NASDAQ',
    basePrice: 342.6,
    price: 342.6,
    change24h: -2.41,
    high24h: 355.0,
    low24h: 338.4,
    volume24h: 7210000000,
    volatility1m: 0.31,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    khmerName: 'ភាគហ៊ុន Microsoft',
    assetClass: 'stock',
    exchange: 'NASDAQ',
    basePrice: 426.5,
    price: 426.5,
    change24h: 1.18,
    high24h: 429.8,
    low24h: 421.9,
    volume24h: 2890000000,
    volatility1m: 0.08,
  },
  {
    symbol: 'ABC-CSX',
    name: 'ACLEDA Bank Plc (CSX)',
    khmerName: 'ធនាគារ អេស៊ីលីដា (CSX)',
    assetClass: 'stock',
    exchange: 'CSX',
    basePrice: 7420,
    price: 7420,
    change24h: 0.54,
    high24h: 7480,
    low24h: 7380,
    volume24h: 482000000,
    volatility1m: 0.06,
  },
  {
    symbol: 'PPAP-CSX',
    name: 'Phnom Penh Autonomous Port',
    khmerName: 'កំពង់ផែស្វ័យតភ្នំពេញ (CSX)',
    assetClass: 'stock',
    exchange: 'CSX',
    basePrice: 13800,
    price: 13800,
    change24h: 1.47,
    high24h: 13960,
    low24h: 13600,
    volume24h: 195000000,
    volatility1m: 0.08,
  },
];

// Constants for Cambodian & Global Gold Unit Conversions
// 1 Troy Ounce = 31.1034768 grams
// 1 Cambodian Damleung (ដំឡឹង) = 37.5 grams = 1.20565303 Troy Ounces
// 1 Chi (ជី) = 3.75 grams = 0.1 Damleung
// 1 Hun (ហ៊ុន) = 0.375 grams = 0.01 Damleung
export const GOLD_CONVERSION = {
  TROY_OZ_GRAMS: 31.1034768,
  DAMLEUNG_GRAMS: 37.5,
  CHI_GRAMS: 3.75,
  HUN_GRAMS: 0.375,
  DAMLEUNG_PER_OZ: 37.5 / 31.1034768, // ~1.20565303
  KHR_PER_USD: 4065,
};

export function calculateCambodiaGoldBreakdown(spotOzUsd: number) {
  const perGram9999 = spotOzUsd / GOLD_CONVERSION.TROY_OZ_GRAMS;
  const perDamleung9999 = perGram9999 * GOLD_CONVERSION.DAMLEUNG_GRAMS;
  const perChi9999 = perDamleung9999 / 10;
  const perHun9999 = perChi9999 / 10;
  const perDamleung18K = perDamleung9999 * 0.75; // មាសផ្លាកទីន 75% (18K)
  return {
    spotOzUsd,
    perGram9999,
    perDamleung9999,
    perChi9999,
    perHun9999,
    perDamleung18K,
    perDamleungKhr: Math.round((perDamleung9999 * GOLD_CONVERSION.KHR_PER_USD) / 100) * 100,
  };
}

// Constants for Global & Cambodian Oil / Energy Conversions
// 1 Oil Barrel (bbl) = 42 US Gallons = 158.987295 Liters
// 1 Metric Ton of Crude Oil ≈ 7.33 Barrels
// 1 Standard NYMEX WTI Lot = 1,000 Barrels
export const OIL_CONVERSION = {
  LITERS_PER_BARREL: 158.987295,
  GALLONS_PER_BARREL: 42,
  BARRELS_PER_TON: 7.33,
  BARRELS_PER_LOT: 1000,
  KHR_PER_USD: 4065,
};

export function calculateSmartOilBreakdown(
  wtiBarrelUsd: number,
  brentBarrelUsd = wtiBarrelUsd + 3.8,
  spotGoldOzUsd = 2684.5
) {
  const rawCrudePerLiterUsd = wtiBarrelUsd / OIL_CONVERSION.LITERS_PER_BARREL;
  const rawCrudePerLiterKhr = Math.round(rawCrudePerLiterUsd * OIL_CONVERSION.KHR_PER_USD);
  const brentWtiSpread = brentBarrelUsd - wtiBarrelUsd;
  const goldToOilRatio = wtiBarrelUsd > 0 ? spotGoldOzUsd / wtiBarrelUsd : 38.4;
  // Estimated Cambodia retail pump reference (crude + refining crack + logistics/tax)
  const estCambodiaDieselKhr = Math.round(((rawCrudePerLiterUsd + 0.52) * OIL_CONVERSION.KHR_PER_USD) / 50) * 50;
  const estCambodiaRegularGasKhr = Math.round(((rawCrudePerLiterUsd + 0.56) * OIL_CONVERSION.KHR_PER_USD) / 50) * 50;

  return {
    wtiBarrelUsd,
    brentBarrelUsd,
    brentWtiSpread,
    goldToOilRatio,
    rawCrudePerLiterUsd,
    rawCrudePerLiterKhr,
    perTonUsd: wtiBarrelUsd * OIL_CONVERSION.BARRELS_PER_TON,
    perStandardLotUsd: wtiBarrelUsd * OIL_CONVERSION.BARRELS_PER_LOT,
    estCambodiaDieselKhr,
    estCambodiaRegularGasKhr,
  };
}

export const TIMEFRAME_METADATA: {
  id: Timeframe;
  label: string;
  khmerLabel: string;
  group: 'seconds' | 'minutes' | 'hours' | 'macro';
}[] = [
  { id: '1s', label: '1s', khmerLabel: '1 វិនាទី (1s)', group: 'seconds' },
  { id: '5s', label: '5s', khmerLabel: '5 វិនាទី (5s)', group: 'seconds' },
  { id: '15s', label: '15s', khmerLabel: '15 វិនាទី (15s)', group: 'seconds' },
  { id: '30s', label: '30s', khmerLabel: '30 វិនាទី (30s)', group: 'seconds' },
  { id: '1m', label: '1m', khmerLabel: '1 នាទី (1m)', group: 'minutes' },
  { id: '5m', label: '5m', khmerLabel: '5 នាទី (5m)', group: 'minutes' },
  { id: '15m', label: '15m', khmerLabel: '15 នាទី (15m)', group: 'minutes' },
  { id: '30m', label: '30m', khmerLabel: '30 នាទី (30m)', group: 'minutes' },
  { id: '1H', label: '1H', khmerLabel: '1 ម៉ោង (1H)', group: 'hours' },
  { id: '4H', label: '4H', khmerLabel: '4 ម៉ោង (4H)', group: 'hours' },
  { id: '1D', label: '1D', khmerLabel: '1 ថ្ងៃ (1D)', group: 'macro' },
  { id: '1W', label: '1W', khmerLabel: '1 សប្តាហ៍ (1W)', group: 'macro' },
  { id: '1M', label: '1M', khmerLabel: '1 ខែ (1M)', group: 'macro' },
  { id: '3M', label: '3M', khmerLabel: '3 ខែ / ត្រីមាស (3M)', group: 'macro' },
  { id: '6M', label: '6M', khmerLabel: '6 ខែ / ឆមាស (6M)', group: 'macro' },
  { id: '1Y', label: '1Y', khmerLabel: '1 ឆ្នាំ (1Y)', group: 'macro' },
];

export function getIntervalSeconds(tf: Timeframe): number {
  switch (tf) {
    case '1s':
      return 1;
    case '5s':
      return 5;
    case '15s':
      return 15;
    case '30s':
      return 30;
    case '1m':
      return 60;
    case '5m':
      return 300;
    case '15m':
      return 900;
    case '30m':
      return 1800;
    case '1H':
      return 3600;
    case '4H':
      return 14400;
    case '1D':
      return 86400;
    case '1W':
      return 604800;
    case '1M':
      return 2592000;
    case '3M':
      return 7776000;
    case '6M':
      return 15552000;
    case '1Y':
      return 31536000;
  }
}

export function mapTimeframeToBinance(tf: Timeframe): string {
  switch (tf) {
    case '1s':
      return '1s';
    case '5s':
    case '15s':
    case '30s':
      return '';
    case '1m':
      return '1m';
    case '5m':
      return '5m';
    case '15m':
      return '15m';
    case '30m':
      return '30m';
    case '1H':
      return '1h';
    case '4H':
      return '4h';
    case '1D':
      return '1d';
    case '1W':
      return '1w';
    case '1M':
      return '1M';
    case '3M':
    case '6M':
    case '1Y':
      return '';
  }
}

export const ALL_TIMEFRAMES_ORDERED: Timeframe[] = [
  '1s',
  '5s',
  '15s',
  '30s',
  '1m',
  '5m',
  '15m',
  '30m',
  '1H',
  '4H',
  '1D',
  '1W',
  '1M',
  '3M',
  '6M',
  '1Y',
];

export function formatVisibleDurationKhmer(spanSec: number): string {
  const safe = Math.max(1, Math.round(spanSec));
  if (safe < 60) {
    return `${safe} វិនាទី (${safe}s)`;
  }
  if (safe < 3600) {
    const mins = (safe / 60).toFixed(safe < 600 ? 1 : 0).replace(/\.0$/, '');
    return `${mins} នាទី (${mins}m)`;
  }
  if (safe < 86400 * 2) {
    const hrs = (safe / 3600).toFixed(safe < 36000 ? 1 : 0).replace(/\.0$/, '');
    return `${hrs} ម៉ោង (${hrs}h)`;
  }
  if (safe < 86400 * 60) {
    const days = Math.round(safe / 86400);
    return `${days} ថ្ងៃ (${days}D)`;
  }
  if (safe < 86400 * 365) {
    const months = (safe / (86400 * 30.4375)).toFixed(1).replace(/\.0$/, '');
    return `${months} ខែ (${months}M)`;
  }
  const years = (safe / (86400 * 365.25)).toFixed(1).replace(/\.0$/, '');
  return `${years} ឆ្នាំ (${years}Y)`;
}

// Deterministic realistic OHLCV series generator for stocks or custom/offline timeframes
export function generateHistoricalCandles(
  asset: MarketAsset,
  timeframe: Timeframe,
  count = 365
): Candle[] {
  const effectiveCount =
    timeframe === '1Y'
      ? Math.min(count, 45)
      : timeframe === '6M'
      ? Math.min(count, 80)
      : timeframe === '3M'
      ? Math.min(count, 120)
      : count;
  const stepSec = getIntervalSeconds(timeframe);
  const nowSec = Math.floor(Date.now() / 1000);
  const currentBucket = Math.floor(nowSec / stepSec) * stepSec;

  let seed = 0;
  for (let i = 0; i < asset.symbol.length; i++) {
    seed = (seed * 31 + asset.symbol.charCodeAt(i)) % 100000;
  }
  const pseudoRandom = () => {
    seed = (seed * 16807 + 11) % 2147483647;
    return (seed % 10000) / 10000;
  };

  const candles: Candle[] = [];
  const volFactor =
    timeframe === '1s'
      ? 0.00045
      : timeframe === '5s'
      ? 0.0008
      : timeframe === '15s'
      ? 0.0012
      : timeframe === '30s'
      ? 0.0016
      : timeframe === '1m'
      ? 0.0022
      : timeframe === '5m'
      ? 0.0042
      : timeframe === '15m'
      ? 0.0065
      : timeframe === '30m'
      ? 0.0085
      : timeframe === '1H'
      ? 0.011
      : timeframe === '4H'
      ? 0.017
      : timeframe === '1D'
      ? 0.022
      : timeframe === '1W'
      ? 0.034
      : timeframe === '1M'
      ? 0.052
      : timeframe === '3M'
      ? 0.078
      : timeframe === '6M'
      ? 0.105
      : 0.145;

  let price = asset.price * (1 - (asset.change24h / 100) * 0.6);

  for (let i = effectiveCount - 1; i >= 0; i--) {
    const time = currentBucket - i * stepSec;
    const wave = Math.sin((effectiveCount - i) / 9) * 0.25 + Math.cos((effectiveCount - i) / 21) * 0.15;
    const drift = (pseudoRandom() - 0.488 + wave * 0.08) * volFactor;
    const open = price;
    const close = i === 0 ? asset.price : Math.max(open * (1 + drift), asset.basePrice * 0.1);
    const wickUp = Math.abs(pseudoRandom() * volFactor * 0.85);
    const wickDown = Math.abs(pseudoRandom() * volFactor * 0.85);
    const high = Math.max(open, close) * (1 + wickUp);
    const low = Math.min(open, close) * (1 - wickDown);
    const volume =
      (asset.volume24h / 1440) *
      (0.5 + pseudoRandom() * 1.4) *
      (1 + Math.abs(close - open) / (open * volFactor));

    candles.push({
      time,
      open: Number(open.toPrecision(7)),
      high: Number(high.toPrecision(7)),
      low: Number(low.toPrecision(7)),
      close: Number(close.toPrecision(7)),
      volume: Math.round(volume),
    });
    price = close;
  }

  return candles;
}

// Technical Indicator Calculations
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    result.push(i >= period - 1 ? sum / period : null);
  }
  return result;
}

export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    if (ema === null) {
      ema = close;
    } else {
      ema = close * k + ema * (1 - k);
    }
    result.push(i >= Math.min(period - 1, 3) ? ema : null);
  }
  return result;
}

export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  multiplier = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(candles, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const avg = middle[i];
    if (avg === null || i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].close - avg;
      sumSq += diff * diff;
    }
    const stdDev = Math.sqrt(sumSq / period);
    upper.push(avg + multiplier * stdDev);
    lower.push(avg - multiplier * stdDev);
  }

  return { upper, middle, lower };
}

export function calculateVWAP(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumPV = 0;
  let cumVol = 0;
  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const vol = Math.max(candles[i].volume, 1);
    cumPV += typicalPrice * vol;
    cumVol += vol;
    result.push(cumPV / cumVol);
  }
  return result;
}

export function calculateRSI(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length === 0) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i < period) {
        result.push(50);
      } else {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);
  const macd: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const f = fastEma[i] ?? candles[i].close;
    const s = slowEma[i] ?? candles[i].close;
    macd.push(f - s);
  }

  const signal: number[] = [];
  const k = 2 / (signalPeriod + 1);
  let sigEma = macd[0] || 0;
  for (let i = 0; i < macd.length; i++) {
    sigEma = macd[i] * k + sigEma * (1 - k);
    signal.push(sigEma);
  }

  const histogram = macd.map((m, idx) => m - signal[idx]);
  return { macd, signal, histogram };
}

export function calculatePearsonCorrelation(
  primaryCandles: Candle[],
  secondaryCandles: Candle[]
): number {
  const n = Math.min(primaryCandles.length, secondaryCandles.length);
  if (n < 3) return 0;

  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    x.push(primaryCandles[primaryCandles.length - n + i].close);
    y.push(secondaryCandles[secondaryCandles.length - n + i].close);
  }

  const meanX = x.reduce((acc, v) => acc + v, 0) / n;
  const meanY = y.reduce((acc, v) => acc + v, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  if (denom < 1e-12) return 0;
  return Math.max(-1, Math.min(1, num / denom));
}

// Wilder's Average True Range (ATR 14) for exact institutional volatility & risk sizing
export function calculateATR(candles: Candle[], period = 14): number[] {
  if (candles.length === 0) return [];
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      tr.push(Math.max(c.high - c.low, c.close * 0.001));
    } else {
      const prevClose = candles[i - 1].close;
      const range1 = c.high - c.low;
      const range2 = Math.abs(c.high - prevClose);
      const range3 = Math.abs(c.low - prevClose);
      tr.push(Math.max(range1, range2, range3));
    }
  }

  const atr: number[] = [];
  let sum = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period) {
      sum += tr[i];
      atr.push(sum / (i + 1));
    } else {
      const prevAtr = atr[i - 1];
      atr.push((prevAtr * (period - 1) + tr[i]) / period);
    }
  }
  return atr;
}

// Wilder's Average Directional Index (ADX 14) with +DI and -DI for true trend strength
export function calculateADX(
  candles: Candle[],
  period = 14
): { adx: number; plusDI: number; minusDI: number } {
  if (candles.length < 3) {
    return { adx: 22, plusDI: 20, minusDI: 20 };
  }

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;
  const dxList: number[] = [];
  let lastPlusDI = 20;
  let lastMinusDI = 20;

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];

    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );

    if (i <= period) {
      smoothedTR += tr;
      smoothedPlusDM += plusDM;
      smoothedMinusDM += minusDM;
    } else {
      smoothedTR = smoothedTR - smoothedTR / period + tr;
      smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM;
      smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM;
    }

    if (i >= Math.min(period, candles.length - 1)) {
      const safeTR = Math.max(smoothedTR, 1e-9);
      lastPlusDI = (smoothedPlusDM / safeTR) * 100;
      lastMinusDI = (smoothedMinusDM / safeTR) * 100;
      const diSum = Math.max(lastPlusDI + lastMinusDI, 1e-9);
      const dx = (Math.abs(lastPlusDI - lastMinusDI) / diSum) * 100;
      dxList.push(dx);
    }
  }

  if (dxList.length === 0) {
    return { adx: 22, plusDI: lastPlusDI, minusDI: lastMinusDI };
  }

  let adx = dxList[0];
  for (let i = 1; i < dxList.length; i++) {
    adx = (adx * (period - 1) + dxList[i]) / period;
  }

  return {
    adx: Number(adx.toFixed(2)),
    plusDI: Number(lastPlusDI.toFixed(2)),
    minusDI: Number(lastMinusDI.toFixed(2)),
  };
}

// Stochastic RSI (14) for high-precision momentum inflection detection
export function calculateStochRSI(candles: Candle[], period = 14): number {
  const rsiSeries = calculateRSI(candles, period).filter((v): v is number => v !== null);
  if (rsiSeries.length < period) return 50;
  const window = rsiSeries.slice(-period);
  const currentRsi = window[window.length - 1];
  const minRsi = Math.min(...window);
  const maxRsi = Math.max(...window);
  if (Math.abs(maxRsi - minRsi) < 1e-6) return 50;
  return Number((((currentRsi - minRsi) / (maxRsi - minRsi)) * 100).toFixed(2));
}

// Institutional Floor Pivot Points (Classic & Fibonacci)
export interface PivotPointLevels {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  fib382: number;
  fib500: number;
  fib618: number;
  swingHigh: number;
  swingLow: number;
}

export function calculatePivotPoints(candles: Candle[], fallbackPrice = 100): PivotPointLevels {
  if (candles.length === 0) {
    return {
      pivot: fallbackPrice,
      r1: fallbackPrice * 1.01,
      r2: fallbackPrice * 1.02,
      r3: fallbackPrice * 1.03,
      s1: fallbackPrice * 0.99,
      s2: fallbackPrice * 0.98,
      s3: fallbackPrice * 0.97,
      fib382: fallbackPrice * 0.995,
      fib500: fallbackPrice,
      fib618: fallbackPrice * 1.005,
      swingHigh: fallbackPrice * 1.015,
      swingLow: fallbackPrice * 0.985,
    };
  }

  const lookback = candles.slice(-Math.min(48, candles.length));
  const high = Math.max(...lookback.map((c) => c.high));
  const low = Math.min(...lookback.map((c) => c.low));
  const close = lookback[lookback.length - 1].close;
  const range = Math.max(high - low, close * 0.002);

  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  const r2 = pivot + range;
  const s2 = pivot - range;
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);

  return {
    pivot: Number(pivot.toPrecision(7)),
    r1: Number(r1.toPrecision(7)),
    r2: Number(r2.toPrecision(7)),
    r3: Number(r3.toPrecision(7)),
    s1: Number(s1.toPrecision(7)),
    s2: Number(s2.toPrecision(7)),
    s3: Number(s3.toPrecision(7)),
    fib382: Number((high - range * 0.382).toPrecision(7)),
    fib500: Number((high - range * 0.5).toPrecision(7)),
    fib618: Number((high - range * 0.618).toPrecision(7)),
    swingHigh: Number(high.toPrecision(7)),
    swingLow: Number(low.toPrecision(7)),
  };
}

export type SignalVerdict = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export interface QuantFactorSignal {
  id: string;
  name: string;
  khmerName: string;
  category: 'MA' | 'OSCILLATOR' | 'STRUCTURE';
  valueLabel: string;
  signal: 'BUY' | 'NEUTRAL' | 'SELL';
  khmerSignal: string;
  detail: string;
}

export interface GlobalPrecisionAnalysisResult {
  symbol: string;
  timeframe: Timeframe;
  currentPrice: number;
  overallScore: number; // 0 to 100
  overallVerdict: SignalVerdict;
  confidencePct: number;
  khmerVerdict: string;
  englishVerdict: string;
  buyCount: number;
  neutralCount: number;
  sellCount: number;
  maSummary: { buy: number; neutral: number; sell: number; label: string };
  oscSummary: { buy: number; neutral: number; sell: number; label: string };
  factors: QuantFactorSignal[];
  atr14: number;
  atrPct: number;
  adx14: number;
  plusDI: number;
  minusDI: number;
  rsi14: number;
  stochRsi14: number;
  vwapValue: number;
  bbPercentB: number;
  buyVolumePct: number;
  pivots: PivotPointLevels;
  tradeSetup: {
    direction: 'LONG' | 'SHORT';
    khmerDirection: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: number;
    confidencePct: number;
    rationaleKhmer: string;
  };
}

export function calculateGlobalPrecisionAnalysis(
  asset: MarketAsset,
  rawCandles: Candle[],
  timeframe: Timeframe
): GlobalPrecisionAnalysisResult {
  const candles =
    rawCandles.length >= 20 ? rawCandles : generateHistoricalCandles(asset, timeframe, 120);
  const price = asset.price || candles[candles.length - 1]?.close || asset.basePrice;

  const ema20Arr = calculateEMA(candles, 20);
  const ema50Arr = calculateEMA(candles, 50);
  const sma200Arr = calculateSMA(candles, Math.min(200, Math.max(30, candles.length - 5)));
  const vwapArr = calculateVWAP(candles);
  const bb = calculateBollingerBands(candles, 20, 2);
  const rsiArr = calculateRSI(candles, 14);
  const macdObj = calculateMACD(candles, 12, 26, 9);
  const atrArr = calculateATR(candles, 14);
  const adxObj = calculateADX(candles, 14);
  const stochRsi = calculateStochRSI(candles, 14);
  const pivots = calculatePivotPoints(candles, price);

  const lastIdx = candles.length - 1;
  const ema20 = ema20Arr[lastIdx] ?? price;
  const ema50 = ema50Arr[lastIdx] ?? price;
  const sma200 = sma200Arr[lastIdx] ?? price;
  const vwap = vwapArr[lastIdx] ?? price;
  const bbUpper = bb.upper[lastIdx] ?? price * 1.015;
  const bbLower = bb.lower[lastIdx] ?? price * 0.985;
  const bbSpan = Math.max(bbUpper - bbLower, 1e-8);
  const bbPercentB = ((price - bbLower) / bbSpan) * 100;

  const rsi14 = rsiArr[lastIdx] ?? 50;
  const macdVal = macdObj.macd[lastIdx] ?? 0;
  const macdSig = macdObj.signal[lastIdx] ?? 0;
  const macdHist = macdObj.histogram[lastIdx] ?? 0;
  const atr14 = atrArr[lastIdx] ?? price * 0.005;
  const atrPct = price > 0 ? (atr14 / price) * 100 : 0.5;

  // Order Flow / Volume Delta over recent 24 candles
  const recentCandles = candles.slice(-24);
  let buyVol = 0;
  let totalVol = 0;
  for (const c of recentCandles) {
    const candleSpan = Math.max(c.high - c.low, 1e-8);
    const closeRatio = Math.max(0, Math.min(1, (c.close - c.low) / candleSpan));
    buyVol += c.volume * closeRatio;
    totalVol += c.volume;
  }
  const buyVolumePct = totalVol > 0 ? (buyVol / totalVol) * 100 : 50;

  const factors: QuantFactorSignal[] = [];

  // 1. EMA 20
  const ema20DiffPct = ((price - ema20) / Math.max(ema20, 1e-8)) * 100;
  const ema20Sig: 'BUY' | 'NEUTRAL' | 'SELL' =
    ema20DiffPct > 0.04 ? 'BUY' : ema20DiffPct < -0.04 ? 'SELL' : 'NEUTRAL';
  factors.push({
    id: 'EMA20',
    name: 'EMA (20)',
    khmerName: 'មធ្យមភាគ EMA 20 (រយៈពេលខ្លី)',
    category: 'MA',
    valueLabel: formatPrice(ema20, asset.symbol),
    signal: ema20Sig,
    khmerSignal: ema20Sig === 'BUY' ? 'ទិញ (Buy)' : ema20Sig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail: `តម្លៃស្ថិតនៅ ${ema20DiffPct >= 0 ? 'លើ' : 'ក្រោម'} EMA20 (${ema20DiffPct >= 0 ? '+' : ''}${ema20DiffPct.toFixed(2)}%)`,
  });

  // 2. EMA 50
  const ema50DiffPct = ((price - ema50) / Math.max(ema50, 1e-8)) * 100;
  const ema50Sig: 'BUY' | 'NEUTRAL' | 'SELL' =
    ema50DiffPct > 0.05 ? 'BUY' : ema50DiffPct < -0.05 ? 'SELL' : 'NEUTRAL';
  factors.push({
    id: 'EMA50',
    name: 'EMA (50)',
    khmerName: 'មធ្យមភាគ EMA 50 (រយៈពេលមធ្យម)',
    category: 'MA',
    valueLabel: formatPrice(ema50, asset.symbol),
    signal: ema50Sig,
    khmerSignal: ema50Sig === 'BUY' ? 'ទិញ (Buy)' : ema50Sig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail: `និន្នាការមធ្យម ${ema20 >= ema50 ? 'Golden Cross (ឡើង)' : 'Death Cross (ចុះ)'}`,
  });

  // 3. SMA 200
  const sma200DiffPct = ((price - sma200) / Math.max(sma200, 1e-8)) * 100;
  const sma200Sig: 'BUY' | 'NEUTRAL' | 'SELL' =
    sma200DiffPct > 0.08 ? 'BUY' : sma200DiffPct < -0.08 ? 'SELL' : 'NEUTRAL';
  factors.push({
    id: 'SMA200',
    name: 'SMA (200)',
    khmerName: 'ខ្សែមេស្ថាប័ន SMA 200 (Macro)',
    category: 'MA',
    valueLabel: formatPrice(sma200, asset.symbol),
    signal: sma200Sig,
    khmerSignal: sma200Sig === 'BUY' ? 'ទិញ (Buy)' : sma200Sig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail: `រចនាសម្ព័ន្ធធំស្ថិតក្នុងតំបន់ ${sma200Sig === 'BUY' ? 'Bullish Macro' : sma200Sig === 'SELL' ? 'Bearish Macro' : 'Equilibrium'}`,
  });

  // 4. VWAP Institutional Benchmark
  const vwapDiffPct = ((price - vwap) / Math.max(vwap, 1e-8)) * 100;
  const vwapSig: 'BUY' | 'NEUTRAL' | 'SELL' =
    vwapDiffPct > 0.03 ? 'BUY' : vwapDiffPct < -0.03 ? 'SELL' : 'NEUTRAL';
  factors.push({
    id: 'VWAP',
    name: 'VWAP',
    khmerName: 'តម្លៃមធ្យមទម្ងន់បរិមាណ (VWAP)',
    category: 'MA',
    valueLabel: formatPrice(vwap, asset.symbol),
    signal: vwapSig,
    khmerSignal: vwapSig === 'BUY' ? 'ទិញ (Buy)' : vwapSig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail: `ស្ថាប័នធំៗកំពុងជួញដូរ ${vwapDiffPct >= 0 ? 'លើតម្លៃមធ្យម VWAP' : 'ក្រោមតម្លៃមធ្យម VWAP'}`,
  });

  // 5. Bollinger Bands (20, 2) %B
  const bbSig: 'BUY' | 'NEUTRAL' | 'SELL' =
    bbPercentB < 22 ? 'BUY' : bbPercentB > 82 ? 'SELL' : bbPercentB >= 52 ? 'BUY' : 'SELL';
  factors.push({
    id: 'BB',
    name: 'Bollinger %B',
    khmerName: 'កម្រិត Bollinger Bands (%B)',
    category: 'MA',
    valueLabel: `${bbPercentB.toFixed(1)}%`,
    signal: bbSig,
    khmerSignal: bbSig === 'BUY' ? 'ទិញ (Buy)' : bbSig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail:
      bbPercentB < 20
        ? 'ប៉ះខ្សែក្រោម (Oversold Bounce)'
        : bbPercentB > 85
        ? 'ប៉ះខ្សែលើ (Upper Band Resistance)'
        : `ស្ថិតក្នុងបណ្តាញ (${bbPercentB.toFixed(0)}%)`,
  });

  // 6. RSI (14)
  const rsiSig: 'BUY' | 'NEUTRAL' | 'SELL' =
    rsi14 < 33 ? 'BUY' : rsi14 > 68 ? 'SELL' : rsi14 >= 52 ? 'BUY' : rsi14 <= 48 ? 'SELL' : 'NEUTRAL';
  factors.push({
    id: 'RSI14',
    name: 'RSI (14)',
    khmerName: 'សន្ទស្សន៍កម្លាំងធៀប RSI (14)',
    category: 'OSCILLATOR',
    valueLabel: rsi14.toFixed(1),
    signal: rsiSig,
    khmerSignal: rsiSig === 'BUY' ? 'ទិញ (Buy)' : rsiSig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail:
      rsi14 >= 70
        ? 'ទិញជ្រុល (Overbought > 70)'
        : rsi14 <= 30
        ? 'លក់ជ្រុល (Oversold < 30)'
        : rsi14 >= 50
        ? 'កម្លាំងទិញមានប្រៀប (Bullish Momentum)'
        : 'កម្លាំងលក់មានប្រៀប (Bearish Momentum)',
  });

  // 7. Stochastic RSI (14)
  const stochSig: 'BUY' | 'NEUTRAL' | 'SELL' =
    stochRsi < 25 ? 'BUY' : stochRsi > 80 ? 'SELL' : stochRsi >= 50 ? 'BUY' : 'SELL';
  factors.push({
    id: 'STOCH_RSI',
    name: 'Stoch RSI (14)',
    khmerName: 'សន្ទុះរលកខ្លី Stoch RSI',
    category: 'OSCILLATOR',
    valueLabel: `${stochRsi.toFixed(1)}%`,
    signal: stochSig,
    khmerSignal: stochSig === 'BUY' ? 'ទិញ (Buy)' : stochSig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail:
      stochRsi < 20
        ? 'តំបន់ងើបឡើងវិញ (Oversold Reversal)'
        : stochRsi > 80
        ? 'តំបន់ថមថយសន្ទុះ (Overbought Zone)'
        : 'សន្ទុះកណ្តាល',
  });

  // 8. MACD (12, 26, 9)
  const macdBuying = macdHist > 0 || macdVal > macdSig;
  const macdSigVerdict: 'BUY' | 'NEUTRAL' | 'SELL' =
    Math.abs(macdHist) < 1e-7 ? 'NEUTRAL' : macdBuying ? 'BUY' : 'SELL';
  factors.push({
    id: 'MACD',
    name: 'MACD (12,26,9)',
    khmerName: 'សន្ទស្សន៍និន្នាការ MACD',
    category: 'OSCILLATOR',
    valueLabel: `${macdHist >= 0 ? '+' : ''}${macdHist.toPrecision(3)}`,
    signal: macdSigVerdict,
    khmerSignal:
      macdSigVerdict === 'BUY' ? 'ទិញ (Buy)' : macdSigVerdict === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail: macdBuying ? 'Histogram វិជ្ជមាន (Bullish Crossover)' : 'Histogram អវិជ្ជមាន (Bearish Cross)',
  });

  // 9. ADX (14) +DI / -DI Directional Strength
  const adxSig: 'BUY' | 'NEUTRAL' | 'SELL' =
    adxObj.adx < 18
      ? 'NEUTRAL'
      : adxObj.plusDI > adxObj.minusDI
      ? 'BUY'
      : 'SELL';
  factors.push({
    id: 'ADX14',
    name: 'ADX (14) +DI/-DI',
    khmerName: 'កម្លាំងនិន្នាការពិតប្រាកដ ADX (14)',
    category: 'OSCILLATOR',
    valueLabel: `${adxObj.adx.toFixed(1)}`,
    signal: adxSig,
    khmerSignal: adxSig === 'BUY' ? 'ទិញ (Buy)' : adxSig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail: `${adxObj.adx >= 25 ? 'និន្នាការខ្លាំង' : 'ទីផ្សាររត់ទទឹង'} (+DI:${adxObj.plusDI.toFixed(0)} / -DI:${adxObj.minusDI.toFixed(0)})`,
  });

  // 10. Order Flow Volume Pressure
  const volSig: 'BUY' | 'NEUTRAL' | 'SELL' =
    buyVolumePct >= 53 ? 'BUY' : buyVolumePct <= 47 ? 'SELL' : 'NEUTRAL';
  factors.push({
    id: 'VOL_DELTA',
    name: 'Volume Flow',
    khmerName: 'លំហូរទឹកប្រាក់ទិញ/លក់ (Order Flow)',
    category: 'OSCILLATOR',
    valueLabel: `${buyVolumePct.toFixed(1)}% Buy`,
    signal: volSig,
    khmerSignal: volSig === 'BUY' ? 'ទិញ (Buy)' : volSig === 'SELL' ? 'លក់ (Sell)' : 'អព្យាក្រឹត',
    detail: `កម្លាំងទិញ ${buyVolumePct.toFixed(1)}% ធៀបនឹងកម្លាំងលក់ ${(100 - buyVolumePct).toFixed(1)}%`,
  });

  const buyCount = factors.filter((f) => f.signal === 'BUY').length;
  const sellCount = factors.filter((f) => f.signal === 'SELL').length;
  const neutralCount = factors.filter((f) => f.signal === 'NEUTRAL').length;

  const maFactors = factors.filter((f) => f.category === 'MA');
  const oscFactors = factors.filter((f) => f.category === 'OSCILLATOR');

  const maBuy = maFactors.filter((f) => f.signal === 'BUY').length;
  const maSell = maFactors.filter((f) => f.signal === 'SELL').length;
  const maNeutral = maFactors.filter((f) => f.signal === 'NEUTRAL').length;

  const oscBuy = oscFactors.filter((f) => f.signal === 'BUY').length;
  const oscSell = oscFactors.filter((f) => f.signal === 'SELL').length;
  const oscNeutral = oscFactors.filter((f) => f.signal === 'NEUTRAL').length;

  const rawScore = 50 + ((buyCount - sellCount) / factors.length) * 50;
  const overallScore = Math.max(5, Math.min(98, Math.round(rawScore)));

  let overallVerdict: SignalVerdict = 'NEUTRAL';
  let khmerVerdict = 'អព្យាក្រឹត (Neutral)';
  let englishVerdict = 'Neutral / Consolidation';

  if (overallScore >= 75) {
    overallVerdict = 'STRONG_BUY';
    khmerVerdict = 'ទិញខ្លាំងបំផុត (Strong Buy)';
    englishVerdict = 'Strong Institutional Buy';
  } else if (overallScore >= 58) {
    overallVerdict = 'BUY';
    khmerVerdict = 'សញ្ញាទិញឡើង (Bullish Buy)';
    englishVerdict = 'Bullish Accumulation';
  } else if (overallScore <= 25) {
    overallVerdict = 'STRONG_SELL';
    khmerVerdict = 'លក់ខ្លាំងបំផុត (Strong Sell)';
    englishVerdict = 'Strong Institutional Sell';
  } else if (overallScore <= 42) {
    overallVerdict = 'SELL';
    khmerVerdict = 'សញ្ញាលក់ចុះ (Bearish Sell)';
    englishVerdict = 'Bearish Distribution';
  }

  // ATR-calibrated precision trade setup
  const isLong = overallScore >= 50;
  const safeAtr = Math.max(atr14, price * 0.003);
  const stopDistance = safeAtr * 1.5;
  const tp1Distance = safeAtr * 2.1;
  const tp2Distance = safeAtr * 3.6;

  const stopLoss = isLong
    ? Number(Math.max(price * 0.1, price - stopDistance).toPrecision(7))
    : Number((price + stopDistance).toPrecision(7));
  const takeProfit1 = isLong
    ? Number((price + tp1Distance).toPrecision(7))
    : Number(Math.max(price * 0.1, price - tp1Distance).toPrecision(7));
  const takeProfit2 = isLong
    ? Number((price + tp2Distance).toPrecision(7))
    : Number(Math.max(price * 0.1, price - tp2Distance).toPrecision(7));

  const riskRewardRatio = Number((tp2Distance / Math.max(stopDistance, 1e-8)).toFixed(2));
  const confidencePct = Math.min(96, Math.max(54, Math.round(50 + Math.abs(overallScore - 50) * 0.9)));

  const rationaleKhmer = isLong
    ? `សូចនាករសុក្រិតចំនួន ${buyCount}/10 បង្ហាញសញ្ញាទិញឡើង (Buy Confluence) ដោយតម្លៃឈរ${price >= vwap ? 'លើខ្សែ VWAP' : 'ជិតតំបន់គាំទ្រ Pivot S1'} និងកម្រិតយោល ATR(14) = ${formatPrice(safeAtr, asset.symbol)}។`
    : `សូចនាករសុក្រិតចំនួន ${sellCount}/10 បង្ហាញសំពាធលក់ចុះ (Sell Confluence) ដោយតម្លៃស្ថិត${price < vwap ? 'ក្រោមខ្សែ VWAP' : 'ជិតតំបន់រាំងខ្ទប់ Pivot R1'} និងកម្រិតយោល ATR(14) = ${formatPrice(safeAtr, asset.symbol)}។`;

  return {
    symbol: asset.symbol,
    timeframe,
    currentPrice: price,
    overallScore,
    overallVerdict,
    confidencePct,
    khmerVerdict,
    englishVerdict,
    buyCount,
    neutralCount,
    sellCount,
    maSummary: {
      buy: maBuy,
      neutral: maNeutral,
      sell: maSell,
      label: maBuy > maSell ? 'ទិញ (Bullish MA)' : maSell > maBuy ? 'លក់ (Bearish MA)' : 'អព្យាក្រឹត',
    },
    oscSummary: {
      buy: oscBuy,
      neutral: oscNeutral,
      sell: oscSell,
      label: oscBuy > oscSell ? 'ទិញ (Bullish Osc)' : oscSell > oscBuy ? 'លក់ (Bearish Osc)' : 'អព្យាក្រឹត',
    },
    factors,
    atr14: Number(safeAtr.toPrecision(6)),
    atrPct: Number(atrPct.toFixed(2)),
    adx14: adxObj.adx,
    plusDI: adxObj.plusDI,
    minusDI: adxObj.minusDI,
    rsi14: Number(rsi14.toFixed(1)),
    stochRsi14: stochRsi,
    vwapValue: Number(vwap.toPrecision(7)),
    bbPercentB: Number(bbPercentB.toFixed(1)),
    buyVolumePct: Number(buyVolumePct.toFixed(1)),
    pivots,
    tradeSetup: {
      direction: isLong ? 'LONG' : 'SHORT',
      khmerDirection: isLong ? 'ទិញឡើង (LONG / BUY SETUP)' : 'លក់ចុះ (SHORT / SELL SETUP)',
      entryPrice: price,
      stopLoss,
      takeProfit1,
      takeProfit2,
      riskRewardRatio,
      confidencePct,
      rationaleKhmer,
    },
  };
}

// Global Financial Centers & Exchange Session Monitor
export interface GlobalMarketSession {
  id: string;
  cityKhmer: string;
  exchangeLabel: string;
  localTimeStr: string;
  isOpen: boolean;
  statusKhmer: string;
  liquidityNote: string;
}

export function getGlobalMarketSessions(now = new Date()): GlobalMarketSession[] {
  const utcDay = now.getUTCDay(); // 0 = Sun, 6 = Sat
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const isWeekday = utcDay >= 1 && utcDay <= 5;

  const fmtTime = (tz: string) =>
    now.toLocaleTimeString('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  // Phnom Penh CSX & Gold Market (08:00 - 17:00 ICT = 01:00 - 10:00 UTC)
  const ppOpen = isWeekday && utcHours >= 1 && utcHours < 10;
  // Tokyo TSE / TOCOM (09:00 - 15:30 JST = 00:00 - 06:30 UTC)
  const tokyoOpen = isWeekday && utcHours >= 0 && utcHours < 6.5;
  // London LBMA / LSE / ICE Brent (08:00 - 16:30 GMT/BST ≈ 07:30 - 16:30 UTC)
  const londonOpen = isWeekday && utcHours >= 7.5 && utcHours < 16.5;
  // New York NYSE / NASDAQ / COMEX / NYMEX (09:30 - 16:00 ET ≈ 13:30 - 20:30 UTC)
  const nyOpen = isWeekday && utcHours >= 13.5 && utcHours < 20.5;

  return [
    {
      id: 'new_york',
      cityKhmer: 'ញូវយ៉ក (New York)',
      exchangeLabel: 'NYSE / COMEX / NYMEX',
      localTimeStr: fmtTime('America/New_York'),
      isOpen: nyOpen,
      statusKhmer: nyOpen ? 'កំពុងបើកជួញដូរខ្លាំង' : 'បិទផ្សារមូលបត្រ (Futures 24/5)',
      liquidityNote: 'មាស COMEX, ប្រេង USOIL WTI, ភាគហ៊ុនអាមេរិក',
    },
    {
      id: 'london',
      cityKhmer: 'ឡុងដ៍ (London)',
      exchangeLabel: 'LBMA Gold / ICE Brent',
      localTimeStr: fmtTime('Europe/London'),
      isOpen: londonOpen,
      statusKhmer: londonOpen ? 'កំពុងបើកជួញដូរខ្លាំង' : 'ក្រៅម៉ោងផ្លូវការ',
      liquidityNote: 'មាសអន្តរជាតិ Spot XAU/USD & ប្រេងឆៅ UKOIL',
    },
    {
      id: 'tokyo',
      cityKhmer: 'តូក្យូ (Tokyo)',
      exchangeLabel: 'TSE / TOCOM',
      localTimeStr: fmtTime('Asia/Tokyo'),
      isOpen: tokyoOpen,
      statusKhmer: tokyoOpen ? 'កំពុងបើកជួញដូរ' : 'បិទវគ្គអាស៊ីបូព៌ា',
      liquidityNote: 'ទីផ្សារអាស៊ី និងលោហៈមានតម្លៃ TOCOM',
    },
    {
      id: 'phnom_penh',
      cityKhmer: 'ភ្នំពេញ (Phnom Penh)',
      exchangeLabel: 'CSX / ហាងឆេងមាសភ្នំពេញ',
      localTimeStr: fmtTime('Asia/Phnom_Penh'),
      isOpen: ppOpen,
      statusKhmer: ppOpen ? 'កំពុងបើកជួញដូរ' : 'ជួញដូរតាមហាងឆេងអន្តរជាតិ',
      liquidityNote: 'មាសគីឡូដំឡឹង GOLD-KH & ផ្សារមូលបត្រ CSX',
    },
  ];
}

export function generateOrderBook(price: number): {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
} {
  const step = price > 1000 ? price * 0.00035 : price > 10 ? price * 0.0006 : price * 0.0012;
  const asks: OrderBookEntry[] = [];
  const bids: OrderBookEntry[] = [];
  let askTotal = 0;
  let bidTotal = 0;

  for (let i = 1; i <= 8; i++) {
    const askPrice = price + step * i;
    const askSize = Number(((Math.sin(price + i * 3) + 1.4) * (price > 1000 ? 0.65 : 42)).toFixed(3));
    askTotal = Number((askTotal + askSize).toFixed(3));
    asks.push({ price: askPrice, size: askSize, total: askTotal });

    const bidPrice = Math.max(0.0001, price - step * i);
    const bidSize = Number(((Math.cos(price + i * 5) + 1.4) * (price > 1000 ? 0.65 : 42)).toFixed(3));
    bidTotal = Number((bidTotal + bidSize).toFixed(3));
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal });
  }

  return { asks: asks.reverse(), bids };
}

export function getTrendlinePriceAtTime(
  drawing: Pick<ChartDrawing, 't1' | 'p1' | 't2' | 'p2'>,
  targetTime: number
): number {
  const dt = drawing.t2 - drawing.t1;
  if (Math.abs(dt) < 1e-6) {
    return drawing.p2;
  }
  const slope = (drawing.p2 - drawing.p1) / dt;
  return drawing.p1 + slope * (targetTime - drawing.t1);
}

export function formatPrice(price: number, symbol?: string): string {
  if (symbol?.endsWith('CSX')) {
    return `${Math.round(price).toLocaleString()} ៛`;
  }
  if (price >= 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 10) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

// Web Audio API synthesizer for immediate volatility & price alert sound
export function playAlertTone(type: 'spike_up' | 'spike_down' | 'target' | 'win' = 'target') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const freqs =
      type === 'win'
        ? [523.25, 659.25, 783.99, 1046.5]
        : type === 'spike_up'
        ? [587.33, 880, 1174.66]
        : type === 'spike_down'
        ? [523.25, 392.0, 329.63]
        : [659.25, 987.77];

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.09);
      gain.gain.setValueAtTime(0.14, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.24);
    });
  } catch {
    // AudioContext blocked until user interaction
  }
}

// ============================================================================
// EXNESS WEBTRADING SYNCHRONIZATION ENGINE (https://my.exness.direct/webtrading/)
// ============================================================================

export type ExnessAccountType = 'standard_m' | 'standard_cent' | 'pro' | 'raw_spread' | 'zero';
export type ExnessLeverage = 200 | 500 | 1000 | 2000 | 0; // 0 = Unlimited Leverage (1:Unlimited)

export interface ExnessContractSpec {
  symbol: string;
  exnessSymbol: string;
  exnessGroup: string;
  contractSize: number; // Units per 1.00 Standard Lot on Exness (divided by 100 for Cent accounts)
  unitName: string;
  pipSize: number;
  pointSize: number;
  digits?: number;
  typicalSpreadPoints: Record<ExnessAccountType, number>;
  commissionPerLotUSD: Record<ExnessAccountType, number>; // Round-turn commission per 1.00 lot
  stopLevelPoints: number;
  swapLongPoints: number;
  swapShortPoints: number;
}

export interface ExnessLiveQuote {
  exnessSymbol: string;
  midPrice: number;
  bid: number;
  ask: number;
  spreadPrice: number;
  spreadPoints: number;
  spreadPips: number;
}

export interface ExnessOrderCalculation {
  exnessSymbol: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  contractUnits: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  requiredMarginUSD: number;
  requiredMarginCents: number;
  commissionUSD: number;
  commissionCents: number;
  tpDistancePoints: number;
  slDistancePoints: number;
  projectedProfitUSD: number;
  projectedLossUSD: number;
  projectedProfitCents: number;
  projectedLossCents: number;
  riskRewardRatio: number;
  pipValuePerLotUSD: number;
  pipValuePerLotCents: number;
  isCentAccount: boolean;
}

export function getExnessAccountSuffix(accountType: ExnessAccountType): string {
  switch (accountType) {
    case 'standard_m':
      return 'm';
    case 'standard_cent':
      return 'c';
    case 'zero':
      return 'z';
    case 'raw_spread':
    case 'pro':
    default:
      return '';
  }
}

export function normalizeToExnessBaseSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean === 'GOLDKH' || clean === 'XAUUSD') return 'XAUUSD';
  if (clean === 'XAGUSD') return 'XAGUSD';
  if (clean === 'BRENT' || clean === 'UKOIL') return 'UKOIL';
  if (clean === 'NGAS' || clean === 'XNGUSD') return 'XNGUSD';
  if (clean.endsWith('USDT')) return clean.replace(/USDT$/, 'USD');
  return clean;
}

export function getExnessContractSpec(
  symbol: string,
  accountType: ExnessAccountType = 'standard_cent'
): ExnessContractSpec {
  const suffix = getExnessAccountSuffix(accountType);
  const baseSymbol = normalizeToExnessBaseSymbol(symbol);
  const exnessSymbol = `${baseSymbol}${suffix}`;

  let spec: ExnessContractSpec;

  switch (baseSymbol) {
    case 'XAUUSD':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Metals (Spot Gold)',
        contractSize: 100, // 100 Troy Oz per 1.00 Lot (1 oz for Cent lot)
        unitName: 'Troy Oz',
        pipSize: 0.1,
        pointSize: 0.01,
        typicalSpreadPoints: {
          standard_m: 16, // $0.16 spread on XAUUSDm
          standard_cent: 16, // $0.16 spread on XAUUSDc
          pro: 11,        // $0.11 spread on XAUUSD Pro
          raw_spread: 4,  // $0.04 spread
          zero: 0,        // 0.00 spread
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 6.5,
          zero: 9.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: -34.2,
        swapShortPoints: 0.0, // Swap-free eligible on Exness Extended
      };
      break;
    case 'XAGUSD':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Metals (Spot Silver)',
        contractSize: 5000, // 5,000 Troy Oz per 1.00 Lot
        unitName: 'Troy Oz',
        pipSize: 0.01,
        pointSize: 0.001,
        typicalSpreadPoints: {
          standard_m: 22,
          standard_cent: 22,
          pro: 15,
          raw_spread: 6,
          zero: 1,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 7.0,
          zero: 10.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: -18.5,
        swapShortPoints: 0.0,
      };
      break;
    case 'USOIL':
    case 'UKOIL':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Energies (Spot Crude Oil)',
        contractSize: 1000, // 1,000 Barrels per 1.00 Lot on Exness
        unitName: 'Barrels',
        pipSize: 0.01,
        pointSize: 0.001,
        typicalSpreadPoints: {
          standard_m: 18, // $0.018 spread
          standard_cent: 18,
          pro: 12,        // $0.012 spread
          raw_spread: 5,
          zero: 1,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 7.0,
          zero: 9.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: -14.8,
        swapShortPoints: 0.0,
      };
      break;
    case 'XNGUSD':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Energies (Natural Gas)',
        contractSize: 10000, // 10,000 MMBtu per 1.00 Lot
        unitName: 'MMBtu',
        pipSize: 0.001,
        pointSize: 0.0001,
        typicalSpreadPoints: {
          standard_m: 35,
          standard_cent: 35,
          pro: 24,
          raw_spread: 12,
          zero: 4,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 7.0,
          zero: 9.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: -11.2,
        swapShortPoints: -4.5,
      };
      break;
    case 'BTCUSD':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Crypto CFD (24/7)',
        contractSize: 1, // 1 BTC per 1.00 Lot on Exness
        unitName: 'BTC',
        pipSize: 1.0,
        pointSize: 0.01,
        typicalSpreadPoints: {
          standard_m: 1800, // $18.00 spread on BTCUSDm
          standard_cent: 1800,
          pro: 1150,        // $11.50 spread
          raw_spread: 550,
          zero: 100,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 7.0,
          zero: 10.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: 0.0, // Swap-free on Exness Crypto
        swapShortPoints: 0.0,
      };
      break;
    case 'ETHUSD':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Crypto CFD (24/7)',
        contractSize: 1, // 1 ETH per 1.00 Lot
        unitName: 'ETH',
        pipSize: 0.1,
        pointSize: 0.01,
        typicalSpreadPoints: {
          standard_m: 140, // $1.40 spread
          standard_cent: 140,
          pro: 90,
          raw_spread: 45,
          zero: 10,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 4.0,
          zero: 6.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: 0.0,
        swapShortPoints: 0.0,
      };
      break;
    case 'SOLUSD':
    case 'BNBUSD':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Crypto CFD (24/7)',
        contractSize: 1,
        unitName: baseSymbol.replace('USD', ''),
        pipSize: 0.1,
        pointSize: 0.01,
        typicalSpreadPoints: {
          standard_m: 32,
          standard_cent: 32,
          pro: 20,
          raw_spread: 10,
          zero: 3,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 2.0,
          zero: 3.5,
        },
        stopLevelPoints: 0,
        swapLongPoints: 0.0,
        swapShortPoints: 0.0,
      };
      break;
    case 'XRPUSD':
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Crypto CFD (24/7)',
        contractSize: 100, // 100 XRP per 1.00 Lot
        unitName: 'XRP',
        pipSize: 0.001,
        pointSize: 0.0001,
        typicalSpreadPoints: {
          standard_m: 28,
          standard_cent: 28,
          pro: 18,
          raw_spread: 8,
          zero: 2,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 2.0,
          zero: 3.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: 0.0,
        swapShortPoints: 0.0,
      };
      break;
    default:
      // Stocks (NVDA, AAPL, TSLA, MSFT)
      spec = {
        symbol: baseSymbol,
        exnessSymbol,
        exnessGroup: 'Stocks CFD (NASDAQ)',
        contractSize: 100, // 100 Shares per 1.00 Lot on Exness
        unitName: 'Shares',
        pipSize: 0.1,
        pointSize: 0.01,
        typicalSpreadPoints: {
          standard_m: 14,
          standard_cent: 14,
          pro: 9,
          raw_spread: 4,
          zero: 1,
        },
        commissionPerLotUSD: {
          standard_m: 0,
          standard_cent: 0,
          pro: 0,
          raw_spread: 4.0,
          zero: 6.0,
        },
        stopLevelPoints: 0,
        swapLongPoints: -6.8,
        swapShortPoints: 0.0,
      };
      break;
  }

  // Exness Standard Cent Account (1 Cent Lot = 0.01 Standard Lot)
  if (accountType === 'standard_cent') {
    return {
      ...spec,
      contractSize: Math.max(0.01, Number((spec.contractSize / 100).toFixed(4))),
      unitName: `${spec.unitName} (Cent Lot)`,
    };
  }

  return spec;
}

export function calculateExnessBidAsk(
  symbol: string,
  midPrice: number,
  accountType: ExnessAccountType = 'standard_cent'
): ExnessLiveQuote {
  const spec = getExnessContractSpec(symbol, accountType);
  const spreadPoints = spec.typicalSpreadPoints[accountType];
  const spreadPrice = spreadPoints * spec.pointSize;
  const halfSpread = spreadPrice / 2;

  const decimals = spec.pointSize <= 0.0001 ? 4 : spec.pointSize <= 0.001 ? 3 : 2;
  const bid = Number((midPrice - halfSpread).toFixed(decimals));
  const ask = Number((midPrice + halfSpread).toFixed(decimals));
  const spreadPips = Number((spreadPrice / spec.pipSize).toFixed(1));

  return {
    exnessSymbol: spec.exnessSymbol,
    midPrice,
    bid,
    ask,
    spreadPrice: Number(spreadPrice.toFixed(decimals)),
    spreadPoints,
    spreadPips,
  };
}

export function calculateExnessOrderMetrics(params: {
  symbol: string;
  accountType: ExnessAccountType;
  leverage: ExnessLeverage;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
}): ExnessOrderCalculation {
  const { symbol, accountType, leverage, direction, lots, entryPrice, takeProfit, stopLoss } = params;
  const spec = getExnessContractSpec(symbol, accountType);
  const safeLots = Math.max(0.01, lots);
  const contractUnits = safeLots * spec.contractSize;
  const notionalValueUSD = contractUnits * entryPrice;

  // Exness Unlimited Leverage (0) uses minimal margin (~1:50000 effective), otherwise notional / leverage
  const requiredMarginUSD =
    leverage === 0 ? Number((notionalValueUSD / 50000).toFixed(2)) : Number((notionalValueUSD / leverage).toFixed(2));

  const commissionUSD = Number((safeLots * spec.commissionPerLotUSD[accountType]).toFixed(2));

  const rawTpDiff = direction === 'BUY' ? takeProfit - entryPrice : entryPrice - takeProfit;
  const rawSlDiff = direction === 'BUY' ? entryPrice - stopLoss : stopLoss - entryPrice;

  const tpDistancePoints = Math.max(0, Math.round(Math.abs(rawTpDiff) / spec.pointSize));
  const slDistancePoints = Math.max(0, Math.round(Math.abs(rawSlDiff) / spec.pointSize));

  const grossProfitUSD = rawTpDiff * contractUnits;
  const grossLossUSD = Math.abs(rawSlDiff) * contractUnits;

  const projectedProfitUSD = Number((grossProfitUSD - commissionUSD).toFixed(2));
  const projectedLossUSD = Number((grossLossUSD + commissionUSD).toFixed(2));

  const riskRewardRatio =
    projectedLossUSD > 0 ? Number((Math.max(0, projectedProfitUSD) / projectedLossUSD).toFixed(2)) : 0;

  const pipValuePerLotUSD = Number((spec.contractSize * spec.pipSize).toFixed(2));

  // Cent currency calculations (1 USD = 100 USC Cents)
  const isCentAccount = accountType === 'standard_cent';
  const requiredMarginCents = Number((requiredMarginUSD * 100).toFixed(2));
  const commissionCents = Number((commissionUSD * 100).toFixed(2));
  const projectedProfitCents = Number((projectedProfitUSD * 100).toFixed(2));
  const projectedLossCents = Number((projectedLossUSD * 100).toFixed(2));
  const pipValuePerLotCents = Number((pipValuePerLotUSD * 100).toFixed(2));

  return {
    exnessSymbol: spec.exnessSymbol,
    direction,
    lots: safeLots,
    contractUnits,
    entryPrice,
    takeProfit,
    stopLoss,
    requiredMarginUSD,
    requiredMarginCents,
    commissionUSD,
    commissionCents,
    tpDistancePoints,
    slDistancePoints,
    projectedProfitUSD,
    projectedLossUSD,
    projectedProfitCents,
    projectedLossCents,
    riskRewardRatio,
    pipValuePerLotUSD,
    pipValuePerLotCents,
    isCentAccount,
  };
}

/**
 * Calculates exact Take Profit and Stop Loss prices based on target money amounts in USD / USC.
 * 1 USD = 100 USC Cents.
 */
export function calculatePricesFromMoneyTargets(params: {
  symbol: string;
  accountType: ExnessAccountType;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  targetProfitUSD?: number;
  maxLossUSD?: number;
}): { takeProfit: number; stopLoss: number } {
  const spec = getExnessContractSpec(params.symbol, params.accountType);
  const safeLots = Math.max(0.01, params.lots);
  const contractUnits = safeLots * spec.contractSize;
  const commission = safeLots * spec.commissionPerLotUSD[params.accountType];
  const digits = spec.digits ?? (params.symbol.includes('JPY') ? 3 : params.symbol.includes('XAU') ? 2 : 5);

  let takeProfit = 0;
  let stopLoss = 0;

  if (params.targetProfitUSD && params.targetProfitUSD > 0 && contractUnits > 0) {
    const tpPriceDiff = (params.targetProfitUSD + commission) / contractUnits;
    if (params.direction === 'BUY') {
      takeProfit = Number((params.entryPrice + tpPriceDiff).toFixed(digits));
    } else {
      takeProfit = Number(Math.max(params.entryPrice * 0.05, params.entryPrice - tpPriceDiff).toFixed(digits));
    }
  }

  if (params.maxLossUSD && params.maxLossUSD > 0 && contractUnits > 0) {
    const slPriceDiff = Math.max(0, (params.maxLossUSD - commission) / contractUnits);
    if (params.direction === 'BUY') {
      stopLoss = Number(Math.max(params.entryPrice * 0.05, params.entryPrice - slPriceDiff).toFixed(digits));
    } else {
      stopLoss = Number((params.entryPrice + slPriceDiff).toFixed(digits));
    }
  }

  return { takeProfit, stopLoss };
}

export type MT5OrderType = 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';

export interface MT5AccountSession {
  connected: boolean;
  login: string;
  server: string;
  broker: string;
  accessMode: 'master' | 'investor';
  connectionMode: 'EXNESS_MT5_REAL' | 'EXNESS_MT5_TRIAL' | 'METAAPI_CLOUD_LIVE';
  accountType: ExnessAccountType;
  leverage: ExnessLeverage;
  balance: number;
  currency: string;
  pingMs: number;
  connectedAt: string;
  metaApiToken?: string;
  metaApiAccountId?: string;
}

export const EXNESS_MT5_SERVERS: {
  id: string;
  group: 'Real' | 'Trial (Demo)';
  region: string;
}[] = [
  { id: 'Exness-MT5Real', group: 'Real', region: 'Global Main #1' },
  { id: 'Exness-MT5Real2', group: 'Real', region: 'Global #2' },
  { id: 'Exness-MT5Real3', group: 'Real', region: 'Global #3' },
  { id: 'Exness-MT5Real4', group: 'Real', region: 'Asia / Singapore #4' },
  { id: 'Exness-MT5Real5', group: 'Real', region: 'Asia / Singapore #5' },
  { id: 'Exness-MT5Real6', group: 'Real', region: 'Asia / Hong Kong #6' },
  { id: 'Exness-MT5Real7', group: 'Real', region: 'Asia / Singapore #7' },
  { id: 'Exness-MT5Real8', group: 'Real', region: 'Asia / Cambodia-SEA #8' },
  { id: 'Exness-MT5Real9', group: 'Real', region: 'Asia / SEA #9' },
  { id: 'Exness-MT5Real10', group: 'Real', region: 'Asia / SEA #10' },
  { id: 'Exness-MT5Real11', group: 'Real', region: 'Global #11' },
  { id: 'Exness-MT5Real12', group: 'Real', region: 'Global #12' },
  { id: 'Exness-MT5Real14', group: 'Real', region: 'Asia / SEA #14' },
  { id: 'Exness-MT5Real15', group: 'Real', region: 'Asia / SEA #15' },
  { id: 'Exness-MT5Real17', group: 'Real', region: 'Europe / Amsterdam #17' },
  { id: 'Exness-MT5Real19', group: 'Real', region: 'Asia / Singapore #19' },
  { id: 'Exness-MT5Real20', group: 'Real', region: 'Asia / Singapore #20' },
  { id: 'Exness-MT5Real21', group: 'Real', region: 'Asia / SEA #21' },
  { id: 'Exness-MT5Real22', group: 'Real', region: 'Asia / SEA #22' },
  { id: 'Exness-MT5Real24', group: 'Real', region: 'Asia / SEA #24' },
  { id: 'Exness-MT5Real25', group: 'Real', region: 'Asia / SEA #25' },
  { id: 'Exness-MT5Real26', group: 'Real', region: 'Asia / SEA #26' },
  { id: 'Exness-MT5Real28', group: 'Real', region: 'Asia / SEA #28' },
  { id: 'Exness-MT5Real30', group: 'Real', region: 'Asia / SEA #30' },
  { id: 'Exness-MT5Real32', group: 'Real', region: 'Asia / SEA #32' },
  { id: 'Exness-MT5Real35', group: 'Real', region: 'Asia / SEA #35' },
  { id: 'Exness-MT5Real38', group: 'Real', region: 'Asia / SEA #38' },
  { id: 'Exness-MT5Trial', group: 'Trial (Demo)', region: 'Demo Main #1' },
  { id: 'Exness-MT5Trial2', group: 'Trial (Demo)', region: 'Demo #2' },
  { id: 'Exness-MT5Trial3', group: 'Trial (Demo)', region: 'Demo #3' },
  { id: 'Exness-MT5Trial4', group: 'Trial (Demo)', region: 'Demo Asia #4' },
  { id: 'Exness-MT5Trial5', group: 'Trial (Demo)', region: 'Demo Asia #5' },
  { id: 'Exness-MT5Trial6', group: 'Trial (Demo)', region: 'Demo Asia #6' },
  { id: 'Exness-MT5Trial7', group: 'Trial (Demo)', region: 'Demo Asia #7' },
  { id: 'Exness-MT5Trial8', group: 'Trial (Demo)', region: 'Demo SEA #8' },
  { id: 'Exness-MT5Trial9', group: 'Trial (Demo)', region: 'Demo SEA #9' },
  { id: 'Exness-MT5Trial10', group: 'Trial (Demo)', region: 'Demo SEA #10' },
  { id: 'Exness-MT5Trial11', group: 'Trial (Demo)', region: 'Demo #11' },
  { id: 'Exness-MT5Trial12', group: 'Trial (Demo)', region: 'Demo #12' },
  { id: 'Exness-MT5Trial14', group: 'Trial (Demo)', region: 'Demo SEA #14' },
  { id: 'Exness-MT5Trial15', group: 'Trial (Demo)', region: 'Demo SEA #15' },
  { id: 'Exness-MT5Trial18', group: 'Trial (Demo)', region: 'Demo SEA #18' },
];

export function generateMql5BridgeScript(appOrigin: string, loginId: string): string {
  return `//+------------------------------------------------------------------+
//|                                   KramaView_Exness_MT5_Bridge.mq5|
//|         Real-Time Exness MetaTrader 5 <-> KramaView Pro Sync EA  |
//+------------------------------------------------------------------+
#property copyright "KramaView Pro"
#property version   "2.00"
#property strict

input string InpWebhookUrl = "${appOrigin}/api/mt5/ea-sync"; // KramaView Pro Bridge URL
input int    InpSyncSec    = 2;                              // Sync Interval (Seconds)

int OnInit()
  {
   EventSetTimer(InpSyncSec);
   SyncAccountState();
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason) { EventKillTimer(); }
void OnTimer()                  { SyncAccountState(); }
void OnTick()                   { SyncAccountState(); }

void SyncAccountState()
  {
   long   login    = AccountInfoInteger(ACCOUNT_LOGIN);
   string server   = AccountInfoString(ACCOUNT_SERVER);
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
   long   leverage = AccountInfoInteger(ACCOUNT_LEVERAGE);
   string currency = AccountInfoString(ACCOUNT_CURRENCY);

   string payload = StringFormat(
     "{\\"login\\":\\"%I64d\\",\\"server\\":\\"%s\\",\\"balance\\":%.2f,\\"equity\\":%.2f,\\"leverage\\":%I64d,\\"currency\\":\\"%s\\"}",
     login > 0 ? login : ${loginId || '148592031'}, server, balance, equity, leverage, currency
   );

   char data[], result[];
   string headers = "Content-Type: application/json\\r\\n";
   string resHeaders;
   StringToCharArray(payload, data, 0, StringLen(payload));
   WebRequest("POST", InpWebhookUrl, headers, 2000, data, result, resHeaders);
  }
//+------------------------------------------------------------------+`;
}

// ============================================================================
// SINGLE-CANDLE VIOLENT SPIKE ENGINE (ម៉ាស៊ីនចាប់បង្គោលខ្លាំង Buy/Sell ភ្លាមៗ)
// ============================================================================

export interface CandleSpikeInfo {
  isSpike: boolean;
  direction: 'BUY' | 'SELL' | null;
  spikeRatio: number; // Ratio of current candle's range vs historical 14-period average range
  bodyRatio: number; // Percentage of the candle range that is solid body (0 to 1)
  changePct: number; // Percentage price movement in this single candle
  priceMove: number; // Price difference (close - open)
  candleRange: number;
  avgRange: number;
  currentPrice: number;
  candleTime: number;
  sensitivityLabel: 'SENSITIVE' | 'STANDARD' | 'EXTREME';
  verdictKhmer: string;
  verdictEnglish: string;
  suggestedTp: number;
  suggestedSl: number;
  strengthScore: number; // 0 to 100
}

/**
 * Detects whether the latest candle is a violent single-candle breakout/spike ("មួយបង្គោលខ្លាំង").
 * Immediately determines if it's a Bullish Surge (Buy) or Bearish Dump (Sell).
 */
export function detectCandleSpike(
  candles: Candle[],
  options?: {
    sensitivityMultiplier?: number; // e.g. 1.8 (sensitive), 2.2 (standard), 3.0 (extreme)
    minChangePct?: number;
    assetClass?: string;
  }
): CandleSpikeInfo {
  if (!candles || candles.length < 5) {
    return {
      isSpike: false,
      direction: null,
      spikeRatio: 1,
      bodyRatio: 0,
      changePct: 0,
      priceMove: 0,
      candleRange: 0,
      avgRange: 0,
      currentPrice: 0,
      candleTime: 0,
      sensitivityLabel: 'STANDARD',
      verdictKhmer: 'ធម្មតា (គ្មានបង្គោលខ្លាំង)',
      verdictEnglish: 'Normal (No Spike)',
      suggestedTp: 0,
      suggestedSl: 0,
      strengthScore: 0,
    };
  }

  const multiplier = options?.sensitivityMultiplier ?? 2.0;
  const lastIdx = candles.length - 1;
  const cur = candles[lastIdx];
  const curRange = Math.max(0.000001, cur.high - cur.low);
  const curBody = Math.abs(cur.close - cur.open);
  const bodyRatio = curRange > 0 ? curBody / curRange : 0;
  const changePct = cur.open > 0 ? ((cur.close - cur.open) / cur.open) * 100 : 0;
  const priceMove = cur.close - cur.open;

  // Calculate average range of preceding 14 bars (excluding the current forming spike candle)
  const lookback = Math.min(14, candles.length - 1);
  const prevSlice = candles.slice(Math.max(0, lastIdx - lookback), lastIdx);
  const sumRange = prevSlice.reduce((acc, c) => acc + (c.high - c.low), 0);
  const avgRange = Math.max(0.000001, sumRange / (prevSlice.length || 1));

  const spikeRatio = curRange / avgRange;

  // Determine dynamic min percentage threshold based on asset class
  const isCrypto = options?.assetClass === 'crypto';
  const defaultMinPct = isCrypto ? 0.65 : 0.12;
  const minChangePct = options?.minChangePct ?? defaultMinPct;

  // A spike requires:
  // 1. Current candle range >= avgRange * multiplier OR single-candle price change >= minChangePct
  // 2. Strong body ratio (at least 50% of total range is solid body, not a long-wick spinning top/doji)
  const isRangeSpike = spikeRatio >= multiplier;
  const isPctSpike = Math.abs(changePct) >= minChangePct;
  const hasSolidBody = bodyRatio >= 0.5;

  const isSpike = (isRangeSpike || isPctSpike) && hasSolidBody;

  let direction: 'BUY' | 'SELL' | null = null;
  let verdictKhmer = 'ធម្មតា (គ្មានបង្គោលខ្លាំង)';
  let verdictEnglish = 'Normal (No Spike)';
  let suggestedTp = 0;
  let suggestedSl = 0;

  if (isSpike) {
    if (cur.close > cur.open) {
      // Bullish Spike (ឡើង មួយបង្គោលខ្លាំង)
      direction = 'BUY';
      verdictKhmer = `ឡើងមួយបង្គោលខ្លាំង (+${Math.abs(changePct).toFixed(2)}%) ➔ BUY ភ្លាមៗ`;
      verdictEnglish = `Bullish Spike (+${Math.abs(changePct).toFixed(2)}%) ➔ INSTANT BUY`;
      // Stop Loss just below the spike candle base (low - buffer)
      suggestedSl = Number((cur.low - curRange * 0.18).toFixed(5));
      // Take Profit with 1.6x expansion
      suggestedTp = Number((cur.close + curRange * 1.6).toFixed(5));
    } else if (cur.close < cur.open) {
      // Bearish Spike (ចុះ មួយបង្គោលខ្លាំង)
      direction = 'SELL';
      verdictKhmer = `ចុះមួយបង្គោលខ្លាំង (-${Math.abs(changePct).toFixed(2)}%) ➔ SELL ភ្លាមៗ`;
      verdictEnglish = `Bearish Spike (-${Math.abs(changePct).toFixed(2)}%) ➔ INSTANT SELL`;
      // Stop Loss just above the spike candle peak (high + buffer)
      suggestedSl = Number((cur.high + curRange * 0.18).toFixed(5));
      // Take Profit with 1.6x downward expansion
      suggestedTp = Number((cur.close - curRange * 1.6).toFixed(5));
    }
  }

  const strengthScore = Math.min(100, Math.round((spikeRatio / 3.0) * 80 + bodyRatio * 20));

  let sensitivityLabel: 'SENSITIVE' | 'STANDARD' | 'EXTREME' = 'STANDARD';
  if (multiplier <= 1.8) sensitivityLabel = 'SENSITIVE';
  else if (multiplier >= 2.8) sensitivityLabel = 'EXTREME';

  return {
    isSpike,
    direction,
    spikeRatio: Number(spikeRatio.toFixed(2)),
    bodyRatio: Number(bodyRatio.toFixed(2)),
    changePct: Number(changePct.toFixed(3)),
    priceMove,
    candleRange: curRange,
    avgRange,
    currentPrice: cur.close,
    candleTime: cur.time,
    sensitivityLabel,
    verdictKhmer,
    verdictEnglish,
    suggestedTp,
    suggestedSl,
    strengthScore,
  };
}



