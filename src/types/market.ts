export type AssetClass = 'crypto' | 'stock' | 'gold';

export type Timeframe =
  | '1s'
  | '5s'
  | '15s'
  | '30s'
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1H'
  | '4H'
  | '1D'
  | '1W'
  | '1M'
  | '3M'
  | '6M'
  | '1Y';

export type ChartType = 'candles' | 'hollow' | 'heikin' | 'area' | 'line';

export type IndicatorId =
  | 'EMA20'
  | 'EMA50'
  | 'SMA200'
  | 'BB'
  | 'VWAP'
  | 'VP'
  | 'AI_SIGNALS'
  | 'VOLUME'
  | 'RSI'
  | 'MACD';

export type DrawingToolId =
  | 'cursor'
  | 'risk_reward'
  | 'trendline'
  | 'horizontal'
  | 'fib'
  | 'channel'
  | 'rect'
  | 'long_pos'
  | 'short_pos'
  | 'measure'
  | 'text';

export interface MarketAsset {
  symbol: string;
  binanceSymbol?: string;
  name: string;
  khmerName: string;
  assetClass: AssetClass;
  subCategory?: 'gold' | 'energy';
  exchange: string;
  unitLabel?: string;
  basePrice: number;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  volatility1m: number;
}

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDrawing {
  id: string;
  tool: Exclude<DrawingToolId, 'cursor'>;
  t1: number; // candle time 1
  p1: number; // price 1
  t2: number; // candle time 2
  p2: number; // price 2
  p3?: number; // stop loss or channel width price
  color: string;
  label?: string;
  hasAlert?: boolean;
}

export interface SavedAnalysisRecord {
  id: string;
  ownerId: string;
  title: string;
  symbol: string;
  assetClass: AssetClass;
  timeframe: Timeframe;
  chartType: ChartType;
  savedPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  notes: string;
  indicators: IndicatorId[];
  drawings: ChartDrawing[];
  createdAtMs: number;
  updatedAtMs: number;
}

export type AlertCondition =
  | 'price_above'
  | 'price_below'
  | 'pct_spike_up'
  | 'pct_drop_down'
  | 'volatility_burst'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'rsi_channel_breakout'
  | 'trendline_touch';

export interface PriceAlertRecord {
  id: string;
  ownerId: string;
  symbol: string;
  assetClass: AssetClass;
  condition: AlertCondition;
  threshold: number;
  status: 'active' | 'paused' | 'triggered';
  notifyTelegram: boolean;
  notifyEmail: boolean;
  note: string;
  triggerCount: number;
  drawingId?: string;
  t1?: number;
  p1?: number;
  t2?: number;
  p2?: number;
  rsiLowerBound?: number;
  rsiUpperBound?: number;
  rsiBreakoutDirection?: 'above' | 'below' | 'both';
  rsiTriggerColor?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AlertLogRecord {
  id: string;
  ownerId: string;
  alertId: string;
  symbol: string;
  conditionLabel: string;
  triggerPrice: number;
  changePercent: number;
  deliveryChannels: string;
  deliveryStatus: 'delivered' | 'in_app_only' | 'failed';
  reviewed: boolean;
  reviewNote: string;
  emailPreviewUrl?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface NotificationConfigRecord {
  ownerId: string;
  emailEnabled: boolean;
  recipientEmail: string;
  emailWebhookUrl: string;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  soundEnabled: boolean;
  autoSpikeThresholdPct: number;
}

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export type FearGreedClassification =
  | 'Extreme Fear'
  | 'Fear'
  | 'Neutral'
  | 'Greed'
  | 'Extreme Greed';

export interface MajorCryptoSentiment {
  symbol: string; // e.g. BTC/USDT
  rawSymbol: string; // BTC
  binanceSymbol: string; // BTCUSDT
  name: string;
  khmerName: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  score: number; // 0 - 100
  classification: FearGreedClassification;
  khmerClassification: string;
  momentum: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  biasLabelKh: string;
  colorClass: string;
  strokeHex: string;
}

export interface CryptoFearGreedHistoryItem {
  timestamp: number;
  dateStr: string;
  score: number;
  classification: FearGreedClassification;
}

export interface CryptoFearGreedData {
  currentScore: number;
  currentClassification: FearGreedClassification;
  khmerClassification: string;
  timestamp: number;
  timeUntilUpdateSeconds?: number;
  historical: {
    yesterday: { score: number; classification: FearGreedClassification };
    lastWeek: { score: number; classification: FearGreedClassification };
    lastMonth: { score: number; classification: FearGreedClassification };
  };
  dailyTrend: CryptoFearGreedHistoryItem[];
  majorCryptos: MajorCryptoSentiment[];
  lastUpdatedMs: number;
}

