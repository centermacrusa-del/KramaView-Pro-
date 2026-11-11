import React, { useMemo, useState, useEffect } from 'react';
import { Candle, ChartDrawing, MarketAsset, Timeframe } from '../types/market';
import {
  calculateGlobalPrecisionAnalysis,
  formatPrice,
  getGlobalMarketSessions,
} from '../services/marketEngine';
import {
  Activity,
  Bell,
  BookmarkCheck,
  CheckCircle2,
  Compass,
  Crosshair,
  Globe,
  Layers,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface GlobalPrecisionAnalysisPanelProps {
  currentAsset: MarketAsset;
  allAssets: MarketAsset[];
  candles: Candle[];
  timeframe: Timeframe;
  isSyncingGlobalQuotes: boolean;
  lastGlobalSyncTime: number | null;
  onSyncGlobalQuotes: () => void;
  onSelectSymbol: (symbol: string) => void;
  onQuickPriceAlert: (price: number) => void;
  onPlotPivotLevelsOnChart: (levels: { label: string; price: number; color: string }[]) => void;
  onPlotTradeSetupOnChart: (drawing: ChartDrawing) => void;
  onQuickSavePrecisionAnalysis: (data: {
    title: string;
    targetPrice: number;
    stopLossPrice: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    notes: string;
  }) => void;
}

export const GlobalPrecisionAnalysisPanel: React.FC<GlobalPrecisionAnalysisPanelProps> = ({
  currentAsset,
  allAssets,
  candles,
  timeframe,
  isSyncingGlobalQuotes,
  lastGlobalSyncTime,
  onSyncGlobalQuotes,
  onSelectSymbol,
  onQuickPriceAlert,
  onPlotPivotLevelsOnChart,
  onPlotTradeSetupOnChart,
  onQuickSavePrecisionAnalysis,
}) => {
  const [clockTick, setClockTick] = useState(0);
  const [plottedFeedback, setPlottedFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClockTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const analysis = useMemo(
    () => calculateGlobalPrecisionAnalysis(currentAsset, candles, timeframe),
    [currentAsset, candles, timeframe]
  );

  const sessions = useMemo(() => {
    void clockTick;
    return getGlobalMarketSessions(new Date());
  }, [clockTick]);

  const showTempFeedback = (msg: string) => {
    setPlottedFeedback(msg);
    setTimeout(() => setPlottedFeedback(null), 3500);
  };

  const handlePlotPivots = () => {
    const p = analysis.pivots;
    onPlotPivotLevelsOnChart([
      { label: `Pivot R2 (${formatPrice(p.r2, currentAsset.symbol)})`, price: p.r2, color: '#EF4444' },
      { label: `Pivot R1 (${formatPrice(p.r1, currentAsset.symbol)})`, price: p.r1, color: '#F97316' },
      { label: `Pivot P (${formatPrice(p.pivot, currentAsset.symbol)})`, price: p.pivot, color: '#F59E0B' },
      { label: `Pivot S1 (${formatPrice(p.s1, currentAsset.symbol)})`, price: p.s1, color: '#10B981' },
      { label: `Pivot S2 (${formatPrice(p.s2, currentAsset.symbol)})`, price: p.s2, color: '#06B6D4' },
    ]);
    showTempFeedback('បានគូសខ្សែ Pivot S1/S2 & R1/R2 លើក្រាហ្វរួចរាល់!');
  };

  const handlePlotTradeSetup = () => {
    const setup = analysis.tradeSetup;
    const lastCandleTime =
      candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000);
    const startCandleTime =
      candles.length > 18
        ? candles[candles.length - 18].time
        : lastCandleTime - 15 * 60;

    const drawing: ChartDrawing = {
      id: `quant_setup_${Date.now()}`,
      tool: setup.direction === 'LONG' ? 'long_pos' : 'short_pos',
      t1: startCandleTime,
      p1: setup.entryPrice,
      t2: lastCandleTime,
      p2: setup.takeProfit2,
      p3: setup.stopLoss,
      color: setup.direction === 'LONG' ? '#10B981' : '#EF4444',
      label: `Quant ${setup.direction} R:R 1:${setup.riskRewardRatio}`,
    };
    onPlotTradeSetupOnChart(drawing);
    showTempFeedback(`បានគូសប្រអប់ផែនការ ${setup.direction} (TP & SL) លើក្រាហ្វរួចរាល់!`);
  };

  const handleSaveQuantSetup = () => {
    const setup = analysis.tradeSetup;
    onQuickSavePrecisionAnalysis({
      title: `[វិភាគសុក្រិតសកល ${analysis.overallScore}%] ${currentAsset.symbol} (${timeframe}) — ${analysis.khmerVerdict}`,
      targetPrice: setup.takeProfit2,
      stopLossPrice: setup.stopLoss,
      direction: setup.direction === 'LONG' ? 'bullish' : 'bearish',
      notes: `${setup.rationaleKhmer} | Pivot P=${formatPrice(analysis.pivots.pivot, currentAsset.symbol)}, R1=${formatPrice(analysis.pivots.r1, currentAsset.symbol)}, S1=${formatPrice(analysis.pivots.s1, currentAsset.symbol)} | ADX(14)=${analysis.adx14}, RSI(14)=${analysis.rsi14}`,
    });
    showTempFeedback('បានរក្សាទុករបាយការណ៍វិភាគសុក្រិតចូលក្នុងបញ្ជីរួចរាល់!');
  };

  const verdictBadgeStyle =
    analysis.overallVerdict === 'STRONG_BUY'
      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
      : analysis.overallVerdict === 'BUY'
      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
      : analysis.overallVerdict === 'STRONG_SELL'
      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
      : analysis.overallVerdict === 'SELL'
      ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40'
      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40';

  const pivotRows = [
    { code: 'R3', label: 'រាំងខ្ទប់ទី ៣ (Resistance 3)', price: analysis.pivots.r3, tone: 'text-rose-600 dark:text-rose-400' },
    { code: 'R2', label: 'រាំងខ្ទប់ទី ២ (Resistance 2)', price: analysis.pivots.r2, tone: 'text-rose-600 dark:text-rose-400' },
    { code: 'R1', label: 'រាំងខ្ទប់ទី ១ (Resistance 1)', price: analysis.pivots.r1, tone: 'text-orange-600 dark:text-orange-400' },
    { code: 'P', label: 'ចំណុចកណ្តាលស្ថាប័ន (Pivot Point)', price: analysis.pivots.pivot, tone: 'text-amber-600 dark:text-amber-300 font-bold' },
    { code: 'S1', label: 'គាំទ្រទី ១ (Support 1)', price: analysis.pivots.s1, tone: 'text-emerald-600 dark:text-emerald-400' },
    { code: 'S2', label: 'គាំទ្រទី ២ (Support 2)', price: analysis.pivots.s2, tone: 'text-emerald-600 dark:text-emerald-400' },
    { code: 'S3', label: 'គាំទ្រទី ៣ (Support 3)', price: analysis.pivots.s3, tone: 'text-cyan-600 dark:text-cyan-400' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
      {/* 1. HEADER & LIVE GLOBAL EXCHANGE DATA SYNC */}
      <div className="bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <Globe className="w-4 h-4 text-sky-500 shrink-0" />
              <span>វិភាគទីផ្សារសុក្រិតពិភពលោក (Global Quant)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              គណនាតាមរូបមន្តស្ថាប័នហិរញ្ញវត្ថុអន្តរជាតិ (10-Factor Confluence, Pivot & ATR)
            </p>
          </div>

          <button
            type="button"
            onClick={onSyncGlobalQuotes}
            disabled={isSyncingGlobalQuotes}
            title="ទាញយកទិន្នន័យតម្លៃពិតៗពីផ្សារអន្តរជាតិ (Binance, COMEX, NYMEX, NASDAQ)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-semibold text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGlobalQuotes ? 'animate-spin' : ''}`} />
            <span>{isSyncingGlobalQuotes ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'ផ្ទៀងផ្ទាត់តម្លៃពិភពលោក'}</span>
          </button>
        </div>

        {/* World Exchange Sessions Status Grid */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      s.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                    {s.cityKhmer}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">{s.exchangeLabel}</div>
              </div>
              <div className="text-right font-mono tabular-nums shrink-0 pl-1">
                <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                  {s.localTimeStr}
                </div>
                <div
                  className={`text-[9px] font-medium ${
                    s.isOpen
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {s.isOpen ? 'OPEN' : '24/5 OTC'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {lastGlobalSyncTime && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span>ប្រភព៖ LBMA / COMEX / NYMEX / Binance / NASDAQ</span>
            <span className="font-mono tabular-nums">
              ផ្ទៀងផ្ទាត់ចុងក្រោយ៖ {new Date(lastGlobalSyncTime).toLocaleTimeString('km-KH')}
            </span>
          </div>
        )}
      </div>

      {plottedFeedback && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{plottedFeedback}</span>
        </div>
      )}

      {/* 2. ACTIVE INSTRUMENT CONFLUENCE SCORE & SIGNAL VERDICT */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                {currentAsset.symbol}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                {timeframe}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {currentAsset.khmerName} · តម្លៃផ្ទាល់ {formatPrice(currentAsset.price, currentAsset.symbol)}
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-lg border text-right ${verdictBadgeStyle}`}>
            <div className="text-xs font-bold whitespace-nowrap">{analysis.khmerVerdict}</div>
            <div className="text-[10px] font-mono tabular-nums opacity-90">
              ពិន្ទុសុក្រិត៖ {analysis.overallScore}/100
            </div>
          </div>
        </div>

        {/* Precision Thermometer Gauge */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <span className="text-rose-500">លក់ខ្លាំង (0)</span>
            <span>អព្យាក្រឹត (50)</span>
            <span className="text-emerald-500">ទិញខ្លាំង (100)</span>
          </div>
          <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-white dark:bg-slate-950 border-2 border-slate-900 dark:border-white rounded-full shadow-md transition-all duration-300"
              style={{ left: `calc(${analysis.overallScore}% - 3px)` }}
            />
          </div>
        </div>

        {/* Buy / Neutral / Sell Vote Breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2 text-center">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300">សញ្ញាទិញ (Buy)</div>
            <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {analysis.buyCount} / 10
            </div>
          </div>
          <div className="bg-slate-500/10 border border-slate-500/25 rounded-lg p-2 text-center">
            <div className="text-[10px] text-slate-600 dark:text-slate-300">អព្យាក្រឹត (Neutral)</div>
            <div className="text-base font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
              {analysis.neutralCount} / 10
            </div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg p-2 text-center">
            <div className="text-[10px] text-rose-700 dark:text-rose-300">សញ្ញាលក់ (Sell)</div>
            <div className="text-base font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {analysis.sellCount} / 10
            </div>
          </div>
        </div>

        {/* Core Quantitative Telemetry Strip (ADX, ATR, VWAP, Order Flow) */}
        <div className="grid grid-cols-2 gap-2 pt-1 font-mono tabular-nums text-[11px]">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-sans text-slate-500">កម្លាំងនិន្នាការ ADX(14)</div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {analysis.adx14} ({analysis.adx14 >= 25 ? 'និន្នាការខ្លាំង' : 'រត់ទទឹង'})
            </div>
            <div className="text-[10px] text-slate-500">
              +DI: <span className="text-emerald-500">{analysis.plusDI}</span> · -DI:{' '}
              <span className="text-rose-500">{analysis.minusDI}</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-sans text-slate-500">កម្រិតយោលពិត ATR(14)</div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {formatPrice(analysis.atr14, currentAsset.symbol)} ({analysis.atrPct}%)
            </div>
            <div className="text-[10px] text-slate-500">
              Order Flow: <span className="text-sky-500">{analysis.buyVolumePct}% Buy</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ATR-CALIBRATED INSTITUTIONAL TRADE PLAN (ENTRY, TP1, TP2, STOP-LOSS) */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <Target className="w-4 h-4 text-amber-500 shrink-0" />
            <span>ផែនការជួញដូរសុក្រិតតាម ATR(14)</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              analysis.tradeSetup.direction === 'LONG'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
            }`}
          >
            {analysis.tradeSetup.khmerDirection}
          </span>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800/80">
          {analysis.tradeSetup.rationaleKhmer}
        </p>

        <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25">
            <div className="text-[10px] font-sans text-sky-700 dark:text-sky-300">
              តម្លៃចូលទីផ្សារ (Entry Zone)
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {formatPrice(analysis.tradeSetup.entryPrice, currentAsset.symbol)}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25">
            <div className="text-[10px] font-sans text-rose-700 dark:text-rose-300">
              កាត់ខាតសុវត្ថិភាព (Stop-Loss 1.5x ATR)
            </div>
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {formatPrice(analysis.tradeSetup.stopLoss, currentAsset.symbol)}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
            <div className="text-[10px] font-sans text-emerald-700 dark:text-emerald-300">
              គោលដៅទី ១ (Take-Profit 1)
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {formatPrice(analysis.tradeSetup.takeProfit1, currentAsset.symbol)}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/35">
            <div className="text-[10px] font-sans text-emerald-800 dark:text-emerald-200">
              គោលដៅទី ២ (Take-Profit 2 · R:R 1:{analysis.tradeSetup.riskRewardRatio})
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
              {formatPrice(analysis.tradeSetup.takeProfit2, currentAsset.symbol)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handlePlotTradeSetup}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>គូសប្រអប់ R:R លើក្រាហ្វ</span>
          </button>

          <button
            type="button"
            onClick={handleSaveQuantSetup}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>រក្សាទុកផែនការ</span>
          </button>
        </div>
      </div>

      {/* 4. INSTITUTIONAL PIVOT POINTS (S1-S3 & R1-R3) */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <Layers className="w-4 h-4 text-sky-500 shrink-0" />
            <span>កម្រិតគាំទ្រ និងរាំងខ្ទប់ស្ថាប័ន (Pivot Points)</span>
          </div>
          <button
            type="button"
            onClick={handlePlotPivots}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-700 dark:text-amber-300 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>គូសខ្សែ S/R លើក្រាហ្វ</span>
          </button>
        </div>

        <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70 font-mono tabular-nums text-[11px]">
          {pivotRows.map((row) => {
            const distPct =
              currentAsset.price > 0
                ? (((row.price - currentAsset.price) / currentAsset.price) * 100).toFixed(2)
                : '0.00';
            return (
              <div key={row.code} className="flex items-center justify-between py-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 font-bold ${row.tone}`}>{row.code}</span>
                  <span className="font-sans text-slate-600 dark:text-slate-300 truncate">
                    {row.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-semibold ${row.tone}`}>
                    {formatPrice(row.price, currentAsset.symbol)}
                  </span>
                  <span className="text-[10px] text-slate-400 w-12 text-right">
                    {Number(distPct) >= 0 ? `+${distPct}%` : `${distPct}%`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onQuickPriceAlert(row.price)}
                    title={`ដាក់ការជូនដំណឹងនៅកម្រិត ${row.code} (${formatPrice(row.price, currentAsset.symbol)})`}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <Bell className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 10-FACTOR TECHNICAL INDICATOR MATRIX */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>តារាងសូចនាករគណិតវិទ្យាទាំង ១០ (10-Factor Matrix)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">MA & Oscillators</span>
        </div>

        <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
          {analysis.factors.map((f) => (
            <div key={f.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {f.name}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {f.khmerName}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {f.detail}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {f.valueLabel}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    f.signal === 'BUY'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : f.signal === 'SELL'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30'
                  }`}
                >
                  {f.khmerSignal}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. GLOBAL BENCHMARK QUICK SCANNER */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <Compass className="w-4 h-4 text-cyan-500 shrink-0" />
            <span>ស្កេនទីផ្សារគោលពិភពលោក (Global Benchmarks)</span>
          </div>
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {allAssets
            .filter((a) =>
              ['XAU/USD', 'GOLD-KH', 'USOIL', 'UKOIL', 'BTC/USDT', 'ETH/USDT', 'NVDA', 'AAPL'].includes(
                a.symbol
              )
            )
            .map((item) => {
              const isUp = item.change24h >= 0;
              const isActive = item.symbol === currentAsset.symbol;
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-500/50'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 hover:border-sky-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.symbol}
                    </span>
                    <span
                      className={`inline-flex items-center text-[10px] font-mono font-bold ${
                        isUp
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isUp ? (
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-0.5" />
                      )}
                      {isUp ? '+' : ''}
                      {item.change24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatPrice(item.price, item.symbol)}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{item.khmerName}</div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
