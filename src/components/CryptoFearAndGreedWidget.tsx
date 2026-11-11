import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CryptoFearGreedData,
  FearGreedClassification,
  MajorCryptoSentiment,
} from '../types/market';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Info,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface CryptoFearAndGreedWidgetProps {
  onSelectSymbol: (symbol: string) => void;
  selectedSymbol?: string;
  className?: string;
  initialCollapsed?: boolean;
}

const DEFAULT_FALLBACK_DATA: CryptoFearGreedData = {
  currentScore: 50,
  currentClassification: 'Neutral',
  khmerClassification: 'អព្យាក្រឹត (Neutral)',
  timestamp: Date.now(),
  timeUntilUpdateSeconds: 43200,
  historical: {
    yesterday: { score: 48, classification: 'Neutral' },
    lastWeek: { score: 54, classification: 'Neutral' },
    lastMonth: { score: 62, classification: 'Greed' },
  },
  dailyTrend: [
    { timestamp: Date.now() - 6 * 86400000, dateStr: '6 ថ្ងៃមុន', score: 55, classification: 'Neutral' },
    { timestamp: Date.now() - 5 * 86400000, dateStr: '5 ថ្ងៃមុន', score: 52, classification: 'Neutral' },
    { timestamp: Date.now() - 4 * 86400000, dateStr: '4 ថ្ងៃមុន', score: 46, classification: 'Neutral' },
    { timestamp: Date.now() - 3 * 86400000, dateStr: '3 ថ្ងៃមុន', score: 42, classification: 'Fear' },
    { timestamp: Date.now() - 2 * 86400000, dateStr: '2 ថ្ងៃមុន', score: 45, classification: 'Neutral' },
    { timestamp: Date.now() - 1 * 86400000, dateStr: 'ម្សិលមិញ', score: 48, classification: 'Neutral' },
    { timestamp: Date.now(), dateStr: 'ថ្ងៃនេះ', score: 50, classification: 'Neutral' },
  ],
  majorCryptos: [
    {
      symbol: 'BTC/USDT',
      rawSymbol: 'BTC',
      binanceSymbol: 'BTCUSDT',
      name: 'Bitcoin',
      khmerName: 'ប៊ីតខوين',
      price: 91450,
      change24h: 3.42,
      high24h: 92400,
      low24h: 88200,
      volume24h: 42000000000,
      score: 72,
      classification: 'Greed',
      khmerClassification: 'លោភលន់ (Greed)',
      momentum: 'Bullish',
      biasLabelKh: 'ទំនោរទិញឡើង',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      strokeHex: '#34D399',
    },
    {
      symbol: 'ETH/USDT',
      rawSymbol: 'ETH',
      binanceSymbol: 'ETHUSDT',
      name: 'Ethereum',
      khmerName: 'អ៊ីធឺរៀម',
      price: 3125,
      change24h: 2.15,
      high24h: 3190,
      low24h: 3040,
      volume24h: 18000000000,
      score: 64,
      classification: 'Greed',
      khmerClassification: 'លោភលន់ (Greed)',
      momentum: 'Bullish',
      biasLabelKh: 'ទំនោរទិញឡើង',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      strokeHex: '#34D399',
    },
    {
      symbol: 'SOL/USDT',
      rawSymbol: 'SOL',
      binanceSymbol: 'SOLUSDT',
      name: 'Solana',
      khmerName: 'សូឡាណា',
      price: 194.8,
      change24h: 5.68,
      high24h: 199.4,
      low24h: 182.1,
      volume24h: 6900000000,
      score: 82,
      classification: 'Extreme Greed',
      khmerClassification: 'លោភលន់ខ្លាំង (Extreme Greed)',
      momentum: 'Strong Bullish',
      biasLabelKh: 'ប្រុងប្រយ័ត្នបញ្ចុះកម្តៅ',
      colorClass: 'text-emerald-500 dark:text-emerald-300',
      strokeHex: '#10B981',
    },
    {
      symbol: 'BNB/USDT',
      rawSymbol: 'BNB',
      binanceSymbol: 'BNBUSDT',
      name: 'BNB',
      khmerName: 'ប៊ីអិនប៊ី',
      price: 642.3,
      change24h: 1.12,
      high24h: 651,
      low24h: 633,
      volume24h: 1650000000,
      score: 58,
      classification: 'Greed',
      khmerClassification: 'លោភលន់ (Greed)',
      momentum: 'Bullish',
      biasLabelKh: 'ទំនោរទិញឡើង',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      strokeHex: '#34D399',
    },
    {
      symbol: 'XRP/USDT',
      rawSymbol: 'XRP',
      binanceSymbol: 'XRPUSDT',
      name: 'XRP',
      khmerName: 'រីផល XRP',
      price: 1.482,
      change24h: -1.84,
      high24h: 1.545,
      low24h: 1.441,
      volume24h: 5120000000,
      score: 41,
      classification: 'Fear',
      khmerClassification: 'ភ័យខ្លាច (Fear)',
      momentum: 'Bearish',
      biasLabelKh: 'ទីផ្សារប្រុងប្រយ័ត្ន',
      colorClass: 'text-orange-600 dark:text-orange-400',
      strokeHex: '#FB923C',
    },
  ],
  lastUpdatedMs: Date.now(),
};

export const CryptoFearAndGreedWidget: React.FC<CryptoFearAndGreedWidgetProps> = ({
  onSelectSymbol,
  selectedSymbol,
  className = '',
  initialCollapsed = false,
}) => {
  const [data, setData] = useState<CryptoFearGreedData>(DEFAULT_FALLBACK_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initialCollapsed);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'change_desc' | 'name'>('score_desc');
  const [cryptoSearch, setCryptoSearch] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/crypto/fear-and-greed');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setData(json);
        }
      }
    } catch {
      // Keep existing data gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Color & Badge helpers
  const getScoreBadge = (score: number) => {
    if (score <= 24) {
      return {
        labelKh: 'ភ័យខ្លាចខ្លាំង',
        labelEn: 'Extreme Fear',
        bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
        barBg: 'bg-rose-500',
        text: 'text-rose-600 dark:text-rose-400',
        stroke: '#F43F5E',
      };
    } else if (score <= 44) {
      return {
        labelKh: 'ភ័យខ្លាច',
        labelEn: 'Fear',
        bg: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
        barBg: 'bg-orange-500',
        text: 'text-orange-600 dark:text-orange-400',
        stroke: '#FB923C',
      };
    } else if (score <= 55) {
      return {
        labelKh: 'អព្យាក្រឹត',
        labelEn: 'Neutral',
        bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        barBg: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        stroke: '#F59E0B',
      };
    } else if (score <= 75) {
      return {
        labelKh: 'លោភលន់',
        labelEn: 'Greed',
        bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        barBg: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        stroke: '#34D399',
      };
    } else {
      return {
        labelKh: 'លោភលន់ខ្លាំង',
        labelEn: 'Extreme Greed',
        bg: 'bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-bold',
        barBg: 'bg-emerald-500',
        text: 'text-emerald-500 dark:text-emerald-300',
        stroke: '#10B981',
      };
    }
  };

  const currentBadge = useMemo(() => getScoreBadge(data.currentScore), [data.currentScore]);

  // Semi-circle needle angle (-90deg to +90deg)
  const needleAngle = -90 + (Math.min(100, Math.max(0, data.currentScore)) / 100) * 180;

  // Filtered and sorted major cryptocurrencies
  const sortedCryptos = useMemo(() => {
    let list = [...data.majorCryptos];
    if (cryptoSearch.trim()) {
      const q = cryptoSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.rawSymbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.khmerName.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'score_desc') return b.score - a.score;
      if (sortBy === 'score_asc') return a.score - b.score;
      if (sortBy === 'change_desc') return b.change24h - a.change24h;
      return a.rawSymbol.localeCompare(b.rawSymbol);
    });
    return list;
  }, [data.majorCryptos, cryptoSearch, sortBy]);

  // Format countdown string
  const formatCountdown = (secs?: number) => {
    if (!secs) return 'ប្រចាំថ្ងៃ (Daily)';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m ទៀតប្តូរថ្មី`;
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 transition-colors ${className}`}
    >
      {/* Header Bar */}
      <div className="p-3 pb-2 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                Crypto Fear & Greed Index
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium whitespace-nowrap">
                Daily
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              សន្ទស្សន៍ភ័យខ្លាច & លោភលន់រូបិយប័ណ្ណគ្រីបតូ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfoModal((prev) => !prev)}
            title="ព័ត៌មានលម្អិតអំពីសន្ទស្សន៍ Fear & Greed"
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            title="ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ (Refresh)"
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-500' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'ពន្លាតបង្ហាញ (Expand)' : 'បង្រួម (Collapse)'}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Info Explainer Drawer */}
      {showInfoModal && (
        <div className="p-3 bg-sky-500/5 dark:bg-sky-500/10 border-b border-sky-500/20 text-[11px] text-slate-700 dark:text-slate-300 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between font-semibold text-sky-700 dark:text-sky-300">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              របៀបយល់ដឹងសន្ទស្សន៍ Fear & Greed Index (0 - 100)
            </span>
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>
          <p className="leading-relaxed text-[11px]">
            សន្ទស្សន៍នេះវាស់វែងអារម្មណ៍ និងចិត្តសាស្ត្ររបស់អ្នកវិនិយោគគ្រីបតូជុំវិញពិភពលោក៖
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
              <span className="font-bold">0 - 44 (Fear / ភ័យខ្លាច)៖</span> អ្នកវិនិយោគបារម្ភជ្រុល ជាឱកាសទិញសន្សំ (Buy Dip)។
            </div>
            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <span className="font-bold">56 - 100 (Greed / លោភលន់)៖</span> ទីផ្សារឡើងកម្តៅខ្លាំង ត្រូវប្រុងប្រយ័ត្នការកែសម្រួល (Correction)។
            </div>
          </div>
          <p className="italic text-[10px] text-slate-500 dark:text-slate-400">
            * គណនាផ្អែកលើទិន្នន័យផ្លូវការ Alternative.me រួមផ្សំចលនាតម្លៃជាក់ស្តែង (24h Momentum, High/Low Range & Volume) នៃរូបិយប័ណ្ណគ្រីបតូធំៗ។
          </p>
        </div>
      )}

      {/* Main Content Area */}
      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Dial + Telemetry Banner */}
          <div className="flex items-center gap-3">
            {/* Semi-Circular SVG Dial */}
            <div className="relative w-28 h-16 shrink-0 flex flex-col items-center justify-end">
              <svg viewBox="0 0 120 68" className="w-28 h-16 overflow-visible">
                {/* Background Track */}
                <path
                  d="M 12 58 A 48 48 0 0 1 108 58"
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                />
                {/* Color Zone Arcs */}
                <path
                  d="M 12 58 A 48 48 0 0 1 21.2 29.8"
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="8.5"
                  strokeLinecap="butt"
                />
                <path
                  d="M 22.8 27.6 A 48 48 0 0 1 45.2 12.3"
                  fill="none"
                  stroke="#FB923C"
                  strokeWidth="8.5"
                  strokeLinecap="butt"
                />
                <path
                  d="M 47.6 11.6 A 48 48 0 0 1 72.4 11.6"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="8.5"
                  strokeLinecap="butt"
                />
                <path
                  d="M 74.8 12.3 A 48 48 0 0 1 97.2 27.6"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="8.5"
                  strokeLinecap="butt"
                />
                <path
                  d="M 98.8 29.8 A 48 48 0 0 1 108 58"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="8.5"
                  strokeLinecap="butt"
                />
                {/* Needle */}
                <g transform={`translate(60, 58) rotate(${needleAngle})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-38"
                    stroke={currentBadge.stroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="0" r="4" fill={currentBadge.stroke} />
                </g>
              </svg>

              {/* Number overlay */}
              <div className="absolute bottom-0 inset-x-0 text-center leading-none">
                <span className={`text-base font-mono tabular-nums font-extrabold ${currentBadge.text}`}>
                  {data.currentScore}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">/100</span>
              </div>
            </div>

            {/* Score & Status Details */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors ${currentBadge.bg}`}
                >
                  {currentBadge.labelKh}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  ({currentBadge.labelEn})
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                {data.currentClassification === 'Extreme Greed' || data.currentClassification === 'Greed'
                  ? 'ទីផ្សារគ្រីបតូកំពុងមានកម្លាំងទិញខ្ពស់'
                  : data.currentClassification === 'Neutral'
                  ? 'ទីផ្សារស្ថិតក្នុងស្ថានភាពតុល្យភាព'
                  : 'ទីផ្សារកំពុងស្ថិតក្នុងតំបន់ភ័យខ្លាច'}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{formatCountdown(data.timeUntilUpdateSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Historical Daily Benchmarks (Yesterday / Last Week / Last Month) */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">ម្សិលមិញ</div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.historical?.yesterday?.score ?? '--'}
              </div>
              <div className="text-[9px] font-medium text-slate-500 truncate">
                {data.historical?.yesterday?.classification ?? ''}
              </div>
            </div>

            <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">សប្តាហ៍មុន (7d)</div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.historical?.lastWeek?.score ?? '--'}
              </div>
              <div className="text-[9px] font-medium text-slate-500 truncate">
                {data.historical?.lastWeek?.classification ?? ''}
              </div>
            </div>

            <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">ខែមុន (30d)</div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.historical?.lastMonth?.score ?? '--'}
              </div>
              <div className="text-[9px] font-medium text-slate-500 truncate">
                {data.historical?.lastMonth?.classification ?? ''}
              </div>
            </div>
          </div>

          {/* 7-Day Mini Trend Sparkline */}
          {data.dailyTrend && data.dailyTrend.length > 0 && (
            <div className="p-2 rounded-md bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-sky-500" />
                  និន្នាការប្រចាំថ្ងៃ ៧ ថ្ងៃចុងក្រោយ (7-Day Daily Trend)
                </span>
                <span className="font-mono text-[9px]">
                  {data.dailyTrend[0]?.score} ➔ {data.currentScore}
                </span>
              </div>
              <div className="flex items-end gap-1 h-8 pt-1">
                {data.dailyTrend.map((item, idx) => {
                  const badge = getScoreBadge(item.score);
                  const heightPct = Math.max(15, Math.min(100, item.score));
                  const isToday = idx === data.dailyTrend.length - 1;
                  return (
                    <div
                      key={item.timestamp || idx}
                      className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end group relative"
                    >
                      <div
                        className={`w-full rounded-xs transition-all duration-300 ${badge.barBg} ${
                          isToday ? 'ring-1 ring-white dark:ring-sky-400 shadow-xs' : 'opacity-80 group-hover:opacity-100'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute -top-7 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[9px] font-mono px-1 py-0.5 rounded whitespace-nowrap z-20 shadow-md">
                        {item.dateStr}: {item.score} ({item.classification})
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] font-mono text-slate-400">
                <span>{data.dailyTrend[0]?.dateStr}</span>
                <span>ថ្ងៃនេះ ({data.currentScore})</span>
              </div>
            </div>
          )}

          {/* MAJOR CRYPTOCURRENCIES DAILY SENTIMENT BREAKDOWN */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  ពិន្ទុអារម្មណ៍គ្រីបតូសំខាន់ៗ (Major Cryptos Sentiment)
                </span>
              </div>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="score_desc">ពិន្ទុខ្ពស់ (Greed)</option>
                <option value="score_asc">ពិន្ទុទាប (Fear)</option>
                <option value="change_desc">ឡើង % ខ្លាំង</option>
                <option value="name">ឈ្មោះ (A-Z)</option>
              </select>
            </div>

            {/* Optional quick search if more than 4 cryptos */}
            {data.majorCryptos.length > 5 && (
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cryptoSearch ?? ''}
                  onChange={(e) => setCryptoSearch(e.target.value)}
                  placeholder="ស្វែងរក BTC, ETH, SOL..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded pl-6 pr-2 py-1 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            {/* List of Major Cryptos with Sentiment Score */}
            <div className="space-y-1.5">
              {sortedCryptos.map((coin) => {
                const badge = getScoreBadge(coin.score);
                const isSelected = selectedSymbol === coin.symbol;
                const isUp = coin.change24h >= 0;

                return (
                  <div
                    key={coin.symbol}
                    onClick={() => onSelectSymbol(coin.symbol)}
                    className={`p-2 rounded-md border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/40 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                    title={`ចុចដើម្បីវិភាគក្រាហ្វ ${coin.symbol}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Left: Coin identifier */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                          {coin.rawSymbol.slice(0, 3)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                              {coin.rawSymbol}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate">
                              {coin.khmerName}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            ${coin.price >= 10 ? coin.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : coin.price.toFixed(4)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Daily Score + Status Badge + 24h % */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-xs font-mono font-extrabold ${badge.text}`}>
                            {coin.score}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${badge.bg}`}
                          >
                            {badge.labelKh}
                          </span>
                        </div>
                        <div
                          className={`flex items-center justify-end gap-0.5 text-[10px] font-mono font-semibold ${
                            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{isUp ? '+' : ''}{coin.change24h.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar indicating Fear (0) to Greed (100) */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${badge.barBg}`}
                          style={{ width: `${Math.min(100, Math.max(5, coin.score))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                        {coin.biasLabelKh}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
