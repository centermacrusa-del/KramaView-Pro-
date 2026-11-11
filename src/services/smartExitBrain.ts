/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Smart Exit Brain (ខួរក្បាលឆ្លាតវៃគ្រប់គ្រងការបិទ Trade ដោយស្វ័យប្រវត្តិ)
 * Intelligently analyzes active positions to determine:
 * 1. ពេលណាគួរ បិទយកចំណេញ (When to Close on Profit):
 *    - Reversal Exit (ទីផ្សារត្រឡប់ក្បាលពេលកំពុងចំណេញ)
 *    - Trailing Stop Lock (ចាក់សោរប្រាក់ចំណេញរំកិលតាមតម្លៃ)
 *    - Auto Break-Even (រុញ SL ស្មើដើម ពេលចំណេញបានពាក់កណ្តាល TP)
 * 2. ពេលណាគួរ បិទកាត់ខាត (When to Close on Loss):
 *    - Early Structure Invalidation (កាត់ខាតមុនពេលបាក់រចនាសម្ព័ន្ធទីផ្សារ សន្សំដើមទុន)
 *    - Max Drawdown Circuit Breaker (កម្រិតខាតអតិបរមាការពារគណនី)
 */

import { Candle, MarketAsset } from '../types/market';
import {
  ExnessAccountType,
  GlobalPrecisionAnalysisResult,
  calculateExnessBidAsk,
  getExnessContractSpec,
  formatPrice,
} from './marketEngine';

export type PositionCloseReason =
  | 'MANUAL'
  | 'TP_HIT'
  | 'SL_HIT'
  | 'SMART_TP_REVERSAL'
  | 'SMART_TRAILING_STOP'
  | 'SMART_BREAK_EVEN'
  | 'SMART_TARGET_PROFIT_CAP'
  | 'SMART_TOTAL_PROFIT_CLOSE_ALL'
  | 'SMART_EARLY_CUT_LOSS'
  | 'SMART_MAX_DRAWDOWN'
  | 'SMART_SPIKE_PROTECTION';

export interface SmartExitSettings {
  autoCloseEnabled: boolean;
  takeProfitOnReversal: boolean;
  trailingStopEnabled: boolean;
  trailingPullbackPct: number; // e.g., 30% pullback from peak profit
  autoBreakEvenEnabled: boolean;
  breakEvenTriggerPct: number; // e.g., 50% towards TP
  smartTrailingProfitEnabled: boolean; // Smart Trailing Profit
  smartTrailingTriggerPct: number; // Trigger threshold e.g. 50% towards target profit
  smartTrailingBufferPct: number; // Trailing distance buffer e.g. 35% behind market price
  earlyStructureCutLoss: boolean;
  maxDrawdownDollars: number; // e.g., $35 max loss per trade in USD ($35 USD = 3,500 ¢ USC)
  targetProfitDollars?: number; // e.g., $50 target profit cap in USD ($50 USD = 5,000 ¢ USC)
  minProfitToTrailUSD: number; // e.g., $8 minimum profit before trailing activates
  totalProfitAutoCloseEnabled: boolean; // Auto close all positions when total portfolio profit reaches target
  totalProfitTargetUSD: number; // Target dollar amount: 1, 2, 3, 4, 5, 100, or custom
}

export const DEFAULT_SMART_EXIT_SETTINGS: SmartExitSettings = {
  autoCloseEnabled: false,
  takeProfitOnReversal: false,
  trailingStopEnabled: false,
  trailingPullbackPct: 30,
  autoBreakEvenEnabled: false,
  breakEvenTriggerPct: 50,
  smartTrailingProfitEnabled: false,
  smartTrailingTriggerPct: 50,
  smartTrailingBufferPct: 35,
  earlyStructureCutLoss: false,
  maxDrawdownDollars: 35,
  targetProfitDollars: 50,
  minProfitToTrailUSD: 10,
  totalProfitAutoCloseEnabled: false,
  totalProfitTargetUSD: 2,
};

export interface ActiveTradeDiagnosis {
  positionId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  highestPnL: number;
  pips: number;
  healthStatus: 'HEALTHY_PROFIT' | 'PREPARE_TP' | 'CLOSE_NOW_PROFIT' | 'CUT_LOSS_EARLY' | 'HOLD_NEUTRAL';
  shouldAutoClose: boolean;
  closeReason?: PositionCloseReason;
  actionKhmer: string;
  rationaleKhmer: string;
  recommendedSlMove?: number; // Break-even new stop price if applicable
}

/**
 * Evaluates an active trade against live market confluence to determine smart exit.
 */
export function evaluateSmartExit(
  position: {
    id: string;
    symbol: string;
    direction: 'BUY' | 'SELL';
    lots: number;
    entryPrice: number;
    takeProfit: number;
    stopLoss: number;
    accountType: ExnessAccountType;
  },
  asset: MarketAsset,
  candles: Candle[],
  precision: GlobalPrecisionAnalysisResult,
  highestPnLRecorded: number,
  settings: SmartExitSettings = DEFAULT_SMART_EXIT_SETTINGS
): ActiveTradeDiagnosis {
  const quote = calculateExnessBidAsk(position.symbol, asset.price, position.accountType);
  const spec = getExnessContractSpec(position.symbol, position.accountType);

  const currentClosePrice = position.direction === 'BUY' ? quote.bid : quote.ask;
  const priceDiff =
    position.direction === 'BUY'
      ? currentClosePrice - position.entryPrice
      : position.entryPrice - currentClosePrice;

  // Realized metrics
  const commission = position.lots * spec.commissionPerLotUSD[position.accountType];
  const grossPnL = priceDiff * position.lots * spec.contractSize;
  const unrealizedPnL = Number((grossPnL - commission).toFixed(2));
  const pips = Number((priceDiff / spec.pipSize).toFixed(1));

  const peakPnL = Math.max(highestPnLRecorded, unrealizedPnL);
  const isProfitable = unrealizedPnL > 0;

  // 1. HARD TP / SL CHECKS
  if (
    position.takeProfit > 0 &&
    ((position.direction === 'BUY' && currentClosePrice >= position.takeProfit) ||
      (position.direction === 'SELL' && currentClosePrice <= position.takeProfit))
  ) {
    return {
      positionId: position.id,
      symbol: position.symbol,
      direction: position.direction,
      entryPrice: position.entryPrice,
      currentPrice: currentClosePrice,
      unrealizedPnL,
      highestPnL: peakPnL,
      pips,
      healthStatus: 'CLOSE_NOW_PROFIT',
      shouldAutoClose: true,
      closeReason: 'TP_HIT',
      actionKhmer: '🎯 ដល់គោលដៅចំណេញ (TP Hit)',
      rationaleKhmer: `តម្លៃបានប៉ះគោលដៅ Take Profit ${formatPrice(position.takeProfit, position.symbol)} ដោយជោគជ័យ (+${pips} pips)!`,
    };
  }

  if (
    position.stopLoss > 0 &&
    ((position.direction === 'BUY' && currentClosePrice <= position.stopLoss) ||
      (position.direction === 'SELL' && currentClosePrice >= position.stopLoss))
  ) {
    return {
      positionId: position.id,
      symbol: position.symbol,
      direction: position.direction,
      entryPrice: position.entryPrice,
      currentPrice: currentClosePrice,
      unrealizedPnL,
      highestPnL: peakPnL,
      pips,
      healthStatus: 'CUT_LOSS_EARLY',
      shouldAutoClose: true,
      closeReason: 'SL_HIT',
      actionKhmer: '🛡️ ប៉ះ Stop Loss (SL Hit)',
      rationaleKhmer: `តម្លៃបានប៉ះបន្ទាត់ការពារ Stop Loss ${formatPrice(position.stopLoss, position.symbol)}។`,
    };
  }

  // 2. SMART PROFIT EXIT BRAIN (ពេលចំណេញគួរ បិទ)
  if (isProfitable) {
    // 0. Target Profit Money Cap (បិទយកប្រាក់ចំណេញពេលដល់ចំនួនទឹកប្រាក់កំណត់ USD / USC)
    if (
      settings.targetProfitDollars &&
      settings.targetProfitDollars > 0 &&
      unrealizedPnL >= settings.targetProfitDollars
    ) {
      return {
        positionId: position.id,
        symbol: position.symbol,
        direction: position.direction,
        entryPrice: position.entryPrice,
        currentPrice: currentClosePrice,
        unrealizedPnL,
        highestPnL: peakPnL,
        pips,
        healthStatus: 'CLOSE_NOW_PROFIT',
        shouldAutoClose: settings.autoCloseEnabled,
        closeReason: 'SMART_TARGET_PROFIT_CAP',
        actionKhmer: '🎯 ដល់គោលដៅទឹកប្រាក់ចំណេញ (Target Profit Cap)',
        rationaleKhmer: `សម្រេចបានផលចំណេញ +$${unrealizedPnL.toFixed(2)} USD (+${(unrealizedPnL * 100).toFixed(0)} ¢ USC) ស្មើនឹងកម្រិតកំណត់ដែលអ្នកចង់បាន (Target: $${settings.targetProfitDollars} USD / ${(settings.targetProfitDollars * 100).toFixed(0)} ¢ USC)។ ប្រព័ន្ធបិទយកចំណេញភ្លាមៗ!`,
      };
    }

    // A. Reversal Exit while in Profit:
    // If BUY trade is profitable, but market has turned heavily BEARISH (SELL signal or RSI rolled over from overbought)
    const isBuyAndBearishReversal =
      position.direction === 'BUY' &&
      unrealizedPnL >= 5 &&
      (precision.overallVerdict === 'SELL' ||
        precision.overallVerdict === 'STRONG_SELL' ||
        precision.rsi14 >= 72 ||
        (precision.factors.find((f) => f.id === 'EMA20')?.signal === 'SELL' &&
          precision.factors.find((f) => f.id === 'VWAP')?.signal === 'SELL'));

    const isSellAndBullishReversal =
      position.direction === 'SELL' &&
      unrealizedPnL >= 5 &&
      (precision.overallVerdict === 'BUY' ||
        precision.overallVerdict === 'STRONG_BUY' ||
        precision.rsi14 <= 28 ||
        (precision.factors.find((f) => f.id === 'EMA20')?.signal === 'BUY' &&
          precision.factors.find((f) => f.id === 'VWAP')?.signal === 'BUY'));

    if (settings.takeProfitOnReversal && (isBuyAndBearishReversal || isSellAndBullishReversal)) {
      return {
        positionId: position.id,
        symbol: position.symbol,
        direction: position.direction,
        entryPrice: position.entryPrice,
        currentPrice: currentClosePrice,
        unrealizedPnL,
        highestPnL: peakPnL,
        pips,
        healthStatus: 'CLOSE_NOW_PROFIT',
        shouldAutoClose: settings.autoCloseEnabled,
        closeReason: 'SMART_TP_REVERSAL',
        actionKhmer: '🧠 បិទយកចំណេញពេលទីផ្សារបញ្ច្រាសទិស (Reversal Take-Profit)',
        rationaleKhmer: `ទីផ្សារបានចាប់ផ្តើមបញ្ច្រាសទិស ${isBuyAndBearishReversal ? 'ធ្លាក់ចុះ (Bearish)' : 'ឡើងមកវិញ (Bullish)'}។ ប្រព័ន្ធបិទភ្លាមៗដើម្បីសង្គ្រោះប្រាក់ចំណេញ +$${unrealizedPnL} (+${pips} pips) មុនពេលវាហួតអស់!`,
      };
    }

    // B. Trailing Stop Lock (ចាក់សោរប្រាក់ចំណេញរំកិលតាមតម្លៃ):
    // If peak profit reached threshold (e.g. >= $10) and has pulled back by e.g. 30% from peak
    if (
      settings.trailingStopEnabled &&
      peakPnL >= settings.minProfitToTrailUSD &&
      unrealizedPnL > 0
    ) {
      const pullbackFromPeakUSD = peakPnL - unrealizedPnL;
      const pullbackRatioPct = (pullbackFromPeakUSD / peakPnL) * 100;

      if (pullbackRatioPct >= settings.trailingPullbackPct) {
        return {
          positionId: position.id,
          symbol: position.symbol,
          direction: position.direction,
          entryPrice: position.entryPrice,
          currentPrice: currentClosePrice,
          unrealizedPnL,
          highestPnL: peakPnL,
          pips,
          healthStatus: 'CLOSE_NOW_PROFIT',
          shouldAutoClose: settings.autoCloseEnabled,
          closeReason: 'SMART_TRAILING_STOP',
          actionKhmer: '📈 ចាក់សោរចំណេញ Trailing Stop Exit',
          rationaleKhmer: `ផលចំណេញបានដកថយ ${pullbackRatioPct.toFixed(0)}% ពីចំណុចកំពូល +$${peakPnL.toFixed(2)}។ ប្រព័ន្ធបានបិទចាក់សោរយកចំណេញសុទ្ធ +$${unrealizedPnL.toFixed(2)}!`,
        };
      }
    }

    // C. Move to Break-Even (រុញ SL ទៅស្មើដើមពិតប្រាកដ Exact Entry Price):
    // When a position gains the specified percentage, automatically moves Stop-Loss to exact entry price
    if (settings.autoBreakEvenEnabled) {
      let isTriggered = false;
      let progressPct = 0;

      if (position.takeProfit > 0) {
        const fullTargetDiff = Math.abs(position.takeProfit - position.entryPrice);
        const currentCoveredDiff = Math.abs(currentClosePrice - position.entryPrice);
        progressPct = fullTargetDiff > 0 ? (currentCoveredDiff / fullTargetDiff) * 100 : 0;
        if (progressPct >= settings.breakEvenTriggerPct) {
          isTriggered = true;
        }
      } else if (unrealizedPnL > 0) {
        // If position has no Take-Profit set: calculate price gain percentage
        const priceGainPct = (Math.abs(priceDiff) / position.entryPrice) * 100;
        progressPct = priceGainPct;
        if (priceGainPct >= settings.breakEvenTriggerPct / 100) {
          isTriggered = true;
        }
      }

      if (isTriggered) {
        // Exact entry price to eliminate risk
        const exactEntryPrice = Number(position.entryPrice.toPrecision(7));

        const isSlAlreadySafe =
          position.direction === 'BUY'
            ? position.stopLoss >= position.entryPrice
            : position.stopLoss > 0 && position.stopLoss <= position.entryPrice;

        if (!isSlAlreadySafe) {
          return {
            positionId: position.id,
            symbol: position.symbol,
            direction: position.direction,
            entryPrice: position.entryPrice,
            currentPrice: currentClosePrice,
            unrealizedPnL,
            highestPnL: peakPnL,
            pips,
            healthStatus: 'PREPARE_TP',
            shouldAutoClose: false,
            recommendedSlMove: exactEntryPrice,
            actionKhmer: '⚖️ Move to Break-Even (រុញ SL ទៅស្មើដើម)',
            rationaleKhmer: `Trade សម្រេចបានផលចំណេញ ${progressPct.toFixed(0)}% (កម្រិតកំណត់ Break-Even: ${settings.breakEvenTriggerPct}%)! Stop-Loss ត្រូវបានរំកិលស្វ័យប្រវត្តិទៅកាន់តម្លៃចូលពិតប្រាកដ (${formatPrice(exactEntryPrice, position.symbol)}) ដើម្បីកម្ចាត់ចោលហានិភ័យខាតបង់ទាំងស្រុង (Zero Risk)។`,
          };
        }
      }
    }

    // D. Smart Trailing Profit (រឹតបន្តឹង SL កាន់តែជិតតម្លៃទីផ្សារពេលចំណេញដល់ 50% នៃ TP)
    if (settings.smartTrailingProfitEnabled && position.takeProfit > 0) {
      const fullTargetDiff = Math.abs(position.takeProfit - position.entryPrice);
      const currentCoveredDiff = Math.abs(currentClosePrice - position.entryPrice);
      const progressToTpPct = fullTargetDiff > 0 ? (currentCoveredDiff / fullTargetDiff) * 100 : 0;

      if (progressToTpPct >= settings.smartTrailingTriggerPct) {
        // Tighten Stop Loss dynamically behind current market price
        const trailingBufferDistance = currentCoveredDiff * (settings.smartTrailingBufferPct / 100);
        const tightenedSl =
          position.direction === 'BUY'
            ? Number((currentClosePrice - trailingBufferDistance).toPrecision(7))
            : Number((currentClosePrice + trailingBufferDistance).toPrecision(7));

        const isBetterSl =
          position.direction === 'BUY'
            ? tightenedSl > position.entryPrice &&
              tightenedSl > (position.stopLoss || 0) &&
              tightenedSl < currentClosePrice &&
              tightenedSl - (position.stopLoss || 0) >= spec.pipSize * 0.8
            : tightenedSl < position.entryPrice &&
              (position.stopLoss === 0 || tightenedSl < position.stopLoss) &&
              tightenedSl > currentClosePrice &&
              (position.stopLoss === 0 || position.stopLoss - tightenedSl >= spec.pipSize * 0.8);

        if (isBetterSl) {
          const lockedGainUSD =
            Math.abs(tightenedSl - position.entryPrice) * position.lots * spec.contractSize;
          return {
            positionId: position.id,
            symbol: position.symbol,
            direction: position.direction,
            entryPrice: position.entryPrice,
            currentPrice: currentClosePrice,
            unrealizedPnL,
            highestPnL: peakPnL,
            pips,
            healthStatus: 'PREPARE_TP',
            shouldAutoClose: false,
            recommendedSlMove: tightenedSl,
            actionKhmer: '📈 Smart Trailing Profit (រឹតបន្តឹង SL ចាក់សោរប្រាក់ចំណេញ)',
            rationaleKhmer: `Trade សម្រេចបាន ${progressToTpPct.toFixed(0)}% នៃ TP គោលដៅ! Stop Loss ត្រូវបានរឹតបន្តឹងឡើងមកកាន់ ${formatPrice(tightenedSl, position.symbol)} ដើម្បីចាក់សោរប្រាក់ចំណេញធានាបានយ៉ាងហោច +$${lockedGainUSD.toFixed(2)} ដោយស្វ័យប្រវត្តិ។`,
          };
        }
      }
    }

    // Healthy trade in progress
    return {
      positionId: position.id,
      symbol: position.symbol,
      direction: position.direction,
      entryPrice: position.entryPrice,
      currentPrice: currentClosePrice,
      unrealizedPnL,
      highestPnL: peakPnL,
      pips,
      healthStatus: 'HEALTHY_PROFIT',
      shouldAutoClose: false,
      actionKhmer: '🟢 កំពុងចំណេញល្អ (បន្តទុក - HOLD)',
      rationaleKhmer: `កំពុងចំណេញ +$${unrealizedPnL} (+${pips} pips)។ និន្នាការនៅតែស្របតាមទិសដៅ បន្តទុកទៅកាន់ TP1 / TP2។`,
    };
  }

  // 3. SMART LOSS CUTTING BRAIN (ខាត ពេលណាគួរ បិទ)
  const lossUSD = Math.abs(unrealizedPnL);

  // A. Circuit Breaker Max Drawdown per Trade
  if (lossUSD >= settings.maxDrawdownDollars) {
    return {
      positionId: position.id,
      symbol: position.symbol,
      direction: position.direction,
      entryPrice: position.entryPrice,
      currentPrice: currentClosePrice,
      unrealizedPnL,
      highestPnL: peakPnL,
      pips,
      healthStatus: 'CUT_LOSS_EARLY',
      shouldAutoClose: settings.autoCloseEnabled,
      closeReason: 'SMART_MAX_DRAWDOWN',
      actionKhmer: '🛑 កាត់ខាតតាមកម្រិតកំណត់ Max Loss Circuit Breaker',
      rationaleKhmer: `ការខាតបង់បានដល់កម្រិតកំណត់សុវត្ថិភាពអតិបរមា -$${lossUSD.toFixed(2)} USD (-${(lossUSD * 100).toFixed(0)} ¢ USC) (Max Drawdown: $${settings.maxDrawdownDollars} USD / ${(settings.maxDrawdownDollars * 100).toFixed(0)} ¢ USC)។ ប្រព័ន្ធបិទ Trade ជាបន្ទាន់ដើម្បីការពារដើមទុន!`,
    };
  }

  // B. Early Structure Invalidation Exit:
  // If in floating loss (> $5) and market structure is broken:
  // e.g. For BUY, price dropped below BOTH EMA50 and VWAP with Strong Sell score
  if (settings.earlyStructureCutLoss && lossUSD >= 6) {
    const isBuyBrokenStructure =
      position.direction === 'BUY' &&
      precision.overallScore <= 35 &&
      precision.factors.find((f) => f.id === 'EMA50')?.signal === 'SELL' &&
      precision.factors.find((f) => f.id === 'VWAP')?.signal === 'SELL';

    const isSellBrokenStructure =
      position.direction === 'SELL' &&
      precision.overallScore >= 65 &&
      precision.factors.find((f) => f.id === 'EMA50')?.signal === 'BUY' &&
      precision.factors.find((f) => f.id === 'VWAP')?.signal === 'BUY';

    if (isBuyBrokenStructure || isSellBrokenStructure) {
      return {
        positionId: position.id,
        symbol: position.symbol,
        direction: position.direction,
        entryPrice: position.entryPrice,
        currentPrice: currentClosePrice,
        unrealizedPnL,
        highestPnL: peakPnL,
        pips,
        healthStatus: 'CUT_LOSS_EARLY',
        shouldAutoClose: settings.autoCloseEnabled,
        closeReason: 'SMART_EARLY_CUT_LOSS',
        actionKhmer: '⚡ កាត់ខាតមុនពេលបាក់រចនាសម្ព័ន្ធ (Early Invalidation Exit)',
        rationaleKhmer: `រចនាសម្ព័ន្ធទីផ្សារបានបាក់ ${isBuyBrokenStructure ? 'ធ្លាក់ក្រោម EMA50 & VWAP' : 'ហក់ឡើងលើ EMA50 & VWAP'}។ កាត់ខាតឥឡូវនេះត្រឹម -$${lossUSD.toFixed(2)} USD (-${(lossUSD * 100).toFixed(0)} ¢ USC) ដើម្បីសន្សំ 50-70% នៃដើមទុន មិនទុកឱ្យបុកដល់ Hard SL ឡើយ!`,
      };
    }
  }

  // Floating loss within normal noise
  return {
    positionId: position.id,
    symbol: position.symbol,
    direction: position.direction,
    entryPrice: position.entryPrice,
    currentPrice: currentClosePrice,
    unrealizedPnL,
    highestPnL: peakPnL,
    pips,
    healthStatus: 'HOLD_NEUTRAL',
    shouldAutoClose: false,
    actionKhmer: '⏳ រំកិលតាមទីផ្សារ (ទុកសង្កេត - HOLD)',
    rationaleKhmer: `កំពុងខាត -$${lossUSD.toFixed(2)} (${pips} pips)។ នេះជាការយោលធម្មតា (Market Fluctuation) មិនទាន់បាក់រចនាសម្ព័ន្ធសំខាន់ឡើយ។`,
  };
}

/**
 * Returns a human-friendly Khmer title and color badge for any trade close reason.
 */
export function getCloseReasonBadge(reason?: PositionCloseReason): {
  label: string;
  khmerDesc: string;
  bgClass: string;
  textClass: string;
  isProfit: boolean;
} {
  switch (reason) {
    case 'TP_HIT':
      return {
        label: 'TP Hit',
        khmerDesc: 'ដល់គោលដៅចំណេញ TP',
        bgClass: 'bg-emerald-500/20 border-emerald-500/40',
        textClass: 'text-[#10B981]',
        isProfit: true,
      };
    case 'SMART_TP_REVERSAL':
      return {
        label: 'Reversal TP',
        khmerDesc: 'បិទចំណេញពេលទីផ្សារបញ្ច្រាស',
        bgClass: 'bg-emerald-500/20 border-emerald-500/40',
        textClass: 'text-[#10B981]',
        isProfit: true,
      };
    case 'SMART_TRAILING_STOP':
      return {
        label: 'Trailing Lock',
        khmerDesc: 'ចាក់សោរចំណេញ Trailing Stop',
        bgClass: 'bg-emerald-500/20 border-emerald-500/40',
        textClass: 'text-[#10B981]',
        isProfit: true,
      };
    case 'SMART_TARGET_PROFIT_CAP':
      return {
        label: 'Target Profit Cap',
        khmerDesc: 'ដល់គោលដៅទឹកប្រាក់ចំណេញ (USD/USC)',
        bgClass: 'bg-emerald-500/25 border-emerald-500/50',
        textClass: 'text-[#10B981]',
        isProfit: true,
      };
    case 'SMART_TOTAL_PROFIT_CLOSE_ALL':
      return {
        label: 'Total Profit Close',
        khmerDesc: 'ដល់គោលដៅចំណេញសរុប (Close All)',
        bgClass: 'bg-emerald-500/30 border-emerald-500/60 ring-1 ring-emerald-500/40',
        textClass: 'text-[#10B981]',
        isProfit: true,
      };
    case 'SMART_BREAK_EVEN':
      return {
        label: 'Break-Even',
        khmerDesc: 'បិទស្មើដើម (Zero Risk Exit)',
        bgClass: 'bg-blue-500/20 border-blue-500/40',
        textClass: 'text-blue-400',
        isProfit: true,
      };
    case 'SMART_EARLY_CUT_LOSS':
      return {
        label: 'Early Invalidation',
        khmerDesc: 'កាត់ខាតមុនពេលបាក់រចនាសម្ព័ន្ធ',
        bgClass: 'bg-amber-500/20 border-amber-500/40',
        textClass: 'text-amber-400',
        isProfit: false,
      };
    case 'SMART_MAX_DRAWDOWN':
      return {
        label: 'Max Loss Exit',
        khmerDesc: 'កាត់ខាតតាមកម្រិត Max Loss',
        bgClass: 'bg-rose-500/20 border-rose-500/40',
        textClass: 'text-[#EF4444]',
        isProfit: false,
      };
    case 'SL_HIT':
      return {
        label: 'SL Hit',
        khmerDesc: 'ប៉ះ Stop Loss តាមគម្រោង',
        bgClass: 'bg-rose-500/20 border-rose-500/40',
        textClass: 'text-[#EF4444]',
        isProfit: false,
      };
    case 'MANUAL':
    default:
      return {
        label: 'Manual Close',
        khmerDesc: 'បិទដោយផ្ទាល់ (Manual)',
        bgClass: 'bg-slate-700/50 border-slate-600',
        textClass: 'text-slate-300',
        isProfit: false,
      };
  }
}
