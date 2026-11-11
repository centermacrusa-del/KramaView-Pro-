import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  List,
} from 'lucide-react';
import { MarketAsset } from '../types/market';
import {
  MT5AccountSession,
  calculateExnessBidAsk,
  formatPrice,
  getExnessContractSpec,
  playAlertTone,
} from '../services/marketEngine';
import { ExnessSyncedPosition } from './ExnessWebTradingPanel';
import { PositionCloseReason } from '../services/smartExitBrain';
import { Language } from '../services/i18n';

const PRESET_PROFIT_TARGETS = [1, 2, 3, 4, 5, 100];

interface ActivePositionsBottomBarProps {
  positions: ExnessSyncedPosition[];
  assets: MarketAsset[];
  currentAsset: MarketAsset;
  mt5Session?: MT5AccountSession;
  language?: Language;
  onClosePosition: (id: string, reason?: PositionCloseReason) => void;
  onCloseAll: (filter?: 'ALL' | 'PROFITABLE') => void;
  totalProfitTargetUSD?: number;
  onUpdateTotalProfitTarget?: (target: number) => void;
  totalProfitAutoCloseEnabled?: boolean;
  onToggleTotalProfitAutoClose?: (enabled: boolean) => void;
  className?: string;
}

export const ActivePositionsBottomBar: React.FC<ActivePositionsBottomBarProps> = ({
  positions,
  assets,
  currentAsset,
  language = 'km',
  onClosePosition,
  onCloseAll,
  totalProfitTargetUSD = 2,
  onUpdateTotalProfitTarget,
  totalProfitAutoCloseEnabled = false,
  onToggleTotalProfitAutoClose,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [customTargetInput, setCustomTargetInput] = useState<string>('');
  const [isFastClosing, setIsFastClosing] = useState<boolean>(false);

  const openPositions = useMemo(
    () => positions.filter((p) => p.status === 'OPEN'),
    [positions]
  );
  const pendingOrders = useMemo(
    () => positions.filter((p) => p.status === 'PENDING'),
    [positions]
  );

  // Calculate live floating PnL for each position and total
  const { positionMetrics, totalFloatingPnL, totalLots, profitableCount } = useMemo(() => {
    let sumPnL = 0;
    let sumLots = 0;
    let profitCount = 0;

    const list = openPositions.map((pos) => {
      const posAsset = assets.find((a) => a.symbol === pos.symbol) || currentAsset;
      const quote = calculateExnessBidAsk(pos.symbol, posAsset.price, pos.accountType);
      const spec = getExnessContractSpec(pos.symbol, pos.accountType);
      const closePrice = pos.direction === 'BUY' ? quote.bid : quote.ask;
      const diff =
        pos.direction === 'BUY' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
      const pnl = Number(
        (
          diff * pos.lots * spec.contractSize -
          pos.lots * spec.commissionPerLotUSD[pos.accountType]
        ).toFixed(2)
      );

      sumPnL += pnl;
      sumLots += pos.lots;
      if (pnl > 0) profitCount += 1;

      return {
        ...pos,
        currentPrice: closePrice,
        floatingPnL: pnl,
      };
    });

    return {
      positionMetrics: list,
      totalFloatingPnL: Number(sumPnL.toFixed(2)),
      totalLots: Number(sumLots.toFixed(2)),
      profitableCount: profitCount,
    };
  }, [openPositions, assets, currentAsset]);

  // Don't display anything if there are no open positions or pending orders
  if (positions.length === 0) return null;

  const isProfit = totalFloatingPnL >= 0;
  const isCentAccount = openPositions.some((p) => p.accountType === 'standard_cent');

  // Calculate progress toward total profit target
  const targetUSD = totalProfitTargetUSD > 0 ? totalProfitTargetUSD : 2;
  const progressRatio = Math.max(0, Math.min(100, (totalFloatingPnL / targetUSD) * 100));
  const isTargetHit = totalProfitAutoCloseEnabled && totalFloatingPnL >= targetUSD;

  const handleSelectPreset = (amount: number) => {
    playAlertTone('target');
    if (onUpdateTotalProfitTarget) {
      onUpdateTotalProfitTarget(amount);
    }
    if (onToggleTotalProfitAutoClose && !totalProfitAutoCloseEnabled) {
      onToggleTotalProfitAutoClose(true);
    }
  };

  const handleApplyCustomTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customTargetInput);
    if (!isNaN(parsed) && parsed > 0) {
      playAlertTone('target');
      if (onUpdateTotalProfitTarget) {
        onUpdateTotalProfitTarget(Number(parsed.toFixed(2)));
      }
      if (onToggleTotalProfitAutoClose && !totalProfitAutoCloseEnabled) {
        onToggleTotalProfitAutoClose(true);
      }
      setCustomTargetInput('');
    }
  };

  const handleFastCloseAll = () => {
    setIsFastClosing(true);
    playAlertTone('spike_down');
    onCloseAll('ALL');
    setTimeout(() => setIsFastClosing(false), 500);
  };

  const handleFastCloseProfitable = () => {
    playAlertTone('spike_up');
    onCloseAll('PROFITABLE');
  };

  return (
    <div
      className={`bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90 shadow-2xl z-30 transition-all ${className}`}
    >
      {/* 1. Main Unified Command Strip */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Zone 1: Status & Total Unrealized PnL Display */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                {openPositions.length} {language === 'km' ? 'បញ្ជា' : 'Orders'} ({totalLots.toFixed(2)} Lot)
              </span>
              {pendingOrders.length > 0 && (
                <span className="text-[10px] font-mono text-amber-500">
                  +{pendingOrders.length} Pending
                </span>
              )}
            </div>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono tabular-nums shadow-xs ${
              isProfit
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-slate-400">
                Total PnL
              </span>
              <span className="text-sm font-black tracking-tight">
                {isProfit ? '+' : ''}${totalFloatingPnL.toFixed(2)}
              </span>
            </div>
            {isCentAccount && (
              <span className="text-[11px] font-bold text-amber-500 border-l border-slate-300 dark:border-slate-700 pl-2">
                {isProfit ? '+' : ''}{(totalFloatingPnL * 100).toFixed(0)} ¢
              </span>
            )}
          </div>
        </div>

        {/* Zone 2: Target Profit Auto-Close Controller (Clean Segmented Buttons & Progress) */}
        <div className="flex items-center flex-wrap gap-2.5 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Label + Target Icon */}
          <div className="flex items-center gap-1.5 pl-1 shrink-0 text-slate-700 dark:text-slate-300">
            <Target className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold whitespace-nowrap">
              {language === 'km' ? 'គោលដៅបិទស្វ័យប្រវត្តិ:' : 'Auto Close Target:'}
            </span>
          </div>

          {/* Segmented Preset Buttons (1$, 2$, 3$, 4$, 5$, 100$) */}
          <div className="flex items-center bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-300 dark:border-slate-800 shadow-2xs">
            {PRESET_PROFIT_TARGETS.map((amount) => {
              const isSelected = totalProfitTargetUSD === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleSelectPreset(amount)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title={`កំណត់គោលដៅចំណេញ $${amount} USD`}
                >
                  {amount}$
                </button>
              );
            })}
          </div>

          {/* Custom $ Input */}
          <form onSubmit={handleApplyCustomTarget} className="flex items-center">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">
                $
              </span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="ផ្សេងៗ"
                value={customTargetInput}
                onChange={(e) => setCustomTargetInput(e.target.value)}
                className="w-16 pl-4 pr-1.5 py-1 text-xs font-mono font-bold rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            {customTargetInput && (
              <button
                type="submit"
                className="ml-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                ដាក់
              </button>
            )}
          </form>

          {/* Auto-Close Switch */}
          {onToggleTotalProfitAutoClose && (
            <div className="flex items-center pl-1 border-l border-slate-300 dark:border-slate-800">
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(totalProfitAutoCloseEnabled)}
                onClick={() => onToggleTotalProfitAutoClose(!totalProfitAutoCloseEnabled)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none ${
                  totalProfitAutoCloseEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-200/70 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span
                  className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                    totalProfitAutoCloseEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                      totalProfitAutoCloseEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className="text-[11px] font-bold whitespace-nowrap">
                  {totalProfitAutoCloseEnabled ? 'បើក Auto' : 'បិទ Auto'}
                </span>
              </button>
            </div>
          )}

          {/* Target Progress Bar & Ratio */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-800">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] font-mono text-slate-500">
                {totalFloatingPnL >= 0 ? '+' : ''}${totalFloatingPnL.toFixed(2)} / ${targetUSD}
              </span>
              <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isTargetHit
                      ? 'bg-emerald-400 animate-pulse'
                      : totalFloatingPnL > 0
                      ? 'bg-emerald-500'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${progressRatio}%` }}
                />
              </div>
            </div>
            {isTargetHit && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[10px] font-bold font-mono animate-pulse whitespace-nowrap">
                🎯 ដល់គោលដៅ!
              </span>
            )}
          </div>
        </div>

        {/* Zone 3: High-Priority Action Buttons (ប៊ូតុង បិទទាំងអស់ ជាចម្បង) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Primary Action (#1): ULTRA-FAST CLOSE ALL */}
          {openPositions.length > 0 && (
            <button
              type="button"
              onClick={handleFastCloseAll}
              disabled={isFastClosing}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs text-white shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap ${
                isFastClosing
                  ? 'bg-rose-700 animate-pulse'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 ring-1 ring-rose-400/50'
              }`}
              title="បិទ Order ទាំងអស់ភ្លាមៗកម្រិតល្បឿនលឿនបំផុត (Close All Instant)"
            >
              <Zap className="w-4 h-4 fill-current text-amber-300" />
              <span>⚡ បិទទាំងអស់ (Close All)</span>
            </button>
          )}

          {/* Secondary Action: Close Profitable Button */}
          {profitableCount > 0 && (
            <button
              type="button"
              onClick={handleFastCloseProfitable}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              title="បិទតែ Order ណាដែលកំពុងចំណេញ (Close Profitable Only)"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'បិទតែចំណេញ' : 'Close Profit'} ({profitableCount})</span>
            </button>
          )}

          {/* Toggle Positions Table View */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
            title={isExpanded ? 'បង្រួមតារាង' : 'មើលបញ្ជីលម្អិត'}
          >
            <List className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExpanded ? 'បង្រួម' : 'បញ្ជី'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Expanded Detail Table of Active Positions */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 text-[10px] text-slate-500 border-b border-slate-200 dark:border-slate-800 font-mono">
              <tr>
                <th className="py-2 pl-4">TICKET #</th>
                <th className="py-2">SYMBOL</th>
                <th className="py-2">TYPE</th>
                <th className="py-2">LOTS</th>
                <th className="py-2">ENTRY</th>
                <th className="py-2">CURRENT</th>
                <th className="py-2">TP / SL</th>
                <th className="py-2 text-right">PROFIT / LOSS</th>
                <th className="py-2 pr-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 font-mono">
              {positionMetrics.map((pos) => {
                const isBuy = pos.direction === 'BUY';
                const isPosProfit = pos.floatingPnL >= 0;
                return (
                  <tr
                    key={pos.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isBuy ? 'bg-emerald-500/[0.02]' : 'bg-rose-500/[0.02]'
                    }`}
                  >
                    <td className="py-2 pl-4 text-slate-500 font-bold">#{pos.ticket}</td>
                    <td className="py-2 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{pos.symbol}</span>
                        {pos.accountType === 'standard_cent' && (
                          <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[8px] font-black border border-amber-500/30">
                            CENT
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {pos.exnessSymbol}
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          isBuy
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {pos.direction}
                      </span>
                    </td>
                    <td className="py-2 font-bold text-slate-900 dark:text-white font-mono text-xs">
                      {pos.lots.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 font-bold ${
                        isBuy ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {formatPrice(pos.entryPrice, pos.symbol)}
                    </td>
                    <td className="py-2 font-bold text-slate-900 dark:text-white">
                      {formatPrice(pos.currentPrice, pos.symbol)}
                    </td>
                    <td className="py-2 text-[10px] text-slate-500">
                      <div>TP: {pos.takeProfit > 0 ? formatPrice(pos.takeProfit, pos.symbol) : '--'}</div>
                      <div>SL: {pos.stopLoss > 0 ? formatPrice(pos.stopLoss, pos.symbol) : '--'}</div>
                    </td>
                    <td
                      className={`py-2 text-right font-black tabular-nums ${
                        isPosProfit ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {pos.accountType === 'standard_cent' ? (
                        <div>
                          <span>
                            {isPosProfit ? '+' : ''}{(pos.floatingPnL * 100).toFixed(2)} ¢
                          </span>
                          <span className="text-[9px] text-slate-400 block font-normal">
                            ({isPosProfit ? '+' : ''}${pos.floatingPnL.toFixed(2)} USD)
                          </span>
                        </div>
                      ) : (
                        <span>
                          {isPosProfit ? '+' : ''}${pos.floatingPnL.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => onClosePosition(pos.id, 'MANUAL')}
                        className="px-2.5 py-1 rounded-md bg-rose-500 hover:bg-rose-600 text-white font-sans font-bold text-[10px] shadow-2xs active:scale-95 transition-all cursor-pointer"
                        title="បិទ Order នេះភ្លាមៗ"
                      >
                        បិទ (Close)
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Pending Orders Rows */}
              {pendingOrders.map((pos) => {
                const isBuyOrder = pos.direction === 'BUY' || pos.orderType.includes('BUY');
                return (
                  <tr key={pos.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 pl-4 text-slate-500 font-bold">#{pos.ticket}</td>
                    <td className="py-2 font-bold text-slate-800 dark:text-slate-200">
                      {pos.symbol}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isBuyOrder
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        {isBuyOrder ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {pos.orderType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 font-bold text-slate-700 dark:text-slate-300">
                      {pos.lots.toFixed(2)}
                    </td>
                    <td
                      className={`py-2 font-bold ${
                        isBuyOrder ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {formatPrice(pos.entryPrice, pos.symbol)}
                    </td>
                    <td className="py-2 text-slate-400">--</td>
                    <td className="py-2 text-[10px] text-slate-500">
                      <div>TP: {pos.takeProfit > 0 ? formatPrice(pos.takeProfit, pos.symbol) : '--'}</div>
                      <div>SL: {pos.stopLoss > 0 ? formatPrice(pos.stopLoss, pos.symbol) : '--'}</div>
                    </td>
                    <td className="py-2 text-right text-amber-500 font-semibold">PENDING</td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => onClosePosition(pos.id, 'MANUAL')}
                        className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-300 font-sans font-bold text-[10px] transition-all cursor-pointer"
                        title="លុប Pending Order"
                      >
                        លុប
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100/95 dark:bg-slate-900/95 border-t border-slate-300 dark:border-slate-800 font-mono sticky bottom-0 text-xs shadow-xs">
              <tr className="font-bold">
                <td colSpan={3} className="py-2.5 pl-4 text-slate-700 dark:text-slate-300">
                  Total: {openPositions.length} active trade{openPositions.length === 1 ? '' : 's'}
                </td>
                <td className="py-2.5 text-slate-900 dark:text-white font-black">
                  {totalLots.toFixed(2)} Lot
                </td>
                <td colSpan={3} className="py-2.5 text-slate-500 text-[11px] font-normal">
                  គោលដៅចំណេញ: +${targetUSD} USD
                </td>
                <td
                  className={`py-2.5 text-right font-black tabular-nums text-sm ${
                    isProfit ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {isProfit ? '+' : ''}${totalFloatingPnL.toFixed(2)} USD
                </td>
                <td className="py-2.5 pr-4 text-right">
                  {openPositions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleFastCloseAll}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-sans font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      ⚡ Close All
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
