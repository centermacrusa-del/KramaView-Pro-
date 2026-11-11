import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Globe,
  Layers,
  Minus,
  Plus,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';
import { Candle, ChartDrawing, MarketAsset, Timeframe } from '../types/market';
import { AssetBadgeIcon } from './AssetBadgeIcon';
import {
  ExnessAccountType,
  MT5AccountSession,
  calculateExnessBidAsk,
  calculateExnessOrderMetrics,
  calculateGlobalPrecisionAnalysis,
  formatPrice,
  getExnessContractSpec,
  playAlertTone,
} from '../services/marketEngine';
import { Language } from '../services/i18n';

interface QuickLiveTradingBarProps {
  asset: MarketAsset;
  candles: Candle[];
  timeframe: Timeframe;
  accountType: ExnessAccountType;
  mt5Session: MT5AccountSession;
  language?: Language;
  onExecuteOrder: (params: {
    direction: 'BUY' | 'SELL';
    lots: number;
    takeProfit?: number;
    stopLoss?: number;
  }) => void;
  onOpenBrokerModal: () => void;
  openPositionsCount?: number;
  totalFloatingPnL?: number;
  totalProfitTargetUSD?: number;
  totalProfitAutoCloseEnabled?: boolean;
  onUpdateTotalProfitTarget?: (target: number) => void;
  onCloseAllPositions?: (filter?: 'ALL' | 'PROFITABLE') => void;
  className?: string;
}

export const QuickLiveTradingBar: React.FC<QuickLiveTradingBarProps> = ({
  asset,
  candles,
  timeframe,
  accountType,
  mt5Session,
  language = 'km',
  onExecuteOrder,
  onOpenBrokerModal,
  openPositionsCount = 0,
  totalFloatingPnL = 0,
  totalProfitTargetUSD = 2,
  totalProfitAutoCloseEnabled = false,
  onUpdateTotalProfitTarget,
  onCloseAllPositions,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [lots, setLots] = useState<number>(0.1);
  const [useTP, setUseTP] = useState<boolean>(false);
  const [useSL, setUseSL] = useState<boolean>(false);
  const [customTP, setCustomTP] = useState<string>('');
  const [customSL, setCustomSL] = useState<string>('');
  const [lastExecutedDirection, setLastExecutedDirection] = useState<'BUY' | 'SELL' | null>(null);
  const [isFastClosing, setIsFastClosing] = useState<boolean>(false);

  const spec = useMemo(
    () => getExnessContractSpec(asset.symbol, accountType),
    [asset.symbol, accountType]
  );

  const liveQuote = useMemo(
    () => calculateExnessBidAsk(asset.symbol, asset.price, accountType),
    [asset.symbol, asset.price, accountType]
  );

  const quantReport = useMemo(
    () => calculateGlobalPrecisionAnalysis(asset, candles, timeframe),
    [asset, candles, timeframe]
  );

  // Sync TP / SL defaults when symbol changes
  useEffect(() => {
    setCustomTP(String(quantReport.tradeSetup.takeProfit1));
    setCustomSL(String(quantReport.tradeSetup.stopLoss));
  }, [asset.symbol, quantReport.tradeSetup.takeProfit1, quantReport.tradeSetup.stopLoss]);

  const effectiveTP = useMemo(() => {
    if (!useTP) return 0;
    const p = parseFloat(customTP);
    return Number.isFinite(p) && p > 0 ? p : quantReport.tradeSetup.takeProfit1;
  }, [useTP, customTP, quantReport.tradeSetup.takeProfit1]);

  const effectiveSL = useMemo(() => {
    if (!useSL) return 0;
    const p = parseFloat(customSL);
    return Number.isFinite(p) && p > 0 ? p : quantReport.tradeSetup.stopLoss;
  }, [useSL, customSL, quantReport.tradeSetup.stopLoss]);

  const handleAdjustLots = (delta: number) => {
    setLots((prev) => {
      const next = Math.max(0.01, Math.min(100, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  const handleBuy = () => {
    setLastExecutedDirection('BUY');
    onExecuteOrder({
      direction: 'BUY',
      lots,
      takeProfit: effectiveTP > 0 ? effectiveTP : undefined,
      stopLoss: effectiveSL > 0 ? effectiveSL : undefined,
    });
    setTimeout(() => setLastExecutedDirection(null), 800);
  };

  const handleSell = () => {
    setLastExecutedDirection('SELL');
    onExecuteOrder({
      direction: 'SELL',
      lots,
      takeProfit: effectiveTP > 0 ? effectiveTP : undefined,
      stopLoss: effectiveSL > 0 ? effectiveSL : undefined,
    });
    setTimeout(() => setLastExecutedDirection(null), 800);
  };

  const spreadUSD = Math.abs(liveQuote.ask - liveQuote.bid);
  const spreadPips = (spreadUSD / spec.pipSize).toFixed(1);

  return (
    <div
      className={`bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs z-30 transition-all ${className}`}
    >
      {/* Top Strip: Quick Trading Bar Header & Controls */}
      <div className="px-3 py-1.5 flex items-center justify-between gap-2">
        {/* Left: Quick Trading Title + Live Asset Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-xs shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">ទិញ/លក់ភ្លាមៗ</span>
            <span className="sm:hidden">Trade</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono min-w-0">
            <AssetBadgeIcon asset={asset} size="xs" />
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
              {asset.symbol}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              ({spec.exnessSymbol})
            </span>
            {accountType === 'standard_cent' && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-black border border-amber-500/30">
                CENT (¢)
              </span>
            )}
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
              Spread: {spreadPips} pips
            </span>
          </div>
        </div>

        {/* Center: Live Execution Buttons (When collapsed, show inline mini buttons) */}
        {isCollapsed ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSell}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-xs active:scale-95 transition-all"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>SELL {formatPrice(liveQuote.bid, asset.symbol)}</span>
            </button>

            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
              {lots} {accountType === 'standard_cent' ? 'Cent Lot' : 'Lot'}
            </span>

            <button
              type="button"
              onClick={handleBuy}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-xs active:scale-95 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>BUY {formatPrice(liveQuote.ask, asset.symbol)}</span>
            </button>
          </div>
        ) : null}

        {/* Active Open Positions Quick PnL & Instant Close All Button */}
        {openPositionsCount > 0 && (
          <div className="flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {openPositionsCount} Orders:
            </span>
            <span
              className={`font-mono text-xs font-black tabular-nums ${
                totalFloatingPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {totalFloatingPnL >= 0 ? '+' : ''}${totalFloatingPnL.toFixed(2)}
            </span>

            {onCloseAllPositions && (
              <button
                type="button"
                onClick={() => {
                  setIsFastClosing(true);
                  playAlertTone('spike_down');
                  onCloseAllPositions('ALL');
                  setTimeout(() => setIsFastClosing(false), 500);
                }}
                disabled={isFastClosing}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] text-white active:scale-95 transition-all shadow-xs cursor-pointer ${
                  isFastClosing ? 'bg-rose-700 animate-pulse' : 'bg-rose-600 hover:bg-rose-500'
                }`}
                title="បិទ Order ទាំងអស់ភ្លាមៗ (Close All Ultra-Fast)"
              >
                <Zap className="w-3 h-3 fill-current text-amber-300" />
                <span>Close All</span>
              </button>
            )}
          </div>
        )}

        {/* Right: Real Broker Connect Badge & Collapse Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenBrokerModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs"
            title="បើកច្រកជួញដូរលើ Exness WebTerminal ឬ Binance Spot ពិត"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">គណនីពិត</span>
            <span className="sm:hidden">Broker</span>
            <span className="text-[10px] font-mono text-slate-400">#{mt5Session.login}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'ពន្លាតបារទិញលក់' : 'បង្រួមបារទិញលក់'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Interactive One-Click Trading Dashboard */}
      {!isCollapsed && (
        <div className="px-3 pb-2.5 pt-0.5 space-y-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            {/* SELL Button (Bid) */}
            <div className="md:col-span-4">
              <button
                type="button"
                onClick={handleSell}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-white font-mono shadow-xs transition-all active:scale-[0.98] ${
                  lastExecutedDirection === 'SELL'
                    ? 'ring-2 ring-rose-400 scale-[0.99] bg-rose-700'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-0.5 text-rose-100">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {language === 'km' ? 'SELL (ចុះ / លក់)' : 'SELL (Short)'}
                  </span>
                  <span className="text-[9px] text-rose-200 font-sans">BID PRICE</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black tabular-nums tracking-tight">
                    {formatPrice(liveQuote.bid, asset.symbol)}
                  </span>
                  <span className="block text-[9px] text-rose-200">
                    {lots} {accountType === 'standard_cent' ? 'Cent Lot' : 'Lot'}
                  </span>
                </div>
              </button>
            </div>

            {/* Lot Size Stepper & Preset Selector */}
            <div className="md:col-span-4 flex flex-col items-center gap-1.5 px-2">
              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => handleAdjustLots(-0.01)}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
                  title="-0.01 Lot"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 text-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    value={lots ?? 0.1}
                    onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                    className="w-full text-center py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                  <span className="block text-[9px] font-mono text-slate-400">
                    {accountType === 'standard_cent' ? 'CENT LOT (¢)' : 'LOT SIZE'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjustLots(0.01)}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors"
                  title="+0.01 Lot"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 w-full justify-between">
                {(accountType === 'standard_cent'
                  ? [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]
                  : [0.01, 0.05, 0.1, 0.5, 1.0]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLots(preset)}
                    className={`flex-1 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      lots === preset
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* BUY Button (Ask) */}
            <div className="md:col-span-4">
              <button
                type="button"
                onClick={handleBuy}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-white font-mono shadow-xs transition-all active:scale-[0.98] ${
                  lastExecutedDirection === 'BUY'
                    ? 'ring-2 ring-emerald-400 scale-[0.99] bg-emerald-700'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-0.5 text-emerald-100">
                    {language === 'km' ? 'BUY (ឡើង / ទិញ)' : 'BUY (Long)'}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[9px] text-emerald-200 font-sans">ASK PRICE</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black tabular-nums tracking-tight">
                    {formatPrice(liveQuote.ask, asset.symbol)}
                  </span>
                  <span className="block text-[9px] text-emerald-200">
                    {lots} {accountType === 'standard_cent' ? 'Cent Lot' : 'Lot'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick TP / SL Optional Row */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/50 text-[11px]">
            <div className="flex items-center flex-wrap gap-3">
              {/* SL Toggle & Input */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(useSL)}
                  onClick={() => setUseSL(!useSL)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none ${
                    useSL
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="font-semibold">Stop Loss (SL):</span>
                  <span
                    className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                      useSL ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                        useSL ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <span className="text-[10px] font-bold">
                    {useSL ? 'បើក' : 'បិទ'}
                  </span>
                </button>
                {useSL && (
                  <input
                    type="number"
                    step="any"
                    value={customSL ?? ''}
                    onChange={(e) => setCustomSL(e.target.value)}
                    placeholder="Auto SL"
                    className="w-24 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-rose-300 dark:border-rose-900 font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 focus:outline-none"
                  />
                )}
              </div>

              {/* TP Toggle & Input */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(useTP)}
                  onClick={() => setUseTP(!useTP)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none ${
                    useTP
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="font-semibold">Take Profit (TP):</span>
                  <span
                    className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                      useTP ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                        useTP ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <span className="text-[10px] font-bold">
                    {useTP ? 'បើក' : 'បិទ'}
                  </span>
                </button>
                {useTP && (
                  <input
                    type="number"
                    step="any"
                    value={customTP ?? ''}
                    onChange={(e) => setCustomTP(e.target.value)}
                    placeholder="Auto TP"
                    className="w-24 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span>គណនី៖</span>
              <b className="text-slate-700 dark:text-slate-300">{mt5Session.server}</b>
            </div>
          </div>

          {/* Quick Target Profit Auto-Close Row when there are open positions */}
          {openPositionsCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  <span>គោលដៅចំណេញបិទស្វ័យប្រវត្តិ:</span>
                </span>
                {onUpdateTotalProfitTarget && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-300 dark:border-slate-800">
                    {[1, 2, 3, 4, 5, 100].map((tgt) => (
                      <button
                        key={tgt}
                        type="button"
                        onClick={() => {
                          playAlertTone('target');
                          onUpdateTotalProfitTarget(tgt);
                        }}
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all cursor-pointer ${
                          totalProfitTargetUSD === tgt
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
                        }`}
                      >
                        {tgt}$
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {onCloseAllPositions && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFastClosing(true);
                      playAlertTone('spike_down');
                      onCloseAllPositions('ALL');
                      setTimeout(() => setIsFastClosing(false), 500);
                    }}
                    disabled={isFastClosing}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black transition-all active:scale-95 cursor-pointer shadow-sm ring-1 ring-rose-400/40"
                  >
                    ⚡ បិទទាំងអស់ (Close All)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playAlertTone('spike_up');
                      onCloseAllPositions('PROFITABLE');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    💰 បិទតែចំណេញ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
