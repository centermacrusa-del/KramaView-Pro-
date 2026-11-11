/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  BLUEPRINT_LIMITS,
  sanitizeId,
  sanitizeString,
  sanitizeSymbol,
} from './firebase';
import {
  AlertCondition,
  AlertLogRecord,
  AssetClass,
  Candle,
  ChartDrawing,
  ChartType,
  DrawingToolId,
  IndicatorId,
  MarketAsset,
  NotificationConfigRecord,
  PriceAlertRecord,
  SavedAnalysisRecord,
  Timeframe,
} from './types/market';
import {
  GOLD_CONVERSION,
  INITIAL_ASSETS,
  TIMEFRAME_METADATA,
  ExnessAccountType,
  ExnessLeverage,
  MT5AccountSession,
  calculateEMA,
  calculateExnessBidAsk,
  calculateGlobalPrecisionAnalysis,
  calculateRSI,
  calculateVWAP,
  formatPrice,
  generateHistoricalCandles,
  generateOrderBook,
  getExnessContractSpec,
  getIntervalSeconds,
  getTrendlinePriceAtTime,
  mapTimeframeToBinance,
  playAlertTone,
} from './services/marketEngine';
import { TradingChartCanvas } from './components/TradingChartCanvas';
import { SaveReviewPanel } from './components/SaveReviewPanel';
import { AlertsAndChannelsPanel, CONDITION_LABELS } from './components/AlertsAndChannelsPanel';
import { SmartGoldIntelligenceBar } from './components/SmartGoldIntelligenceBar';
import { MarketSentimentWidget } from './components/MarketSentimentWidget';
import { CryptoFearAndGreedWidget } from './components/CryptoFearAndGreedWidget';
import { GlobalPrecisionAnalysisPanel } from './components/GlobalPrecisionAnalysisPanel';
import {
  ExnessWebTradingPanel,
  ExnessSyncedPosition,
  ExnessClosedDeal,
} from './components/ExnessWebTradingPanel';
import { DEFAULT_EXNESS_CLOSED_DEALS } from './services/historyExportService';
import { QuickLiveTradingBar } from './components/QuickLiveTradingBar';
import { ActivePositionsBottomBar } from './components/ActivePositionsBottomBar';
import { RealBrokerTradingModal } from './components/RealBrokerTradingModal';
import { SmartAutoTradingBotPanel } from './components/SmartAutoTradingBotPanel';
import { AssetBadgeIcon } from './components/AssetBadgeIcon';
import {
  PositionCloseReason,
  SmartExitSettings,
  DEFAULT_SMART_EXIT_SETTINGS,
  evaluateSmartExit,
} from './services/smartExitBrain';
import {
  Language,
  SUPPORTED_LANGUAGES,
  t,
} from './services/i18n';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Bell,
  Bookmark,
  Bot,
  Columns2,
  Download,
  ExternalLink,
  Gauge,
  Globe,
  Layers,
  Minus,
  Moon,
  MousePointer,
  Pause,
  PenTool,
  Percent,
  Play,
  Ruler,
  Scale,
  Search,
  ShieldCheck,
  Square,
  Sun,
  TrendingDown,
  TrendingUp,
  Type,
  X,
  Zap,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

const TIMEFRAMES: Timeframe[] = [
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

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'candles', label: 'ទៀន (Candles)' },
  { id: 'hollow', label: 'ទៀនប្រហោង (Hollow)' },
  { id: 'heikin', label: 'Heikin Ashi' },
  { id: 'area', label: 'ផ្ទៃ (Area)' },
  { id: 'line', label: 'ខ្សែបន្ទាត់ (Line)' },
];

const INDICATORS_LIST: { id: IndicatorId; label: string; group: 'overlay' | 'oscillator' }[] = [
  { id: 'EMA20', label: 'EMA 20', group: 'overlay' },
  { id: 'EMA50', label: 'EMA 50', group: 'overlay' },
  { id: 'SMA200', label: 'SMA 200', group: 'overlay' },
  { id: 'BB', label: 'Bollinger Bands', group: 'overlay' },
  { id: 'VWAP', label: 'VWAP', group: 'overlay' },
  { id: 'VP', label: 'Volume Profile (VP)', group: 'overlay' },
  { id: 'AI_SIGNALS', label: '⚡ សញ្ញាទិញ/លក់ AI (Buy/Sell Signals)', group: 'overlay' },
  { id: 'VOLUME', label: 'Volume', group: 'oscillator' },
  { id: 'RSI', label: 'RSI 14', group: 'oscillator' },
  { id: 'MACD', label: 'MACD', group: 'oscillator' },
];

const DRAWING_TOOLS: {
  id: DrawingToolId;
  label: string;
  khmerDesc: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'cursor', label: 'Pointer', khmerDesc: 'រំកិលក្រាហ្វ / ជ្រើសរើស', icon: MousePointer },
  { id: 'risk_reward', label: 'Risk/Reward Ratio', khmerDesc: 'គណនាផលធៀប Risk/Reward (TP/SL)', icon: Scale },
  { id: 'trendline', label: 'Trendline', khmerDesc: 'ខ្សែនិន្នាការ (Trendline)', icon: PenTool },
  { id: 'horizontal', label: 'Horizontal S/R', khmerDesc: 'ខ្សែគាំទ្រ / រាំងខ្ទប់ (S/R Ray)', icon: Minus },
  { id: 'fib', label: 'Fibonacci', khmerDesc: 'កម្រិត Fibonacci Retracement', icon: Percent },
  { id: 'channel', label: 'Parallel Channel', khmerDesc: 'បណ្តាញស្រប (Parallel Channel)', icon: Layers },
  { id: 'rect', label: 'Supply/Demand Zone', khmerDesc: 'ប្រអប់តំបន់ទិញ/លក់ (Zone)', icon: Square },
  { id: 'long_pos', label: 'Long Risk/Reward', khmerDesc: 'គណនាហានិភ័យទិញឡើង (Long R:R)', icon: TrendingUp },
  { id: 'short_pos', label: 'Short Risk/Reward', khmerDesc: 'គណនាហានិភ័យលក់ចុះ (Short R:R)', icon: TrendingDown },
  { id: 'measure', label: 'Price Ruler', khmerDesc: 'វាស់ភាគរយ និងតម្លៃ (Measure)', icon: Ruler },
  { id: 'text', label: 'Text Note', khmerDesc: 'សរសេរចំណាំលើក្រាហ្វ (Text)', icon: Type },
];

const DEFAULT_SAVED_ANALYSES: SavedAnalysisRecord[] = [
  {
    id: 'sample_gold_xau_setup',
    ownerId: 'local_guest',
    title: 'XAU/USD & ហាងឆេងមាសដំឡឹង — តំបន់គាំទ្រសំខាន់ $2,670',
    symbol: 'XAU/USD',
    assetClass: 'gold',
    timeframe: '15m',
    chartType: 'candles',
    savedPrice: 2684.5,
    targetPrice: 2735.0,
    stopLossPrice: 2658.0,
    direction: 'bullish',
    notes: 'មាសអន្តរជាតិ (Spot Gold) កំពុងឈរលើខ្សែ EMA 50 យ៉ាងរឹងមាំ ស្មើនឹងប្រហែល $3,236 ក្នុង ១ ដំឡឹង។ តាមដានការបំបែកកម្រិត $2,700/oz។',
    indicators: ['EMA20', 'EMA50', 'BB', 'RSI'],
    drawings: [
      {
        id: 'gold_rr_setup',
        tool: 'risk_reward',
        t1: Math.floor(Date.now() / 1000) - 3600 * 4,
        p1: 2684.5,
        t2: Math.floor(Date.now() / 1000) + 3600 * 6,
        p2: 2735.0,
        p3: 2658.0,
        color: '#10B981',
        label: 'R:R 1:1.91',
      },
    ],
    createdAtMs: Date.now() - 3600 * 1000 * 2,
    updatedAtMs: Date.now() - 3600 * 1000 * 2,
  },
  {
    id: 'sample_usoil_wti_setup',
    ownerId: 'local_guest',
    title: 'USOIL (WTI Crude) — តំបន់គាំទ្រសំខាន់ $68.50 & Brent Spread',
    symbol: 'USOIL',
    assetClass: 'gold',
    timeframe: '15m',
    chartType: 'candles',
    savedPrice: 69.85,
    targetPrice: 72.4,
    stopLossPrice: 68.2,
    direction: 'bullish',
    notes: 'ប្រេងឆៅអាមេរិក (USOIL / WTI) កំពុងបង្កើតមូលដ្ឋានគាំទ្រលើខ្សែ EMA 50 ជាមួយគម្លាត Brent-WTI Spread ~$3.80/bbl។ តាមដានរបាយការណ៍ស្តុកប្រេង EIA។',
    indicators: ['EMA20', 'EMA50', 'BB', 'RSI'],
    drawings: [],
    createdAtMs: Date.now() - 3600 * 1000 * 3,
    updatedAtMs: Date.now() - 3600 * 1000 * 3,
  },
  {
    id: 'sample_btc_breakout',
    ownerId: 'local_guest',
    title: 'BTC/USDT តំបន់គាំទ្រសំខាន់ & Fibonacci 0.618',
    symbol: 'BTC/USDT',
    assetClass: 'crypto',
    timeframe: '15m',
    chartType: 'candles',
    savedPrice: 89850,
    targetPrice: 94200,
    stopLossPrice: 88100,
    direction: 'bullish',
    notes: 'តម្លៃបានប៉ះខ្សែ EMA 50 និងកម្រិត Fibonacci 0.618 ដោយមានកម្លាំងទិញខ្លាំង។ រក្សាទុកដើម្បីពិនិត្យមើលការបំបែក (Breakout)។',
    indicators: ['EMA20', 'EMA50', 'BB', 'RSI'],
    drawings: [],
    createdAtMs: Date.now() - 3600 * 1000 * 5,
    updatedAtMs: Date.now() - 3600 * 1000 * 5,
  },
  {
    id: 'sample_nvda_channel',
    ownerId: 'local_guest',
    title: 'NVDA ការវិភាគបណ្តាញឡើងថ្លៃ (Parallel Channel)',
    symbol: 'NVDA',
    assetClass: 'stock',
    timeframe: '1H',
    chartType: 'candles',
    savedPrice: 139.2,
    targetPrice: 148.5,
    stopLossPrice: 135.8,
    direction: 'bullish',
    notes: 'ភាគហ៊ុនបច្ចេកវិទ្យា AI កំពុងបន្តនិន្នាការឡើងលើខ្សែ VWAP។ តាមដានរបាយការណ៍ប្រាក់ចំណូល។',
    indicators: ['EMA20', 'VWAP', 'MACD'],
    drawings: [],
    createdAtMs: Date.now() - 3600 * 1000 * 18,
    updatedAtMs: Date.now() - 3600 * 1000 * 18,
  },
];

export default function App() {
  // Theme State ('dark' | 'light') synced with <html> .dark class and system preference detection
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('kv_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    // Automatically detect user's system color scheme preference
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('kv_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Market & Chart State
  const [assets, setAssets] = useState<MarketAsset[]>(INITIAL_ASSETS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('XAU/USD');
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('kv_language');
      return saved === 'en' ? 'en' : 'km';
    } catch {
      return 'km';
    }
  });
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('kv_language', language);
    } catch {
      // ignore
    }
    document.documentElement.lang = language;
  }, [language]);

  const localizedDrawingTools = useMemo(() => [
    { id: 'cursor' as const, label: t('tool.cursor', language), khmerDesc: t('tool.cursorDesc', language), icon: MousePointer },
    { id: 'risk_reward' as const, label: t('tool.riskReward', language), khmerDesc: t('tool.riskRewardDesc', language), icon: Scale },
    { id: 'trendline' as const, label: t('tool.trendline', language), khmerDesc: t('tool.trendlineDesc', language), icon: PenTool },
    { id: 'horizontal' as const, label: t('tool.horizontal', language), khmerDesc: t('tool.horizontalDesc', language), icon: Minus },
    { id: 'fib' as const, label: t('tool.fib', language), khmerDesc: t('tool.fibDesc', language), icon: Percent },
    { id: 'channel' as const, label: t('tool.channel', language), khmerDesc: t('tool.channelDesc', language), icon: Layers },
    { id: 'rect' as const, label: t('tool.rect', language), khmerDesc: t('tool.rectDesc', language), icon: Square },
    { id: 'long_pos' as const, label: t('tool.longPos', language), khmerDesc: t('tool.longPosDesc', language), icon: TrendingUp },
    { id: 'short_pos' as const, label: t('tool.shortPos', language), khmerDesc: t('tool.shortPosDesc', language), icon: TrendingDown },
    { id: 'measure' as const, label: t('tool.measure', language), khmerDesc: t('tool.measureDesc', language), icon: Ruler },
    { id: 'text' as const, label: t('tool.text', language), khmerDesc: t('tool.textDesc', language), icon: Type },
  ], [language]);

  const localizedChartTypes = useMemo(() => [
    { id: 'candles' as const, label: t('chart.candles', language) },
    { id: 'hollow' as const, label: t('chart.hollow', language) },
    { id: 'heikin' as const, label: t('chart.heikin', language) },
    { id: 'area' as const, label: t('chart.area', language) },
    { id: 'line' as const, label: t('chart.line', language) },
  ], [language]);

  const [assetFilter, setAssetFilter] = useState<'ALL' | AssetClass>('ALL');
  const [watchlistSentimentTab, setWatchlistSentimentTab] = useState<'crypto_fng' | 'general'>('crypto_fng');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [secondaryTimeframe, setSecondaryTimeframe] = useState<Timeframe>('1H');
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [indicators, setIndicators] = useState<IndicatorId[]>([
    'EMA20',
    'EMA50',
    'BB',
    'VOLUME',
    'VP',
    'AI_SIGNALS',
  ]);
  const [activeTool, setActiveTool] = useState<DrawingToolId>('cursor');
  const [drawingsBySymbol, setDrawingsBySymbol] = useState<Record<string, ChartDrawing[]>>({});
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [secondaryCandles, setSecondaryCandles] = useState<Candle[]>([]);
  const [dataSourceLabel, setDataSourceLabel] = useState<'LIVE STREAM' | 'MARKET FEED'>('LIVE STREAM');
  const [isStreamPaused, setIsStreamPaused] = useState<boolean>(false);

  // Workspace Right Panel Mode & Resizable Layout State
  const [rightPanelTab, setRightPanelTab] = useState<
    'watchlist' | 'quant' | 'exness' | 'autobot' | 'saved' | 'alerts'
  >('autobot');
  const [exnessAccountType, setExnessAccountType] = useState<ExnessAccountType>(() => {
    try {
      const saved = localStorage.getItem('kv_exness_account_type_v2') as ExnessAccountType | null;
      if (
        saved === 'standard_cent' ||
        saved === 'standard_m' ||
        saved === 'pro' ||
        saved === 'raw_spread' ||
        saved === 'zero'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'standard_cent';
  });
  const [exnessLeverage, setExnessLeverage] = useState<ExnessLeverage>(2000);
  const [showExnessBidAskLines, setShowExnessBidAskLines] = useState<boolean>(true);
  const [priceOffsetsBySymbol, setPriceOffsetsBySymbol] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('kv_exness_price_offsets');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [exnessPositions, setExnessPositions] = useState<ExnessSyncedPosition[]>(() => {
    try {
      const raw = localStorage.getItem('kv_exness_positions_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [exnessClosedDeals, setExnessClosedDeals] = useState<ExnessClosedDeal[]>(() => {
    try {
      const raw = localStorage.getItem('kv_exness_closed_deals_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_EXNESS_CLOSED_DEALS;
    } catch {
      return DEFAULT_EXNESS_CLOSED_DEALS;
    }
  });

  // Smart Exit Brain (ខួរក្បាលឆ្លាតវៃ: កំណត់ប៊ូតុង បិទ ទាំងអស់ ជាចម្បង)
  const [smartExitSettings, setSmartExitSettings] = useState<SmartExitSettings>(() => {
    try {
      const raw = localStorage.getItem('kv_smart_exit_settings_v2');
      if (raw) return { ...DEFAULT_SMART_EXIT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_SMART_EXIT_SETTINGS;
  });

  const peakProfitTrackerRef = useRef<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem('kv_smart_exit_settings_v2', JSON.stringify(smartExitSettings));
    } catch {
      // ignore
    }
  }, [smartExitSettings]);

  const [mt5Session, setMt5Session] = useState<MT5AccountSession>(() => {
    try {
      const raw = localStorage.getItem('kv_exness_mt5_session_v2');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {
      connected: true,
      login: '148592031',
      server: 'Exness-MT5Real8',
      broker: 'Exness Technologies Ltd',
      accessMode: 'master',
      connectionMode: 'EXNESS_MT5_REAL',
      accountType: 'standard_cent',
      leverage: 2000,
      balance: 100, // $100 USD = 10,000 ¢ USC on Exness Standard Cent
      currency: 'USC',
      pingMs: 18,
      connectedAt: new Date().toLocaleTimeString(),
    };
  });
  const [presetAlertPrice, setPresetAlertPrice] = useState<number | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(395);
  const [isResizingPanel, setIsResizingPanel] = useState<boolean>(false);
  const [isChartMaximized, setIsChartMaximized] = useState<boolean>(false);

  // Clean Workspace & Pop-out Drawer Mode (លាក់កម្មវិធីផ្សេងៗពេលប៉ះ លោតចេញមក ដើម្បីអោយស្រលះចេញផ្ទាំងទៀន)
  const [isCleanView, setIsCleanView] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kv_clean_chart_view');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [activePopoutTab, setActivePopoutTab] = useState<
    'autobot' | 'exness' | 'quant' | 'watchlist' | 'saved' | 'alerts' | null
  >(null);

  const [showGoldConversionPopout, setShowGoldConversionPopout] = useState<boolean>(false);
  const [showDrawingsPopout, setShowDrawingsPopout] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('kv_clean_chart_view', String(isCleanView));
    } catch {
      // ignore
    }
  }, [isCleanView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopoutTab(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenPanel = useCallback(
    (tab: 'autobot' | 'exness' | 'quant' | 'watchlist' | 'saved' | 'alerts') => {
      setIsChartMaximized(false);
      setRightPanelTab(tab);
      if (isCleanView) {
        setActivePopoutTab(tab);
      }
    },
    [isCleanView]
  );

  const [isSyncingGlobalQuotes, setIsSyncingGlobalQuotes] = useState<boolean>(false);
  const [lastGlobalSyncTime, setLastGlobalSyncTime] = useState<number | null>(null);
  const [isAllWatchlistConnected, setIsAllWatchlistConnected] = useState<boolean>(true);
  const [liveWsTickCount, setLiveWsTickCount] = useState<number>(0);
  const [showRealBrokerModal, setShowRealBrokerModal] = useState<boolean>(false);
  const [executionToast, setExecutionToast] = useState<{
    id: string;
    ticket: number;
    message: string;
    direction: 'BUY' | 'SELL';
    lots: number;
    price: number;
    symbol: string;
  } | null>(null);

  // Total Profit Target Hit Auto-Close All Notification Toast
  const [totalProfitToast, setTotalProfitToast] = useState<{
    targetUSD: number;
    realizedUSD: number;
    positionsCount: number;
    timestamp: number;
  } | null>(null);
  const lastTotalProfitClosedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!totalProfitToast) return;
    const timer = setTimeout(() => {
      setTotalProfitToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [totalProfitToast]);

  useEffect(() => {
    if (!isResizingPanel) return;
    const onMove = (e: MouseEvent) => {
      const newWidth = Math.min(580, Math.max(260, window.innerWidth - e.clientX));
      setRightPanelWidth(newWidth);
    };
    const onUp = () => setIsResizingPanel(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizingPanel]);

  // Saved Analyses, Price Alerts, Logs, and Notification Config
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysisRecord[]>(() => {
    try {
      const raw = localStorage.getItem('kv_saved_analyses_v2');
      return raw ? JSON.parse(raw) : DEFAULT_SAVED_ANALYSES;
    } catch {
      return DEFAULT_SAVED_ANALYSES;
    }
  });

  const [priceAlerts, setPriceAlerts] = useState<PriceAlertRecord[]>(() => {
    try {
      const raw = localStorage.getItem('kv_price_alerts_v2');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return [
      {
        id: 'default_gold_xau_alert',
        ownerId: 'local_guest',
        symbol: 'XAU/USD',
        assetClass: 'gold',
        condition: 'price_above',
        threshold: 2700,
        status: 'active',
        notifyTelegram: true,
        notifyEmail: true,
        note: 'មាសអន្តរជាតិ XAU/USD បំបែកកម្រិតសំខាន់ $2,700/oz (~$3,255/ដំឡឹង)',
        triggerCount: 0,
        createdAtMs: Date.now() - 2400000,
        updatedAtMs: Date.now() - 2400000,
      },
      {
        id: 'default_usoil_wti_alert',
        ownerId: 'local_guest',
        symbol: 'USOIL',
        assetClass: 'gold',
        condition: 'price_above',
        threshold: 71.0,
        status: 'active',
        notifyTelegram: true,
        notifyEmail: true,
        note: 'ប្រេងឆៅអាមេរិក USOIL (WTI) បំបែកកម្រិតសំខាន់ $71.00/បារ៉ែល',
        triggerCount: 0,
        createdAtMs: Date.now() - 2100000,
        updatedAtMs: Date.now() - 2100000,
      },
      {
        id: 'default_btc_high',
        ownerId: 'local_guest',
        symbol: 'BTC/USDT',
        assetClass: 'crypto',
        condition: 'price_above',
        threshold: 92000,
        status: 'active',
        notifyTelegram: true,
        notifyEmail: true,
        note: 'BTC បំបែកតំបន់រាំងខ្ទប់សំខាន់ $92,000',
        triggerCount: 0,
        createdAtMs: Date.now() - 1800000,
        updatedAtMs: Date.now() - 1800000,
      },
      {
        id: 'default_gold_rsi_overbought',
        ownerId: 'local_guest',
        symbol: 'XAU/USD',
        assetClass: 'gold',
        condition: 'rsi_overbought',
        threshold: 70,
        status: 'active',
        notifyTelegram: true,
        notifyEmail: true,
        note: 'XAU/USD RSI(14) ឆ្លងលើសកម្រិតទិញជ្រុល 70 (Overbought)',
        triggerCount: 0,
        createdAtMs: Date.now() - 1500000,
        updatedAtMs: Date.now() - 1500000,
      },
      {
        id: 'default_btc_rsi_channel_breakout',
        ownerId: 'local_guest',
        symbol: 'BTC/USDT',
        assetClass: 'crypto',
        condition: 'rsi_channel_breakout',
        threshold: 65,
        status: 'active',
        notifyTelegram: true,
        notifyEmail: true,
        note: '[RSI_CHANNEL:45,65,above] BTC/USDT RSI(14) ធ្លាយចេញពីបណ្តាញ Trend Channel [45 - 65] (Bullish Momentum Breakout)',
        triggerCount: 0,
        rsiLowerBound: 45,
        rsiUpperBound: 65,
        rsiBreakoutDirection: 'above',
        createdAtMs: Date.now() - 1200000,
        updatedAtMs: Date.now() - 1200000,
      },
    ];
  });

  const [alertLogs, setAlertLogs] = useState<AlertLogRecord[]>(() => {
    try {
      const raw = localStorage.getItem('kv_alert_logs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [notificationConfig, setNotificationConfig] = useState<NotificationConfigRecord>(() => {
    const defaultConfig: NotificationConfigRecord = {
      ownerId: 'local_guest',
      emailEnabled: false,
      recipientEmail: 'vanndatree98@gmail.com',
      emailWebhookUrl: '',
      telegramEnabled: false,
      telegramBotToken: '',
      telegramChatId: '',
      soundEnabled: false,
      autoSpikeThresholdPct: 1.5,
    };
    try {
      const raw = localStorage.getItem('kv_notification_config_v2');
      if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
    } catch {
      // fallback
    }
    return defaultConfig;
  });

  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);

  const [liveBannerAlert, setLiveBannerAlert] = useState<{
    id: string;
    symbol: string;
    title: string;
    price: number;
    changePct: number;
    channels: string;
    emailPreviewUrl?: string;
  } | null>(null);

  const currentAsset = useMemo(
    () => assets.find((a) => a.symbol === selectedSymbol) || assets[0],
    [assets, selectedSymbol]
  );

  const currentDrawings = useMemo(
    () =>
      (drawingsBySymbol[selectedSymbol] || []).filter(
        (d) => !d.id.startsWith('pos_quick_') && !d.id.startsWith('mt5_pos_')
      ),
    [drawingsBySymbol, selectedSymbol]
  );

  const currentRsi = useMemo(() => {
    if (candles.length === 0) return 50;
    const rsiSeries = calculateRSI(candles, 14);
    return rsiSeries[rsiSeries.length - 1] ?? 50;
  }, [candles]);

  const currentPrecisionSummary = useMemo(
    () => calculateGlobalPrecisionAnalysis(currentAsset, candles, timeframe),
    [currentAsset, candles, timeframe]
  );

  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const drawingsBySymbolRef = useRef(drawingsBySymbol);
  drawingsBySymbolRef.current = drawingsBySymbol;
  const previousRsiRef = useRef<Record<string, number>>({});
  const priceAlertsRef = useRef(priceAlerts);
  priceAlertsRef.current = priceAlerts;
  const notificationConfigRef = useRef(notificationConfig);
  notificationConfigRef.current = notificationConfig;
  const lastSpikeAlertTimeRef = useRef<Record<string, number>>({});
  const previousPricesRef = useRef<Record<string, number>>({});

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser?.email) {
        setNotificationConfig((prev) => ({
          ...prev,
          ownerId: currentUser.uid,
          recipientEmail: prev.recipientEmail || currentUser.email || 'vanndatree98@gmail.com',
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Firestore Real-Time Listeners (when authenticated)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const uid = user.uid;

    const analysesQuery = query(
      collection(db, 'savedAnalyses'),
      where('ownerId', '==', uid)
    );
    const unsubAnalyses = onSnapshot(
      analysesQuery,
      (snap) => {
        const docs: SavedAnalysisRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const createdMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          const updatedMs =
            data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now();
          return {
            id: d.id,
            ownerId: data.ownerId,
            title: data.title,
            symbol: data.symbol,
            assetClass: data.assetClass,
            timeframe: data.timeframe,
            chartType: data.chartType,
            savedPrice: Number(data.savedPrice),
            targetPrice: Number(data.targetPrice),
            stopLossPrice: Number(data.stopLossPrice),
            direction: data.direction,
            notes: data.notes || '',
            indicators: Array.isArray(data.indicators) ? data.indicators : [],
            drawings: Array.isArray(data.drawings) ? data.drawings : [],
            createdAtMs: createdMs,
            updatedAtMs: updatedMs,
          };
        });
        docs.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setSavedAnalyses(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'savedAnalyses')
    );

    const alertsQuery = query(
      collection(db, 'priceAlerts'),
      where('ownerId', '==', uid)
    );
    const unsubAlerts = onSnapshot(
      alertsQuery,
      (snap) => {
        const docs: PriceAlertRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const createdMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          const updatedMs =
            data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now();
          let rsiLowerBound = typeof data.rsiLowerBound === 'number' ? data.rsiLowerBound : undefined;
          let rsiUpperBound = typeof data.rsiUpperBound === 'number' ? data.rsiUpperBound : undefined;
          let rsiBreakoutDirection = data.rsiBreakoutDirection;
          let rsiTriggerColor = typeof data.rsiTriggerColor === 'string' ? data.rsiTriggerColor : undefined;

          if (data.note && typeof data.note === 'string') {
            if (data.note.includes('[RSI_CHANNEL:')) {
              const match = data.note.match(/\[RSI_CHANNEL:\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*(above|below|both)\]/i);
              if (match) {
                rsiLowerBound = parseFloat(match[1]);
                rsiUpperBound = parseFloat(match[2]);
                rsiBreakoutDirection = match[3] as 'above' | 'below' | 'both';
              }
            }
            if (data.note.includes('[RSI_COLOR:')) {
              const colorMatch = data.note.match(/\[RSI_COLOR:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*\]/i);
              if (colorMatch) {
                rsiTriggerColor = colorMatch[1];
              }
            }
          }

          return {
            id: d.id,
            ownerId: data.ownerId,
            symbol: data.symbol,
            assetClass: data.assetClass,
            condition: data.condition,
            threshold: Number(data.threshold),
            status: data.status,
            notifyTelegram: Boolean(data.notifyTelegram),
            notifyEmail: Boolean(data.notifyEmail),
            note: data.note || '',
            triggerCount: Number(data.triggerCount || 0),
            rsiLowerBound,
            rsiUpperBound,
            rsiBreakoutDirection,
            rsiTriggerColor,
            createdAtMs: createdMs,
            updatedAtMs: updatedMs,
          };
        });
        docs.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setPriceAlerts(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'priceAlerts')
    );

    const logsQuery = query(
      collection(db, 'alertLogs'),
      where('ownerId', '==', uid)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snap) => {
        const docs: AlertLogRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const createdMs =
            data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
          const updatedMs =
            data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now();
          return {
            id: d.id,
            ownerId: data.ownerId,
            alertId: data.alertId,
            symbol: data.symbol,
            conditionLabel: data.conditionLabel,
            triggerPrice: Number(data.triggerPrice),
            changePercent: Number(data.changePercent),
            deliveryChannels: data.deliveryChannels,
            deliveryStatus: data.deliveryStatus,
            reviewed: Boolean(data.reviewed),
            reviewNote: data.reviewNote || '',
            createdAtMs: createdMs,
            updatedAtMs: updatedMs,
          };
        });
        docs.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setAlertLogs(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'alertLogs')
    );

    const loadNotifConfig = async () => {
      const cfgPath = `notificationConfigs/${uid}`;
      try {
        const snap = await getDoc(doc(db, 'notificationConfigs', uid));
        if (snap.exists()) {
          const d = snap.data();
          setNotificationConfig({
            ownerId: uid,
            emailEnabled: Boolean(d.emailEnabled),
            recipientEmail: d.recipientEmail || user.email || '',
            emailWebhookUrl: d.emailWebhookUrl || '',
            telegramEnabled: Boolean(d.telegramEnabled),
            telegramBotToken: d.telegramBotToken || '',
            telegramChatId: d.telegramChatId || '',
            soundEnabled: Boolean(d.soundEnabled ?? true),
            autoSpikeThresholdPct: Number(d.autoSpikeThresholdPct || 1.5),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, cfgPath);
      }
    };
    loadNotifConfig();

    return () => {
      unsubAnalyses();
      unsubAlerts();
      unsubLogs();
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('kv_saved_analyses_v2', JSON.stringify(savedAnalyses));
    }
  }, [savedAnalyses, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('kv_price_alerts_v2', JSON.stringify(priceAlerts));
    }
  }, [priceAlerts, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('kv_alert_logs', JSON.stringify(alertLogs));
    }
  }, [alertLogs, user]);

  useEffect(() => {
    localStorage.setItem('kv_notification_config_v2', JSON.stringify(notificationConfig));
  }, [notificationConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_exness_price_offsets', JSON.stringify(priceOffsetsBySymbol));
    } catch {
      // ignore
    }
  }, [priceOffsetsBySymbol]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_exness_positions_v2', JSON.stringify(exnessPositions));
    } catch {
      // ignore
    }
  }, [exnessPositions]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_exness_closed_deals_v2', JSON.stringify(exnessClosedDeals));
    } catch {
      // ignore
    }
  }, [exnessClosedDeals]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_exness_account_type_v2', exnessAccountType);
    } catch {
      // ignore
    }
  }, [exnessAccountType]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_exness_mt5_session_v2', JSON.stringify(mt5Session));
    } catch {
      // ignore
    }
  }, [mt5Session]);

  // MT5 Position & Order Execution Handlers
  const handleOpenMt5Position = useCallback(
    (pos: Omit<ExnessSyncedPosition, 'id' | 'ticket' | 'openedAt'>) => {
      const ticket = Math.floor(80000000 + Math.random() * 19999999);
      const newPos: ExnessSyncedPosition = {
        ...pos,
        id: `mt5_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ticket,
        openedAt: new Date().toLocaleTimeString(),
      };
      setExnessPositions((prev) => [newPos, ...prev]);
      playAlertTone('target');

      // Dispatch to authoritative server ledger & MetaApi cloud if configured
      try {
        fetch('/api/trading/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: pos.symbol,
            direction: pos.direction,
            lots: pos.lots,
            entryPrice: pos.entryPrice,
            stopLoss: pos.stopLoss,
            takeProfit: pos.takeProfit,
            orderType: pos.orderType,
            accountLogin: mt5Session.login,
            accountServer: mt5Session.server,
            metaApiToken: mt5Session.metaApiToken,
            metaApiAccountId: mt5Session.metaApiAccountId,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }

      setExecutionToast({
        id: newPos.id,
        ticket,
        message: `បានដាក់បញ្ជា ${pos.direction} ជោគជ័យ!`,
        direction: pos.direction,
        lots: pos.lots,
        price: pos.entryPrice,
        symbol: pos.symbol,
      });

      setTimeout(() => {
        setExecutionToast((curr) => (curr?.ticket === ticket ? null : curr));
      }, 4500);
    },
    [mt5Session]
  );


  const handleUpdateMt5Position = useCallback(
    (id: string, patch: Partial<ExnessSyncedPosition>) => {
      setExnessPositions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
    },
    []
  );

  const handleCloseMt5Position = useCallback(
    (id: string, closeReason: PositionCloseReason = 'MANUAL') => {
      delete peakProfitTrackerRef.current[id];
      setExnessPositions((prev) => {
        const target = prev.find((p) => p.id === id);
        if (!target) return prev;

        // Only realize P/L if the order was OPEN (not a cancelled PENDING order)
        if (target.status === 'OPEN') {
          const posAsset = assets.find((a) => a.symbol === target.symbol) || currentAsset;
          const quote = calculateExnessBidAsk(target.symbol, posAsset.price, target.accountType);
          const spec = getExnessContractSpec(target.symbol, target.accountType);
          const closePrice =
            closeReason === 'TP_HIT' && target.takeProfit > 0
              ? target.takeProfit
              : closeReason === 'SL_HIT' && target.stopLoss > 0
              ? target.stopLoss
              : target.direction === 'BUY'
              ? quote.bid
              : quote.ask;

          const diff =
            target.direction === 'BUY'
              ? closePrice - target.entryPrice
              : target.entryPrice - closePrice;
          const realizedPnL = Number(
            (
              diff * target.lots * spec.contractSize -
              target.lots * spec.commissionPerLotUSD[target.accountType]
            ).toFixed(2)
          );

          const deal: ExnessClosedDeal = {
            id: `deal_${Date.now()}_${target.ticket}`,
            ticket: target.ticket,
            symbol: target.symbol,
            exnessSymbol: target.exnessSymbol,
            direction: target.direction,
            lots: target.lots,
            entryPrice: target.entryPrice,
            closePrice,
            realizedPnL,
            closeReason,
            closedAt: new Date().toLocaleTimeString(),
          };

          setExnessClosedDeals((dPrev) => [deal, ...dPrev.slice(0, 99)]);
          setMt5Session((sPrev) => ({
            ...sPrev,
            balance: Number((sPrev.balance + realizedPnL).toFixed(2)),
          }));
          playAlertTone(realizedPnL >= 0 ? 'spike_up' : 'spike_down');

          try {
            fetch('/api/trading/close', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ticket: target.ticket,
                closePrice,
                realizedPnL,
              }),
            }).catch(() => {});
          } catch {
            // ignore
          }
        }

        return prev.filter((p) => p.id !== id);
      });
    },
    [assets, currentAsset]
  );

  const totalFloatingPnL = useMemo(() => {
    const openList = exnessPositions.filter((p) => p.status === 'OPEN');
    let sumPnL = 0;
    for (const pos of openList) {
      const posAsset = assets.find((a) => a.symbol === pos.symbol) || currentAsset;
      const quote = calculateExnessBidAsk(pos.symbol, posAsset.price, pos.accountType);
      const spec = getExnessContractSpec(pos.symbol, pos.accountType);
      const closePrice = pos.direction === 'BUY' ? quote.bid : quote.ask;
      const diff =
        pos.direction === 'BUY' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
      const pnl =
        diff * pos.lots * spec.contractSize -
        pos.lots * spec.commissionPerLotUSD[pos.accountType];
      sumPnL += pnl;
    }
    return Number(sumPnL.toFixed(2));
  }, [exnessPositions, assets, currentAsset]);

  const handleCloseAllMt5Positions = useCallback(
    (filter: 'ALL' | 'PROFITABLE' = 'ALL', reason: PositionCloseReason = 'MANUAL') => {
      const openList = exnessPositions.filter((p) => p.status === 'OPEN');
      openList.forEach((pos) => {
        const posAsset = assets.find((a) => a.symbol === pos.symbol) || currentAsset;
        const quote = calculateExnessBidAsk(pos.symbol, posAsset.price, pos.accountType);
        const spec = getExnessContractSpec(pos.symbol, pos.accountType);
        const closePrice = pos.direction === 'BUY' ? quote.bid : quote.ask;
        const diff =
          pos.direction === 'BUY' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
        const pnl =
          diff * pos.lots * spec.contractSize -
          pos.lots * spec.commissionPerLotUSD[pos.accountType];
        if (filter === 'ALL' || pnl > 0) {
          handleCloseMt5Position(pos.id, reason);
        }
      });
    },
    [exnessPositions, assets, currentAsset, handleCloseMt5Position]
  );

  // Automatic MT5 Pending Order Triggering, TP/SL Execution & Smart Auto-Close Brain
  useEffect(() => {
    if (exnessPositions.length === 0) return;

    // 0. Automatic Total Profit Auto-Close All (កំណត់ចំនួនលុយ សរុប 1-2-3-4-5-100$ បិទទាំងអស់ លឿនបំផុត)
    const openList = exnessPositions.filter((p) => p.status === 'OPEN');
    if (
      openList.length > 0 &&
      Boolean(smartExitSettings.totalProfitAutoCloseEnabled) &&
      (smartExitSettings.totalProfitTargetUSD ?? 0) > 0
    ) {
      let sumPnL = 0;
      openList.forEach((pos) => {
        const posAsset = assets.find((a) => a.symbol === pos.symbol) || currentAsset;
        const quote = calculateExnessBidAsk(pos.symbol, posAsset.price, pos.accountType);
        const spec = getExnessContractSpec(pos.symbol, pos.accountType);
        const closePrice = pos.direction === 'BUY' ? quote.bid : quote.ask;
        const diff =
          pos.direction === 'BUY' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
        const pnl =
          diff * pos.lots * spec.contractSize -
          pos.lots * spec.commissionPerLotUSD[pos.accountType];
        sumPnL += pnl;
      });
      const currentTotalPnL = Number(sumPnL.toFixed(2));
      const targetVal = smartExitSettings.totalProfitTargetUSD ?? 2;

      if (currentTotalPnL >= targetVal) {
        const now = Date.now();
        if (now - lastTotalProfitClosedAtRef.current > 2000) {
          lastTotalProfitClosedAtRef.current = now;
          handleCloseAllMt5Positions('ALL', 'SMART_TOTAL_PROFIT_CLOSE_ALL');
          playAlertTone('win');
          setTotalProfitToast({
            targetUSD: targetVal,
            realizedUSD: currentTotalPnL,
            positionsCount: openList.length,
            timestamp: now,
          });
          return;
        }
      }
    }

    exnessPositions.forEach((pos) => {
      const posAsset = assets.find((a) => a.symbol === pos.symbol) || currentAsset;
      if (!posAsset) return;
      const quote = calculateExnessBidAsk(pos.symbol, posAsset.price, pos.accountType);

      if (pos.status === 'PENDING') {
        const triggered =
          (pos.orderType === 'BUY_LIMIT' && quote.ask <= pos.entryPrice) ||
          (pos.orderType === 'BUY_STOP' && quote.ask >= pos.entryPrice) ||
          (pos.orderType === 'SELL_LIMIT' && quote.bid >= pos.entryPrice) ||
          (pos.orderType === 'SELL_STOP' && quote.bid <= pos.entryPrice);
        if (triggered) {
          handleUpdateMt5Position(pos.id, { status: 'OPEN' });
          playAlertTone('target');
        }
      } else if (pos.status === 'OPEN') {
        const closeP = pos.direction === 'BUY' ? quote.bid : quote.ask;
        const spec = getExnessContractSpec(pos.symbol, pos.accountType);
        const priceDiff =
          pos.direction === 'BUY'
            ? closeP - pos.entryPrice
            : pos.entryPrice - closeP;
        const commission = pos.lots * spec.commissionPerLotUSD[pos.accountType];
        const grossPnL = priceDiff * pos.lots * spec.contractSize;
        const currentPnL = Number((grossPnL - commission).toFixed(2));

        // Track highest profit reached
        const prevPeak = peakProfitTrackerRef.current[pos.id] || 0;
        const newPeak = Math.max(prevPeak, currentPnL);
        peakProfitTrackerRef.current[pos.id] = newPeak;

        // 1. Classical Hard TP / Hard SL checks
        const hitTp =
          pos.takeProfit > 0 &&
          ((pos.direction === 'BUY' && closeP >= pos.takeProfit) ||
            (pos.direction === 'SELL' && closeP <= pos.takeProfit));
        const hitSl =
          pos.stopLoss > 0 &&
          ((pos.direction === 'BUY' && closeP <= pos.stopLoss) ||
            (pos.direction === 'SELL' && closeP >= pos.stopLoss));

        if (hitTp) {
          handleCloseMt5Position(pos.id, 'TP_HIT');
          return;
        } else if (hitSl) {
          const isExactBreakEven = Math.abs(pos.stopLoss - pos.entryPrice) <= 1e-5;
          const isProfitableSl =
            pos.direction === 'BUY'
              ? pos.stopLoss > pos.entryPrice
              : pos.stopLoss < pos.entryPrice;
          const slReason: PositionCloseReason = isExactBreakEven
            ? 'SMART_BREAK_EVEN'
            : isProfitableSl
            ? 'SMART_TRAILING_STOP'
            : 'SL_HIT';
          handleCloseMt5Position(pos.id, slReason);
          return;
        }

        // 2. Smart Brain Auto-Close (ខួរក្បាលឆ្លាតវៃ: ពេលចំណេញគួរ បិទ, ពេលខាត ពេលណាគួរ បិទ)
        if (smartExitSettings.autoCloseEnabled) {
          const precision = calculateGlobalPrecisionAnalysis(posAsset, candles, timeframe);
          const diagnosis = evaluateSmartExit(
            pos,
            posAsset,
            candles,
            precision,
            newPeak,
            smartExitSettings
          );

          // Auto Break-Even Stop Loss protection
          if (
            diagnosis.recommendedSlMove &&
            diagnosis.recommendedSlMove !== pos.stopLoss
          ) {
            handleUpdateMt5Position(pos.id, { stopLoss: diagnosis.recommendedSlMove });
            playAlertTone('target');
          }

          // Auto-Close trigger
          if (diagnosis.shouldAutoClose && diagnosis.closeReason) {
            handleCloseMt5Position(pos.id, diagnosis.closeReason);
          }
        }
      }
    });
  }, [
    assets,
    currentAsset,
    candles,
    timeframe,
    exnessPositions,
    smartExitSettings,
    handleUpdateMt5Position,
    handleCloseMt5Position,
  ]);

  // Exness 1:1 Price Calibration Handlers (aligns live price & candles with user's Exness WebTerminal screen)
  const handleCalibrateExnessPrice = useCallback(
    (symbol: string, targetExnessPrice: number) => {
      const targetAsset = assets.find((a) => a.symbol === symbol);
      if (!targetAsset || !(targetExnessPrice > 0)) return;
      const delta = targetExnessPrice - targetAsset.price;
      setPriceOffsetsBySymbol((prev) => ({
        ...prev,
        [symbol]: Number(((prev[symbol] || 0) + delta).toFixed(4)),
      }));
      setAssets((prev) =>
        prev.map((a) =>
          a.symbol === symbol
            ? {
                ...a,
                price: Number((a.price + delta).toPrecision(7)),
                high24h: Number((a.high24h + delta).toPrecision(7)),
                low24h: Number((a.low24h + delta).toPrecision(7)),
              }
            : a
        )
      );
      if (symbol === selectedSymbol) {
        setCandles((prev) =>
          prev.map((c) => ({
            ...c,
            open: Number((c.open + delta).toPrecision(7)),
            high: Number((c.high + delta).toPrecision(7)),
            low: Number((c.low + delta).toPrecision(7)),
            close: Number((c.close + delta).toPrecision(7)),
          }))
        );
        setSecondaryCandles((prev) =>
          prev.map((c) => ({
            ...c,
            open: Number((c.open + delta).toPrecision(7)),
            high: Number((c.high + delta).toPrecision(7)),
            low: Number((c.low + delta).toPrecision(7)),
            close: Number((c.close + delta).toPrecision(7)),
          }))
        );
      }
    },
    [assets, selectedSymbol]
  );

  const handleResetExnessPriceOffset = useCallback(
    (symbol: string) => {
      const existingOffset = priceOffsetsBySymbol[symbol] || 0;
      if (existingOffset === 0) return;
      setPriceOffsetsBySymbol((prev) => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });
      setAssets((prev) =>
        prev.map((a) =>
          a.symbol === symbol
            ? {
                ...a,
                price: Number((a.price - existingOffset).toPrecision(7)),
                high24h: Number((a.high24h - existingOffset).toPrecision(7)),
                low24h: Number((a.low24h - existingOffset).toPrecision(7)),
              }
            : a
        )
      );
      if (symbol === selectedSymbol) {
        setCandles((prev) =>
          prev.map((c) => ({
            ...c,
            open: Number((c.open - existingOffset).toPrecision(7)),
            high: Number((c.high - existingOffset).toPrecision(7)),
            low: Number((c.low - existingOffset).toPrecision(7)),
            close: Number((c.close - existingOffset).toPrecision(7)),
          }))
        );
      }
    },
    [priceOffsetsBySymbol, selectedSymbol]
  );

  // 2B. Real-Time Global Multi-Exchange Market Quotes Sync (Binance + COMEX + NYMEX + LBMA + NASDAQ)
  const syncGlobalMarketQuotes = useCallback(async () => {
    setIsSyncingGlobalQuotes(true);
    try {
      const res = await fetch('/api/market/global-quotes');
      if (res.ok) {
        const data = await res.json();
        const quotes = data?.quotes as
          | Record<
              string,
              { price: number; change24h: number; high24h: number; low24h: number; source: string }
            >
          | undefined;
        if (quotes && Object.keys(quotes).length > 0) {
          setAssets((prev) =>
            prev.map((asset) => {
              const q = quotes[asset.symbol];
              if (!q || !(q.price > 0)) return asset;
              return {
                ...asset,
                basePrice: q.price / (1 + (q.change24h || 0) / 100),
                price: q.price,
                change24h: q.change24h,
                high24h: Math.max(q.high24h || q.price, q.price),
                low24h: Math.min(q.low24h || q.price, q.price),
              };
            })
          );
          setLastGlobalSyncTime(Date.now());
          setIsAllWatchlistConnected(true);
        }
      }
    } catch {
      // Keep existing live stream / deterministic values if offline
    } finally {
      setIsSyncingGlobalQuotes(false);
    }
  }, []);

  useEffect(() => {
    if (isStreamPaused) return;
    syncGlobalMarketQuotes();
    const intervalId = setInterval(() => {
      syncGlobalMarketQuotes();
    }, 4000);
    return () => clearInterval(intervalId);
  }, [syncGlobalMarketQuotes, isStreamPaused]);

  // 3. Load Initial Historical Candles (Binance + Yahoo Finance Global Commodities & Stocks)
  useEffect(() => {
    let cancelled = false;
    const loadCandles = async () => {
      const target = INITIAL_ASSETS.find((a) => a.symbol === selectedSymbol) || currentAsset;

      const binancePair =
        target.symbol === 'GOLD-KH' ? 'PAXGUSDT' : target.binanceSymbol || 'BTCUSDT';
      const scaleFactor =
        target.symbol === 'GOLD-KH' ? GOLD_CONVERSION.DAMLEUNG_PER_OZ : 1;

      const interval = mapTimeframeToBinance(timeframe) || '15m';
      try {
        const res = await fetch(
          `/api/market/klines?appSymbol=${encodeURIComponent(target.symbol)}&symbol=${binancePair}&interval=${interval}&limit=365`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.candles) && data.candles.length > 15) {
            const isAlreadyScaled = data.source === 'yahoo_global_live';
            const factor = isAlreadyScaled ? 1 : scaleFactor;
            const scaledCandles: Candle[] = data.candles.map((c: Candle) => ({
              time: c.time,
              open: Number((c.open * factor).toPrecision(7)),
              high: Number((c.high * factor).toPrecision(7)),
              low: Number((c.low * factor).toPrecision(7)),
              close: Number((c.close * factor).toPrecision(7)),
              volume: c.volume,
            }));
            setCandles(scaledCandles);
            setDataSourceLabel('LIVE STREAM');
            const latest = scaledCandles[scaledCandles.length - 1];
            setAssets((prev) =>
              prev.map((a) =>
                a.symbol === target.symbol ? { ...a, price: latest.close } : a
              )
            );
            return;
          }
        }
      } catch {
        // Fallback to deterministic generator below
      }

      if (!cancelled) {
        const generated = generateHistoricalCandles(target, timeframe, 365);
        setCandles(generated);
        setDataSourceLabel('MARKET FEED');
      }
    };

    loadCandles();
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, timeframe]);

  // 3B. Load Historical Candles for Secondary Timeframe (Split-View Side-by-Side Chart)
  useEffect(() => {
    let cancelled = false;
    const loadSecondaryTimeframeCandles = async () => {
      const target = INITIAL_ASSETS.find((a) => a.symbol === selectedSymbol) || currentAsset;
      const binancePair =
        target.symbol === 'GOLD-KH' ? 'PAXGUSDT' : target.binanceSymbol || 'BTCUSDT';
      const scaleFactor =
        target.symbol === 'GOLD-KH' ? GOLD_CONVERSION.DAMLEUNG_PER_OZ : 1;

      const interval = mapTimeframeToBinance(secondaryTimeframe) || '1h';
      try {
        const res = await fetch(
          `/api/market/klines?appSymbol=${encodeURIComponent(target.symbol)}&symbol=${binancePair}&interval=${interval}&limit=365`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.candles) && data.candles.length > 15) {
            const isAlreadyScaled = data.source === 'yahoo_global_live';
            const factor = isAlreadyScaled ? 1 : scaleFactor;
            const scaledCandles: Candle[] = data.candles.map((c: Candle) => ({
              time: c.time,
              open: Number((c.open * factor).toPrecision(7)),
              high: Number((c.high * factor).toPrecision(7)),
              low: Number((c.low * factor).toPrecision(7)),
              close: Number((c.close * factor).toPrecision(7)),
              volume: c.volume,
            }));
            setSecondaryCandles(scaledCandles);
            return;
          }
        }
      } catch {
        // Fallback to deterministic generator below
      }

      if (!cancelled) {
        setSecondaryCandles(generateHistoricalCandles(target, secondaryTimeframe, 365));
      }
    };

    loadSecondaryTimeframeCandles();
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, secondaryTimeframe]);

  // 4. Alert Evaluation & Real-Time Dispatch Engine
  const triggerAlertDispatch = useCallback(
    async (params: {
      alertId: string;
      symbol: string;
      conditionLabel: string;
      triggerPrice: number;
      changePercent: number;
      note: string;
      wantTelegram: boolean;
      wantEmail: boolean;
    }) => {
      const cfg = notificationConfigRef.current;

      if (cfg.soundEnabled) {
        playAlertTone(
          params.changePercent >= 1
            ? 'spike_up'
            : params.changePercent <= -1
            ? 'spike_down'
            : 'target'
        );
      }

      const channelsUsed = ['In-App'];
      if (params.wantTelegram && cfg.telegramEnabled) channelsUsed.push('Telegram');
      if (params.wantEmail && cfg.emailEnabled) channelsUsed.push('Email');
      const channelsStr = channelsUsed.join(' + ');

      let deliveryStatus: 'delivered' | 'in_app_only' | 'failed' = 'in_app_only';
      let emailPreviewUrl: string | undefined;

      if ((params.wantTelegram && cfg.telegramEnabled) || (params.wantEmail && cfg.emailEnabled)) {
        try {
          const resp = await fetch('/api/alerts/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: params.symbol,
              conditionLabel: params.conditionLabel,
              triggerPrice: params.triggerPrice,
              changePercent: params.changePercent,
              note: params.note,
              telegramEnabled: params.wantTelegram && cfg.telegramEnabled,
              telegramBotToken: cfg.telegramBotToken,
              telegramChatId: cfg.telegramChatId,
              emailEnabled: params.wantEmail && cfg.emailEnabled,
              recipientEmail: cfg.recipientEmail,
              emailWebhookUrl: cfg.emailWebhookUrl,
            }),
          });
          if (resp.ok) {
            const body = await resp.json();
            deliveryStatus = body.deliveryStatus || 'delivered';
            emailPreviewUrl = body.results?.email?.previewUrl;
          } else {
            deliveryStatus = 'failed';
          }
        } catch {
          deliveryStatus = 'failed';
        }
      }

      const bannerId = `log_${Date.now()}`;
      setLiveBannerAlert({
        id: bannerId,
        symbol: params.symbol,
        title: `${params.conditionLabel} — ${params.note}`,
        price: params.triggerPrice,
        changePct: params.changePercent,
        channels: channelsStr,
        emailPreviewUrl,
      });

      const newLog: AlertLogRecord = {
        id: bannerId,
        ownerId: user?.uid || 'local_guest',
        alertId: sanitizeId(params.alertId),
        symbol: sanitizeSymbol(params.symbol),
        conditionLabel: sanitizeString(params.conditionLabel, BLUEPRINT_LIMITS.TITLE_MAX_LEN, 'Price Alert'),
        triggerPrice: Number(params.triggerPrice),
        changePercent: Number(params.changePercent),
        deliveryChannels: sanitizeString(channelsStr, BLUEPRINT_LIMITS.TITLE_MAX_LEN, 'In-App'),
        deliveryStatus,
        reviewed: false,
        reviewNote: '',
        emailPreviewUrl,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      };

      if (user) {
        const logPath = `alertLogs/${newLog.id}`;
        try {
          await setDoc(doc(db, 'alertLogs', newLog.id), {
            ownerId: user.uid,
            alertId: newLog.alertId,
            symbol: newLog.symbol,
            conditionLabel: newLog.conditionLabel,
            triggerPrice: newLog.triggerPrice,
            changePercent: newLog.changePercent,
            deliveryChannels: newLog.deliveryChannels,
            deliveryStatus: newLog.deliveryStatus,
            reviewed: false,
            reviewNote: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, logPath);
        }
      } else {
        setAlertLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      }
    },
    [user]
  );

  const evaluateTickForAlerts = useCallback(
    (
      symbol: string,
      newPrice: number,
      prevPrice: number,
      explicitPctJump?: number,
      overrideCandles?: Candle[]
    ) => {
      const pctMove =
        explicitPctJump !== undefined
          ? explicitPctJump
          : prevPrice > 0
          ? ((newPrice - prevPrice) / prevPrice) * 100
          : 0;

      // Compute previous & current RSI(14) for technical indicator alert evaluation
      const baseCandles = overrideCandles || candlesRef.current;
      let prevRsi = previousRsiRef.current[symbol];
      let currRsi = 50;
      if (baseCandles.length >= 2) {
        const seriesWithTick = overrideCandles
          ? overrideCandles
          : [
              ...baseCandles.slice(0, -1),
              {
                ...baseCandles[baseCandles.length - 1],
                close: newPrice,
                high: Math.max(baseCandles[baseCandles.length - 1].high, newPrice),
                low: Math.min(baseCandles[baseCandles.length - 1].low, newPrice),
              },
            ];
        const rsiArr = calculateRSI(seriesWithTick, 14);
        currRsi = rsiArr[rsiArr.length - 1] ?? 50;
        if (prevRsi === undefined) {
          prevRsi = rsiArr[rsiArr.length - 2] ?? 50;
        }
        previousRsiRef.current[symbol] = currRsi;
      } else {
        prevRsi = prevRsi ?? 50;
      }

      const activeList = priceAlertsRef.current.filter(
        (a) => a.symbol === symbol && a.status === 'active'
      );

      activeList.forEach(async (al) => {
        let matched = false;
        let customConditionLabel = `${CONDITION_LABELS[al.condition]} ${al.threshold}`;

        if (al.condition === 'price_above' && newPrice >= al.threshold) matched = true;
        if (al.condition === 'price_below' && newPrice <= al.threshold) matched = true;
        if (al.condition === 'pct_spike_up' && pctMove >= al.threshold) matched = true;
        if (al.condition === 'pct_drop_down' && pctMove <= -al.threshold) matched = true;
        if (al.condition === 'volatility_burst' && Math.abs(pctMove) >= al.threshold)
          matched = true;

        // Technical Indicator Alert: RSI(14) crosses above 70 (or custom overbought threshold)
        if (al.condition === 'rsi_overbought') {
          const targetRsi = al.threshold > 0 ? al.threshold : 70;
          if (
            (prevRsi < targetRsi && currRsi >= targetRsi) ||
            (explicitPctJump !== undefined && explicitPctJump > 0 && currRsi >= targetRsi)
          ) {
            matched = true;
            customConditionLabel = `RSI(14) = ${currRsi.toFixed(1)} ឆ្លងលើស ${targetRsi} (Overbought / ទិញជ្រុល)`;
          }
        }

        // Technical Indicator Alert: RSI(14) crosses below 30 (or custom oversold threshold)
        if (al.condition === 'rsi_oversold') {
          const targetRsi = al.threshold > 0 ? al.threshold : 30;
          if (
            (prevRsi > targetRsi && currRsi <= targetRsi) ||
            (explicitPctJump !== undefined && explicitPctJump < 0 && currRsi <= targetRsi)
          ) {
            matched = true;
            customConditionLabel = `RSI(14) = ${currRsi.toFixed(1)} ឆ្លងក្រោម ${targetRsi} (Oversold / លក់ជ្រុល)`;
          }
        }

        // Technical Indicator Alert: RSI(14) breaks out of user-defined trend-following channel
        if (al.condition === 'rsi_channel_breakout') {
          let lowerBound = al.rsiLowerBound ?? 45;
          let upperBound = al.rsiUpperBound ?? 65;
          let direction: 'above' | 'below' | 'both' = al.rsiBreakoutDirection ?? 'above';

          if (al.note && typeof al.note === 'string' && al.note.includes('[RSI_CHANNEL:')) {
            const match = al.note.match(/\[RSI_CHANNEL:\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*(above|below|both)\]/i);
            if (match) {
              lowerBound = parseFloat(match[1]);
              upperBound = parseFloat(match[2]);
              direction = match[3] as 'above' | 'below' | 'both';
            }
          }

          let triggered = false;
          let breakoutMsg = '';

          // Check breakout above channel ceiling (Bullish momentum breakout)
          if (direction === 'above' || direction === 'both') {
            if (
              (prevRsi <= upperBound && currRsi > upperBound) ||
              (explicitPctJump !== undefined && explicitPctJump > 0 && currRsi > upperBound && prevRsi < upperBound)
            ) {
              triggered = true;
              breakoutMsg = `RSI(14) = ${currRsi.toFixed(1)} ធ្លាយឡើងផុត Channel Ceiling ${upperBound} (Bullish Momentum Breakout)`;
            }
          }

          // Check breakdown below channel floor (Bearish breakdown)
          if (!triggered && (direction === 'below' || direction === 'both')) {
            if (
              (prevRsi >= lowerBound && currRsi < lowerBound) ||
              (explicitPctJump !== undefined && explicitPctJump < 0 && currRsi < lowerBound && prevRsi > lowerBound)
            ) {
              triggered = true;
              breakoutMsg = `RSI(14) = ${currRsi.toFixed(1)} ធ្លាក់ចុះធ្លាយបាត Channel Floor ${lowerBound} (Bearish Breakdown)`;
            }
          }

          if (triggered) {
            matched = true;
            customConditionLabel = breakoutMsg;
          }
        }

        // Trendline Touch Alert: Triggers when live market price touches or crosses the specific drawn trendline
        if (al.condition === 'trendline_touch') {
          const latestCandleTime =
            baseCandles.length > 0
              ? baseCandles[baseCandles.length - 1].time
              : Math.floor(Date.now() / 1000);
          const symbolDrawings = drawingsBySymbolRef.current[symbol] || [];
          const linkedDrawing = al.drawingId
            ? symbolDrawings.find((d) => d.id === al.drawingId)
            : undefined;

          const lineTargetPrice = linkedDrawing
            ? getTrendlinePriceAtTime(linkedDrawing, latestCandleTime)
            : al.t1 !== undefined &&
              al.p1 !== undefined &&
              al.t2 !== undefined &&
              al.p2 !== undefined
            ? getTrendlinePriceAtTime(
                { t1: al.t1, p1: al.p1, t2: al.t2, p2: al.p2 },
                latestCandleTime
              )
            : al.threshold;

          const crossedLine =
            (prevPrice <= lineTargetPrice && newPrice >= lineTargetPrice) ||
            (prevPrice >= lineTargetPrice && newPrice <= lineTargetPrice);
          const touchedLine =
            Math.abs(newPrice - lineTargetPrice) / Math.max(lineTargetPrice, 0.0001) <= 0.0008;

          if (crossedLine || touchedLine) {
            matched = true;
            customConditionLabel = `តម្លៃប៉ះខ្សែ Trendline (@ ${formatPrice(lineTargetPrice, al.symbol)})`;
          }
        }

        if (matched) {
          if (user) {
            const alertPath = `priceAlerts/${al.id}`;
            try {
              await updateDoc(doc(db, 'priceAlerts', al.id), {
                status: 'triggered',
                triggerCount: al.triggerCount + 1,
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, alertPath);
            }
          } else {
            setPriceAlerts((prev) =>
              prev.map((item) =>
                item.id === al.id
                  ? {
                      ...item,
                      status: 'triggered',
                      triggerCount: item.triggerCount + 1,
                      updatedAtMs: Date.now(),
                    }
                  : item
              )
            );
          }

          await triggerAlertDispatch({
            alertId: al.id,
            symbol: al.symbol,
            conditionLabel: customConditionLabel,
            triggerPrice: newPrice,
            changePercent: pctMove,
            note: al.note,
            wantTelegram: al.notifyTelegram,
            wantEmail: al.notifyEmail,
          });
        }
      });

      const autoThreshold = notificationConfigRef.current.autoSpikeThresholdPct || 1.5;
      const lastFired = lastSpikeAlertTimeRef.current[symbol] || 0;
      if (Math.abs(pctMove) >= autoThreshold && Date.now() - lastFired > 12000) {
        lastSpikeAlertTimeRef.current[symbol] = Date.now();
        triggerAlertDispatch({
          alertId: 'auto_spike_detector',
          symbol,
          conditionLabel:
            pctMove > 0
              ? `ការហក់ឡើងតម្លៃខ្លាំងភ្លាមៗ (+${pctMove.toFixed(2)}%)`
              : `ការធ្លាក់ចុះតម្លៃខ្លាំងភ្លាមៗ (${pctMove.toFixed(2)}%)`,
          triggerPrice: newPrice,
          changePercent: pctMove,
          note: `ប្រព័ន្ធចាប់សញ្ញាបម្រែបម្រួលតម្លៃខ្លាំងស្វ័យប្រវត្តិ (លើសកម្រិត ±${autoThreshold}%)`,
          wantTelegram: true,
          wantEmail: true,
        });
      }
    },
    [triggerAlertDispatch, user]
  );

  // 5. Real-Time Market Streaming across all Watchlist markets (Binance Multi-Stream + Auto Global Multi-Exchange Sync)
  useEffect(() => {
    if (isStreamPaused) {
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    // Combined multi-stream for all Crypto pairs + PAXG Gold (which also anchors XAU/USD, XAUT/USDT, and GOLD-KH)
    const multiStreams = [
      'btcusdt@trade',
      'ethusdt@trade',
      'solusdt@trade',
      'bnbusdt@trade',
      'xrpusdt@trade',
      'paxgusdt@trade',
    ].join('/');

    const connectMultiWs = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${multiStreams}`);

        ws.onopen = () => {
          setIsAllWatchlistConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            const payload = raw?.data || raw;
            const streamSym = (payload.s || '').toUpperCase();
            const rawPrice = parseFloat(payload.p);
            const tradeQty = parseFloat(payload.q || '0.1');

            if (!streamSym || isNaN(rawPrice) || rawPrice <= 0) return;

            setLiveWsTickCount((c) => (c + 1) % 100000);

            // Map Binance symbols to all corresponding Watchlist symbols
            let targetSymbols: string[] = [];
            if (streamSym === 'BTCUSDT') targetSymbols = ['BTC/USDT'];
            else if (streamSym === 'ETHUSDT') targetSymbols = ['ETH/USDT'];
            else if (streamSym === 'SOLUSDT') targetSymbols = ['SOL/USDT'];
            else if (streamSym === 'BNBUSDT') targetSymbols = ['BNB/USDT'];
            else if (streamSym === 'XRPUSDT') targetSymbols = ['XRP/USDT'];
            else if (streamSym === 'PAXGUSDT') {
              targetSymbols = ['PAXG/USDT', 'XAU/USD', 'XAUT/USDT', 'GOLD-KH'];
            }

            if (targetSymbols.length === 0) return;

            // Update all matching Watchlist assets in real-time concurrently
            setAssets((prev) =>
              prev.map((a) => {
                if (targetSymbols.includes(a.symbol)) {
                  const isKhmerGold = a.symbol === 'GOLD-KH';
                  const livePrice = isKhmerGold
                    ? Number((rawPrice * GOLD_CONVERSION.DAMLEUNG_PER_OZ).toFixed(2))
                    : rawPrice;
                  const newChange =
                    ((livePrice - a.basePrice) / Math.max(a.basePrice, 0.0001)) * 100;
                  return {
                    ...a,
                    price: livePrice,
                    high24h: Math.max(a.high24h, livePrice),
                    low24h: Math.min(a.low24h, livePrice),
                    change24h: Number((a.change24h * 0.9 + newChange * 0.1).toFixed(2)),
                  };
                }
                return a;
              })
            );

            // If the incoming stream tick matches selectedSymbol, update candles & evaluate price alerts
            const isMatchSelected =
              targetSymbols.includes(selectedSymbol) ||
              (streamSym === 'PAXGUSDT' && (selectedSymbol === 'GOLD-KH' || selectedSymbol === 'XAU/USD' || selectedSymbol === 'XAUT/USDT'));

            if (isMatchSelected) {
              const livePrice =
                selectedSymbol === 'GOLD-KH'
                  ? Number((rawPrice * GOLD_CONVERSION.DAMLEUNG_PER_OZ).toFixed(2))
                  : rawPrice;
              const prevP = previousPricesRef.current[selectedSymbol] || livePrice;
              previousPricesRef.current[selectedSymbol] = livePrice;

              setCandles((prevCandles) => {
                if (prevCandles.length === 0) return prevCandles;
                const stepSec = getIntervalSeconds(timeframe);
                const bucket = Math.floor(Date.now() / 1000 / stepSec) * stepSec;
                const last = prevCandles[prevCandles.length - 1];

                if (last.time === bucket) {
                  const updated: Candle = {
                    ...last,
                    close: livePrice,
                    high: Math.max(last.high, livePrice),
                    low: Math.min(last.low, livePrice),
                    volume: last.volume + tradeQty * livePrice * 0.05,
                  };
                  return [...prevCandles.slice(0, -1), updated];
                } else if (bucket > last.time) {
                  return [
                    ...prevCandles.slice(1),
                    {
                      time: bucket,
                      open: last.close,
                      high: Math.max(last.close, livePrice),
                      low: Math.min(last.close, livePrice),
                      close: livePrice,
                      volume: tradeQty * livePrice,
                    },
                  ];
                }
                return prevCandles;
              });

              setSecondaryCandles((prevCandles) => {
                if (prevCandles.length === 0) return prevCandles;
                const stepSec = getIntervalSeconds(secondaryTimeframe);
                const bucket = Math.floor(Date.now() / 1000 / stepSec) * stepSec;
                const last = prevCandles[prevCandles.length - 1];

                if (last.time === bucket) {
                  return [
                    ...prevCandles.slice(0, -1),
                    {
                      ...last,
                      close: livePrice,
                      high: Math.max(last.high, livePrice),
                      low: Math.min(last.low, livePrice),
                      volume: last.volume + tradeQty * livePrice * 0.05,
                    },
                  ];
                } else if (bucket > last.time) {
                  return [
                    ...prevCandles.slice(1),
                    {
                      time: bucket,
                      open: last.close,
                      high: Math.max(last.close, livePrice),
                      low: Math.min(last.close, livePrice),
                      close: livePrice,
                      volume: tradeQty * livePrice,
                    },
                  ];
                }
                return prevCandles;
              });

              evaluateTickForAlerts(selectedSymbol, livePrice, prevP);
            }
          } catch {
            // ignore malformed frame
          }
        };

        ws.onclose = () => {
          if (!isStreamPaused) {
            reconnectTimeout = setTimeout(connectMultiWs, 3000);
          }
        };
      } catch {
        // WebSocket fallback handled by continuous tick timer below
      }
    };

    connectMultiWs();

    const timer = setInterval(() => {
      setAssets((prevAssets) => {
        const goldCommonShock = (Math.random() - 0.494) * 0.0011;
        const oilCommonShock = (Math.random() - 0.494) * 0.0014;

        return prevAssets.map((asset) => {
          const prevP = previousPricesRef.current[asset.symbol] || asset.price;
          const microDrift =
            asset.subCategory === 'energy'
              ? oilCommonShock + (Math.random() - 0.498) * 0.0005
              : asset.assetClass === 'gold'
                ? goldCommonShock + (Math.random() - 0.498) * 0.0004
                : (Math.random() - 0.495) * (asset.volatility1m * 0.0085);

          const rawNext = asset.price * (1 + microDrift);
          const nextPrice = asset.symbol.endsWith('CSX')
            ? Math.round(rawNext / 10) * 10
            : Number(rawNext.toPrecision(7));

          previousPricesRef.current[asset.symbol] = nextPrice;

          if (asset.symbol === selectedSymbol) {
            setCandles((prevCandles) => {
              if (prevCandles.length === 0) return prevCandles;
              const stepSec = getIntervalSeconds(timeframe);
              const bucket = Math.floor(Date.now() / 1000 / stepSec) * stepSec;
              const last = prevCandles[prevCandles.length - 1];
              if (last.time === bucket) {
                return [
                  ...prevCandles.slice(0, -1),
                  {
                    ...last,
                    close: nextPrice,
                    high: Math.max(last.high, nextPrice),
                    low: Math.min(last.low, nextPrice),
                    volume: Math.round(last.volume + Math.random() * 1200),
                  },
                ];
              }
              return [
                ...prevCandles.slice(1),
                {
                  time: bucket,
                  open: last.close,
                  high: Math.max(last.close, nextPrice),
                  low: Math.min(last.close, nextPrice),
                  close: nextPrice,
                  volume: Math.round(1500 + Math.random() * 4500),
                },
              ];
            });

            setSecondaryCandles((prevCandles) => {
              if (prevCandles.length === 0) return prevCandles;
              const stepSec = getIntervalSeconds(secondaryTimeframe);
              const bucket = Math.floor(Date.now() / 1000 / stepSec) * stepSec;
              const last = prevCandles[prevCandles.length - 1];
              if (last.time === bucket) {
                return [
                  ...prevCandles.slice(0, -1),
                  {
                    ...last,
                    close: nextPrice,
                    high: Math.max(last.high, nextPrice),
                    low: Math.min(last.low, nextPrice),
                    volume: Math.round(last.volume + Math.random() * 1200),
                  },
                ];
              }
              return [
                ...prevCandles.slice(1),
                {
                  time: bucket,
                  open: last.close,
                  high: Math.max(last.close, nextPrice),
                  low: Math.min(last.close, nextPrice),
                  close: nextPrice,
                  volume: Math.round(1500 + Math.random() * 4500),
                },
              ];
            });

            evaluateTickForAlerts(asset.symbol, nextPrice, prevP);
          }

          const deltaPct = ((nextPrice - prevP) / Math.max(prevP, 0.0001)) * 100;
          return {
            ...asset,
            price: nextPrice,
            high24h: Math.max(asset.high24h, nextPrice),
            low24h: Math.min(asset.low24h, nextPrice),
            change24h: Number((asset.change24h + deltaPct * 0.35).toFixed(2)),
          };
        });
      });
    }, timeframe.endsWith('s') || (isSplitView && secondaryTimeframe.endsWith('s')) ? 950 : 1800);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      clearInterval(timer);
    };
  }, [selectedSymbol, timeframe, secondaryTimeframe, isSplitView, isStreamPaused, evaluateTickForAlerts]);

  const handleSimulateSpike = useCallback(
    (direction: 'up' | 'down') => {
      const pct = direction === 'up' ? 2.45 : -2.45;
      const factor = 1 + pct / 100;
      const prevPrice = currentAsset.price;
      const rawNew = prevPrice * factor;
      const spikedPrice = currentAsset.symbol.endsWith('CSX')
        ? Math.round(rawNew / 20) * 20
        : Number(rawNew.toPrecision(7));

      setAssets((prev) =>
        prev.map((a) => {
          if (a.symbol === currentAsset.symbol) {
            return {
              ...a,
              price: spikedPrice,
              high24h: Math.max(a.high24h, spikedPrice),
              low24h: Math.min(a.low24h, spikedPrice),
              change24h: Number((a.change24h + pct).toFixed(2)),
            };
          }
          if (currentAsset.assetClass === 'gold' && a.assetClass === 'gold') {
            const corrPrice = Number((a.price * factor).toPrecision(7));
            return {
              ...a,
              price: corrPrice,
              high24h: Math.max(a.high24h, corrPrice),
              low24h: Math.min(a.low24h, corrPrice),
              change24h: Number((a.change24h + pct).toFixed(2)),
            };
          }
          return a;
        })
      );

      const currentSeries = candlesRef.current;
      let nextSeries = currentSeries;
      if (currentSeries.length > 0) {
        const last = currentSeries[currentSeries.length - 1];
        nextSeries = [
          ...currentSeries.slice(0, -1),
          {
            ...last,
            close: spikedPrice,
            high: Math.max(last.high, spikedPrice),
            low: Math.min(last.low, spikedPrice),
            volume: Math.round(last.volume * 2.4),
          },
        ];
        setCandles(nextSeries);
      }

      setSecondaryCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            close: spikedPrice,
            high: Math.max(last.high, spikedPrice),
            low: Math.min(last.low, spikedPrice),
            volume: Math.round(last.volume * 2.4),
          },
        ];
      });

      evaluateTickForAlerts(currentAsset.symbol, spikedPrice, prevPrice, pct, nextSeries);
    },
    [currentAsset, evaluateTickForAlerts]
  );

  const handleAddDrawing = (drawing: ChartDrawing) => {
    setDrawingsBySymbol((prev) => {
      const existing = prev[selectedSymbol] || [];
      return {
        ...prev,
        [selectedSymbol]: [...existing.slice(-49), drawing],
      };
    });
    setActiveTool('cursor');
  };

  const handleQuickTrade = useCallback(
    (params: {
      symbol?: string;
      direction: 'BUY' | 'SELL';
      lots: number;
      takeProfit?: number;
      stopLoss?: number;
      comment?: string;
    }) => {
      const targetSymbol = params.symbol || currentAsset.symbol;
      const targetAsset = assets.find((a) => a.symbol === targetSymbol) || currentAsset;
      const quote = calculateExnessBidAsk(targetSymbol, targetAsset.price, exnessAccountType);
      const spec = getExnessContractSpec(targetSymbol, exnessAccountType);
      const entry = params.direction === 'BUY' ? quote.ask : quote.bid;

      handleOpenMt5Position({
        symbol: targetSymbol,
        exnessSymbol: spec.exnessSymbol,
        direction: params.direction,
        orderType: 'MARKET',
        status: 'OPEN',
        lots: params.lots,
        entryPrice: entry,
        takeProfit: params.takeProfit ?? 0,
        stopLoss: params.stopLoss ?? 0,
        accountType: exnessAccountType,
        comment: params.comment || `One-Click Trade via KramaView Pro`,
      });
    },
    [currentAsset, assets, exnessAccountType, handleOpenMt5Position]
  );

  const handleUpdateDrawing = useCallback(
    (updated: ChartDrawing) => {
      setDrawingsBySymbol((prev) => ({
        ...prev,
        [selectedSymbol]: (prev[selectedSymbol] || []).map((d) =>
          d.id === updated.id ? updated : d
        ),
      }));
    },
    [selectedSymbol]
  );

  const handleDeleteDrawing = (id: string) => {
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [selectedSymbol]: (prev[selectedSymbol] || []).filter((d) => d.id !== id),
    }));
    setSelectedDrawingId(null);
  };

  const handleClearDrawings = () => {
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [selectedSymbol]: [],
    }));
    setSelectedDrawingId(null);
  };

  const handlePlotPivotLevelsOnChart = useCallback(
    (levels: { label: string; price: number; color: string }[]) => {
      const lastTime =
        candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000);
      const firstTime =
        candles.length > 25 ? candles[candles.length - 25].time : lastTime - 3600;

      const newDrawings: ChartDrawing[] = levels.map((lvl, idx) => ({
        id: `pivot_${Date.now()}_${idx}`,
        tool: 'horizontal',
        t1: firstTime,
        p1: lvl.price,
        t2: lastTime,
        p2: lvl.price,
        color: lvl.color,
        label: lvl.label,
      }));

      setDrawingsBySymbol((prev) => {
        const existing = (prev[selectedSymbol] || []).filter(
          (d) => !d.id.startsWith('pivot_')
        );
        return {
          ...prev,
          [selectedSymbol]: [...existing, ...newDrawings].slice(-49),
        };
      });
    },
    [candles, selectedSymbol]
  );

  const handleSaveAnalysis = async (formData: {
    title: string;
    targetPrice: number;
    stopLossPrice: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    notes: string;
  }) => {
    setIsSavingAnalysis(true);
    const id = sanitizeId(`analysis_${Date.now()}`);
    const sanitizedIndicators = indicators.slice(0, BLUEPRINT_LIMITS.INDICATORS_MAX_ITEMS);
    const sanitizedDrawings = currentDrawings
      .slice(0, BLUEPRINT_LIMITS.DRAWINGS_MAX_ITEMS)
      .map((d) => ({
        id: sanitizeId(d.id),
        tool: d.tool,
        t1: Number(d.t1),
        p1: Number(d.p1),
        t2: Number(d.t2),
        p2: Number(d.p2),
        ...(d.p3 !== undefined ? { p3: Number(d.p3) } : {}),
        color: String(d.color || '#0284C7').slice(0, 32),
        label: String(d.label || '').slice(0, 80),
      }));

    const record: SavedAnalysisRecord = {
      id,
      ownerId: user?.uid || 'local_guest',
      title: sanitizeString(formData.title, BLUEPRINT_LIMITS.TITLE_MAX_LEN, 'Technical Analysis'),
      symbol: sanitizeSymbol(currentAsset.symbol),
      assetClass: currentAsset.assetClass,
      timeframe,
      chartType,
      savedPrice: Number(currentAsset.price),
      targetPrice: Number(formData.targetPrice),
      stopLossPrice: Number(formData.stopLossPrice),
      direction: formData.direction,
      notes: sanitizeString(formData.notes, BLUEPRINT_LIMITS.NOTES_MAX_LEN, ''),
      indicators: sanitizedIndicators,
      drawings: sanitizedDrawings,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };

    try {
      if (user) {
        const docPath = `savedAnalyses/${id}`;
        try {
          await setDoc(doc(db, 'savedAnalyses', id), {
            ownerId: user.uid,
            title: record.title,
            symbol: record.symbol,
            assetClass: record.assetClass,
            timeframe: record.timeframe,
            chartType: record.chartType,
            savedPrice: record.savedPrice,
            targetPrice: record.targetPrice,
            stopLossPrice: record.stopLossPrice,
            direction: record.direction,
            notes: record.notes,
            indicators: record.indicators,
            drawings: record.drawings,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, docPath);
        }
      } else {
        setSavedAnalyses((prev) => [record, ...prev]);
      }
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  const handleLoadAnalysis = (rec: SavedAnalysisRecord) => {
    setSelectedSymbol(rec.symbol);
    setTimeframe(rec.timeframe);
    setChartType(rec.chartType);
    setIndicators(rec.indicators);
    setDrawingsBySymbol((prev) => ({
      ...prev,
      [rec.symbol]: rec.drawings || [],
    }));
  };

  const handleUpdateAnalysisNotes = async (rec: SavedAnalysisRecord, newNotes: string) => {
    const cleanNotes = sanitizeString(newNotes, BLUEPRINT_LIMITS.NOTES_MAX_LEN, '');
    if (user) {
      const docPath = `savedAnalyses/${rec.id}`;
      try {
        await updateDoc(doc(db, 'savedAnalyses', rec.id), {
          notes: cleanNotes,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      }
    } else {
      setSavedAnalyses((prev) =>
        prev.map((item) =>
          item.id === rec.id ? { ...item, notes: cleanNotes, updatedAtMs: Date.now() } : item
        )
      );
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    if (user) {
      const docPath = `savedAnalyses/${id}`;
      try {
        await deleteDoc(doc(db, 'savedAnalyses', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    } else {
      setSavedAnalyses((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleCreateAlert = async (alertInput: {
    symbol: string;
    assetClass: AssetClass;
    condition: AlertCondition;
    threshold: number;
    notifyTelegram: boolean;
    notifyEmail: boolean;
    note: string;
    rsiLowerBound?: number;
    rsiUpperBound?: number;
    rsiBreakoutDirection?: 'above' | 'below' | 'both';
    rsiTriggerColor?: string;
  }) => {
    const id = sanitizeId(`alert_${Date.now()}`);
    const newAlert: PriceAlertRecord = {
      id,
      ownerId: user?.uid || 'local_guest',
      symbol: sanitizeSymbol(alertInput.symbol),
      assetClass: alertInput.assetClass,
      condition: alertInput.condition,
      threshold: Number(alertInput.threshold),
      status: 'active',
      notifyTelegram: alertInput.notifyTelegram,
      notifyEmail: alertInput.notifyEmail,
      note: sanitizeString(alertInput.note, BLUEPRINT_LIMITS.ALERT_NOTE_MAX_LEN, ''),
      triggerCount: 0,
      rsiLowerBound: alertInput.rsiLowerBound,
      rsiUpperBound: alertInput.rsiUpperBound,
      rsiBreakoutDirection: alertInput.rsiBreakoutDirection,
      rsiTriggerColor: alertInput.rsiTriggerColor,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };

    if (user) {
      const docPath = `priceAlerts/${id}`;
      try {
        await setDoc(doc(db, 'priceAlerts', id), {
          ownerId: user.uid,
          symbol: newAlert.symbol,
          assetClass: newAlert.assetClass,
          condition: newAlert.condition,
          threshold: newAlert.threshold,
          status: 'active',
          notifyTelegram: newAlert.notifyTelegram,
          notifyEmail: newAlert.notifyEmail,
          note: newAlert.note,
          triggerCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, docPath);
      }
    } else {
      setPriceAlerts((prev) => [newAlert, ...prev]);
    }
  };

  const handleSetTrendlineAlert = async (drawing: ChartDrawing, targetPrice: number) => {
    const id = sanitizeId(`tl_alert_${Date.now()}`);
    const noteText = sanitizeString(
      `ជូនដំណឹងនៅពេល ${currentAsset.symbol} ប៉ះខ្សែ Trendline (@ ${formatPrice(targetPrice, currentAsset.symbol)})`,
      BLUEPRINT_LIMITS.ALERT_NOTE_MAX_LEN,
      'Trendline Touch Alert'
    );
    const newAlert: PriceAlertRecord = {
      id,
      ownerId: user?.uid || 'local_guest',
      symbol: sanitizeSymbol(currentAsset.symbol),
      assetClass: currentAsset.assetClass,
      condition: 'trendline_touch',
      threshold: Number(targetPrice.toPrecision(7)),
      status: 'active',
      notifyTelegram: true,
      notifyEmail: true,
      note: noteText,
      triggerCount: 0,
      drawingId: drawing.id,
      t1: drawing.t1,
      p1: drawing.p1,
      t2: drawing.t2,
      p2: drawing.p2,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };

    if (user) {
      const docPath = `priceAlerts/${id}`;
      try {
        await setDoc(doc(db, 'priceAlerts', id), {
          ownerId: user.uid,
          symbol: newAlert.symbol,
          assetClass: newAlert.assetClass,
          condition: newAlert.condition,
          threshold: newAlert.threshold,
          status: 'active',
          notifyTelegram: newAlert.notifyTelegram,
          notifyEmail: newAlert.notifyEmail,
          note: newAlert.note,
          triggerCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, docPath);
      }
    } else {
      setPriceAlerts((prev) => [newAlert, ...prev]);
    }

    setRightPanelTab('alerts');
  };

  const handleToggleAlertStatus = async (alert: PriceAlertRecord) => {
    const nextStatus = alert.status === 'active' ? 'paused' : 'active';
    if (user) {
      const docPath = `priceAlerts/${alert.id}`;
      try {
        await updateDoc(doc(db, 'priceAlerts', alert.id), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      }
    } else {
      setPriceAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, status: nextStatus } : a))
      );
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (user) {
      const docPath = `priceAlerts/${id}`;
      try {
        await deleteDoc(doc(db, 'priceAlerts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    } else {
      setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleMarkLogReviewed = async (log: AlertLogRecord, reviewNote: string) => {
    const nextReviewed = !log.reviewed;
    const cleanNote = sanitizeString(reviewNote, BLUEPRINT_LIMITS.REVIEW_NOTE_MAX_LEN, '');
    if (user) {
      const docPath = `alertLogs/${log.id}`;
      try {
        await updateDoc(doc(db, 'alertLogs', log.id), {
          reviewed: nextReviewed,
          reviewNote: cleanNote,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      }
    } else {
      setAlertLogs((prev) =>
        prev.map((l) =>
          l.id === log.id ? { ...l, reviewed: nextReviewed, reviewNote: cleanNote } : l
        )
      );
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (user) {
      const docPath = `alertLogs/${id}`;
      try {
        await deleteDoc(doc(db, 'alertLogs', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    } else {
      setAlertLogs((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleSaveNotificationConfig = async (cfg: NotificationConfigRecord) => {
    const sanitized: NotificationConfigRecord = {
      ownerId: user?.uid || 'local_guest',
      emailEnabled: Boolean(cfg.emailEnabled),
      recipientEmail: String(cfg.recipientEmail || '').trim().slice(0, BLUEPRINT_LIMITS.EMAIL_MAX_LEN),
      emailWebhookUrl: String(cfg.emailWebhookUrl || '').trim().slice(0, BLUEPRINT_LIMITS.WEBHOOK_MAX_LEN),
      telegramEnabled: Boolean(cfg.telegramEnabled),
      telegramBotToken: String(cfg.telegramBotToken || '').trim().slice(0, BLUEPRINT_LIMITS.TG_TOKEN_MAX_LEN),
      telegramChatId: String(cfg.telegramChatId || '').trim().slice(0, BLUEPRINT_LIMITS.TG_CHAT_MAX_LEN),
      soundEnabled: Boolean(cfg.soundEnabled),
      autoSpikeThresholdPct: Math.min(50, Math.max(0.1, Number(cfg.autoSpikeThresholdPct || 1.5))),
    };

    setNotificationConfig(sanitized);

    if (user) {
      const docPath = `notificationConfigs/${user.uid}`;
      try {
        await setDoc(doc(db, 'notificationConfigs', user.uid), {
          ...sanitized,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    }
  };

  const handleSendTestNotification = async (cfg: NotificationConfigRecord) => {
    if (cfg.soundEnabled) {
      playAlertTone('target');
    }
    try {
      const resp = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: currentAsset.symbol,
          conditionLabel: 'សារសាកល្បងប្រព័ន្ធជូនដំណឹង (Test Alert)',
          triggerPrice: currentAsset.price,
          changePercent: currentAsset.change24h,
          note: 'ប្រព័ន្ធដាស់តឿន KramaView Pro ដំណើរការបានត្រឹមត្រូវ!',
          telegramEnabled: cfg.telegramEnabled,
          telegramBotToken: cfg.telegramBotToken,
          telegramChatId: cfg.telegramChatId,
          emailEnabled: cfg.emailEnabled,
          recipientEmail: cfg.recipientEmail,
          emailWebhookUrl: cfg.emailWebhookUrl,
        }),
      });
      const data = await resp.json();
      const tgResult = data.results?.telegram;
      const emailResult = data.results?.email;

      const messages: string[] = [];
      if (tgResult) messages.push(`Telegram: ${tgResult.detail}`);
      if (emailResult) messages.push(`Email: ${emailResult.detail}`);
      if (messages.length === 0) {
        messages.push('សូមចុចប៊ូតុងបើក (ON) យ៉ាងហោចណាស់ Email ឬ Telegram ដើម្បីផ្ញើសារសាកល្បង។');
      }

      return {
        ok: Boolean(tgResult?.ok || emailResult?.ok),
        message: messages.join(' · '),
        emailPreviewUrl: emailResult?.previewUrl,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'បរាជ័យក្នុងការភ្ជាប់ទៅម៉ាស៊ីនមេ',
      };
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in cancelled');
    }
  };

  const toggleIndicator = (id: IndicatorId) => {
    setIndicators((prev) => {
      const target = INDICATORS_LIST.find((i) => i.id === id);
      if (target?.group === 'oscillator') {
        const withoutOtherOsc = prev.filter(
          (item) => INDICATORS_LIST.find((x) => x.id === item)?.group !== 'oscillator'
        );
        return [...withoutOtherOsc, id];
      }
      return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
    });
  };

  const filteredWatchlist = useMemo(() => {
    return assets.filter((a) => {
      if (assetFilter !== 'ALL' && a.assetClass !== assetFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.symbol.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.khmerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assets, assetFilter, searchQuery]);

  const orderBook = useMemo(() => generateOrderBook(currentAsset.price), [currentAsset.price]);

  const handleExportCandlesCsv = useCallback(() => {
    const sourceCandles =
      candles.length > 0 ? candles : generateHistoricalCandles(currentAsset, timeframe, 160);
    if (sourceCandles.length === 0) return;

    const ema20 = calculateEMA(sourceCandles, 20);
    const ema50 = calculateEMA(sourceCandles, 50);
    const rsi14 = calculateRSI(sourceCandles, 14);
    const vwap = calculateVWAP(sourceCandles);

    const headers = [
      'Timestamp_ISO',
      'Unix_Time',
      'Symbol',
      'Exchange',
      'Timeframe',
      'Open',
      'High',
      'Low',
      'Close',
      'Volume',
      'Change_Pct',
      'EMA20',
      'EMA50',
      'RSI14',
      'VWAP',
    ];

    const escapeCsvCell = (val: string | number) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = sourceCandles.map((c, idx) => {
      const isoTime = new Date(c.time * 1000).toISOString();
      const changePct = c.open > 0 ? (((c.close - c.open) / c.open) * 100).toFixed(4) : '0.0000';
      const e20 = ema20[idx] !== null && ema20[idx] !== undefined ? ema20[idx]!.toFixed(4) : '';
      const e50 = ema50[idx] !== null && ema50[idx] !== undefined ? ema50[idx]!.toFixed(4) : '';
      const r14 = rsi14[idx] !== null && rsi14[idx] !== undefined ? rsi14[idx]!.toFixed(2) : '';
      const vw = vwap[idx] !== null && vwap[idx] !== undefined ? vwap[idx]!.toFixed(4) : '';

      return [
        isoTime,
        c.time,
        currentAsset.symbol,
        currentAsset.exchange,
        timeframe,
        c.open,
        c.high,
        c.low,
        c.close,
        Math.round(c.volume),
        changePct,
        e20,
        e50,
        r14,
        vw,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const cleanSymbol = currentAsset.symbol.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KramaView_${cleanSymbol}_${timeframe}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [candles, currentAsset, timeframe]);

  const renderDockTabContent = (tab: 'autobot' | 'exness' | 'quant' | 'watchlist' | 'saved' | 'alerts') => {
    switch (tab) {
      case 'autobot':
        return (
          <SmartAutoTradingBotPanel
            asset={currentAsset}
            allAssets={assets}
            candles={candles}
            timeframe={timeframe}
            exnessAccountType={exnessAccountType}
            openPositions={exnessPositions}
            smartExitSettings={smartExitSettings}
            onUpdateSmartExitSettings={setSmartExitSettings}
            onExecuteTrade={handleQuickTrade}
            onClosePosition={handleCloseMt5Position}
            onCloseAllPositions={() => handleCloseAllMt5Positions('ALL')}
          />
        );
      case 'exness':
        return (
          <ExnessWebTradingPanel
            asset={currentAsset}
            allAssets={assets}
            candles={candles}
            timeframe={timeframe}
            accountType={exnessAccountType}
            onSelectAccountType={(t) => {
              setExnessAccountType(t);
              setMt5Session((prev) => ({
                ...prev,
                accountType: t,
                currency: t === 'standard_cent' ? 'USC' : 'USD',
              }));
            }}
            leverage={exnessLeverage}
            onSelectLeverage={(lev) => {
              setExnessLeverage(lev);
              setMt5Session((prev) => ({ ...prev, leverage: lev }));
            }}
            priceOffset={priceOffsetsBySymbol[currentAsset.symbol] || 0}
            onCalibrateExactPrice={handleCalibrateExnessPrice}
            onResetPriceOffset={handleResetExnessPriceOffset}
            showBidAskLines={showExnessBidAskLines}
            onToggleBidAskLines={() => setShowExnessBidAskLines((prev) => !prev)}
            mt5Session={mt5Session}
            onUpdateMt5Session={setMt5Session}
            positions={exnessPositions}
            closedDeals={exnessClosedDeals}
            onOpenSyncedPosition={handleOpenMt5Position}
            onUpdateSyncedPosition={handleUpdateMt5Position}
            onCloseSyncedPosition={handleCloseMt5Position}
            onCloseAllPositions={handleCloseAllMt5Positions}
            onClearClosedDeals={() => setExnessClosedDeals([])}
            onPlotTradeSetupOnChart={handleAddDrawing}
          />
        );
      case 'quant':
        return (
          <GlobalPrecisionAnalysisPanel
            currentAsset={currentAsset}
            allAssets={assets}
            candles={candles}
            timeframe={timeframe}
            isSyncingGlobalQuotes={isSyncingGlobalQuotes}
            lastGlobalSyncTime={lastGlobalSyncTime}
            onSyncGlobalQuotes={syncGlobalMarketQuotes}
            onSelectSymbol={(sym) => setSelectedSymbol(sym)}
            onQuickPriceAlert={(price) => {
              setPresetAlertPrice(price);
              handleOpenPanel('alerts');
            }}
            onPlotPivotLevelsOnChart={handlePlotPivotLevelsOnChart}
            onPlotTradeSetupOnChart={handleAddDrawing}
            onQuickSavePrecisionAnalysis={(formData) => {
              handleSaveAnalysis(formData);
            }}
          />
        );
      case 'watchlist':
        return (
          <div className="flex-1 flex flex-col min-h-0 divide-y divide-slate-200 dark:divide-slate-800/80">
            {/* Top Sentiment Section: Crypto Fear & Greed vs General Market Sentiment Switcher */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-2 pb-0 shrink-0">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setWatchlistSentimentTab('crypto_fng')}
                  className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md transition-all ${
                    watchlistSentimentTab === 'crypto_fng'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="truncate">Crypto Fear & Greed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatchlistSentimentTab('general')}
                  className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md transition-all ${
                    watchlistSentimentTab === 'general'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5 text-sky-500" />
                  <span className="truncate">អារម្មណ៍ទូទៅ (Breadth)</span>
                </button>
              </div>
            </div>

            {/* Sentiment Body */}
            <div className="shrink-0">
              {watchlistSentimentTab === 'crypto_fng' ? (
                <CryptoFearAndGreedWidget
                  onSelectSymbol={(sym) => setSelectedSymbol(sym)}
                  selectedSymbol={selectedSymbol}
                />
              ) : (
                <MarketSentimentWidget
                  assets={assets}
                  assetFilter={assetFilter}
                  onSelectSymbol={(sym) => setSelectedSymbol(sym)}
                />
              )}
            </div>

            {/* Auto-Connected All Markets Live Status Banner */}
            <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-amber-500/10 dark:from-emerald-950/40 dark:via-sky-950/30 dark:to-amber-950/30 border-b border-emerald-500/20 dark:border-emerald-500/30 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span>ភ្ជាប់ទីផ្សារទាំងអស់ដោយស្វ័យប្រវត្តិ</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        {assets.length}/{INITIAL_ASSETS.length} ផ្សាយផ្ទាល់
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                      <span>Binance WS ⚡ · NYMEX · LBMA · NASDAQ · CSX</span>
                      {lastGlobalSyncTime && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          (អាប់ដេត ៤វិនាទី)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => syncGlobalMarketQuotes()}
                  disabled={isSyncingGlobalQuotes}
                  title="ទាញយក និងភ្ជាប់ទិន្នន័យទីផ្សារទាំងអស់ភ្លាមៗ (Sync All Markets Now)"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all shrink-0 shadow-2xs disabled:opacity-60 cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncingGlobalQuotes ? 'animate-spin' : ''}`} />
                  <span>{isSyncingGlobalQuotes ? 'កំពុងភ្ជាប់...' : 'Sync ទាំងអស់'}</span>
                </button>
              </div>
            </div>

            {/* Search, 4-Category Filter & Historical Candle CSV Export */}
            <div className="p-3 space-y-2.5 bg-slate-50/80 dark:bg-slate-900/30 shrink-0">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                    ទិន្នន័យទៀនប្រវត្តិសាស្ត្រ ({currentAsset.symbol})
                  </div>
                  <div className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {timeframe} · {candles.length} ទៀន (OHLCV + Indicators)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCandlesCsv}
                  title={`Export ${currentAsset.symbol} (${timeframe}) historical candles to CSV`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>ទាញយក CSV</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ស្វែងរក មាស, ប្រេង USOIL, គ្រីបតូ, ភាគហ៊ុន..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-md border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssetFilter('ALL')}
                  className={`py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    assetFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  ទាំងអស់
                </button>
                <button
                  type="button"
                  onClick={() => setAssetFilter('gold')}
                  className={`py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    assetFilter === 'gold'
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
                  }`}
                >
                  មាស & ប្រេង
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssetFilter('crypto');
                    setWatchlistSentimentTab('crypto_fng');
                  }}
                  className={`py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    assetFilter === 'crypto'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  គ្រីបតូ
                </button>
                <button
                  type="button"
                  onClick={() => setAssetFilter('stock')}
                  className={`py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    assetFilter === 'stock'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  ភាគហ៊ុន
                </button>
              </div>
            </div>

            {/* High-Density Instrument Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#0B0F17] border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                  <tr>
                    <th className="py-2 pl-3.5 font-medium">និមិត្តសញ្ញា</th>
                    <th className="py-2 text-right font-medium">តម្លៃបច្ចុប្បន្ន</th>
                    <th className="py-2 pr-3.5 text-right font-medium">24h %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/50 text-xs">
                  {filteredWatchlist.map((item) => {
                    const isSelected = item.symbol === selectedSymbol;
                    const isUp = item.change24h >= 0;
                    const isEnergy = item.subCategory === 'energy';
                    const isGold = item.assetClass === 'gold' && !isEnergy;
                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => setSelectedSymbol(item.symbol)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? isEnergy
                              ? 'bg-cyan-500/15 hover:bg-cyan-500/20'
                              : isGold
                                ? 'bg-amber-500/15 hover:bg-amber-500/20'
                                : 'bg-sky-500/10 hover:bg-sky-500/15'
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/70'
                        }`}
                      >
                        <td className="py-2.5 pl-3.5">
                          <div className="flex items-center gap-2.5">
                            <AssetBadgeIcon asset={item} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`font-mono font-bold ${
                                    isEnergy
                                      ? 'text-cyan-700 dark:text-cyan-300'
                                      : isGold
                                        ? 'text-amber-700 dark:text-amber-300'
                                        : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {item.symbol}
                                </span>
                                <span
                                  className={`px-1 py-0.2 rounded text-[9px] font-mono font-semibold ${
                                    item.exchange === 'BINANCE'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                      : item.subCategory === 'energy'
                                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20'
                                        : item.assetClass === 'gold'
                                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                          : item.exchange === 'CSX'
                                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                                            : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                  }`}
                                >
                                  {item.exchange === 'BINANCE'
                                    ? 'WS LIVE'
                                    : item.exchange === 'CSX'
                                      ? 'CSX 4s'
                                      : item.exchange.includes('LBMA') || item.symbol.includes('GOLD')
                                        ? 'LBMA 4s'
                                        : item.subCategory === 'energy'
                                          ? 'NYMEX 4s'
                                          : 'NASDAQ 4s'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                {item.khmerName} · {item.unitLabel || item.exchange}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {formatPrice(item.price, item.symbol)}
                        </td>
                        <td
                          className={`py-2.5 pr-3.5 text-right font-mono tabular-nums font-semibold ${
                            isUp
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isUp ? '+' : ''}
                          {item.change24h.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Live Order Book Depth Snapshot */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 shrink-0 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  បញ្ជីបញ្ជាទិញ/លក់ផ្ទាល់ ({currentAsset.symbol})
                </span>
                <span className="text-slate-500 font-mono">Order Book</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono tabular-nums">
                {/* Bids (Buy Orders) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 pb-0.5 border-b border-slate-200 dark:border-slate-800">
                    <span>ថ្លៃទិញ (Bid)</span>
                    <span>បរិមាណ</span>
                  </div>
                  {orderBook.bids.slice(0, 5).map((b, i) => (
                    <div key={i} className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>{formatPrice(b.price, currentAsset.symbol)}</span>
                      <span className="text-slate-600 dark:text-slate-400">{b.size}</span>
                    </div>
                  ))}
                </div>

                {/* Asks (Sell Orders) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 pb-0.5 border-b border-slate-200 dark:border-slate-800">
                    <span>ថ្លៃលក់ (Ask)</span>
                    <span>បរិមាណ</span>
                  </div>
                  {orderBook.asks.slice(-5).reverse().map((a, i) => (
                    <div key={i} className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>{formatPrice(a.price, currentAsset.symbol)}</span>
                      <span className="text-slate-600 dark:text-slate-400">{a.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'saved':
        return (
          <SaveReviewPanel
            currentAsset={currentAsset}
            allAssets={assets}
            timeframe={timeframe}
            chartType={chartType}
            indicators={indicators}
            drawings={currentDrawings}
            savedAnalyses={savedAnalyses}
            isSaving={isSavingAnalysis}
            language={language}
            onSaveAnalysis={handleSaveAnalysis}
            onLoadAnalysis={handleLoadAnalysis}
            onUpdateAnalysisNotes={handleUpdateAnalysisNotes}
            onDeleteAnalysis={handleDeleteAnalysis}
          />
        );
      case 'alerts':
        return (
          <AlertsAndChannelsPanel
            currentAsset={currentAsset}
            currentRsi={currentRsi}
            alerts={priceAlerts}
            alertLogs={alertLogs}
            notificationConfig={notificationConfig}
            presetAlertPrice={presetAlertPrice}
            onClearPresetPrice={() => setPresetAlertPrice(null)}
            onCreateAlert={handleCreateAlert}
            onToggleAlertStatus={handleToggleAlertStatus}
            onDeleteAlert={handleDeleteAlert}
            onMarkLogReviewed={handleMarkLogReviewed}
            onDeleteLog={handleDeleteLog}
            onClearAllLogs={() => setAlertLogs([])}
            onSaveNotificationConfig={handleSaveNotificationConfig}
            onSendTestNotification={handleSendTestNotification}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-[#E2E8F0] select-none transition-colors duration-150">
      {/* 1. TOP HEADER WITH USER-ACCESSIBLE THEME TOGGLE */}
      <header className="flex items-center justify-between gap-8 px-5 h-12 border-b border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B0F17] shrink-0 transition-colors">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#workspace"
          className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          KramaView Pro
        </a>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => handleOpenPanel('autobot')}
            className={`flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
              rightPanelTab === 'autobot'
                ? 'text-[#10B981] font-bold underline underline-offset-4 decoration-[#10B981]'
                : ''
            }`}
          >
            <Bot className="w-4 h-4 text-[#10B981]" />
            <span>{t('nav.autobot', language)}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenPanel('exness')}
            className={`flex items-center gap-1.5 hover:text-amber-600 dark:hover:text-[#FFCF01] transition-colors whitespace-nowrap shrink-0 py-1 ${
              rightPanelTab === 'exness'
                ? 'text-amber-600 dark:text-[#FFCF01] font-bold underline underline-offset-4 decoration-amber-500 dark:decoration-[#FFCF01]'
                : ''
            }`}
          >
            <span className="px-1.5 py-0.2 rounded bg-[#FFCF01] text-slate-950 font-black text-[10px]">
              EX
            </span>
            <span>{t('nav.exness', language)}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenPanel('quant')}
            className={`hover:text-sky-600 dark:hover:text-sky-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
              rightPanelTab === 'quant'
                ? 'text-sky-600 dark:text-sky-300 font-bold underline underline-offset-4 decoration-sky-500 dark:decoration-sky-400'
                : ''
            }`}
          >
            {t('nav.quant', language)} ({currentPrecisionSummary.overallScore}%)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedSymbol(currentAsset.subCategory === 'energy' ? 'XAU/USD' : 'USOIL');
              setAssetFilter('gold');
              handleOpenPanel('watchlist');
            }}
            className={`hover:text-amber-600 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
              currentAsset.assetClass === 'gold' && rightPanelTab === 'watchlist'
                ? 'text-amber-600 dark:text-amber-300 underline underline-offset-4 decoration-amber-500 dark:decoration-amber-400'
                : ''
            }`}
          >
            {t('nav.goldOil', language)}
          </button>
          <button
            type="button"
            onClick={() => {
              setAssetFilter('ALL');
              handleOpenPanel('watchlist');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              rightPanelTab === 'watchlist' && currentAsset.assetClass !== 'gold'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-sky-500 dark:decoration-sky-400'
                : ''
            }`}
          >
            {t('nav.stocksCrypto', language)}
          </button>
          <button
            type="button"
            onClick={() => handleOpenPanel('saved')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              rightPanelTab === 'saved'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-sky-500 dark:decoration-sky-400'
                : ''
            }`}
          >
            {t('nav.saved', language)} ({savedAnalyses.length})
          </button>
          <button
            type="button"
            onClick={() => handleOpenPanel('alerts')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              rightPanelTab === 'alerts'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-4 decoration-sky-500 dark:decoration-sky-400'
                : ''
            }`}
          >
            {t('nav.alerts', language)} ({priceAlerts.filter((a) => a.status === 'active').length})
          </button>
        </nav>

        {/* Zone 3: Exness WebTerminal Direct Link + Real Trade + Language Selector + Theme Toggle + Cloud Sync Auth */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://my.exness.direct/webtrading/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-950 bg-[#FFCF01] hover:bg-[#f5c400] rounded-lg shadow-xs transition-all whitespace-nowrap shrink-0"
            title="Exness WebTrading (my.exness.direct/webtrading)"
          >
            <span>Exness WebTrading</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => setShowRealBrokerModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg shadow-2xs transition-all whitespace-nowrap shrink-0"
            title="Real Execution Gateway"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">{t('nav.realTrade', language)}</span>
            <span className="sm:hidden">Real Trade</span>
          </button>

          {/* Language Selector Dropdown (កម្មវិធីជ្រើសរើសភាសា) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLanguageDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title={language === 'km' ? 'ជ្រើសរើសភាសា (Change Language)' : 'Select Language'}
              aria-expanded={showLanguageDropdown}
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>{language === 'km' ? '🇰🇭 ភាសាខ្មែរ' : '🇬🇧 English'}</span>
            </button>

            {showLanguageDropdown && (
              <div
                className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#131A26] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setShowLanguageDropdown(false)}
              >
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  {t('nav.languageSelect', language)}
                </div>
                {SUPPORTED_LANGUAGES.map((langOpt) => (
                  <button
                    key={langOpt.code}
                    type="button"
                    onClick={() => {
                      setLanguage(langOpt.code);
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left ${
                      language === langOpt.code
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{langOpt.flag}</span>
                      <span>{langOpt.nativeName}</span>
                    </div>
                    {language === langOpt.code && (
                      <span className="text-sky-500 text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'ប្តូរទៅផ្ទៃភ្លឺ (Light Theme)' : 'ប្តូរទៅផ្ទៃងងឹត (Dark Theme)'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('nav.lightTheme', language)}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>{t('nav.darkTheme', language)}</span>
              </>
            )}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title={`Signed in as ${user.email}`}
            >
              {t('nav.account', language)}: {user.displayName || user.email?.split('@')[0]} ({t('nav.signOut', language)})
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t('nav.cloudSignIn', language)}
            </button>
          )}
        </div>
      </header>

      {/* REAL-TIME VOLATILITY / PRICE ALERT POPUP BANNER */}
      {liveBannerAlert && (
        <div className="fixed top-14 right-5 z-50 max-w-md bg-white/95 dark:bg-slate-900/95 border border-amber-500/60 rounded-xl shadow-2xl p-3.5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  ⚡ ការជូនដំណឹងបន្ទាន់៖ {liveBannerAlert.symbol}
                </span>
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                  {formatPrice(liveBannerAlert.price, liveBannerAlert.symbol)}
                </span>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    liveBannerAlert.changePct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ({liveBannerAlert.changePct >= 0 ? '+' : ''}
                  {liveBannerAlert.changePct.toFixed(2)}%)
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200">{liveBannerAlert.title}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span>បញ្ជូនតាម៖ {liveBannerAlert.channels}</span>
                {liveBannerAlert.emailPreviewUrl && (
                  <a
                    href={liveBannerAlert.emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>បើកមើលអ៊ីមែល</span>
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveBannerAlert(null)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {authError && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-5 py-1.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span>មិនអាចភ្ជាប់គណនី Google៖ {authError} (ទិន្នន័យកំពុងរក្សាទុកក្នុងឧបករណ៍ផ្ទាល់)</span>
          <button type="button" onClick={() => setAuthError(null)} className="text-rose-700 dark:text-rose-200">
            បិទ
          </button>
        </div>
      )}

      {/* 2. INSTRUMENT TICKER + TIMEFRAME + CHART TYPE + INDICATOR TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-slate-900/40 shrink-0 transition-colors">
        {/* Left: Active Instrument Price & 24h Telemetry */}
        <div className="flex items-center gap-3">
          <AssetBadgeIcon asset={currentAsset} size="lg" showGlow={true} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                {currentAsset.symbol}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
                {currentAsset.khmerName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>{currentAsset.exchange}</span>
              {currentAsset.unitLabel && (
                <>
                  <span>·</span>
                  <span className="text-amber-700 dark:text-amber-400/90">{currentAsset.unitLabel}</span>
                </>
              )}
              <span>·</span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  isStreamPaused
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}
              >
                {!isStreamPaused && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <span>
                  {isStreamPaused
                    ? 'PAUSED (ផ្អាក)'
                    : isAllWatchlistConnected
                      ? 'ភ្ជាប់ស្វ័យប្រវត្តិ ២១ ទីផ្សារ (21 Live)'
                      : dataSourceLabel}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span
              className={`text-base font-bold ${
                currentAsset.change24h >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatPrice(currentAsset.price, currentAsset.symbol)}
            </span>
            <span
              className={`flex items-center text-xs font-semibold ${
                currentAsset.change24h >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {currentAsset.change24h >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {currentAsset.change24h >= 0 ? '+' : ''}
              {currentAsset.change24h.toFixed(2)}%
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums border-l border-slate-300 dark:border-slate-800 pl-4">
            <div>
              <span className="text-slate-500 mr-1">24h High</span>
              <span className="text-slate-800 dark:text-slate-200">
                {formatPrice(currentAsset.high24h, currentAsset.symbol)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">24h Low</span>
              <span className="text-slate-800 dark:text-slate-200">
                {formatPrice(currentAsset.low24h, currentAsset.symbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Timeframes (1s to 1Y), Chart Types, Technical Indicators & Quick Save */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Horizon Timeframe Selector: Seconds (វិនាទី) up to Year (ឆ្នាំ) */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-300 dark:border-slate-800 overflow-x-auto max-w-full">
            {TIMEFRAMES.map((tf) => {
              const meta = TIMEFRAME_METADATA.find((m) => m.id === tf);
              const isSec = tf.endsWith('s');
              const isMacro = tf === '1M' || tf === '3M' || tf === '6M' || tf === '1Y';
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  title={meta?.khmerLabel || tf}
                  className={`px-1.5 py-1 text-[11px] font-mono rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    timeframe === tf
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-2xs'
                      : isSec
                      ? 'text-cyan-700 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                      : isMacro
                      ? 'text-amber-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {tf}
                </button>
              );
            })}

            {/* Grouped Khmer Timeframe Dropdown (វិនាទី → ឆ្នាំ) */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              aria-label="ជ្រើសរើសរយៈពេលក្រាហ្វពីវិនាទីដល់ឆ្នាំ (Timeframe Selector)"
              className="ml-1 pl-1.5 pr-1 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer"
            >
              <optgroup label="វិនាទី (Seconds)">
                {TIMEFRAME_METADATA.filter((m) => m.group === 'seconds').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.khmerLabel}
                  </option>
                ))}
              </optgroup>
              <optgroup label="នាទី (Minutes)">
                {TIMEFRAME_METADATA.filter((m) => m.group === 'minutes').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.khmerLabel}
                  </option>
                ))}
              </optgroup>
              <optgroup label="ម៉ោង (Hours)">
                {TIMEFRAME_METADATA.filter((m) => m.group === 'hours').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.khmerLabel}
                  </option>
                ))}
              </optgroup>
              <optgroup label="ថ្ងៃ / សប្តាហ៍ / ខែ / ឆ្នាំ (Macro)">
                {TIMEFRAME_METADATA.filter((m) => m.group === 'macro').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.khmerLabel}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {localizedChartTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.label}
              </option>
            ))}
          </select>

          {/* Technical Indicators Toggles */}
          <div className="hidden lg:flex items-center gap-1 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-300 dark:border-slate-800">
            {INDICATORS_LIST.map((ind) => {
              const active = indicators.includes(ind.id);
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => toggleIndicator(ind.id)}
                  className={`px-2 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-sky-500/15 dark:bg-slate-800 text-sky-700 dark:text-sky-400 font-semibold border border-sky-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {ind.label}
                </button>
              );
            })}
          </div>

          {/* Split-View Dual-Timeframe Toggle Button + Inline Secondary Timeframe Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsSplitView((prev) => {
                  const next = !prev;
                  if (next && secondaryTimeframe === timeframe) {
                    setSecondaryTimeframe(timeframe === '1H' ? '15m' : '1H');
                  }
                  return next;
                });
              }}
              title="បំបែកក្រាហ្វជា ២ ដើម្បីប្រៀបធៀបរយៈពេល ២ ផ្សេងគ្នាទន្ទឹមគ្នា (Split-View Dual Timeframe)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isSplitView
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>បំបែកក្រាហ្វ ២ (Split-View)</span>
            </button>

            {isSplitView && (
              <div className="flex items-center gap-1 pl-1.5 pr-1 border-l border-slate-200 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  ក្រាហ្វទី ២៖
                </span>
                <select
                  value={secondaryTimeframe}
                  onChange={(e) => setSecondaryTimeframe(e.target.value as Timeframe)}
                  aria-label="Secondary chart timeframe selector"
                  className="bg-sky-500/15 text-sky-700 dark:text-sky-300 font-mono font-bold px-1.5 py-0.5 rounded border border-sky-500/30 focus:outline-none cursor-pointer"
                >
                  {TIMEFRAME_METADATA.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {m.khmerLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Pause / Resume Real-Time Stream Button */}
          <button
            type="button"
            onClick={() => setIsStreamPaused((prev) => !prev)}
            aria-pressed={isStreamPaused}
            title={
              isStreamPaused
                ? 'បន្តការផ្សាយផ្ទាល់តម្លៃទីផ្សារ និង WebSocket (Resume Real-Time Stream)'
                : 'ផ្អាកការផ្សាយផ្ទាល់តម្លៃទីផ្សារ និង WebSocket ដើម្បីពិនិត្យក្រាហ្វ (Pause Real-Time Stream)'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isStreamPaused
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-2xs'
                : 'bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-800'
            }`}
          >
            {isStreamPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>បន្តផ្សាយផ្ទាល់ (Resume)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Pause className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>ផ្អាកក្រាហ្វ (Pause)</span>
              </>
            )}
          </button>

          {/* Quick Open Save Panel Button */}
          <button
            type="button"
            onClick={() => handleOpenPanel('saved')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-800 dark:text-emerald-300 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>រក្សាទុកក្រាហ្វ</span>
          </button>

          {/* Clean View / Pop-out Mode Toggle (ផ្ទាំងស្រលះ ពេលប៉ះលោតចេញមក) */}
          <button
            type="button"
            onClick={() => {
              setIsCleanView((prev) => !prev);
              setActivePopoutTab(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              isCleanView
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sky-500/20 ring-2 ring-sky-300/40'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
            title="លាក់កម្មវិធីផ្សេងៗពេលប៉ះ លោតចេញមក ដើម្បីអោយស្រលះចេញផ្ទាំងទៀន ស្រួលមើល (Toggle Clean View)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCleanView ? 'text-amber-300 animate-pulse' : 'text-sky-500'}`} />
            <span>{isCleanView ? '✨ ផ្ទាំងស្រលះ (បើក)' : '✨ ផ្ទាំងស្រលះ (Clean)'}</span>
          </button>
        </div>
      </div>

      {/* 2B. SMART GOLD INTELLIGENCE & CAMBODIAN DAMLEUNG/CHI CONVERSION STRIP */}
      {isCleanView ? (
        <div className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-[#0B0F17] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs transition-colors shrink-0">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="flex items-center gap-1.5 font-bold text-amber-500 text-[11px] shrink-0">
              <AssetBadgeIcon asset={currentAsset} size="xs" />
              <span>មាស & ប្រេង (USOIL) Live:</span>
            </span>
            <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 shrink-0">
              {currentAsset.name} ({currentAsset.symbol}):{' '}
              <strong className="text-amber-500 dark:text-amber-400 font-bold">
                {formatPrice(currentAsset.price, currentAsset.symbol)}
              </strong>
            </span>
          </div>

          {/* Clean View Quick Tool Launchers Moved to Top Bar (ខាងលើ) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {!isChartMaximized && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenPanel('autobot')}
                  title="Auto-Bot"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Bot className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>{t('float.bot', language)}</span>
                  {exnessPositions.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black">
                      {exnessPositions.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPanel('exness')}
                  title="Exness WebTrading & MT5 Terminal"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span className="px-1 py-0.2 rounded bg-[#FFCF01] text-slate-950 font-black text-[9px]">
                    EX
                  </span>
                  <span>{t('float.exness', language)}</span>
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-300">
                    {exnessPositions.length > 0 ? `${exnessPositions.length} orders` : 'MT5'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPanel('quant')}
                  title="Quant Precision Analysis"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-700 dark:text-sky-300 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{t('float.quant', language)}</span>
                  <span className="text-[10px] font-bold">
                    {currentPrecisionSummary.overallScore}%
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPanel('watchlist')}
                  title="Market Watchlist"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{t('float.market', language)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPanel('saved')}
                  title={`Saved Analyses (${savedAnalyses.length})`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Bookmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t('float.saved', language)}</span>
                  {savedAnalyses.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {savedAnalyses.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPanel('alerts')}
                  title={`Alerts (${priceAlerts.filter((a) => a.status === 'active').length})`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Bell className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{t('float.alerts', language)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCleanView(false)}
                  title="ប្ដូរមករបៀបចំហៀងធម្មតា (Switch to Docked Panel)"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <PanelRightClose className="w-3.5 h-3.5 shrink-0" />
                  <span>ចំហៀង</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowGoldConversionPopout((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/35 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            >
              <span>{showGoldConversionPopout ? '▲ បង្រួមរបារមាស' : '▼ របារគណនាដំឡឹង/ជី'}</span>
            </button>
          </div>
        </div>
      ) : null}

      {(!isCleanView || showGoldConversionPopout) && (
        <SmartGoldIntelligenceBar
          assets={assets}
          currentAsset={currentAsset}
          onSelectSymbol={(sym) => setSelectedSymbol(sym)}
          onQuickGoldAlert={(sym, price) => {
            setSelectedSymbol(sym);
            setPresetAlertPrice(price);
            handleOpenPanel('alerts');
          }}
        />
      )}

      {/* 3. MAIN WORKSPACE: LEFT DRAWING RAIL + CENTER INTERACTIVE CHART (SINGLE OR SPLIT-VIEW) + RIGHT MULTI-TOOL DOCK */}
      <div id="workspace" className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Vertical Technical Drawing Tools Dock */}
        <aside className="w-12 border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B0F17] flex flex-col items-center py-2.5 gap-1.5 shrink-0 z-10 transition-colors">
          {localizedDrawingTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                title={`${tool.khmerDesc} (${tool.label})`}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </aside>

        {/* Center Interactive Chart Canvas (Supports Single or Side-by-Side Split-View) */}
        <main className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0 relative divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800/90">
          {/* Primary Chart Pane */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
            {isSplitView && (
              <div className="flex items-center justify-between gap-2 px-3 py-1 bg-slate-100/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap shrink-0">
                    ក្រាហ្វទី ១ (Primary)៖ {currentAsset.symbol}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {TIMEFRAME_METADATA.find((m) => m.id === timeframe)?.khmerLabel || timeframe}
                  </span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {(['1s', '1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M', '1Y'] as Timeframe[]).map(
                    (tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframe(tf)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                          timeframe === tf
                            ? 'bg-sky-500 text-slate-950 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tf}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Real-Time One-Click Live Trading Bar Floating on Chart */}
            <QuickLiveTradingBar
              asset={currentAsset}
              candles={candles}
              timeframe={timeframe}
              accountType={exnessAccountType}
              mt5Session={mt5Session}
              language={language}
              onExecuteOrder={handleQuickTrade}
              onOpenBrokerModal={() => setShowRealBrokerModal(true)}
              openPositionsCount={exnessPositions.filter((p) => p.status === 'OPEN').length}
              totalFloatingPnL={totalFloatingPnL}
              totalProfitTargetUSD={smartExitSettings.totalProfitTargetUSD ?? 2}
              totalProfitAutoCloseEnabled={Boolean(smartExitSettings.totalProfitAutoCloseEnabled)}
              onUpdateTotalProfitTarget={(target) =>
                setSmartExitSettings((prev) => ({
                  ...prev,
                  totalProfitTargetUSD: target,
                  totalProfitAutoCloseEnabled: true,
                }))
              }
              onCloseAllPositions={handleCloseAllMt5Positions}
            />

            <TradingChartCanvas
              asset={currentAsset}
              allAssets={assets}
              candles={candles}
              timeframe={timeframe}
              chartType={chartType}
              indicators={indicators}
              activeTool={activeTool}
              drawings={currentDrawings}
              selectedDrawingId={selectedDrawingId}
              activeAlerts={priceAlerts}
              theme={theme}
              isMaximized={isChartMaximized}
              onToggleMaximize={() => setIsChartMaximized((prev) => !prev)}
              onAddDrawing={handleAddDrawing}
              onUpdateDrawing={handleUpdateDrawing}
              onSelectDrawing={setSelectedDrawingId}
              onDeleteDrawing={handleDeleteDrawing}
              onClearDrawings={handleClearDrawings}
              onQuickPriceAlert={(price) => {
                setPresetAlertPrice(price);
                setIsChartMaximized(false);
                setRightPanelTab('alerts');
              }}
              onSetTrendlineAlert={handleSetTrendlineAlert}
              onSimulateSpike={handleSimulateSpike}
              onChangeTimeframe={setTimeframe}
              onToggleIndicator={toggleIndicator}
              exnessAccountType={exnessAccountType}
              showExnessBidAskLines={showExnessBidAskLines}
              mt5Positions={exnessPositions}
            />

            {/* Active Live Positions & Floating PnL Bottom Bar */}
            <ActivePositionsBottomBar
              positions={exnessPositions}
              assets={assets}
              currentAsset={currentAsset}
              mt5Session={mt5Session}
              language={language}
              onClosePosition={handleCloseMt5Position}
              onCloseAll={handleCloseAllMt5Positions}
              totalProfitTargetUSD={smartExitSettings.totalProfitTargetUSD ?? 2}
              onUpdateTotalProfitTarget={(target) =>
                setSmartExitSettings((prev) => ({
                  ...prev,
                  totalProfitTargetUSD: target,
                  totalProfitAutoCloseEnabled: true,
                }))
              }
              totalProfitAutoCloseEnabled={Boolean(smartExitSettings.totalProfitAutoCloseEnabled)}
              onToggleTotalProfitAutoClose={(enabled) =>
                setSmartExitSettings((prev) => ({
                  ...prev,
                  totalProfitAutoCloseEnabled: enabled,
                }))
              }
            />
          </div>

          {/* Secondary Side-by-Side Chart Pane (Active when Split-View is Enabled) */}
          {isSplitView && (
            <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
              <div className="flex items-center justify-between gap-2 px-3 py-1 bg-slate-100/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
                    ក្រាហ្វទី ២ (Split-View)៖ {currentAsset.symbol}
                  </span>
                  <span className="text-slate-400">·</span>
                  <select
                    value={secondaryTimeframe}
                    onChange={(e) => setSecondaryTimeframe(e.target.value as Timeframe)}
                    aria-label="ជ្រើសរើសរយៈពេលក្រាហ្វទី ២ (Secondary Chart Timeframe)"
                    className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 focus:outline-none cursor-pointer"
                  >
                    {TIMEFRAME_METADATA.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.khmerLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {(['1s', '1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M', '1Y'] as Timeframe[]).map(
                    (tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setSecondaryTimeframe(tf)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                          secondaryTimeframe === tf
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tf}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSplitView(false)}
                    title="បិទក្រាហ្វទី ២ (Close Split-View)"
                    className="ml-1 p-0.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <TradingChartCanvas
                asset={currentAsset}
                allAssets={assets}
                candles={secondaryCandles}
                timeframe={secondaryTimeframe}
                chartType={chartType}
                indicators={indicators}
                activeTool={activeTool}
                drawings={currentDrawings}
                selectedDrawingId={selectedDrawingId}
                activeAlerts={priceAlerts}
                theme={theme}
                isMaximized={isChartMaximized}
                onToggleMaximize={() => setIsChartMaximized((prev) => !prev)}
                onAddDrawing={handleAddDrawing}
                onUpdateDrawing={handleUpdateDrawing}
                onSelectDrawing={setSelectedDrawingId}
                onDeleteDrawing={handleDeleteDrawing}
                onClearDrawings={handleClearDrawings}
                onQuickPriceAlert={(price) => {
                  setPresetAlertPrice(price);
                  setIsChartMaximized(false);
                  setRightPanelTab('alerts');
                }}
                onSetTrendlineAlert={handleSetTrendlineAlert}
                onSimulateSpike={handleSimulateSpike}
                onChangeTimeframe={setSecondaryTimeframe}
                onToggleIndicator={toggleIndicator}
                exnessAccountType={exnessAccountType}
                showExnessBidAskLines={showExnessBidAskLines}
                mt5Positions={exnessPositions}
              />
            </div>
          )}
        </main>

        {/* Interactive Drag Resizer Handle Between Chart and Right Analytical Dock */}
        {!isChartMaximized && !isCleanView && (
          <div
            onMouseDown={() => setIsResizingPanel(true)}
            title="ចាប់អូសដើម្បីបង្រួម ឬ ពង្រីកទំហំផ្ទាំងខាងស្តាំ (Drag to resize panel)"
            className={`w-1.5 cursor-col-resize shrink-0 transition-colors flex items-center justify-center group ${
              isResizingPanel
                ? 'bg-sky-500'
                : 'bg-slate-200/70 dark:bg-slate-800/80 hover:bg-sky-500/60'
            }`}
          >
            <div className="w-0.5 h-8 rounded-full bg-slate-400 dark:bg-slate-600 group-hover:bg-white" />
          </div>
        )}

        {/* Right Multi-Function Analytical Dock (Resizable 260px–580px, rendered when !isCleanView) */}
        {!isChartMaximized && !isCleanView && (
          <aside
            style={{ width: `${rightPanelWidth}px` }}
            className="border-l border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B0F17] flex flex-col shrink-0 overflow-hidden transition-colors"
          >
          {/* Right Dock Top Mode Switcher (6 Tabs: Auto-Bot, Exness Sync, Global Quant, Watchlist, Saved, Alerts) */}
          <div className="grid grid-cols-6 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 shrink-0">
            <button
              type="button"
              onClick={() => setRightPanelTab('autobot')}
              className={`flex items-center justify-center gap-1 py-2 text-[10px] font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                rightPanelTab === 'autobot'
                  ? 'border-emerald-500 text-[#10B981] bg-white dark:bg-slate-900/50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-500'
              }`}
              title="ប្រព័ន្ធប្រាប់ពេលណាទិញ ពេលណាលក់ & Bot ស្វ័យប្រវត្តិ"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Auto-Bot</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('exness')}
              className={`flex items-center justify-center gap-1 py-2 text-[10px] font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                rightPanelTab === 'exness'
                  ? 'border-[#FFCF01] text-amber-700 dark:text-[#FFCF01] bg-white dark:bg-slate-900/50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="px-1 py-0.2 rounded bg-[#FFCF01] text-slate-950 font-black text-[8px]">
                EX
              </span>
              <span>Exness</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('quant')}
              className={`flex items-center justify-center gap-1 py-2 text-[10px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                rightPanelTab === 'quant'
                  ? 'border-sky-500 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900/50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>វិភាគសុក្រិត</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('watchlist')}
              className={`flex items-center justify-center gap-1 py-2 text-[10px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                rightPanelTab === 'watchlist'
                  ? 'border-sky-500 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900/50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              <span>ទីផ្សារ</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('saved')}
              className={`flex items-center justify-center gap-1 py-2 text-[10px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                rightPanelTab === 'saved'
                  ? 'border-sky-500 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900/50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
              <span>រក្សាទុក</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('alerts')}
              className={`flex items-center justify-center gap-1 py-2 text-[10px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                rightPanelTab === 'alerts'
                  ? 'border-sky-500 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900/50'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>ដាស់តឿន</span>
            </button>
          </div>

          {/* DOCKED PANEL BODY */}
          {renderDockTabContent(rightPanelTab)}
          </aside>
        )}
      </div>

      {/* Pop-Out Slide-over Drawer for Clean View (លាក់កម្មវិធីផ្សេងៗពេលប៉ះ លោតចេញមក) */}
      {isCleanView && activePopoutTab !== null && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Semi-transparent Backdrop: click to close */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setActivePopoutTab(null)}
            title="ប៉ះទីនេះ ឬចុច Esc ដើម្បីបិទ (Click outside to close)"
          />

          {/* Slide-over Drawer Panel */}
          <div className="relative w-full sm:w-[480px] md:w-[540px] max-w-[95vw] h-full bg-white dark:bg-[#0B0F17] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Pop-out Drawer Header */}
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {activePopoutTab === 'autobot' && '🤖 ប្រព័ន្ធពេលណាទិញ-លក់ & Auto-Bot'}
                  {activePopoutTab === 'exness' && '⚡ Exness WebTrading & MT5 Terminal'}
                  {activePopoutTab === 'quant' && '🎯 វិភាគសុក្រិតបច្ចេកទេសពិភពលោក (Quant)'}
                  {activePopoutTab === 'watchlist' && '📊 តារាងទីផ្សារ & បញ្ជីបញ្ជាទិញផ្ទាល់'}
                  {activePopoutTab === 'saved' && '💾 រក្សាទុក & ពិនិត្យការវិភាគបច្ចេកទេស'}
                  {activePopoutTab === 'alerts' && '🔔 ការដាស់តឿនតម្លៃ & Telegram/Email'}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCleanView(false);
                    setActivePopoutTab(null);
                  }}
                  title="ខ្ទាស់ជាផ្ទាំងចំហៀងអចិន្ត្រៃយ៍ (Pin to Dock)"
                  className="px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <PanelRightOpen className="w-3.5 h-3.5 text-sky-500" />
                  <span className="text-[11px] font-medium hidden sm:inline">ខ្ទាស់ចំហៀង</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopoutTab(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="បិទ (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick 6-Tab Switcher inside Drawer */}
            <div className="grid grid-cols-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setActivePopoutTab('autobot');
                  setRightPanelTab('autobot');
                }}
                className={`py-2 flex items-center justify-center gap-1 border-b-2 font-bold transition-colors cursor-pointer ${
                  activePopoutTab === 'autobot'
                    ? 'border-emerald-500 text-[#10B981] bg-white dark:bg-slate-900/60'
                    : 'border-transparent text-slate-500 hover:text-emerald-500'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Auto-Bot</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopoutTab('exness');
                  setRightPanelTab('exness');
                }}
                className={`py-2 flex items-center justify-center gap-1 border-b-2 font-bold transition-colors cursor-pointer ${
                  activePopoutTab === 'exness'
                    ? 'border-[#FFCF01] text-amber-500 bg-white dark:bg-slate-900/60'
                    : 'border-transparent text-slate-500 hover:text-amber-500'
                }`}
              >
                <span className="px-1 py-0.2 rounded bg-[#FFCF01] text-slate-950 text-[8px] font-black">EX</span>
                <span className="hidden sm:inline">Exness</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopoutTab('quant');
                  setRightPanelTab('quant');
                }}
                className={`py-2 flex items-center justify-center gap-1 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activePopoutTab === 'quant'
                    ? 'border-sky-500 text-sky-500 bg-white dark:bg-slate-900/60'
                    : 'border-transparent text-slate-500 hover:text-sky-500'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">វិភាគ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopoutTab('watchlist');
                  setRightPanelTab('watchlist');
                }}
                className={`py-2 flex items-center justify-center gap-1 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activePopoutTab === 'watchlist'
                    ? 'border-indigo-500 text-indigo-500 bg-white dark:bg-slate-900/60'
                    : 'border-transparent text-slate-500 hover:text-indigo-500'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ទីផ្សារ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopoutTab('saved');
                  setRightPanelTab('saved');
                }}
                className={`py-2 flex items-center justify-center gap-1 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activePopoutTab === 'saved'
                    ? 'border-emerald-500 text-emerald-500 bg-white dark:bg-slate-900/60'
                    : 'border-transparent text-slate-500 hover:text-emerald-500'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">រក្សាទុក</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopoutTab('alerts');
                  setRightPanelTab('alerts');
                }}
                className={`py-2 flex items-center justify-center gap-1 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activePopoutTab === 'alerts'
                    ? 'border-rose-500 text-rose-500 bg-white dark:bg-slate-900/60'
                    : 'border-transparent text-slate-500 hover:text-rose-500'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ដាស់តឿន</span>
              </button>
            </div>

            {/* Popout Body Content */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              {renderDockTabContent(activePopoutTab)}
            </div>

            {/* Bottom Dismiss Footer */}
            <div className="px-4 py-2 bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                ✨ ប៉ះក្រៅ ឬចុច Esc ដើម្បីបិទ ត្រឡប់ទៅមើលទៀនស្រលះ
              </span>
              <button
                type="button"
                onClick={() => setActivePopoutTab(null)}
                className="font-bold text-sky-500 hover:text-sky-400 cursor-pointer"
              >
                បិទផ្ទាំង (✕)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Broker Execution Modal */}
      <RealBrokerTradingModal
        isOpen={showRealBrokerModal}
        onClose={() => setShowRealBrokerModal(false)}
        asset={currentAsset}
        mt5Session={mt5Session}
        onUpdateMt5Session={setMt5Session}
      />

      {/* Total Profit Target Hit Auto-Close All Notification Toast */}
      {totalProfitToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-emerald-950/95 border-2 border-emerald-400 text-white shadow-2xl backdrop-blur-md animate-bounce">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-amber-300 fill-current" />
          </div>
          <div className="text-xs">
            <div className="font-black text-emerald-300 flex items-center gap-2">
              <span>🎯 សម្រេចបានគោលដៅចំណេញសរុប (Target: +${totalProfitToast.targetUSD} USD)!</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-100 font-mono text-xs font-black">
                +{totalProfitToast.realizedUSD >= 0 ? '$' : ''}{totalProfitToast.realizedUSD.toFixed(2)} USD
              </span>
            </div>
            <div className="text-[11px] text-slate-200 mt-0.5">
              បានបិទ Order ទាំងអស់ទាំង {totalProfitToast.positionsCount} ជាស្វ័យប្រវត្តិកម្រិតល្បឿនលឿនបំផុត (Close All Ultra-Fast) ដោយជោគជ័យ!
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTotalProfitToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Trade Order Fill Notification Toast */}
      {executionToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700 shadow-2xl backdrop-blur-md animate-slideUp">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              executionToast.direction === 'BUY'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {executionToast.direction}
          </div>
          <div className="text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <span>{executionToast.message}</span>
              <span className="text-[10px] font-mono text-slate-400">#{executionToast.ticket}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              {executionToast.lots} Lot {executionToast.symbol} @ {formatPrice(executionToast.price, executionToast.symbol)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExecutionToast(null)}
            className="text-slate-400 hover:text-white p-1 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
