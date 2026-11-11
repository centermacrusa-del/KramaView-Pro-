import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Candle, MarketAsset, Timeframe } from '../types/market';
import {
  ExnessAccountType,
  GlobalPrecisionAnalysisResult,
  calculateExnessBidAsk,
  calculateGlobalPrecisionAnalysis,
  getExnessContractSpec,
  formatPrice,
  playAlertTone,
  CandleSpikeInfo,
  detectCandleSpike,
  generateHistoricalCandles,
} from '../services/marketEngine';
import { ExnessSyncedPosition } from './ExnessWebTradingPanel';
import {
  PositionCloseReason,
  SmartExitSettings,
  DEFAULT_SMART_EXIT_SETTINGS,
  evaluateSmartExit,
  getCloseReasonBadge,
  ActiveTradeDiagnosis,
} from '../services/smartExitBrain';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  HelpCircle,
  History,
  Layers,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Gauge,
  Globe,
  Coins,
  Target,
  DollarSign,
  Trash2,
} from 'lucide-react';

export interface BotTradeLog {
  id: string;
  timestamp: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  confidence: number;
  strategy: 'SCALP' | 'SWING' | 'CONSERVATIVE' | 'FLASH_SPIKE';
  reason: string;
  status: 'EXECUTED' | 'SKIPPED' | 'MANUAL';
}

interface SmartAutoTradingBotPanelProps {
  asset: MarketAsset;
  allAssets?: MarketAsset[];
  candles: Candle[];
  timeframe: Timeframe;
  exnessAccountType: ExnessAccountType;
  openPositions: ExnessSyncedPosition[];
  smartExitSettings: SmartExitSettings;
  onUpdateSmartExitSettings: (settings: SmartExitSettings) => void;
  onExecuteTrade: (params: {
    symbol?: string;
    direction: 'BUY' | 'SELL';
    lots: number;
    takeProfit?: number;
    stopLoss?: number;
    comment?: string;
  }) => void;
  onClosePosition?: (id: string, reason?: PositionCloseReason) => void;
  onCloseAllPositions?: () => void;
}

export const SmartAutoTradingBotPanel: React.FC<SmartAutoTradingBotPanelProps> = ({
  asset,
  allAssets,
  candles,
  timeframe,
  exnessAccountType,
  openPositions,
  smartExitSettings,
  onUpdateSmartExitSettings,
  onExecuteTrade,
  onClosePosition,
  onCloseAllPositions,
}) => {
  // Bot Operating Mode & Configuration (បិទ ទាំងអស់ ជាចម្បង)
  const [isBotActive, setIsBotActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kv_autobot_active_v2') === 'true';
    } catch {
      return false;
    }
  });

  const [strategy, setStrategy] = useState<'SCALP' | 'SWING' | 'CONSERVATIVE' | 'FLASH_SPIKE'>('SCALP');
  const [lotSize, setLotSize] = useState<number>(0.05);
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [maxConcurrentPositions, setMaxConcurrentPositions] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kv_autobot_max_trades');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch {
      // ignore
    }
    return 2;
  });

  // Single-Candle Violent Spike Engine State (បិទ ជាចម្បង)
  const [instantSpikeTriggerEnabled, setInstantSpikeTriggerEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kv_autobot_spike_trigger_v2');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const [spikeSensitivity, setSpikeSensitivity] = useState<'SENSITIVE' | 'STANDARD' | 'EXTREME'>(() => {
    try {
      const saved = localStorage.getItem('kv_autobot_spike_sens') as any;
      if (saved === 'SENSITIVE' || saved === 'STANDARD' || saved === 'EXTREME') return saved;
    } catch {
      // ignore
    }
    return 'STANDARD';
  });

  // Master Trading Direction Rule: 'REVERSAL' = ពេលឡើង BUY SELL / ពេលចុះ BUY (User's primary rule)
  //                                 'TREND'    = ពេលឡើង BUY / ពេលចុះ SELL
  const [tradingDirectionMode, setTradingDirectionMode] = useState<'REVERSAL' | 'TREND'>(() => {
    try {
      const saved = localStorage.getItem('kv_autobot_direction_mode');
      if (saved === 'REVERSAL' || saved === 'TREND') return saved;
    } catch {
      // ignore
    }
    return 'REVERSAL'; // Default per user request: "ពេលទីផ្សារ ឡើង ត្រូវតែទិញSELL ពេលទីផ្សារ ចុះ ត្រូវតែទិញBuy ដោយស្វ័យប្រវត្តិ"
  });

  const [spikeMode, setSpikeMode] = useState<'TREND' | 'REVERSAL'>(() => {
    try {
      const saved = localStorage.getItem('kv_autobot_spike_mode');
      if (saved === 'TREND' || saved === 'REVERSAL') return saved;
    } catch {
      // ignore
    }
    return 'REVERSAL'; // Default to REVERSAL per user request
  });

  const [scanAllMarkets, setScanAllMarkets] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kv_autobot_scan_all_v2') === 'true';
    } catch {
      return false;
    }
  });

  // Last Spike Execution trackers to prevent multiple trades on the same candle bar
  const lastSpikeCandleTimeRef = useRef<Record<string, number>>({});
  const lastMultiMarketScanRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_direction_mode', tradingDirectionMode);
    } catch {
      // ignore
    }
  }, [tradingDirectionMode]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_spike_mode', spikeMode);
    } catch {
      // ignore
    }
  }, [spikeMode]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_spike_trigger_v2', String(instantSpikeTriggerEnabled));
    } catch {
      // ignore
    }
  }, [instantSpikeTriggerEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_spike_sens', spikeSensitivity);
    } catch {
      // ignore
    }
  }, [spikeSensitivity]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_scan_all_v2', String(scanAllMarkets));
    } catch {
      // ignore
    }
  }, [scanAllMarkets]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_max_trades', String(maxConcurrentPositions));
    } catch {
      // ignore
    }
  }, [maxConcurrentPositions]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [autoCooldownSeconds, setAutoCooldownSeconds] = useState<number>(45);

  // Profit & Loss Currency Unit ('USD' = $ | 'USC' = ¢ US Cent Exness — Default USC for Exness Cent)
  const [pnlCurrencyUnit, setPnlCurrencyUnit] = useState<'USD' | 'USC'>(() => {
    try {
      const saved = localStorage.getItem('kv_autobot_pnl_unit_v2');
      if (saved === 'USD' || saved === 'USC') return saved;
      return exnessAccountType === 'standard_cent' ? 'USC' : 'USD';
    } catch {
      return 'USC';
    }
  });

  useEffect(() => {
    setPnlCurrencyUnit(exnessAccountType === 'standard_cent' ? 'USC' : 'USD');
  }, [exnessAccountType]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_pnl_unit_v2', pnlCurrencyUnit);
    } catch {
      // ignore
    }
  }, [pnlCurrencyUnit]);

  // Peak Profit tracking per position for Trailing Stop calculation
  const peakProfitRef = useRef<Record<string, number>>({});

  // Execution History Logs
  const [botLogs, setBotLogs] = useState<BotTradeLog[]>(() => {
    try {
      const saved = localStorage.getItem('kv_autobot_logs');
      if (saved) return JSON.parse(saved).slice(0, 30);
    } catch {
      // ignore
    }
    return [
      {
        id: 'sample_bot_1',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(),
        symbol: 'XAU/USD',
        direction: 'BUY',
        lots: 0.05,
        entryPrice: 2682.4,
        takeProfit: 2692.8,
        stopLoss: 2675.2,
        confidence: 84,
        strategy: 'SCALP',
        reason: 'EMA 20/50 Golden Cross + VWAP Breakout Confluence',
        status: 'EXECUTED',
      },
    ];
  });

  // Last execution timestamp per symbol to prevent spamming
  const lastExecutedAtRef = useRef<number>(0);

  // Persist Bot State & Logs
  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_active_v2', String(isBotActive));
    } catch {
      // ignore
    }
  }, [isBotActive]);

  useEffect(() => {
    try {
      localStorage.setItem('kv_autobot_logs', JSON.stringify(botLogs.slice(0, 50)));
    } catch {
      // ignore
    }
  }, [botLogs]);

  // Real-time Quantitative & Confluence Precision Analysis
  const analysis: GlobalPrecisionAnalysisResult = calculateGlobalPrecisionAnalysis(
    asset,
    candles,
    timeframe
  );

  const sensitivityMultiplier =
    spikeSensitivity === 'SENSITIVE' ? 1.7 : spikeSensitivity === 'EXTREME' ? 3.0 : 2.2;

  // Real-time Single Candle Violent Spike Analysis ("ឡើងឫចុះ មួយបង្គោលខ្លាំង")
  const currentSpikeInfo: CandleSpikeInfo = useMemo(() => {
    return detectCandleSpike(candles, {
      sensitivityMultiplier,
      assetClass: asset.assetClass,
    });
  }, [candles, sensitivityMultiplier, asset.assetClass]);

  const quote = calculateExnessBidAsk(asset.symbol, asset.price, exnessAccountType);
  const currentOpenForSymbol = openPositions.filter(
    (p) => p.symbol === asset.symbol && p.status === 'OPEN'
  );

  // Real-time diagnosis for all open positions using the Smart Exit Brain
  const openPositionsDiagnoses: ActiveTradeDiagnosis[] = useMemo(() => {
    return openPositions
      .filter((p) => p.status === 'OPEN')
      .map((pos) => {
        const posAsset = pos.symbol === asset.symbol ? asset : { ...asset, symbol: pos.symbol };
        const prevPeak = peakProfitRef.current[pos.id] || 0;
        const diagnosis = evaluateSmartExit(
          pos,
          posAsset,
          candles,
          analysis,
          prevPeak,
          smartExitSettings
        );
        peakProfitRef.current[pos.id] = diagnosis.highestPnL;
        return diagnosis;
      });
  }, [openPositions, asset, candles, analysis, smartExitSettings]);

  // Signal Evaluation & Automation Loop for Opening Trades
  const evaluateAndTriggerBot = useCallback(() => {
    if (!isBotActive) return;

    const now = Date.now();

    // =========================================================================
    // 1. INSTANT SINGLE-CANDLE VIOLENT SPIKE TRIGGER ("ឡើងឫចុះ មួយបង្គោលខ្លាំង Buy/Sell ភ្លាមៗ")
    // =========================================================================
    if (instantSpikeTriggerEnabled || strategy === 'FLASH_SPIKE') {
      if (currentSpikeInfo.isSpike && currentSpikeInfo.direction) {
        const lastSpikeBarTime = lastSpikeCandleTimeRef.current[asset.symbol] || 0;
        // Trigger if this single candle bar hasn't already been traded
        if (currentSpikeInfo.candleTime !== lastSpikeBarTime) {
          if (maxConcurrentPositions === 0 || currentOpenForSymbol.length < maxConcurrentPositions) {
            const isSpikeUp = currentSpikeInfo.direction === 'BUY';
            const finalDirection =
              spikeMode === 'REVERSAL'
                ? isSpikeUp
                  ? 'SELL' // When candle surged UP -> Enter SELL!
                  : 'BUY'  // When candle dumped DOWN -> Enter BUY!
                : currentSpikeInfo.direction;

            lastSpikeCandleTimeRef.current[asset.symbol] = currentSpikeInfo.candleTime;
            lastExecutedAtRef.current = now;

            const entry = finalDirection === 'BUY' ? quote.ask : quote.bid;
            const range = Math.max(currentSpikeInfo.candleRange, asset.price * 0.003);

            let chosenTp: number;
            let chosenSl: number;

            if (finalDirection === 'BUY') {
              chosenSl = Number(Math.max(entry * 0.1, entry - range * 1.2).toFixed(5));
              chosenTp = Number((entry + range * 1.8).toFixed(5));
            } else {
              chosenSl = Number((entry + range * 1.2).toFixed(5));
              chosenTp = Number(Math.max(entry * 0.1, entry - range * 1.8).toFixed(5));
            }

            onExecuteTrade({
              symbol: asset.symbol,
              direction: finalDirection,
              lots: lotSize,
              takeProfit: chosenTp,
              stopLoss: chosenSl,
              comment: `Bot Flash Spike ${finalDirection} (${currentSpikeInfo.spikeRatio}x ATR)`,
            });

            if (soundEnabled) {
              playAlertTone(finalDirection === 'BUY' ? 'spike_up' : 'spike_down');
            }

            const spikeLog: BotTradeLog = {
              id: `spike_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              symbol: asset.symbol,
              direction: finalDirection,
              lots: lotSize,
              entryPrice: entry,
              takeProfit: chosenTp,
              stopLoss: chosenSl,
              confidence: Math.max(92, currentSpikeInfo.strengthScore),
              strategy: 'FLASH_SPIKE',
              reason:
                spikeMode === 'REVERSAL'
                  ? isSpikeUp
                    ? `⚡ ទីផ្សារឡើងមួយបង្គោលខ្លាំង ➔ ស្ទាក់លក់ SELL ភ្លាមៗ (${currentSpikeInfo.spikeRatio}x ATR, +${Math.abs(currentSpikeInfo.changePct)}%)`
                    : `⚡ ទីផ្សារចុះមួយបង្គោលខ្លាំង ➔ ស្ទាក់ទិញ BUY ភ្លាមៗ (${currentSpikeInfo.spikeRatio}x ATR, -${Math.abs(currentSpikeInfo.changePct)}%)`
                  : `⚡ ${currentSpikeInfo.verdictKhmer} (${currentSpikeInfo.spikeRatio}x ATR)`,
              status: 'EXECUTED',
            };

            setBotLogs((prev) => [spikeLog, ...prev.slice(0, 49)]);
            return; // Instant spike trade prioritized!
          }
        }
      }
    }

    // =========================================================================
    // 2. MULTI-MARKET WATCHLIST SPIKE SCANNER ("ពេលទីផ្សារណា ឡើងឫចុះខ្លាំង")
    // =========================================================================
    if (
      (instantSpikeTriggerEnabled || strategy === 'FLASH_SPIKE') &&
      scanAllMarkets &&
      allAssets &&
      allAssets.length > 0
    ) {
      if (now - lastMultiMarketScanRef.current > 3000) {
        lastMultiMarketScanRef.current = now;
        for (const targetAsset of allAssets) {
          if (targetAsset.symbol === asset.symbol) continue;
          const openForTarget = openPositions.filter(
            (p) => p.symbol === targetAsset.symbol && p.status === 'OPEN'
          );
          if (maxConcurrentPositions > 0 && openForTarget.length >= maxConcurrentPositions) continue;

          // Check single candle spike on target asset
          const targetCandles = generateHistoricalCandles(targetAsset, timeframe, 30);
          const targetSpike = detectCandleSpike(targetCandles, {
            sensitivityMultiplier,
            assetClass: targetAsset.assetClass,
          });

          if (targetSpike.isSpike && targetSpike.direction) {
            const lastBarTime = lastSpikeCandleTimeRef.current[targetAsset.symbol] || 0;
            if (targetSpike.candleTime !== lastBarTime) {
              lastSpikeCandleTimeRef.current[targetAsset.symbol] = targetSpike.candleTime;
              const isTargetSpikeUp = targetSpike.direction === 'BUY';
              const targetDir =
                spikeMode === 'REVERSAL'
                  ? isTargetSpikeUp
                    ? 'SELL'
                    : 'BUY'
                  : targetSpike.direction;

              const targetQuote = calculateExnessBidAsk(targetAsset.symbol, targetAsset.price, exnessAccountType);
              const targetEntry = targetDir === 'BUY' ? targetQuote.ask : targetQuote.bid;
              const targetRange = Math.max(targetSpike.candleRange, targetAsset.price * 0.003);

              const multiTp = targetDir === 'BUY'
                ? Number((targetEntry + targetRange * 1.8).toFixed(5))
                : Number(Math.max(targetEntry * 0.1, targetEntry - targetRange * 1.8).toFixed(5));
              const multiSl = targetDir === 'BUY'
                ? Number(Math.max(targetEntry * 0.1, targetEntry - targetRange * 1.2).toFixed(5))
                : Number((targetEntry + targetRange * 1.2).toFixed(5));

              onExecuteTrade({
                symbol: targetAsset.symbol,
                direction: targetDir,
                lots: lotSize,
                takeProfit: multiTp,
                stopLoss: multiSl,
                comment: `Multi-Market Spike: ${targetAsset.symbol} ${targetDir}`,
              });

              if (soundEnabled) {
                playAlertTone(targetDir === 'BUY' ? 'spike_up' : 'spike_down');
              }

              const multiLog: BotTradeLog = {
                id: `multi_spike_${Date.now()}`,
                timestamp: new Date().toLocaleTimeString(),
                symbol: targetAsset.symbol,
                direction: targetDir,
                lots: lotSize,
                entryPrice: targetEntry,
                takeProfit: multiTp,
                stopLoss: multiSl,
                confidence: Math.max(90, targetSpike.strengthScore),
                strategy: 'FLASH_SPIKE',
                reason:
                  spikeMode === 'REVERSAL'
                    ? isTargetSpikeUp
                      ? `🌐 ទីផ្សារ ${targetAsset.symbol} ឡើងខ្លាំង ➔ ស្ទាក់លក់ SELL ភ្លាមៗ`
                      : `🌐 ទីផ្សារ ${targetAsset.symbol} ចុះខ្លាំង ➔ ស្ទាក់ទិញ BUY ភ្លាមៗ`
                    : `🌐 ទីផ្សារ ${targetAsset.symbol}: ${targetSpike.verdictKhmer}`,
                status: 'EXECUTED',
              };

              setBotLogs((prev) => [multiLog, ...prev.slice(0, 49)]);
              break;
            }
          }
        }
      }
    }

    const cooldownMs = autoCooldownSeconds * 1000;
    if (now - lastExecutedAtRef.current < cooldownMs) {
      return;
    }

    if (maxConcurrentPositions > 0 && currentOpenForSymbol.length >= maxConcurrentPositions) {
      return;
    }

    const { overallVerdict, confidencePct, tradeSetup, overallScore } = analysis;

    // Check strategy constraints
    if (confidencePct < minConfidence) {
      return;
    }

    let targetDirection: 'BUY' | 'SELL' | null = null;
    let rationale = '';

    if (tradingDirectionMode === 'REVERSAL') {
      // User's core rule: "ពេលទីផ្សារ ឡើង ត្រូវតែទិញSELL ពេលទីផ្សារ ចុះ ត្រូវតែទិញBuy ដោយស្វ័យប្រវត្តិ"
      const isMarketUp = overallVerdict === 'BUY' || overallVerdict === 'STRONG_BUY' || overallScore >= 55;
      const isMarketDown = overallVerdict === 'SELL' || overallVerdict === 'STRONG_SELL' || overallScore <= 45;

      if (isMarketUp) {
        // Market went UP ➔ Enter SELL!
        targetDirection = 'SELL';
        rationale = `🔄 ទីផ្សារឡើង ➔ ស្ទាក់លក់ SELL ស្វ័យប្រវត្តិ (Fade Overbought / ស្ទាក់លក់កំពូល - ${confidencePct}% Conf)`;
      } else if (isMarketDown) {
        // Market went DOWN ➔ Enter BUY!
        targetDirection = 'BUY';
        rationale = `🔄 ទីផ្សារចុះ ➔ ស្ទាក់ទិញ BUY ស្វ័យប្រវត្តិ (Buy the Dip / ស្ទាក់ទិញបាត - ${confidencePct}% Conf)`;
      }
    } else {
      // Standard Trend Follow mode
      if (strategy === 'CONSERVATIVE') {
        if (overallVerdict === 'STRONG_BUY' && confidencePct >= 80) {
          targetDirection = 'BUY';
          rationale = `Conservative High-Conviction BUY (${confidencePct}% Conf)`;
        } else if (overallVerdict === 'STRONG_SELL' && confidencePct >= 80) {
          targetDirection = 'SELL';
          rationale = `Conservative High-Conviction SELL (${confidencePct}% Conf)`;
        }
      } else if (strategy === 'SWING') {
        if ((overallVerdict === 'BUY' || overallVerdict === 'STRONG_BUY') && overallScore >= 60) {
          targetDirection = 'BUY';
          rationale = `Swing Trend Following Long (${confidencePct}% Conf)`;
        } else if ((overallVerdict === 'SELL' || overallVerdict === 'STRONG_SELL') && overallScore <= 40) {
          targetDirection = 'SELL';
          rationale = `Swing Trend Following Short (${confidencePct}% Conf)`;
        }
      } else if (strategy === 'FLASH_SPIKE') {
        if (overallVerdict === 'STRONG_BUY' || overallVerdict === 'BUY') {
          targetDirection = 'BUY';
          rationale = `Flash Spike Trend Momentum Long (${confidencePct}% Conf)`;
        } else if (overallVerdict === 'STRONG_SELL' || overallVerdict === 'SELL') {
          targetDirection = 'SELL';
          rationale = `Flash Spike Trend Momentum Short (${confidencePct}% Conf)`;
        }
      } else {
        // SCALP
        if (overallVerdict === 'BUY' || overallVerdict === 'STRONG_BUY') {
          targetDirection = 'BUY';
          rationale = `Scalp Momentum Long (${confidencePct}% Conf, TP: ${formatPrice(tradeSetup.takeProfit1, asset.symbol)})`;
        } else if (overallVerdict === 'SELL' || overallVerdict === 'STRONG_SELL') {
          targetDirection = 'SELL';
          rationale = `Scalp Momentum Short (${confidencePct}% Conf, TP: ${formatPrice(tradeSetup.takeProfit1, asset.symbol)})`;
        }
      }
    }

    if (!targetDirection) return;

    const safeAtr = Math.max(analysis.atr14, asset.price * 0.003);
    const entryPrice = targetDirection === 'BUY' ? quote.ask : quote.bid;
    let chosenTp: number;
    let chosenSl: number;

    if (targetDirection === 'BUY') {
      chosenSl = Number(Math.max(entryPrice * 0.1, entryPrice - safeAtr * 1.5).toFixed(5));
      chosenTp = Number((entryPrice + safeAtr * (strategy === 'SWING' ? 3.0 : 2.0)).toFixed(5));
    } else {
      chosenSl = Number((entryPrice + safeAtr * 1.5).toFixed(5));
      chosenTp = Number(Math.max(entryPrice * 0.1, entryPrice - safeAtr * (strategy === 'SWING' ? 3.0 : 2.0)).toFixed(5));
    }

    lastExecutedAtRef.current = now;

    onExecuteTrade({
      symbol: asset.symbol,
      direction: targetDirection,
      lots: lotSize,
      takeProfit: chosenTp,
      stopLoss: chosenSl,
    });

    if (soundEnabled) {
      playAlertTone(targetDirection === 'BUY' ? 'spike_up' : 'spike_down');
    }

    const newLog: BotTradeLog = {
      id: `bot_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      symbol: asset.symbol,
      direction: targetDirection,
      lots: lotSize,
      entryPrice: targetDirection === 'BUY' ? quote.ask : quote.bid,
      takeProfit: chosenTp,
      stopLoss: chosenSl,
      confidence: confidencePct,
      strategy,
      reason: rationale,
      status: 'EXECUTED',
    };

    setBotLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  }, [
    isBotActive,
    instantSpikeTriggerEnabled,
    strategy,
    currentSpikeInfo,
    asset,
    candles,
    timeframe,
    maxConcurrentPositions,
    currentOpenForSymbol.length,
    spikeMode,
    tradingDirectionMode,
    quote.ask,
    quote.bid,
    lotSize,
    soundEnabled,
    scanAllMarkets,
    allAssets,
    openPositions,
    sensitivityMultiplier,
    exnessAccountType,
    onExecuteTrade,
    autoCooldownSeconds,
    analysis,
    minConfidence,
  ]);

  // Periodic bot evaluation whenever candles or price change
  useEffect(() => {
    evaluateAndTriggerBot();
  }, [candles, asset.price, evaluateAndTriggerBot]);

  // Manual execution handler of the current recommendation
  const handleManualExecuteCurrent = (direction: 'BUY' | 'SELL') => {
    const chosenTp = strategy === 'SWING' ? analysis.tradeSetup.takeProfit2 : analysis.tradeSetup.takeProfit1;
    const chosenSl = analysis.tradeSetup.stopLoss;

    onExecuteTrade({
      direction,
      lots: lotSize,
      takeProfit: chosenTp,
      stopLoss: chosenSl,
    });

    if (soundEnabled) {
      playAlertTone(direction === 'BUY' ? 'spike_up' : 'spike_down');
    }

    const newLog: BotTradeLog = {
      id: `manual_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      symbol: asset.symbol,
      direction,
      lots: lotSize,
      entryPrice: direction === 'BUY' ? quote.ask : quote.bid,
      takeProfit: chosenTp,
      stopLoss: chosenSl,
      confidence: analysis.confidencePct,
      strategy,
      reason: `Manual One-Click Follow: ${analysis.khmerVerdict}`,
      status: 'MANUAL',
    };
    setBotLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // Immediate Test Trigger for Single-Candle Violent Spike (ឡើងឫចុះ មួយបង្គោលខ្លាំង Buy/Sell ភ្លាមៗ)
  const handleSimulateSpikeTrade = (simDirection: 'BUY' | 'SELL') => {
    const entry = simDirection === 'BUY' ? quote.ask : quote.bid;
    const move = Math.max(0.1, asset.price * 0.0035);
    const chosenSl = simDirection === 'BUY' ? entry - move : entry + move;
    const chosenTp = simDirection === 'BUY' ? entry + move * 1.6 : entry - move * 1.6;

    onExecuteTrade({
      symbol: asset.symbol,
      direction: simDirection,
      lots: lotSize,
      takeProfit: Number(chosenTp.toFixed(5)),
      stopLoss: Number(chosenSl.toFixed(5)),
      comment: `Simulated Flash Spike ${simDirection}`,
    });

    if (soundEnabled) {
      playAlertTone(simDirection === 'BUY' ? 'spike_up' : 'spike_down');
    }

    const testLog: BotTradeLog = {
      id: `test_spike_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      symbol: asset.symbol,
      direction: simDirection,
      lots: lotSize,
      entryPrice: entry,
      takeProfit: Number(chosenTp.toFixed(5)),
      stopLoss: Number(chosenSl.toFixed(5)),
      confidence: 96,
      strategy: 'FLASH_SPIKE',
      reason: `⚡ សាកល្បង Spike ${simDirection === 'BUY' ? 'ឡើងមួយបង្គោលខ្លាំង' : 'ចុះមួយបង្គោលខ្លាំង'} ➔ ${simDirection} ភ្លាមៗ (Instant Test Trigger)`,
      status: 'MANUAL',
    };
    setBotLogs((prev) => [testLog, ...prev.slice(0, 49)]);
  };

  const [botViewTab, setBotViewTab] = useState<'ALL' | 'SIGNAL_SPIKE' | 'AUTO_CLOSE' | 'SETTINGS'>('ALL');
  const [exitRuleSubTab, setExitRuleSubTab] = useState<'BOTH' | 'PROFIT' | 'LOSS'>('BOTH');

  const isBuySignal = analysis.overallVerdict === 'BUY' || analysis.overallVerdict === 'STRONG_BUY';
  const isSellSignal = analysis.overallVerdict === 'SELL' || analysis.overallVerdict === 'STRONG_SELL';

  const handleTurnOffAllSwitches = () => {
    setIsBotActive(false);
    setInstantSpikeTriggerEnabled(false);
    setScanAllMarkets(false);
    setSoundEnabled(false);
    onUpdateSmartExitSettings({
      ...smartExitSettings,
      autoCloseEnabled: false,
      totalProfitAutoCloseEnabled: false,
      takeProfitOnReversal: false,
      trailingStopEnabled: false,
      autoBreakEvenEnabled: false,
      smartTrailingProfitEnabled: false,
      earlyStructureCutLoss: false,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 text-slate-100 text-xs overflow-y-auto select-none p-3 space-y-3 font-sans">
      {/* 1. MASTER CONTROL DECK & QUICK SECTION TABS */}
      <div className="p-3.5 rounded-xl border bg-slate-800/90 border-slate-700/80 shadow-lg space-y-3">
        {/* PRIMARY ACTION BAR: ប៊ូតុង បិទទាំងអស់ ជាចម្បង (Primary Close All Trades & Turn Off All Switches) */}
        <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-rose-950/35 border border-rose-500/40">
          <button
            type="button"
            onClick={() => {
              setIsBotActive(false);
              if (onCloseAllPositions) onCloseAllPositions();
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-black text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="បិទ Order ទាំងអស់ភ្លាមៗ និងផ្អាក Bot (Primary Close All)"
          >
            <Zap className="w-4 h-4 fill-current text-amber-300 shrink-0" />
            <span>⚡ បិទទាំងអស់ ({openPositions.filter((p) => p.status === 'OPEN').length})</span>
          </button>

          <button
            type="button"
            onClick={handleTurnOffAllSwitches}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-bold text-xs bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="បិទកុងតាក់ Bot និងមុខងារស្វ័យប្រវត្តិទាំងអស់ទៅជា បិទ (OFF)"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>បិទកុងតាក់ទាំងអស់ (OFF)</span>
          </button>
        </div>

        {/* Top Row: Bot Title + Sound + Master ON/OFF Switch */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isBotActive
                  ? 'bg-emerald-500/20 text-[#10B981] border border-emerald-500/40'
                  : 'bg-slate-700/60 text-slate-400 border border-slate-600/60'
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white truncate">
                  ប្រព័ន្ធ Auto-Bot & សញ្ញា AI
                </h2>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  · {isBotActive ? 'កំពុងដំណើរការ' : 'បិទ (OFF)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isBotActive
                  ? `កំពុងឃ្លាំមើល ${asset.symbol} (${timeframe}) ដោយស្វ័យប្រវត្តិ`
                  : 'កុងតាក់ទាំងអស់ត្រូវបានដាក់ បិទ (OFF) ជាចម្បង'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? 'សំឡេងសញ្ញា៖ បើក' : 'សំឡេងសញ្ញា៖ បិទ'}
              className={`h-9 px-2.5 rounded-lg border flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                soundEnabled
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'សំឡេង បើក' : 'សំឡេង បិទ'}</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={isBotActive}
              onClick={() => setIsBotActive((prev) => !prev)}
              className={`h-9 px-3.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                isBotActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <span
                className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                  isBotActive ? 'bg-slate-950/40' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                    isBotActive ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span>{isBotActive ? 'បើក Bot (ON)' : 'បិទ Bot (OFF)'}</span>
            </button>
          </div>
        </div>

        {/* Status Summary Bar */}
        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] tabular-nums">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">ទីផ្សារបច្ចុប្បន្ន</span>
            <strong className="text-white font-mono">
              {asset.symbol} ({timeframe})
            </strong>
          </div>
          <div className="flex flex-col border-l border-slate-800 pl-2">
            <span className="text-[10px] text-slate-400">Orders កំពុងបើក</span>
            <strong className="text-white font-mono">
              {currentOpenForSymbol.length} / {maxConcurrentPositions === 0 ? '∞' : maxConcurrentPositions}
            </strong>
          </div>
          <div className="flex flex-col border-l border-slate-800 pl-2">
            <span className="text-[10px] text-slate-400">ទំហំ Lot & ទំនុកចិត្ត</span>
            <strong className="text-emerald-400 font-mono">
              {lotSize} Lot · ≥{minConfidence}%
            </strong>
          </div>
        </div>

        {/* Master Trading Direction Rule Switcher (2 Equal Columns) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
              <span>ក្បួនទិសដៅជួញដូររបស់ Bot:</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400">
              {tradingDirectionMode === 'REVERSAL'
                ? 'ឡើង ➔ SELL | ចុះ ➔ BUY'
                : 'ឡើង ➔ BUY | ចុះ ➔ SELL'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setTradingDirectionMode('REVERSAL');
                setSpikeMode('REVERSAL');
              }}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tradingDirectionMode === 'REVERSAL'
                  ? 'bg-purple-600/25 border-purple-400 text-white ring-1 ring-purple-400/30'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="font-bold text-xs flex items-center gap-1 whitespace-nowrap">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>បញ្ច្រាសទីផ្សារ</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    tradingDirectionMode === 'REVERSAL'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tradingDirectionMode === 'REVERSAL' ? 'កំពុងប្រើ' : 'ជ្រើសរើស'}
                </span>
              </div>
              <div className="text-[10px] font-mono mt-1 text-slate-300">
                ឡើង ➔ <b className="text-rose-400">SELL</b> · ចុះ ➔ <b className="text-emerald-400">BUY</b>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTradingDirectionMode('TREND');
                setSpikeMode('TREND');
              }}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tradingDirectionMode === 'TREND'
                  ? 'bg-blue-600/25 border-blue-400 text-white ring-1 ring-blue-400/30'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="font-bold text-xs flex items-center gap-1 whitespace-nowrap">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>តាមទិសដៅទីផ្សារ</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    tradingDirectionMode === 'TREND'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tradingDirectionMode === 'TREND' ? 'កំពុងប្រើ' : 'ជ្រើសរើស'}
                </span>
              </div>
              <div className="text-[10px] font-mono mt-1 text-slate-300">
                ឡើង ➔ <b className="text-emerald-400">BUY</b> · ចុះ ➔ <b className="text-rose-400">SELL</b>
              </div>
            </button>
          </div>
        </div>

        {/* Section Filter Navigation Bar (One-Click Easy Organization) */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          {[
            { id: 'ALL', label: 'ទាំងអស់' },
            { id: 'SIGNAL_SPIKE', label: '⚡ សញ្ញា & Spike' },
            { id: 'AUTO_CLOSE', label: '🧠 បិទអូតូ' },
            { id: 'SETTINGS', label: '⚙️ កំណត់ Bot' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBotViewTab(tab.id as any)}
              className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap truncate ${
                botViewTab === tab.id
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. MAIN LIVE SIGNAL & ONE-CLICK MANUAL EXECUTION */}
      {(botViewTab === 'ALL' || botViewTab === 'SIGNAL_SPIKE') && (
        <div
          className={`p-3.5 rounded-xl border transition-all shadow-lg ${
            isBuySignal
              ? 'bg-slate-900/95 border-emerald-500/40'
              : isSellSignal
              ? 'bg-slate-900/95 border-rose-500/40'
              : 'bg-slate-900/95 border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center shrink-0 ${
                  isBuySignal
                    ? 'bg-emerald-500/20 text-[#10B981]'
                    : isSellSignal
                    ? 'bg-rose-500/20 text-[#EF4444]'
                    : 'bg-amber-500/20 text-[#F59E0B]'
                }`}
              >
                {isBuySignal ? (
                  <TrendingUp className="w-4 h-4" />
                ) : isSellSignal ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                  <span>សញ្ញាបច្ចេកទេសផ្ទាល់</span>
                  <span>·</span>
                  <span
                    className={
                      isBuySignal
                        ? 'text-emerald-400 font-bold'
                        : isSellSignal
                        ? 'text-rose-400 font-bold'
                        : 'text-amber-400 font-bold'
                    }
                  >
                    {isBuySignal ? '▲ គួរទិញ (BUY)' : isSellSignal ? '▼ គួរលក់ (SELL)' : '⏳ រង់ចាំ (WAIT)'}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  {analysis.khmerVerdict}
                </h3>
              </div>
            </div>

            <div className="text-right tabular-nums">
              <span className="text-[10px] text-slate-400 block">កម្រិតជឿជាក់</span>
              <span
                className={`text-lg font-black font-mono ${
                  isBuySignal ? 'text-[#10B981]' : isSellSignal ? 'text-[#EF4444]' : 'text-amber-400'
                }`}
              >
                {analysis.confidencePct}%
              </span>
            </div>
          </div>

          {/* Setup Parameters (2x2 Clean Grid) */}
          <div className="grid grid-cols-2 gap-2 mt-2.5 tabular-nums">
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">តម្លៃចូល (Entry):</span>
              <span className="text-xs font-mono font-bold text-white">
                {formatPrice(analysis.tradeSetup.entryPrice, asset.symbol)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-rose-950/25 border border-rose-500/30 flex items-center justify-between">
              <span className="text-[10px] text-rose-400 font-bold">កាត់ខាត (SL):</span>
              <span className="text-xs font-mono font-bold text-[#EF4444]">
                {formatPrice(analysis.tradeSetup.stopLoss, asset.symbol)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-bold">គោលដៅទី១ (TP1):</span>
              <span className="text-xs font-mono font-bold text-[#10B981]">
                {formatPrice(analysis.tradeSetup.takeProfit1, asset.symbol)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-[10px] text-teal-400 font-bold">គោលដៅទី២ (TP2):</span>
              <span className="text-xs font-mono font-bold text-teal-300">
                {formatPrice(analysis.tradeSetup.takeProfit2, asset.symbol)}
              </span>
            </div>
          </div>

          {/* Manual One-Click BUY / SELL Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <button
              type="button"
              onClick={() => handleManualExecuteCurrent('BUY')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-bold bg-[#10B981] hover:bg-emerald-500 text-slate-950 shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>ទិញឡើង BUY ({lotSize} Lot)</span>
            </button>
            <button
              type="button"
              onClick={() => handleManualExecuteCurrent('SELL')}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-bold bg-[#EF4444] hover:bg-rose-500 text-white shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <ArrowDownRight className="w-4 h-4 shrink-0" />
              <span>លក់ចុះ SELL ({lotSize} Lot)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. VIOLENT SINGLE-CANDLE SPIKE RADAR & INSTANT TRIGGER */}
      {(botViewTab === 'ALL' || botViewTab === 'SIGNAL_SPIKE') && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-slate-900/95 shadow-lg space-y-3">
          {/* Header + Unified ON/OFF Switch */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  instantSpikeTriggerEnabled
                    ? 'bg-amber-500/20 text-[#FFCF01] border border-amber-500/40'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-extrabold text-white truncate">
                  ម៉ាស៊ីនចាប់បង្គោលខ្លាំង (Flash Spike)
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  ចូល BUY/SELL ភ្លាមៗពេលទីផ្សារឡើងឬចុះ 1 បង្គោលខ្លាំង
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={instantSpikeTriggerEnabled}
              onClick={() => setInstantSpikeTriggerEnabled((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
                instantSpikeTriggerEnabled
                  ? 'bg-amber-500/20 border-amber-500/50 text-[#FFCF01]'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                  instantSpikeTriggerEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                    instantSpikeTriggerEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span>{instantSpikeTriggerEnabled ? 'បើក' : 'បិទ'}</span>
            </button>
          </div>

          {/* Live Candle Power Bar */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 tabular-nums">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-semibold">
                កម្លាំងបង្គោលបច្ចុប្បន្ន ({asset.symbol}):
              </span>
              <span className="font-mono font-bold text-amber-400">
                {currentSpikeInfo.spikeRatio}x ATR (កម្រិតចាប់៖ {sensitivityMultiplier}x)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500 transition-all duration-200"
                style={{
                  width: `${Math.min(
                    100,
                    (currentSpikeInfo.spikeRatio / sensitivityMultiplier) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Organized Spike Controls (Stacked Clean Rows instead of cramped 3 columns) */}
          <div className="space-y-2">
            {/* Control Row 1: Sensitivity Selector (3 Equal Buttons) */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/90 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-bold">១. កម្រិតរំញោចបង្គោល (Sensitivity):</span>
                <span className="font-mono text-amber-400 font-bold">{sensitivityMultiplier}x ATR</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'SENSITIVE', label: '1.7x រហ័ស', desc: 'បង្គោលមធ្យម' },
                  { id: 'STANDARD', label: '2.2x ស្តង់ដារ', desc: 'បង្គោលធំច្បាស់' },
                  { id: 'EXTREME', label: '3.0x ព័ត៌មាន', desc: 'បង្គោលធំខ្លាំង' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSpikeSensitivity(s.id as any)}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-colors cursor-pointer text-center whitespace-nowrap ${
                      spikeSensitivity === s.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Control Row 2: Multi-Market Watchlist Scope Toggle */}
            <div
              onClick={() => setScanAllMarkets(!scanAllMarkets)}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/90 cursor-pointer hover:border-slate-700 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-white font-bold text-[11px] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>២. ស្កេនគ្រប់ទីផ្សារក្នុង Watchlist ទាំងអស់</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {scanAllMarkets
                    ? `កំពុងឃ្លាំមើលគ្រប់ ${allAssets?.length ?? 12} Assets ទាំងអស់ 24/7`
                    : `តាមដានតែទីផ្សារបច្ចុប្បន្ន (${asset.symbol})`}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={scanAllMarkets}
                onClick={(e) => {
                  e.stopPropagation();
                  setScanAllMarkets(!scanAllMarkets);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all cursor-pointer select-none shrink-0 ${
                  scanAllMarkets
                    ? 'bg-amber-500/20 border-amber-500/50 text-[#FFCF01]'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <span
                  className={`w-6 h-3.5 rounded-full transition-colors relative inline-flex items-center ${
                    scanAllMarkets ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${
                      scanAllMarkets ? 'translate-x-3' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span>{scanAllMarkets ? 'បើក' : 'បិទ'}</span>
              </button>
            </div>

            {/* Control Row 3: Instant Spike Test Buttons (2 Equal Columns) */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/90 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 block">
                ៣. សាកល្បងបញ្ជា Spike ភ្លាមៗ (One-Click Test):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateSpikeTrade('SELL')}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>ឡើងខ្លាំង ➔ SELL ភ្លាម</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateSpikeTrade('BUY')}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>ចុះខ្លាំង ➔ BUY ភ្លាម</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SMART AUTO-CLOSE BRAIN (ខួរក្បាលបិទ Trade ស្វ័យប្រវត្តិ) */}
      {(botViewTab === 'ALL' || botViewTab === 'AUTO_CLOSE') && (
        <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-slate-900/95 shadow-lg space-y-3">
          {/* Header + Unified ON/OFF Switch */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-extrabold text-white truncate">
                  ខួរក្បាលបិទ Trade ស្វ័យប្រវត្តិ (Smart Auto-Close)
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  បិទយកប្រាក់ចំណេញ និងកាត់ខាតដោយស្វ័យប្រវត្តិ
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(smartExitSettings.autoCloseEnabled)}
              onClick={() =>
                onUpdateSmartExitSettings({
                  ...smartExitSettings,
                  autoCloseEnabled: !smartExitSettings.autoCloseEnabled,
                })
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
                smartExitSettings.autoCloseEnabled
                  ? 'bg-indigo-500/25 border-indigo-400/60 text-indigo-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                  smartExitSettings.autoCloseEnabled ? 'bg-indigo-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                    smartExitSettings.autoCloseEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span>{smartExitSettings.autoCloseEnabled ? 'បើក' : 'បិទ'}</span>
            </button>
          </div>

          {/* Top Bar: Currency Unit ($ USD vs ¢ USC) + Rule Filter Sub-Tabs */}
          <div className="grid grid-cols-2 gap-2">
            {/* Currency Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setPnlCurrencyUnit('USD')}
                className={`py-1 px-2 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                  pnlCurrencyUnit === 'USD'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3 h-3 shrink-0" />
                <span>$ USD</span>
              </button>
              <button
                type="button"
                onClick={() => setPnlCurrencyUnit('USC')}
                className={`py-1 px-2 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                  pnlCurrencyUnit === 'USC'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="w-3 h-3 shrink-0" />
                <span>¢ USC</span>
              </button>
            </div>

            {/* Profit / Loss Sub-Filter */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
              {[
                { id: 'BOTH', label: 'ទាំង ២' },
                { id: 'PROFIT', label: '💰 ចំណេញ' },
                { id: 'LOSS', label: '🛑 ខាត' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setExitRuleSubTab(sub.id as any)}
                  className={`py-1 px-1.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    exitRuleSubTab === sub.id
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stacked Full-Width Cards for Profit Exit & Loss Exit (No squished columns!) */}
          <div className="space-y-3">
            {/* A. PROFIT EXIT RULES */}
            {(exitRuleSubTab === 'BOTH' || exitRuleSubTab === 'PROFIT') && (
              <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#10B981]" />
                    <span>ក្បួនបិទយកប្រាក់ចំណេញ (Profit Auto-Exit)</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-300 tabular-nums">
                    គោលដៅសរុប៖{' '}
                    {pnlCurrencyUnit === 'USD'
                      ? `+$${smartExitSettings.totalProfitTargetUSD ?? 2}`
                      : `+${Math.round((smartExitSettings.totalProfitTargetUSD ?? 2) * 100).toLocaleString()}¢`}
                  </span>
                </div>

                {/* 1. Total Profit Close All Block */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-emerald-500/35 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>១. ចំណេញសរុបបិទទាំងអស់ (Close All Target):</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(smartExitSettings?.totalProfitAutoCloseEnabled)}
                      onClick={() =>
                        onUpdateSmartExitSettings({
                          ...smartExitSettings,
                          totalProfitAutoCloseEnabled: !Boolean(
                            smartExitSettings?.totalProfitAutoCloseEnabled
                          ),
                        })
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer select-none shrink-0 ${
                        smartExitSettings?.totalProfitAutoCloseEnabled
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-6 h-3.5 rounded-full transition-colors relative inline-flex items-center ${
                          smartExitSettings?.totalProfitAutoCloseEnabled
                            ? 'bg-emerald-500'
                            : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${
                            smartExitSettings?.totalProfitAutoCloseEnabled
                              ? 'translate-x-3'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                      <span>
                        {smartExitSettings?.totalProfitAutoCloseEnabled ? 'បើក' : 'បិទ'}
                      </span>
                    </button>
                  </div>

                  {/* Quick Presets 1$, 2$, 3$, 4$, 5$, 100$ + Input */}
                  <div className="grid grid-cols-6 gap-1">
                    {[1, 2, 3, 4, 5, 100].map((preset) => {
                      const isSelected = (smartExitSettings.totalProfitTargetUSD ?? 2) === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            onUpdateSmartExitSettings({
                              ...smartExitSettings,
                              totalProfitTargetUSD: preset,
                              totalProfitAutoCloseEnabled: true,
                            })
                          }
                          className={`py-1.5 rounded-md text-[11px] font-mono font-bold border transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-white'
                          }`}
                        >
                          {pnlCurrencyUnit === 'USD' ? `$${preset}` : `${preset * 100}¢`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      វាយចំនួនផ្ទាល់៖
                    </span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                        {pnlCurrencyUnit === 'USD' ? '$' : '¢'}
                      </span>
                      <input
                        type="number"
                        min="0.5"
                        step={pnlCurrencyUnit === 'USD' ? '0.5' : '50'}
                        value={
                          pnlCurrencyUnit === 'USD'
                            ? smartExitSettings.totalProfitTargetUSD ?? 2
                            : Math.round((smartExitSettings.totalProfitTargetUSD ?? 2) * 100)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            const usdVal =
                              pnlCurrencyUnit === 'USD' ? val : Number((val / 100).toFixed(2));
                            onUpdateSmartExitSettings({
                              ...smartExitSettings,
                              totalProfitTargetUSD: usdVal,
                              totalProfitAutoCloseEnabled: true,
                            });
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-2.5 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Per-Trade Target Profit Cap */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>២. កម្រិតចំណេញក្នុង 1 Trade (Target Cap):</span>
                    </span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                        {pnlCurrencyUnit === 'USD' ? '$' : '¢'}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step={pnlCurrencyUnit === 'USD' ? '1' : '100'}
                        value={
                          pnlCurrencyUnit === 'USD'
                            ? smartExitSettings.targetProfitDollars ?? 50
                            : Math.round((smartExitSettings.targetProfitDollars ?? 50) * 100)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            const usdVal =
                              pnlCurrencyUnit === 'USD' ? val : Number((val / 100).toFixed(2));
                            onUpdateSmartExitSettings({
                              ...smartExitSettings,
                              targetProfitDollars: usdVal,
                            });
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-5 pr-2 py-1 text-xs text-emerald-400 font-mono font-bold text-right focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {(pnlCurrencyUnit === 'USD'
                      ? [10, 25, 50, 100, 200]
                      : [1000, 2500, 5000, 10000, 20000]
                    ).map((preset) => {
                      const usdEquivalent = pnlCurrencyUnit === 'USD' ? preset : preset / 100;
                      const isSelected =
                        (smartExitSettings.targetProfitDollars ?? 50) === usdEquivalent;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            onUpdateSmartExitSettings({
                              ...smartExitSettings,
                              targetProfitDollars: usdEquivalent,
                            })
                          }
                          className={`py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pnlCurrencyUnit === 'USD' ? `$${preset}` : `${preset.toLocaleString()}¢`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Smart Profit Protection Switches (Uniform Aligned List) */}
                <div className="space-y-1.5">
                  {/* Switch 1: Reversal Take-Profit */}
                  <div
                    onClick={() =>
                      onUpdateSmartExitSettings({
                        ...smartExitSettings,
                        takeProfitOnReversal: !smartExitSettings?.takeProfitOnReversal,
                      })
                    }
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/90 cursor-pointer hover:border-slate-700"
                  >
                    <div className="min-w-0">
                      <strong className="text-white text-[11px] block">
                        Reversal Take-Profit (បិទពេលបញ្ច្រាសទិស)
                      </strong>
                      <span className="text-[10px] text-slate-400 block">
                        បិទការពារប្រាក់ចំណេញភ្លាមៗពេលទីផ្សារប្ដូរទិសដៅ
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(smartExitSettings?.takeProfitOnReversal)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSmartExitSettings({
                          ...smartExitSettings,
                          takeProfitOnReversal: !smartExitSettings?.takeProfitOnReversal,
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer select-none shrink-0 ${
                        smartExitSettings?.takeProfitOnReversal
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-6 h-3.5 rounded-full transition-colors relative inline-flex items-center ${
                          smartExitSettings?.takeProfitOnReversal ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${
                            smartExitSettings?.takeProfitOnReversal
                              ? 'translate-x-3'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                      <span>{smartExitSettings?.takeProfitOnReversal ? 'បើក' : 'បិទ'}</span>
                    </button>
                  </div>

                  {/* Switch 2: Trailing Stop Lock */}
                  <div
                    onClick={() =>
                      onUpdateSmartExitSettings({
                        ...smartExitSettings,
                        trailingStopEnabled: !smartExitSettings?.trailingStopEnabled,
                      })
                    }
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/90 cursor-pointer hover:border-slate-700"
                  >
                    <div className="min-w-0">
                      <strong className="text-white text-[11px] block">
                        Trailing Stop Lock ({smartExitSettings?.trailingPullbackPct ?? 30}%)
                      </strong>
                      <span className="text-[10px] text-slate-400 block">
                        ចាក់សោរប្រាក់ចំណេញពេលតម្លៃដកថយ 30% ពីចំណុចកំពូល
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(smartExitSettings?.trailingStopEnabled)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSmartExitSettings({
                          ...smartExitSettings,
                          trailingStopEnabled: !smartExitSettings?.trailingStopEnabled,
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer select-none shrink-0 ${
                        smartExitSettings?.trailingStopEnabled
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-6 h-3.5 rounded-full transition-colors relative inline-flex items-center ${
                          smartExitSettings?.trailingStopEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${
                            smartExitSettings?.trailingStopEnabled
                              ? 'translate-x-3'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                      <span>{smartExitSettings?.trailingStopEnabled ? 'បើក' : 'បិទ'}</span>
                    </button>
                  </div>

                  {/* Switch 3: Move to Break-Even */}
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/90 space-y-2">
                    <div
                      onClick={() =>
                        onUpdateSmartExitSettings({
                          ...smartExitSettings,
                          autoBreakEvenEnabled: !smartExitSettings?.autoBreakEvenEnabled,
                        })
                      }
                      className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <strong className="text-white text-[11px] block">
                          Move to Break-Even (+{smartExitSettings?.breakEvenTriggerPct ?? 33}% នៃ TP)
                        </strong>
                        <span className="text-[10px] text-slate-400 block">
                          រុញ Stop-Loss ទៅតម្លៃដើម (Zero Risk) ដោយស្វ័យប្រវត្តិ
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(smartExitSettings?.autoBreakEvenEnabled)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSmartExitSettings({
                            ...smartExitSettings,
                            autoBreakEvenEnabled: !smartExitSettings?.autoBreakEvenEnabled,
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer select-none shrink-0 ${
                          smartExitSettings?.autoBreakEvenEnabled
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-6 h-3.5 rounded-full transition-colors relative inline-flex items-center ${
                            smartExitSettings?.autoBreakEvenEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${
                              smartExitSettings?.autoBreakEvenEnabled
                                ? 'translate-x-3'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                        <span>{smartExitSettings?.autoBreakEvenEnabled ? 'បើក' : 'បិទ'}</span>
                      </button>
                    </div>

                    {Boolean(smartExitSettings?.autoBreakEvenEnabled) && (
                      <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/80">
                        {[25, 33, 50, 66].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              onUpdateSmartExitSettings({
                                ...smartExitSettings,
                                breakEvenTriggerPct: pct,
                              })
                            }
                            className={`py-1 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                              smartExitSettings?.breakEvenTriggerPct === pct
                                ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            +{pct}% TP
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Switch 4: Smart Trailing Profit */}
                  <div
                    onClick={() =>
                      onUpdateSmartExitSettings({
                        ...smartExitSettings,
                        smartTrailingProfitEnabled: !smartExitSettings?.smartTrailingProfitEnabled,
                      })
                    }
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/90 cursor-pointer hover:border-slate-700"
                  >
                    <div className="min-w-0">
                      <strong className="text-white text-[11px] block">
                        Smart Trailing Profit (+{smartExitSettings?.smartTrailingTriggerPct ?? 50}% នៃ TP)
                      </strong>
                      <span className="text-[10px] text-slate-400 block">
                        រឹតបន្តឹង Stop Loss តាមចលនាតម្លៃដើម្បីចាក់សោរប្រាក់ចំណេញ
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(smartExitSettings?.smartTrailingProfitEnabled)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSmartExitSettings({
                          ...smartExitSettings,
                          smartTrailingProfitEnabled: !smartExitSettings?.smartTrailingProfitEnabled,
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer select-none shrink-0 ${
                        smartExitSettings?.smartTrailingProfitEnabled
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-6 h-3.5 rounded-full transition-colors relative inline-flex items-center ${
                          smartExitSettings?.smartTrailingProfitEnabled
                            ? 'bg-emerald-500'
                            : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${
                            smartExitSettings?.smartTrailingProfitEnabled
                              ? 'translate-x-3'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                      <span>{smartExitSettings?.smartTrailingProfitEnabled ? 'បើក' : 'បិទ'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* B. LOSS EXIT RULES */}
            {(exitRuleSubTab === 'BOTH' || exitRuleSubTab === 'LOSS') && (
              <div className="p-3 rounded-xl bg-rose-950/15 border border-rose-500/30 space-y-2.5">
                <div className="flex items-center justify-between text-rose-400 font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                    <span>ក្បួនកាត់ខាតការពារដើមទុន (Loss Auto-Cut)</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-rose-300 tabular-nums">
                    ខាតអតិបរមា៖{' '}
                    {pnlCurrencyUnit === 'USD'
                      ? `-$${smartExitSettings.maxDrawdownDollars}`
                      : `-${Math.round(smartExitSettings.maxDrawdownDollars * 100).toLocaleString()}¢`}
                  </span>
                </div>

                {/* Max Loss Cap Setting */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-rose-500/35 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>កម្រិតខាតអតិបរមាសម្រេចបិទ (Max Loss Cap):</span>
                    </span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                        {pnlCurrencyUnit === 'USD' ? '$' : '¢'}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step={pnlCurrencyUnit === 'USD' ? '1' : '100'}
                        value={
                          pnlCurrencyUnit === 'USD'
                            ? smartExitSettings.maxDrawdownDollars
                            : Math.round(smartExitSettings.maxDrawdownDollars * 100)
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            const usdVal =
                              pnlCurrencyUnit === 'USD' ? val : Number((val / 100).toFixed(2));
                            onUpdateSmartExitSettings({
                              ...smartExitSettings,
                              maxDrawdownDollars: usdVal,
                            });
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-5 pr-2 py-1 text-xs text-rose-400 font-mono font-bold text-right focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {(pnlCurrencyUnit === 'USD'
                      ? [10, 20, 35, 50, 100]
                      : [1000, 2000, 3500, 5000, 10000]
                    ).map((preset) => {
                      const usdEquivalent = pnlCurrencyUnit === 'USD' ? preset : preset / 100;
                      const isSelected = smartExitSettings.maxDrawdownDollars === usdEquivalent;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            onUpdateSmartExitSettings({
                              ...smartExitSettings,
                              maxDrawdownDollars: usdEquivalent,
                            })
                          }
                          className={`py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-rose-500/30 border-rose-400 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pnlCurrencyUnit === 'USD' ? `-$${preset}` : `-${preset.toLocaleString()}¢`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Early Invalidation Cut-Loss Switch */}
                <div
                  onClick={() =>
                    onUpdateSmartExitSettings({
                      ...smartExitSettings,
                      earlyStructureCutLoss: !smartExitSettings?.earlyStructureCutLoss,
                    })
                  }
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/90 cursor-pointer hover:border-slate-700"
                >
                  <div className="min-w-0">
                    <strong className="text-white text-[11px] block">
                      Early Invalidation Cut-Loss (កាត់ខាតមុនបាក់ទម្រង់)
                    </strong>
                    <span className="text-[10px] text-slate-400 block">
                      កាត់ខាតមុនពេលបាក់ EMA50/VWAP ដើម្បីសន្សំដើមទុន 50-70%
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(smartExitSettings?.earlyStructureCutLoss)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSmartExitSettings({
                        ...smartExitSettings,
                        earlyStructureCutLoss: !smartExitSettings?.earlyStructureCutLoss,
                      });
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all cursor-pointer select-none shrink-0 ${
                      smartExitSettings?.earlyStructureCutLoss
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-6 h-3.5 rounded-full transition-colors relative inline-flex items-center ${
                        smartExitSettings?.earlyStructureCutLoss ? 'bg-rose-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${
                          smartExitSettings?.earlyStructureCutLoss
                            ? 'translate-x-3'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span>{smartExitSettings?.earlyStructureCutLoss ? 'បើក' : 'បិទ'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LIVE ACTIVE TRADES DIAGNOSIS CARDS */}
          {openPositionsDiagnoses.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ការវិភាគ Orders កំពុងដំណើរការ ({openPositionsDiagnoses.length}):</span>
                </span>
                <span className="text-[10px] text-slate-400">តាមដានដោយ Smart Brain</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {openPositionsDiagnoses.map((diag) => {
                  const isProfit = diag.unrealizedPnL >= 0;
                  return (
                    <div
                      key={diag.positionId}
                      className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 transition-all ${
                        diag.healthStatus === 'CLOSE_NOW_PROFIT'
                          ? 'bg-emerald-950/40 border-emerald-500/50'
                          : diag.healthStatus === 'CUT_LOSS_EARLY'
                          ? 'bg-rose-950/40 border-rose-500/50'
                          : isProfit
                          ? 'bg-slate-950/70 border-emerald-500/30'
                          : 'bg-slate-950/70 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              diag.direction === 'BUY'
                                ? 'bg-[#10B981] text-slate-950'
                                : 'bg-[#EF4444] text-white'
                            }`}
                          >
                            {diag.direction}
                          </span>
                          <strong className="text-white font-mono">{diag.symbol}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatPrice(diag.entryPrice, diag.symbol)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 tabular-nums">
                          <span
                            className={`font-mono font-black text-xs ${
                              isProfit ? 'text-[#10B981]' : 'text-[#EF4444]'
                            }`}
                          >
                            {isProfit
                              ? `+$${diag.unrealizedPnL}`
                              : `-$${Math.abs(diag.unrealizedPnL)}`}{' '}
                            ({diag.pips >= 0 ? '+' : ''}{diag.pips}p)
                          </span>

                          {onClosePosition && (
                            <button
                              type="button"
                              onClick={() =>
                                onClosePosition(diag.positionId, diag.closeReason || 'MANUAL')
                              }
                              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              បិទ Trade
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] leading-relaxed">
                        <div className="font-bold text-amber-300 flex items-center gap-1">
                          <span>ការណែនាំ:</span>
                          <span>{diag.actionKhmer}</span>
                        </div>
                        <p className="text-slate-300 mt-0.5">{diag.rationaleKhmer}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. STRATEGY, LOT PRESETS & BOT SETTINGS */}
      {(botViewTab === 'ALL' || botViewTab === 'SETTINGS') && (
        <div className="p-3.5 rounded-xl border bg-slate-900/95 border-slate-700/80 shadow-md space-y-3">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Settings2 className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-xs">
              កំណត់យុទ្ធសាស្ត្រ, ទំហំ Lot & ដែនកំណត់ Bot
            </h3>
          </div>

          {/* Strategy Selector (2x2 Clean Grid instead of cramped 4 columns) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">
              ១. ជ្រើសរើសទម្រង់ជួញដូរ (Trading Strategy):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'SCALP', label: 'Scalping (រហ័ស)', desc: 'ឆក់ផលចំណេញលឿនតាម TP1' },
                { id: 'SWING', label: 'Swing Trend', desc: 'ជិះតាមរលកធំ TP2' },
                { id: 'CONSERVATIVE', label: 'Conservative', desc: 'សុវត្ថិភាពខ្ពស់ > 80%' },
                {
                  id: 'FLASH_SPIKE',
                  label: '⚡ Flash Spike',
                  desc:
                    tradingDirectionMode === 'REVERSAL'
                      ? 'ឡើង SELL / ចុះ BUY ភ្លាមៗ'
                      : 'ឡើង BUY / ចុះ SELL ភ្លាមៗ',
                },
              ].map((strat) => (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setStrategy(strat.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    strategy === strat.id
                      ? strat.id === 'FLASH_SPIKE'
                        ? 'bg-amber-500/20 border-amber-500 text-[#FFCF01] font-bold'
                        : 'bg-blue-600/25 border-blue-400 text-white font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{strat.label}</span>
                    {strategy === strat.id && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white">
                        សកម្ម
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{strat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Lot Size Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300">២. ជ្រើសរើសទំហំ Lot រហ័ស:</span>
              <span className="font-mono font-bold text-emerald-400">{lotSize} Lot</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0].map((presetLot) => (
                <button
                  key={presetLot}
                  type="button"
                  onClick={() => setLotSize(presetLot)}
                  className={`py-1.5 rounded-md font-mono text-[11px] font-bold border transition-colors cursor-pointer ${
                    lotSize === presetLot
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {presetLot}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence & Max Trades Grid (2 Columns) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                ៣. កម្រិតជឿជាក់អប្បបរមា:
              </label>
              <select
                value={minConfidence ?? 75}
                onChange={(e) => setMinConfidence(parseInt(e.target.value, 10))}
                aria-label="កម្រិតជឿជាក់អប្បបរមា"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              >
                <option value="65">65% (សកម្មខ្លាំង)</option>
                <option value="70">70% (ល្មម)</option>
                <option value="75">75% (ស្តង់ដារ)</option>
                <option value="80">80% (សុវត្ថិភាពខ្ពស់)</option>
                <option value="85">85% (ច្បាស់លាស់បំផុត)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                ៤. ចំនួន Trade អតិបរមា:
              </label>
              <select
                value={maxConcurrentPositions ?? 2}
                onChange={(e) => setMaxConcurrentPositions(parseInt(e.target.value, 10))}
                aria-label="ចំនួន Trade អតិបរមា"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              >
                <option value="1">1 Trade</option>
                <option value="2">2 Trades</option>
                <option value="3">3 Trades</option>
                <option value="5">5 Trades</option>
                <option value="10">10 Trades</option>
                <option value="0">គ្មានដែនកំណត់ (∞)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 6. 10 TECHNICAL INDICATORS CONFLUENCE & EXECUTION LOGS */}
      {(botViewTab === 'ALL' || botViewTab === 'SETTINGS') && (
        <>
          <div className="p-3.5 rounded-xl border bg-slate-900/95 border-slate-700/80 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-xs">
                  តារាងផ្ទៀងផ្ទាត់ 10 សូចនាករបច្ចេកទេស
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] tabular-nums">
                <span className="text-[#10B981] font-bold">ទិញ {analysis.buyCount}</span>
                <span className="text-slate-500">·</span>
                <span className="text-amber-400 font-bold">ស្មើ {analysis.neutralCount}</span>
                <span className="text-slate-500">·</span>
                <span className="text-[#EF4444] font-bold">លក់ {analysis.sellCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {analysis.factors.map((factor) => {
                const isBuy = factor.signal === 'BUY';
                const isSell = factor.signal === 'SELL';
                return (
                  <div
                    key={factor.id}
                    className={`p-2 rounded-lg border text-[11px] flex items-center justify-between transition-colors ${
                      isBuy
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : isSell
                        ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <span className="font-bold text-white block text-[10px] truncate">
                        {factor.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono truncate block">
                        {factor.valueLabel}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                        isBuy
                          ? 'bg-[#10B981] text-slate-950'
                          : isSell
                          ? 'bg-[#EF4444] text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isBuy ? 'BUY' : isSell ? 'SELL' : 'WAIT'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-slate-900/95 border-slate-700/80 shadow-md space-y-2.5">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-xs truncate">
                    ប្រវត្តិបញ្ជាទិញ/លក់របស់ Bot ({botLogs.length})
                  </h3>
                  <span className="text-[10px] text-slate-400 block truncate">
                    កំណត់ត្រាប្រតិបត្តិការស្វ័យប្រវត្តិ និងសញ្ញាឆ្លាតវៃ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (botLogs.length > 0) {
                    playAlertTone('spike_down');
                    setBotLogs([]);
                  }
                }}
                disabled={botLogs.length === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all whitespace-nowrap shrink-0 ${
                  botLogs.length > 0
                    ? 'bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/35 hover:border-rose-500 shadow-xs hover:shadow-md hover:shadow-rose-600/20 active:scale-95 cursor-pointer'
                    : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
                }`}
                title="សម្អាតប្រវត្តិបញ្ជាទិញ/លក់ទាំងអស់ (Clear Bot History)"
              >
                {botLogs.length > 0 ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>សម្អាតប្រវត្តិ ({botLogs.length})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    <span>បានសម្អាត</span>
                  </>
                )}
              </button>
            </div>

            {botLogs.length === 0 ? (
              <div className="py-6 px-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-1.5">
                <History className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-300">
                  ប្រវត្តិបញ្ជាទិញ/លក់ត្រូវបានសម្អាតរួចរាល់
                </p>
                <p className="text-[10px] text-slate-500">
                  មិនទាន់មានប្រវត្តិទិញលក់ដោយ Bot នៅឡើយទេ។
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 tabular-nums">
                {botLogs.map((log) => {
                  const isBuy = log.direction === 'BUY';
                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-[11px] flex items-center justify-between gap-2 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                            isBuy ? 'bg-[#10B981] text-slate-950' : 'bg-[#EF4444] text-white'
                          }`}
                        >
                          {log.direction}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{log.symbol}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {log.lots} lot @ {formatPrice(log.entryPrice, log.symbol)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{log.reason}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] font-mono text-emerald-400 font-semibold">
                            TP: {formatPrice(log.takeProfit, log.symbol)}
                          </div>
                          <div className="text-[9px] text-slate-500">{log.timestamp}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBotLogs((prev) => prev.filter((item) => item.id !== log.id))
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                          title="លុបប្រវត្តិនេះ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 7. Emergency Circuit Breaker */}
      {onCloseAllPositions && openPositions.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              setIsBotActive(false);
              onCloseAllPositions();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>បិទ Bot និងបិទ Trade ទាំងអស់ភ្លាមៗ (Emergency Close All)</span>
          </button>
        </div>
      )}
    </div>
  );
};
