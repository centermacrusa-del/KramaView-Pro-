import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Candle,
  ChartDrawing,
  ChartType,
  DrawingToolId,
  IndicatorId,
  MarketAsset,
  PriceAlertRecord,
  Timeframe,
} from '../types/market';
import {
  ALL_TIMEFRAMES_ORDERED,
  ExnessAccountType,
  GOLD_CONVERSION,
  INITIAL_ASSETS,
  TIMEFRAME_METADATA,
  calculateBollingerBands,
  calculateEMA,
  calculateExnessBidAsk,
  calculateMACD,
  calculatePearsonCorrelation,
  calculateRSI,
  calculateSMA,
  calculateVWAP,
  formatPrice,
  formatVisibleDurationKhmer,
  generateHistoricalCandles,
  getExnessContractSpec,
  getIntervalSeconds,
  getTrendlinePriceAtTime,
  mapTimeframeToBinance,
} from '../services/marketEngine';
import { ExnessSyncedPosition } from './ExnessWebTradingPanel';
import {
  BarChart2,
  BellPlus,
  BellRing,
  Crosshair,
  GitCompare,
  Maximize2,
  Minimize2,
  Move,
  PenTool,
  RotateCcw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { AssetBadgeIcon } from './AssetBadgeIcon';

interface TradingChartCanvasProps {
  asset: MarketAsset;
  allAssets?: MarketAsset[];
  candles: Candle[];
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorId[];
  activeTool: DrawingToolId;
  drawings: ChartDrawing[];
  selectedDrawingId: string | null;
  activeAlerts: PriceAlertRecord[];
  theme: 'dark' | 'light';
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onAddDrawing: (drawing: ChartDrawing) => void;
  onUpdateDrawing?: (drawing: ChartDrawing) => void;
  onSelectDrawing: (id: string | null) => void;
  onDeleteDrawing: (id: string) => void;
  onClearDrawings: () => void;
  onQuickPriceAlert: (price: number) => void;
  onSetTrendlineAlert?: (drawing: ChartDrawing, targetPrice: number) => void;
  onSimulateSpike: (direction: 'up' | 'down') => void;
  onChangeTimeframe?: (tf: Timeframe) => void;
  onToggleIndicator?: (id: IndicatorId) => void;
  exnessAccountType?: ExnessAccountType;
  showExnessBidAskLines?: boolean;
  mt5Positions?: ExnessSyncedPosition[];
}

const FIB_LEVELS = [
  { level: 0, color: '#64748B' },
  { level: 0.236, color: '#EF4444' },
  { level: 0.382, color: '#D97706' },
  { level: 0.5, color: '#059669' },
  { level: 0.618, color: '#0284C7' },
  { level: 0.786, color: '#7C3AED' },
  { level: 1, color: '#64748B' },
];

export const TradingChartCanvas: React.FC<TradingChartCanvasProps> = ({
  asset,
  allAssets = INITIAL_ASSETS,
  candles,
  timeframe,
  chartType,
  indicators,
  activeTool,
  drawings,
  selectedDrawingId,
  activeAlerts,
  theme,
  isMaximized = false,
  onToggleMaximize,
  onAddDrawing,
  onUpdateDrawing,
  onSelectDrawing,
  onDeleteDrawing,
  onClearDrawings,
  onQuickPriceAlert,
  onSetTrendlineAlert,
  onSimulateSpike,
  onChangeTimeframe,
  onToggleIndicator,
  exnessAccountType = 'standard_cent',
  showExnessBidAskLines = true,
  mt5Positions = [],
}) => {
  const exnessQuote = useMemo(
    () => calculateExnessBidAsk(asset.symbol, asset.price, exnessAccountType),
    [asset.symbol, asset.price, exnessAccountType]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [dimensions, setDimensions] = useState({ width: 900, height: 540 });
  const [visibleCount, setVisibleCount] = useState<number>(85);
  const [autoHorizonZoom, setAutoHorizonZoom] = useState<boolean>(true);
  const lastHorizonStepRef = useRef<number>(0);
  // Continuous horizontal shift (in candle slots). Negative = dragged left (into center/left); Positive = dragged right.
  const [scrollOffset, setScrollOffset] = useState<number>(0);

  // Locked 2D Price Camera Bounds (when user drags vertically/horizontally, prevents auto-scale snap-back)
  const [lockedPriceBounds, setLockedPriceBounds] = useState<{
    center: number;
    span: number;
  } | null>(null);
  const [priceScaleZoom, setPriceScaleZoom] = useState<number>(1);
  const [mainPaneRatio, setMainPaneRatio] = useState<number>(0.74);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Synchronous ref for 1:1 lag-free 2D dragging without closure drift or snap-back
  const panRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startScrollOffset: number;
    startPriceCenter: number;
    startPriceSpan: number;
  } | null>(null);

  // Interactive Axis & Sub-Pane Divider Drag State
  const [axisDragMode, setAxisDragMode] = useState<'none' | 'price' | 'time' | 'divider'>('none');
  const [axisDragStartVal, setAxisDragStartVal] = useState<number>(0);
  const [axisDragStartCoord, setAxisDragStartCoord] = useState<number>(0);

  // Technical Drawing Drag & Resize State
  const [draggingDrawingState, setDraggingDrawingState] = useState<{
    drawing: ChartDrawing;
    handle: 'p1' | 'p2' | 'move' | 'target' | 'stop' | 'entry' | 'width';
    startX: number;
    startY: number;
  } | null>(null);

  // Touch Gesture State (1-finger free 2D pan & 2-finger pinch zoom)
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    startOffset: number;
    startPriceCenter: number;
    startPriceSpan: number;
    startDist: number | null;
    startVisibleCount: number;
  } | null>(null);

  // Reset camera only when switching primary symbol or timeframe
  useEffect(() => {
    setLockedPriceBounds(null);
    setPriceScaleZoom(1);
    setScrollOffset(0);
    setContextMenu(null);
  }, [asset.symbol, timeframe]);

  const [draftDrawing, setDraftDrawing] = useState<ChartDrawing | null>(null);
  const [textPromptPos, setTextPromptPos] = useState<{ t: number; p: number; x: number; y: number } | null>(null);
  const [textInputVal, setTextInputVal] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    drawing: ChartDrawing;
    linePriceAtCursor: number;
    linePriceAtLatest: number;
  } | null>(null);

  // Secondary Asset Overlay State for Correlation Analysis
  const [compareSymbol, setCompareSymbol] = useState<string>('');
  const [overlayScaleMode, setOverlayScaleMode] = useState<'dual' | 'percent'>('dual');
  const [rawCompareCandles, setRawCompareCandles] = useState<Candle[]>([]);

  const compareAsset = useMemo(() => {
    if (!compareSymbol || compareSymbol === asset.symbol) return null;
    return allAssets.find((a) => a.symbol === compareSymbol) || null;
  }, [allAssets, compareSymbol, asset.symbol]);

  // Load historical candles for secondary comparison asset when selected
  useEffect(() => {
    if (!compareAsset) {
      setRawCompareCandles([]);
      return;
    }

    let cancelled = false;
    const loadSecondaryCandles = async () => {
      const binancePair =
        compareAsset.symbol === 'GOLD-KH' ? 'PAXGUSDT' : compareAsset.binanceSymbol;
      const scaleFactor =
        compareAsset.symbol === 'GOLD-KH' ? GOLD_CONVERSION.DAMLEUNG_PER_OZ : 1;

      const interval = mapTimeframeToBinance(timeframe);
      if (binancePair && interval) {
        try {
          const res = await fetch(
            `/api/market/klines?symbol=${binancePair}&interval=${interval}&limit=160`
          );
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && Array.isArray(data.candles) && data.candles.length > 20) {
              const scaled: Candle[] = data.candles.map((c: Candle) => ({
                time: c.time,
                open: Number((c.open * scaleFactor).toPrecision(7)),
                high: Number((c.high * scaleFactor).toPrecision(7)),
                low: Number((c.low * scaleFactor).toPrecision(7)),
                close: Number((c.close * scaleFactor).toPrecision(7)),
                volume: c.volume,
              }));
              setRawCompareCandles(scaled);
              return;
            }
          }
        } catch {
          // fallback below
        }
      }

      if (!cancelled) {
        setRawCompareCandles(generateHistoricalCandles(compareAsset, timeframe, 365));
      }
    };

    loadSecondaryCandles();
    return () => {
      cancelled = true;
    };
  }, [compareAsset?.symbol, timeframe]);

  // Keep secondary asset's latest candle synchronized with live ticks & aligned to primary candles length
  const compareCandles = useMemo(() => {
    if (!compareAsset || candles.length === 0) return [];
    const baseSeries =
      rawCompareCandles.length > 0
        ? rawCompareCandles
        : generateHistoricalCandles(compareAsset, timeframe, candles.length);

    const aligned: Candle[] = [];
    const offset = baseSeries.length - candles.length;
    for (let i = 0; i < candles.length; i++) {
      const srcIdx = Math.min(baseSeries.length - 1, Math.max(0, i + offset));
      const src = baseSeries[srcIdx];
      const isLast = i === candles.length - 1;
      const closePrice = isLast ? compareAsset.price : src.close;
      aligned.push({
        time: candles[i].time,
        open: src.open,
        high: isLast ? Math.max(src.high, closePrice) : src.high,
        low: isLast ? Math.min(src.low, closePrice) : src.low,
        close: closePrice,
        volume: src.volume,
      });
    }
    return aligned;
  }, [compareAsset, rawCompareCandles, candles, timeframe]);

  // Observe container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Precompute technical indicators on full candle series
  const computedIndicators = useMemo(() => {
    const hasRsiAlert = activeAlerts.some(
      (a) =>
        a.symbol === asset.symbol &&
        a.status === 'active' &&
        (a.condition === 'rsi_overbought' ||
          a.condition === 'rsi_oversold' ||
          a.condition === 'rsi_channel_breakout')
    );
    return {
      ema20: indicators.includes('EMA20') ? calculateEMA(candles, 20) : null,
      ema50: indicators.includes('EMA50') ? calculateEMA(candles, 50) : null,
      sma200: indicators.includes('SMA200') ? calculateSMA(candles, 200) : null,
      bb: indicators.includes('BB') ? calculateBollingerBands(candles, 20, 2) : null,
      vwap: indicators.includes('VWAP') ? calculateVWAP(candles) : null,
      rsi: indicators.includes('RSI') || hasRsiAlert ? calculateRSI(candles, 14) : null,
      macd: indicators.includes('MACD') ? calculateMACD(candles, 12, 26, 9) : null,
    };
  }, [candles, indicators, activeAlerts, asset.symbol]);

  // Precompute AI Buy/Sell Signals for candlestick overlays
  const aiSignals = useMemo(() => {
    if (!indicators.includes('AI_SIGNALS') || candles.length < 20) return [];

    const ema20Arr = calculateEMA(candles, 20);
    const ema50Arr = calculateEMA(candles, 50);
    const rsiArr = calculateRSI(candles, 14);
    const vwapArr = calculateVWAP(candles);

    const signals: { index: number; type: 'BUY' | 'SELL'; price: number; reason: string }[] = [];
    let lastSignalIdx = -20;

    for (let i = 20; i < candles.length; i++) {
      if (i - lastSignalIdx < 6) continue;

      const c = candles[i];
      const prev = candles[i - 1];
      const ema20 = ema20Arr[i];
      const ema50 = ema50Arr[i];
      const prevEma20 = ema20Arr[i - 1];
      const prevEma50 = ema50Arr[i - 1];
      const rsi = rsiArr[i] ?? 50;
      const prevRsi = rsiArr[i - 1] ?? 50;
      const vwap = vwapArr[i];

      const isBullishCross =
        prevEma20 !== null &&
        prevEma50 !== null &&
        ema20 !== null &&
        ema50 !== null &&
        prevEma20 <= prevEma50 &&
        ema20 > ema50;
      const isRsiBullReversal = prevRsi <= 35 && rsi > 35 && c.close > c.open;
      const isVwapBullBounce =
        vwap !== null && prev.close < vwap && c.close > vwap && c.close > c.open;

      if ((isBullishCross || isRsiBullReversal || isVwapBullBounce) && c.close > c.open) {
        signals.push({
          index: i,
          type: 'BUY',
          price: c.low,
          reason: isBullishCross ? 'EMA Cross' : isRsiBullReversal ? 'RSI Reversal' : 'VWAP Break',
        });
        lastSignalIdx = i;
        continue;
      }

      const isBearishCross =
        prevEma20 !== null &&
        prevEma50 !== null &&
        ema20 !== null &&
        ema50 !== null &&
        prevEma20 >= prevEma50 &&
        ema20 < ema50;
      const isRsiBearReversal = prevRsi >= 65 && rsi < 65 && c.close < c.open;
      const isVwapBearBreak =
        vwap !== null && prev.close > vwap && c.close < vwap && c.close < c.open;

      if ((isBearishCross || isRsiBearReversal || isVwapBearBreak) && c.close < c.open) {
        signals.push({
          index: i,
          type: 'SELL',
          price: c.high,
          reason: isBearishCross ? 'Death Cross' : isRsiBearReversal ? 'RSI Overbought' : 'VWAP Break',
        });
        lastSignalIdx = i;
      }
    }
    return signals;
  }, [indicators, candles]);

  // Geometry constants
  const rightAxisWidth = 82;
  const bottomAxisHeight = 26;
  const chartW = Math.max(100, dimensions.width - rightAxisWidth);
  const totalChartH = Math.max(100, dimensions.height - bottomAxisHeight);
  const mainPaneH = Math.floor(totalChartH * mainPaneRatio);
  const subPaneTop = mainPaneH;
  const subPaneH = totalChartH - mainPaneH;

  // Horizontal slot geometry: supports compressing up to 365 candles (multi-year view) or zooming in to 8 candles (seconds view)
  const maxVisibleCount = Math.max(160, Math.min(365, candles.length || 365));
  const minVisibleCount = 8;
  const candleStep = chartW / Math.max(visibleCount, 1);
  const defaultLatestSlot = Math.max(4, visibleCount - 5);
  const minScrollOffset = -Math.floor(visibleCount * 0.92);
  const maxScrollOffset = Math.max(30, candles.length + Math.floor(visibleCount * 0.6));

  const clampScroll = useCallback(
    (val: number) => Math.min(maxScrollOffset, Math.max(minScrollOffset, val)),
    [minScrollOffset, maxScrollOffset]
  );

  const currentTfIndex = useMemo(
    () => Math.max(0, ALL_TIMEFRAMES_ORDERED.indexOf(timeframe)),
    [timeframe]
  );

  const visibleSpanSeconds = useMemo(
    () => visibleCount * getIntervalSeconds(timeframe),
    [visibleCount, timeframe]
  );

  // Compute all candles currently inside (or adjacent to) the horizontal viewport
  const renderedCandles = useMemo(() => {
    const list: { candle: Candle; gIdx: number; x: number }[] = [];
    const n = candles.length;
    if (n === 0) return list;
    for (let gIdx = 0; gIdx < n; gIdx++) {
      const slot = defaultLatestSlot - (n - 1 - gIdx) + scrollOffset;
      const x = (slot + 0.5) * candleStep;
      if (x >= -candleStep * 2 && x <= chartW + candleStep * 2) {
        list.push({ candle: candles[gIdx], gIdx, x });
      }
    }
    return list;
  }, [candles, defaultLatestSlot, scrollOffset, candleStep, chartW]);

  const visibleCandles = useMemo(() => renderedCandles.map((rc) => rc.candle), [renderedCandles]);
  const visibleCompareCandles = useMemo(() => {
    if (compareCandles.length === 0) return [];
    return renderedCandles
      .map((rc) => compareCandles[rc.gIdx])
      .filter((c): c is Candle => Boolean(c));
  }, [compareCandles, renderedCandles]);

  // Natural auto-fit price bounds (used when camera is not manually locked, or to initialize lock on drag)
  const autoPriceBounds = useMemo(() => {
    const sourceCandles =
      renderedCandles.length > 0
        ? renderedCandles
        : candles.slice(-40).map((candle, idx) => ({
            candle,
            gIdx: Math.max(0, candles.length - 40 + idx),
            x: 0,
          }));
    if (sourceCandles.length === 0) {
      return { min: asset.price * 0.98, max: asset.price * 1.02 };
    }
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < sourceCandles.length; i++) {
      const { candle: c, gIdx } = sourceCandles[i];
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (computedIndicators.bb) {
        const u = computedIndicators.bb.upper[gIdx];
        const l = computedIndicators.bb.lower[gIdx];
        if (u !== null && u !== undefined && u > max) max = u;
        if (l !== null && l !== undefined && l < min) min = l;
      }
    }
    const pad = Math.max((max - min) * 0.12, max * 0.0015);
    return { min: min - pad, max: max + pad };
  }, [renderedCandles, candles, computedIndicators.bb, asset.price]);

  // Effective Price Bounds: uses locked 2D camera center & span when dragged so candles never snap back
  const priceBounds = useMemo(() => {
    const baseCenter = lockedPriceBounds
      ? lockedPriceBounds.center
      : (autoPriceBounds.min + autoPriceBounds.max) / 2;
    const baseSpan = lockedPriceBounds
      ? lockedPriceBounds.span
      : autoPriceBounds.max - autoPriceBounds.min;
    const halfSpan = Math.max((baseSpan / 2) * priceScaleZoom, asset.price * 0.0002);
    return { min: baseCenter - halfSpan, max: baseCenter + halfSpan };
  }, [lockedPriceBounds, autoPriceBounds, priceScaleZoom, asset.price]);

  // Price range calculation for secondary overlay asset
  const comparePriceBounds = useMemo(() => {
    if (!compareAsset || visibleCompareCandles.length === 0) {
      return { min: 0, max: 1 };
    }
    if (overlayScaleMode === 'percent' && visibleCandles.length > 0) {
      const primaryFirst = Math.max(visibleCandles[0].open, 0.000001);
      const primaryMinPct = (priceBounds.min - primaryFirst) / primaryFirst;
      const primaryMaxPct = (priceBounds.max - primaryFirst) / primaryFirst;

      let secMinPct = primaryMinPct;
      let secMaxPct = primaryMaxPct;
      const secFirst = Math.max(visibleCompareCandles[0].open, 0.000001);
      for (let i = 0; i < visibleCompareCandles.length; i++) {
        const pct = (visibleCompareCandles[i].close - secFirst) / secFirst;
        if (pct < secMinPct) secMinPct = pct;
        if (pct > secMaxPct) secMaxPct = pct;
      }
      const padPct = Math.max((secMaxPct - secMinPct) * 0.08, 0.001);
      return {
        min: secFirst * (1 + secMinPct - padPct),
        max: secFirst * (1 + secMaxPct + padPct),
      };
    }

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < visibleCompareCandles.length; i++) {
      const c = visibleCompareCandles[i];
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    const pad = Math.max((max - min) * 0.12, max * 0.0015);
    return { min: min - pad, max: max + pad };
  }, [compareAsset, visibleCompareCandles, visibleCandles, overlayScaleMode, priceBounds]);

  const priceToY = useCallback(
    (price: number) => {
      const range = Math.max(priceBounds.max - priceBounds.min, 0.000001);
      return mainPaneH - ((price - priceBounds.min) / range) * (mainPaneH - 28) - 14;
    },
    [priceBounds, mainPaneH]
  );

  const comparePriceToY = useCallback(
    (price: number) => {
      const range = Math.max(comparePriceBounds.max - comparePriceBounds.min, 0.000001);
      return mainPaneH - ((price - comparePriceBounds.min) / range) * (mainPaneH - 28) - 14;
    },
    [comparePriceBounds, mainPaneH]
  );

  const yToComparePrice = useCallback(
    (y: number) => {
      const range = Math.max(comparePriceBounds.max - comparePriceBounds.min, 0.000001);
      const ratio = (mainPaneH - 14 - y) / Math.max(mainPaneH - 28, 1);
      return comparePriceBounds.min + ratio * range;
    },
    [comparePriceBounds, mainPaneH]
  );

  const yToPrice = useCallback(
    (y: number) => {
      const range = Math.max(priceBounds.max - priceBounds.min, 0.000001);
      const ratio = (mainPaneH - 14 - y) / Math.max(mainPaneH - 28, 1);
      return priceBounds.min + ratio * range;
    },
    [priceBounds, mainPaneH]
  );

  // Average candle interval in seconds (supports projecting into past/future empty canvas space)
  const candleIntervalSec = useMemo(() => {
    if (candles.length >= 2) {
      return Math.max(1, candles[candles.length - 1].time - candles[candles.length - 2].time);
    }
    return 60;
  }, [candles]);

  const timeToX = useCallback(
    (time: number) => {
      const n = candles.length;
      if (n === 0) return chartW / 2;
      const exactIdx = candles.findIndex((c) => c.time === time);
      if (exactIdx !== -1) {
        const slot = defaultLatestSlot - (n - 1 - exactIdx) + scrollOffset;
        return (slot + 0.5) * candleStep;
      }
      const latestTime = candles[n - 1].time;
      const deltaBars = (time - latestTime) / candleIntervalSec;
      const slot = defaultLatestSlot + deltaBars + scrollOffset;
      return (slot + 0.5) * candleStep;
    },
    [candles, defaultLatestSlot, scrollOffset, candleStep, candleIntervalSec, chartW]
  );

  const xToTime = useCallback(
    (x: number) => {
      const n = candles.length;
      if (n === 0) return Math.floor(Date.now() / 1000);
      const slot = x / Math.max(candleStep, 0.0001) - 0.5;
      const gIdxFloat = n - 1 + (slot - defaultLatestSlot - scrollOffset);
      const gIdxRounded = Math.round(gIdxFloat);
      if (gIdxRounded >= 0 && gIdxRounded < n) {
        return candles[gIdxRounded].time;
      }
      if (gIdxRounded >= n) {
        return candles[n - 1].time + (gIdxRounded - (n - 1)) * candleIntervalSec;
      }
      return candles[0].time + gIdxRounded * candleIntervalSec;
    },
    [candles, candleStep, defaultLatestSlot, scrollOffset, candleIntervalSec]
  );

  const activeGlobalIdx = useMemo(() => {
    const n = candles.length;
    if (n === 0) return 0;
    if (!mousePos || mousePos.x > chartW) {
      return n - 1;
    }
    const slot = mousePos.x / Math.max(candleStep, 0.0001) - 0.5;
    const gIdx = Math.round(n - 1 + (slot - defaultLatestSlot - scrollOffset));
    return Math.min(n - 1, Math.max(0, gIdx));
  }, [mousePos, chartW, candles.length, candleStep, defaultLatestSlot, scrollOffset]);

  const activeCandle = candles[activeGlobalIdx] || candles[candles.length - 1];
  const activeCompareCandle =
    compareCandles[activeGlobalIdx] || compareCandles[compareCandles.length - 1] || null;

  // Real-time Pearson Correlation & Relative Performance Spread on Visible Window
  const correlationStats = useMemo(() => {
    if (!compareAsset || visibleCandles.length < 3 || visibleCompareCandles.length < 3) {
      return null;
    }
    const r = calculatePearsonCorrelation(visibleCandles, visibleCompareCandles);
    const primStart = Math.max(visibleCandles[0].open, 0.000001);
    const secStart = Math.max(visibleCompareCandles[0].open, 0.000001);
    const primCurr = activeCandle ? activeCandle.close : asset.price;
    const secCurr = activeCompareCandle ? activeCompareCandle.close : compareAsset.price;

    const primReturnPct = ((primCurr - primStart) / primStart) * 100;
    const secReturnPct = ((secCurr - secStart) / secStart) * 100;
    const spreadPct = primReturnPct - secReturnPct;

    let labelKh = 'មិនសូវទាក់ទងគ្នា';
    if (r >= 0.7) labelKh = 'ដើរស្របគ្នាខ្លាំង';
    else if (r >= 0.3) labelKh = 'ដើរស្របគ្នាមធ្យម';
    else if (r <= -0.7) labelKh = 'ដើរបញ្ច្រាសខ្លាំង';
    else if (r <= -0.3) labelKh = 'ដើរបញ្ច្រាសមធ្យម';

    return {
      r,
      labelKh,
      primReturnPct,
      secReturnPct,
      spreadPct,
    };
  }, [
    compareAsset,
    visibleCandles,
    visibleCompareCandles,
    activeCandle,
    activeCompareCandle,
    asset.price,
  ]);

  // Helper to center candles right in the middle of the canvas (both horizontally & vertically)
  const handleCenterCandlesOnCanvas = useCallback(() => {
    const centerSlotTarget = Math.floor(visibleCount * 0.48);
    const targetOffset = centerSlotTarget - defaultLatestSlot;
    setScrollOffset(clampScroll(targetOffset));

    const recentSlice = candles.slice(-Math.min(35, candles.length));
    if (recentSlice.length > 0) {
      let min = Infinity;
      let max = -Infinity;
      recentSlice.forEach((c) => {
        if (c.low < min) min = c.low;
        if (c.high > max) max = c.high;
      });
      const span = Math.max((max - min) * 1.35, asset.price * 0.004);
      setLockedPriceBounds({
        center: (min + max) / 2,
        span,
      });
    }
  }, [visibleCount, defaultLatestSlot, clampScroll, candles, asset.price]);

  // Visible Range Volume Profile (VPVR) Calculation
  const volumeProfileData = useMemo(() => {
    if (!indicators.includes('VP') || renderedCandles.length === 0) {
      return null;
    }

    const minP = priceBounds.min;
    const maxP = priceBounds.max;
    const priceSpan = maxP - minP;
    if (priceSpan <= 0) return null;

    const numBins = 38; // 38 horizontal price distribution buckets
    const binSize = priceSpan / numBins;

    interface VpBin {
      low: number;
      high: number;
      mid: number;
      buyVol: number;
      sellVol: number;
      totalVol: number;
    }

    const bins: VpBin[] = [];
    for (let b = 0; b < numBins; b++) {
      const low = minP + b * binSize;
      const high = low + binSize;
      bins.push({
        low,
        high,
        mid: (low + high) / 2,
        buyVol: 0,
        sellVol: 0,
        totalVol: 0,
      });
    }

    let totalVolume = 0;
    renderedCandles.forEach(({ candle: c }) => {
      const vol = c.volume || 1;
      totalVolume += vol;
      const cH = c.high;
      const cL = c.low;
      const cRange = Math.max(0.000001, cH - cL);

      // Estimate buy vs sell volume based on close position relative to candle range
      const buyRatio = Math.max(0.15, Math.min(0.85, (c.close - cL) / cRange));
      const cBuy = vol * buyRatio;
      const cSell = vol * (1 - buyRatio);

      bins.forEach((bin) => {
        const overlap = Math.max(0, Math.min(cH, bin.high) - Math.max(cL, bin.low));
        if (overlap > 0) {
          const prop = overlap / cRange;
          bin.buyVol += cBuy * prop;
          bin.sellVol += cSell * prop;
          bin.totalVol += vol * prop;
        }
      });
    });

    // Determine POC (Point of Control)
    let maxBinVol = 0;
    let pocIdx = 0;
    bins.forEach((bin, idx) => {
      if (bin.totalVol > maxBinVol) {
        maxBinVol = bin.totalVol;
        pocIdx = idx;
      }
    });

    // Determine Value Area (70% of total volume expanding outward from POC)
    const targetVaVol = totalVolume * 0.70;
    let vaVol = bins[pocIdx]?.totalVol || 0;
    let vaLowIdx = pocIdx;
    let vaHighIdx = pocIdx;

    while (vaVol < targetVaVol && (vaLowIdx > 0 || vaHighIdx < numBins - 1)) {
      const nextUpVol = vaHighIdx < numBins - 1 ? bins[vaHighIdx + 1].totalVol : 0;
      const nextDownVol = vaLowIdx > 0 ? bins[vaLowIdx - 1].totalVol : 0;

      if (nextUpVol >= nextDownVol && vaHighIdx < numBins - 1) {
        vaHighIdx++;
        vaVol += nextUpVol;
      } else if (vaLowIdx > 0) {
        vaLowIdx--;
        vaVol += nextDownVol;
      } else if (vaHighIdx < numBins - 1) {
        vaHighIdx++;
        vaVol += nextUpVol;
      } else {
        break;
      }
    }

    return {
      bins,
      maxBinVol,
      pocIdx,
      pocPrice: bins[pocIdx]?.mid || asset.price,
      vahPrice: bins[vaHighIdx]?.high || maxP,
      valPrice: bins[vaLowIdx]?.low || minP,
      vaLowIdx,
      vaHighIdx,
      totalVolume,
    };
  }, [indicators, renderedCandles, priceBounds, asset.price]);

  // Main Canvas Render Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const isDark = theme === 'dark';
    const bgCanvas = isDark ? '#0B0F17' : '#FFFFFF';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.07)' : 'rgba(15, 23, 42, 0.07)';
    const borderColor = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.14)';
    const textMuted = isDark ? '#94A3B8' : '#475569';
    const textStrong = isDark ? '#F8FAFC' : '#0F172A';
    const bullColor = isDark ? '#10B981' : '#059669';
    const bearColor = isDark ? '#EF4444' : '#DC2626';

    // Clear canvas
    ctx.fillStyle = bgCanvas;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 1. Horizontal Price Grid Lines & Right Axis Price Labels
    const priceLevels = 7;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    for (let i = 0; i <= priceLevels; i++) {
      const y = 16 + ((mainPaneH - 32) / priceLevels) * i;
      const p = yToPrice(y);

      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();

      ctx.fillStyle = textMuted;
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(p, asset.symbol), chartW + 8, y + 3);
    }

    // 2. Vertical Time Grid Lines & Bottom Axis Time Labels (adaptive from Seconds up to Multi-Year)
    const timeStep = Math.max(1, Math.floor(visibleCount / 7));
    const slotModOffset = ((Math.round(scrollOffset) % timeStep) + timeStep) % timeStep;
    const spanSec = visibleCount * candleIntervalSec;
    for (let slot = slotModOffset; slot <= visibleCount; slot += timeStep) {
      const x = (slot + 0.5) * candleStep;
      if (x < 10 || x > chartW - 10) continue;

      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalChartH);
      ctx.stroke();

      const tSec = xToTime(x);
      const dateObj = new Date(tSec * 1000);
      const timeStr =
        timeframe.endsWith('s') || spanSec <= 600
          ? dateObj.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : timeframe === '1Y' || spanSec >= 86400 * 365 * 2
          ? dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : timeframe === '1M' || timeframe === '3M' || timeframe === '6M' || spanSec >= 86400 * 90
          ? dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : timeframe === '1D' || timeframe === '1W' || spanSec >= 86400 * 3
          ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      ctx.fillStyle = textMuted;
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, totalChartH + 17);
    }

    // Clip to Main Chart Pane
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, mainPaneH);
    ctx.clip();

    // 3. Render Bollinger Bands background fill if active
    if (computedIndicators.bb && renderedCandles.length > 1) {
      const { upper, middle, lower } = computedIndicators.bb;
      ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.06)' : 'rgba(2, 132, 199, 0.07)';
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < renderedCandles.length; i++) {
        const { gIdx, x } = renderedCandles[i];
        const u = upper[gIdx];
        if (u !== null && u !== undefined) {
          const y = priceToY(u);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let i = renderedCandles.length - 1; i >= 0; i--) {
        const { gIdx, x } = renderedCandles[i];
        const l = lower[gIdx];
        if (l !== null && l !== undefined) {
          const y = priceToY(l);
          ctx.lineTo(x, y);
        }
      }
      if (started) {
        ctx.closePath();
        ctx.fill();
      }

      const drawBandLine = (arr: (number | null)[], stroke: string, dashed = false) => {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.setLineDash(dashed ? [4, 4] : []);
        ctx.beginPath();
        let s = false;
        for (let i = 0; i < renderedCandles.length; i++) {
          const { gIdx, x } = renderedCandles[i];
          const val = arr[gIdx];
          if (val !== null && val !== undefined) {
            const y = priceToY(val);
            if (!s) {
              ctx.moveTo(x, y);
              s = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };

      const bandStroke = isDark ? 'rgba(56, 189, 248, 0.55)' : 'rgba(2, 132, 199, 0.6)';
      const midStroke = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.4)';
      drawBandLine(upper, bandStroke);
      drawBandLine(middle, midStroke, true);
      drawBandLine(lower, bandStroke);
    }

    // 3.5. Render Volume Profile (VPVR) Histogram Bars on Right Side of Chart
    if (indicators.includes('VP') && volumeProfileData && volumeProfileData.maxBinVol > 0) {
      const { bins, maxBinVol, vaLowIdx, vaHighIdx, pocIdx } = volumeProfileData;
      // Responsive max width of histogram on the right side of chart
      const maxVpWidth = Math.min(160, Math.max(90, chartW * 0.22));
      const vpRightX = chartW - 2;

      bins.forEach((bin, idx) => {
        if (bin.totalVol <= 0) return;
        const yTop = priceToY(bin.high);
        const yBottom = priceToY(bin.low);
        const barY = Math.min(yTop, yBottom);
        const barH = Math.max(1.8, Math.abs(yBottom - yTop) - 0.8);

        const barWidth = (bin.totalVol / maxBinVol) * maxVpWidth;
        const buyRatio = bin.buyVol / Math.max(0.00001, bin.totalVol);
        const buyWidth = barWidth * buyRatio;
        const sellWidth = barWidth - buyWidth;

        const isInsideVA = idx >= vaLowIdx && idx <= vaHighIdx;
        const isPOC = idx === pocIdx;
        const barLeftX = vpRightX - barWidth;

        if (isPOC) {
          // Point of Control (POC) Bar Highlight
          ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.55)' : 'rgba(217, 119, 6, 0.5)';
          ctx.fillRect(barLeftX, barY, barWidth, barH);
        } else if (isInsideVA) {
          // Inside 70% Value Area: prominent buy (emerald) / sell (rose) colors
          ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.40)' : 'rgba(5, 150, 105, 0.40)';
          ctx.fillRect(barLeftX, barY, buyWidth, barH);

          ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.40)' : 'rgba(225, 29, 72, 0.40)';
          ctx.fillRect(barLeftX + buyWidth, barY, sellWidth, barH);
        } else {
          // Outside Value Area: translucent / subdued
          ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(5, 150, 105, 0.18)';
          ctx.fillRect(barLeftX, barY, buyWidth, barH);

          ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(225, 29, 72, 0.18)';
          ctx.fillRect(barLeftX + buyWidth, barY, sellWidth, barH);
        }
      });
    }

    // 4. Render Candlesticks / Area / Line / Heikin Ashi at their exact 2D dragged coordinates
    if (chartType === 'area' || chartType === 'line') {
      const lineStroke = isDark ? '#38BDF8' : '#0284C7';
      ctx.strokeStyle = lineStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      renderedCandles.forEach(({ candle: c, x }, i) => {
        const y = priceToY(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      if (chartType === 'area' && renderedCandles.length > 1) {
        const grad = ctx.createLinearGradient(0, 0, 0, mainPaneH);
        grad.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(2, 132, 199, 0.22)');
        grad.addColorStop(1, isDark ? 'rgba(56, 189, 248, 0.0)' : 'rgba(2, 132, 199, 0.0)');
        ctx.fillStyle = grad;
        ctx.lineTo(renderedCandles[renderedCandles.length - 1].x, mainPaneH);
        ctx.lineTo(renderedCandles[0].x, mainPaneH);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const bodyW = Math.max(1.2, Math.min(candleStep * 0.74, 20));
      let prevHaOpen = renderedCandles[0]?.candle.open || 0;
      let prevHaClose = renderedCandles[0]?.candle.close || 0;

      renderedCandles.forEach(({ candle: c, x }, i) => {
        let open = c.open;
        let high = c.high;
        let low = c.low;
        let close = c.close;

        if (chartType === 'heikin') {
          const haClose = (c.open + c.high + c.low + c.close) / 4;
          const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevHaOpen + prevHaClose) / 2;
          const haHigh = Math.max(c.high, haOpen, haClose);
          const haLow = Math.min(c.low, haOpen, haClose);
          prevHaOpen = haOpen;
          prevHaClose = haClose;
          open = haOpen;
          high = haHigh;
          low = haLow;
          close = haClose;
        }

        const isBull = close >= open;
        const color = isBull ? bullColor : bearColor;
        const yHigh = priceToY(high);
        const yLow = priceToY(low);
        const yOpen = priceToY(open);
        const yClose = priceToY(close);

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Body
        const topY = Math.min(yOpen, yClose);
        const boxH = Math.max(1.5, Math.abs(yClose - yOpen));
        if (chartType === 'hollow' && isBull) {
          ctx.fillStyle = bgCanvas;
          ctx.fillRect(x - bodyW / 2, topY, bodyW, boxH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(x - bodyW / 2, topY, bodyW, boxH);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x - bodyW / 2, topY, bodyW, boxH);
        }
      });
    }

    // 5. Render Moving Averages & VWAP Overlays
    const drawOverlayLine = (
      series: (number | null)[] | null,
      color: string,
      width = 1.6,
      dash: number[] = []
    ) => {
      if (!series) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < renderedCandles.length; i++) {
        const { gIdx, x } = renderedCandles[i];
        const val = series[gIdx];
        if (val !== null && val !== undefined) {
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawOverlayLine(computedIndicators.ema20, isDark ? '#38BDF8' : '#0284C7', 1.6);
    drawOverlayLine(computedIndicators.ema50, isDark ? '#F59E0B' : '#D97706', 1.6);
    drawOverlayLine(computedIndicators.sma200, isDark ? '#A855F7' : '#7C3AED', 1.8);
    drawOverlayLine(computedIndicators.vwap, isDark ? '#EC4899' : '#DB2777', 1.4, [5, 3]);

    // 5A. Render AI Buy / Sell Confluence Markers on Candlesticks
    if (indicators.includes('AI_SIGNALS') && aiSignals.length > 0) {
      const renderedMap = new Map<number, { x: number; c: Candle }>();
      renderedCandles.forEach((rc) => renderedMap.set(rc.gIdx, { x: rc.x, c: rc.candle }));

      ctx.save();
      ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      aiSignals.forEach((sig) => {
        const item = renderedMap.get(sig.index);
        if (!item) return;

        const { x, c } = item;
        if (sig.type === 'BUY') {
          const yLow = priceToY(c.low);
          const badgeY = yLow + 16;
          // Connecting pointer arrow
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.moveTo(x, yLow + 4);
          ctx.lineTo(x - 4, yLow + 9);
          ctx.lineTo(x + 4, yLow + 9);
          ctx.closePath();
          ctx.fill();

          // Clean Pill badge
          const label = '▲ BUY';
          const tw = ctx.measureText(label).width;
          const bw = tw + 8;
          const bh = 14;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x - bw / 2, badgeY - bh / 2, bw, bh, 3);
          } else {
            ctx.rect(x - bw / 2, badgeY - bh / 2, bw, bh);
          }
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(label, x, badgeY);
        } else {
          const yHigh = priceToY(c.high);
          const badgeY = yHigh - 16;
          // Connecting pointer arrow
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.moveTo(x, yHigh - 4);
          ctx.lineTo(x - 4, yHigh - 9);
          ctx.lineTo(x + 4, yHigh - 9);
          ctx.closePath();
          ctx.fill();

          // Clean Pill badge
          const label = '▼ SELL';
          const tw = ctx.measureText(label).width;
          const bw = tw + 8;
          const bh = 14;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x - bw / 2, badgeY - bh / 2, bw, bh, 3);
          } else {
            ctx.rect(x - bw / 2, badgeY - bh / 2, bw, bh);
          }
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(label, x, badgeY);
        }
      });
      ctx.restore();
    }

    // 5B. Render Secondary Asset Comparison Overlay (Correlation Analysis)
    if (compareAsset && renderedCandles.length > 1 && compareCandles.length > 0) {
      const compColor = isDark ? '#22D3EE' : '#0891B2';
      const compFillTop = isDark ? 'rgba(34, 211, 238, 0.14)' : 'rgba(8, 145, 178, 0.12)';
      const compFillBot = isDark ? 'rgba(34, 211, 238, 0.0)' : 'rgba(8, 145, 178, 0.0)';

      ctx.save();
      ctx.strokeStyle = compColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      let firstX = renderedCandles[0].x;
      let lastX = renderedCandles[renderedCandles.length - 1].x;
      let startedComp = false;
      renderedCandles.forEach(({ gIdx, x }) => {
        const cc = compareCandles[gIdx];
        if (!cc) return;
        const y = comparePriceToY(cc.close);
        if (!startedComp) {
          ctx.moveTo(x, y);
          firstX = x;
          startedComp = true;
        } else {
          ctx.lineTo(x, y);
          lastX = x;
        }
      });
      ctx.stroke();

      if (startedComp) {
        const compGrad = ctx.createLinearGradient(0, 0, 0, mainPaneH);
        compGrad.addColorStop(0, compFillTop);
        compGrad.addColorStop(1, compFillBot);
        ctx.fillStyle = compGrad;
        ctx.lineTo(lastX, mainPaneH);
        ctx.lineTo(firstX, mainPaneH);
        ctx.closePath();
        ctx.fill();
      }

      // Secondary asset live price dashed reference line
      const compLatestY = comparePriceToY(compareAsset.price);
      if (compLatestY >= 0 && compLatestY <= mainPaneH) {
        ctx.strokeStyle = compColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(0, compLatestY);
        ctx.lineTo(chartW, compLatestY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Left-side secondary price scale ticks
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      const secTicks = [0.2, 0.5, 0.8];
      secTicks.forEach((ratio) => {
        const ty = Math.round(mainPaneH * ratio);
        const tp = yToComparePrice(ty);
        const label = `${compareAsset.symbol}: ${formatPrice(tp, compareAsset.symbol)}`;
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(6, ty - 9, tw, 15);
        ctx.fillStyle = compColor;
        ctx.fillText(label, 10, ty + 2);
      });

      // Live Secondary Asset Tag on Left Edge
      if (compLatestY >= 12 && compLatestY <= mainPaneH - 12) {
        const liveLabel = `${compareAsset.symbol} ${formatPrice(compareAsset.price, compareAsset.symbol)}`;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        const ltw = ctx.measureText(liveLabel).width + 12;
        ctx.fillStyle = compColor;
        ctx.fillRect(6, compLatestY - 9, ltw, 18);
        ctx.fillStyle = '#0F172A';
        ctx.fillText(liveLabel, 12, compLatestY + 3);
      }

      // Highlighted node on secondary curve at hovered candle
      if (activeCompareCandle) {
        const hoveredItem = renderedCandles.find((rc) => rc.gIdx === activeGlobalIdx);
        if (hoveredItem) {
          const hx = hoveredItem.x;
          const hy = comparePriceToY(activeCompareCandle.close);
          ctx.fillStyle = bgCanvas;
          ctx.strokeStyle = compColor;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 5C. Render Volume Profile Reference Lines (POC, VAH, VAL) on Right Side of Chart
    if (indicators.includes('VP') && volumeProfileData) {
      const { pocPrice, vahPrice, valPrice } = volumeProfileData;
      const maxVpWidth = Math.min(160, Math.max(90, chartW * 0.22));

      // POC Line (Point of Control)
      const pocY = priceToY(pocPrice);
      if (pocY >= 0 && pocY <= mainPaneH) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(chartW - maxVpWidth - 30, pocY);
        ctx.lineTo(chartW, pocY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small badge at right edge of chart
        ctx.font = '700 9px "JetBrains Mono", monospace';
        const pocLabel = `POC ${formatPrice(pocPrice, asset.symbol)}`;
        const ptw = ctx.measureText(pocLabel).width + 8;
        ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.95)' : 'rgba(217, 119, 6, 0.95)';
        ctx.fillRect(chartW - ptw - 4, pocY - 8, ptw, 16);
        ctx.fillStyle = '#0B0F17';
        ctx.textAlign = 'left';
        ctx.fillText(pocLabel, chartW - ptw, pocY + 3);
      }

      // VAH Line (Value Area High)
      const vahY = priceToY(vahPrice);
      if (vahY >= 0 && vahY <= mainPaneH) {
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(2, 132, 199, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(chartW - maxVpWidth - 10, vahY);
        ctx.lineTo(chartW, vahY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.fillStyle = isDark ? '#38BDF8' : '#0284C7';
        ctx.textAlign = 'right';
        ctx.fillText(`VAH ${formatPrice(vahPrice, asset.symbol)}`, chartW - 6, vahY - 3);
      }

      // VAL Line (Value Area Low)
      const valY = priceToY(valPrice);
      if (valY >= 0 && valY <= mainPaneH) {
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(2, 132, 199, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(chartW - maxVpWidth - 10, valY);
        ctx.lineTo(chartW, valY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.fillStyle = isDark ? '#38BDF8' : '#0284C7';
        ctx.textAlign = 'right';
        ctx.fillText(`VAL ${formatPrice(valPrice, asset.symbol)}`, chartW - 6, valY + 9);
      }
    }

    // 6. Render Active Price Alert Threshold Lines
    activeAlerts
      .filter(
        (a) =>
          a.symbol === asset.symbol &&
          a.status === 'active' &&
          (a.condition === 'price_above' || a.condition === 'price_below')
      )
      .forEach((alert) => {
        const y = priceToY(alert.threshold);
        if (y >= 0 && y <= mainPaneH) {
          ctx.strokeStyle = isDark ? '#F59E0B' : '#D97706';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartW, y);
          ctx.stroke();
          ctx.setLineDash([]);

          const label = `🔔 Alert ${alert.condition === 'price_above' ? '≥' : '≤'} ${formatPrice(alert.threshold, asset.symbol)}`;
          ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
          const tw = ctx.measureText(label).width + 12;
          ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(254, 243, 199, 0.95)';
          ctx.fillRect(10, y - 10, tw, 18);
          ctx.strokeStyle = isDark ? '#F59E0B' : '#D97706';
          ctx.strokeRect(10, y - 10, tw, 18);
          ctx.fillStyle = isDark ? '#FBBF24' : '#92400E';
          ctx.textAlign = 'left';
          ctx.fillText(label, 16, y + 3);
        }
      });

    // 6B. Render Active Exness MT5 Positions & Pending Order Lines (MetaTrader 5 Style)
    mt5Positions
      .filter((p) => p.symbol === asset.symbol)
      .forEach((pos) => {
        const posSpec = getExnessContractSpec(pos.symbol, pos.accountType);
        const closeP = pos.direction === 'BUY' ? exnessQuote.bid : exnessQuote.ask;
        const diff = pos.direction === 'BUY' ? closeP - pos.entryPrice : pos.entryPrice - closeP;
        const pnl =
          pos.status === 'OPEN'
            ? Number(
                (
                  diff * pos.lots * posSpec.contractSize -
                  pos.lots * posSpec.commissionPerLotUSD[pos.accountType]
                ).toFixed(2)
              )
            : 0;

        // Entry Line (Clean dashed line, no blocking box over candles; numbers on right axis)
        const yEntry = priceToY(pos.entryPrice);
        if (yEntry >= 0 && yEntry <= mainPaneH) {
          const isBuy = pos.direction === 'BUY';
          const isProfitable = pnl >= 0;

          // BUY (ឡើង): Green (#10B981) | SELL (ចុះ): Red (#EF4444)
          const directionColor = isBuy ? '#10B981' : '#EF4444';
          const pnlColor = isProfitable ? '#10B981' : '#EF4444';
          const entryLineColor =
            pos.status === 'PENDING'
              ? '#F59E0B'
              : directionColor;

          ctx.strokeStyle = entryLineColor;
          ctx.lineWidth = 1.3;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(0, yEntry);
          ctx.lineTo(chartW, yEntry);
          ctx.stroke();
          ctx.setLineDash([]);

          // Right-aligned subtle text right before the price scale (does NOT block candles)
          // BUY is Green, SELL is Red; PnL is Green if >= 0 (ឡើង), Red if < 0 (ចុះ)
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';

          if (pos.status === 'OPEN') {
            const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
            const pnlTag = ` [${pnlStr}]`;
            const baseTag = `${pos.direction} ${pos.lots.toFixed(2)} @ ${formatPrice(pos.entryPrice, asset.symbol)}`;
            const pnlWidth = ctx.measureText(pnlTag).width;

            // Draw PnL colored in green (ឡើង) or red (ចុះ)
            ctx.fillStyle = pnlColor;
            ctx.fillText(pnlTag, chartW - 8, yEntry - 4);

            // Draw base text (BUY in green, SELL in red)
            ctx.fillStyle = directionColor;
            ctx.fillText(baseTag, chartW - 8 - pnlWidth, yEntry - 4);
          } else {
            ctx.fillStyle = '#F59E0B';
            ctx.fillText(
              `${pos.direction} ${pos.lots.toFixed(2)} @ ${formatPrice(pos.entryPrice, asset.symbol)} [PENDING]`,
              chartW - 8,
              yEntry - 4
            );
          }

          // Exact numerical price badge right on the price axis (TradingView / MT5 standard)
          // Green for BUY (ឡើង), Red for SELL (ចុះ)
          ctx.fillStyle = pos.status === 'PENDING' ? '#F59E0B' : directionColor;
          ctx.fillRect(chartW, yEntry - 8, rightAxisWidth, 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          const dirArrow = isBuy ? '▲ ' : '▼ ';
          ctx.fillText(`${dirArrow}${formatPrice(pos.entryPrice, asset.symbol)}`, chartW + 3, yEntry + 3);
        }

        // Take Profit Line (TP)
        if (pos.takeProfit > 0) {
          const yTp = priceToY(pos.takeProfit);
          if (yTp >= 0 && yTp <= mainPaneH) {
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(0, yTp);
            ctx.lineTo(chartW, yTp);
            ctx.stroke();
            ctx.setLineDash([]);

            // Text near right edge, no blocking box
            ctx.font = '700 9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#10B981';
            ctx.textAlign = 'right';
            ctx.fillText(`TP #${pos.ticket}`, chartW - 8, yTp - 4);

            // Exact numeric price on the right axis
            ctx.fillStyle = '#10B981';
            ctx.fillRect(chartW, yTp - 8, rightAxisWidth, 16);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '700 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`TP ${formatPrice(pos.takeProfit, asset.symbol)}`, chartW + 3, yTp + 3);
          }
        }

        // Stop Loss Line (SL)
        if (pos.stopLoss > 0) {
          const ySl = priceToY(pos.stopLoss);
          if (ySl >= 0 && ySl <= mainPaneH) {
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(0, ySl);
            ctx.lineTo(chartW, ySl);
            ctx.stroke();
            ctx.setLineDash([]);

            // Text near right edge, no blocking box
            ctx.font = '700 9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#EF4444';
            ctx.textAlign = 'right';
            ctx.fillText(`SL #${pos.ticket}`, chartW - 8, ySl - 4);

            // Exact numeric price on the right axis
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(chartW, ySl - 8, rightAxisWidth, 16);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '700 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`SL ${formatPrice(pos.stopLoss, asset.symbol)}`, chartW + 3, ySl + 3);
          }
        }
      });

    // 7. Render Technical Drawings (Saved + Draft)
    const allDrawings = draftDrawing ? [...drawings, draftDrawing] : drawings;

    allDrawings.forEach((d) => {
      const x1 = timeToX(d.t1);
      const y1 = priceToY(d.p1);
      const x2 = timeToX(d.t2);
      const y2 = priceToY(d.p2);
      const isSelected = d.id === selectedDrawingId;
      const strokeColor = d.color || (isDark ? '#38BDF8' : '#0284C7');

      ctx.save();
      ctx.lineWidth = isSelected ? 2.4 : 1.7;
      ctx.strokeStyle = strokeColor;

      if (d.tool === 'trendline') {
        const linkedAlert = activeAlerts.find(
          (a) =>
            a.symbol === asset.symbol &&
            a.status === 'active' &&
            a.condition === 'trendline_touch' &&
            a.drawingId === d.id
        );
        const hasTrendlineAlert = Boolean(d.hasAlert || linkedAlert);
        const activeStroke = hasTrendlineAlert
          ? isDark
            ? '#F59E0B'
            : '#D97706'
          : strokeColor;

        ctx.strokeStyle = activeStroke;
        ctx.lineWidth = isSelected || hasTrendlineAlert ? 2.5 : 1.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Projection ray to latest candle time so user can see current trendline touch level
        const latestCandleTime =
          candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000);
        const projPrice = getTrendlinePriceAtTime(d, latestCandleTime);
        const projX = timeToX(latestCandleTime);
        const projY = priceToY(projPrice);
        const rightEndX = d.t2 >= d.t1 ? x2 : x1;
        const rightEndY = d.t2 >= d.t1 ? y2 : y1;

        if (hasTrendlineAlert || isSelected) {
          ctx.save();
          ctx.strokeStyle = activeStroke;
          ctx.lineWidth = 1.3;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(rightEndX, rightEndY);
          ctx.lineTo(projX, projY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Target node at current candle time intersection
          if (projY >= 0 && projY <= mainPaneH) {
            ctx.fillStyle = activeStroke;
            ctx.beginPath();
            ctx.arc(projX, projY, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        const pct = ((d.p2 - d.p1) / Math.max(d.p1, 0.0001)) * 100;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 10;

        if (hasTrendlineAlert) {
          const alertBadge = `🔔 Trendline Alert @ ${formatPrice(projPrice, asset.symbol)}`;
          ctx.font = '600 10px "Plus Jakarta Sans", "JetBrains Mono", sans-serif';
          const tw = ctx.measureText(alertBadge).width + 12;
          ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(254, 243, 199, 0.96)';
          ctx.fillRect(midX - tw / 2, midY - 11, tw, 17);
          ctx.strokeStyle = activeStroke;
          ctx.lineWidth = 1;
          ctx.strokeRect(midX - tw / 2, midY - 11, tw, 17);
          ctx.fillStyle = isDark ? '#FBBF24' : '#92400E';
          ctx.textAlign = 'center';
          ctx.fillText(alertBadge, midX, midY + 1);
        } else {
          const labelStr = isSelected
            ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% · Right-click: Set Price Alert`
            : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = activeStroke;
          ctx.textAlign = 'center';
          ctx.fillText(labelStr, midX, midY);
        }
      } else if (d.tool === 'horizontal') {
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y1);
        ctx.lineTo(chartW, y1);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = strokeColor;
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`S/R ${formatPrice(d.p1, asset.symbol)}`, chartW - 8, y1 - 5);
      } else if (d.tool === 'fib') {
        const leftX = Math.min(x1, x2);
        const rightX = Math.max(x1, x2, leftX + 120);
        const diffP = d.p2 - d.p1;

        FIB_LEVELS.forEach((fib, idx) => {
          const levelPrice = d.p2 - diffP * fib.level;
          const ly = priceToY(levelPrice);

          if (idx < FIB_LEVELS.length - 1) {
            const nextPrice = d.p2 - diffP * FIB_LEVELS[idx + 1].level;
            const nextY = priceToY(nextPrice);
            ctx.fillStyle = `${fib.color}18`;
            ctx.fillRect(leftX, Math.min(ly, nextY), rightX - leftX, Math.abs(nextY - ly));
          }

          ctx.strokeStyle = fib.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(leftX, ly);
          ctx.lineTo(rightX, ly);
          ctx.stroke();

          ctx.fillStyle = fib.color;
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${fib.level.toFixed(3)} (${formatPrice(levelPrice, asset.symbol)})`,
            leftX + 6,
            ly - 3
          );
        });
      } else if (d.tool === 'channel') {
        const offsetPx = 38;
        ctx.fillStyle = `${strokeColor}16`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 + offsetPx);
        ctx.lineTo(x1, y1 + offsetPx);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.moveTo(x1, y1 + offsetPx);
        ctx.lineTo(x2, y2 + offsetPx);
        ctx.stroke();

        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1 + offsetPx / 2);
        ctx.lineTo(x2, y2 + offsetPx / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (d.tool === 'rect') {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.max(Math.abs(x2 - x1), 8);
        const rh = Math.max(Math.abs(y2 - y1), 6);
        ctx.fillStyle = `${strokeColor}22`;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (d.tool === 'long_pos' || d.tool === 'short_pos' || d.tool === 'risk_reward') {
        const isLong = d.tool === 'short_pos' ? false : (d.tool === 'long_pos' ? true : d.p2 >= d.p1);
        const entryP = d.p1;
        const targetP = d.p2;
        const stopP =
          d.p3 ??
          (isLong
            ? entryP - Math.abs(targetP - entryP) * 0.5
            : entryP + Math.abs(entryP - targetP) * 0.5);

        const yEntry = priceToY(entryP);
        const yTarget = priceToY(targetP);
        const yStop = priceToY(stopP);
        const rx = Math.min(x1, x2);
        const rw = Math.max(Math.abs(x2 - x1), 120);
        const midX = rx + rw / 2;

        const reward = Math.abs(targetP - entryP);
        const risk = Math.max(Math.abs(entryP - stopP), 0.00001);
        const rr = (reward / risk).toFixed(2);
        const tpPct = ((reward / entryP) * 100).toFixed(2);
        const slPct = ((risk / entryP) * 100).toFixed(2);

        // 1. Profit / Reward Zone Rectangle (Green)
        const topYProfit = Math.min(yEntry, yTarget);
        const hProfit = Math.max(Math.abs(yTarget - yEntry), 4);
        ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.13)';
        ctx.fillRect(rx, topYProfit, rw, hProfit);
        ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.65)' : 'rgba(5, 150, 105, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, topYProfit, rw, hProfit);

        // 2. Risk / Loss Zone Rectangle (Red)
        const topYLoss = Math.min(yEntry, yStop);
        const hLoss = Math.max(Math.abs(yStop - yEntry), 4);
        ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.13)';
        ctx.fillRect(rx, topYLoss, rw, hLoss);
        ctx.strokeStyle = isDark ? 'rgba(239, 68, 68, 0.65)' : 'rgba(225, 29, 72, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, topYLoss, rw, hLoss);

        // 3. 'TP' (Take Profit) Line & Tag
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(rx, yTarget);
        ctx.lineTo(rx + rw, yTarget);
        ctx.stroke();
        ctx.setLineDash([]);

        const tpText = `TP: ${formatPrice(targetP, asset.symbol)} (+${tpPct}%)`;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        const tpTextW = ctx.measureText(tpText).width + 12;
        ctx.fillStyle = isDark ? 'rgba(11, 15, 23, 0.92)' : 'rgba(255, 255, 255, 0.94)';
        ctx.fillRect(rx + 6, yTarget - 16, tpTextW, 15);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 6, yTarget - 16, tpTextW, 15);
        ctx.fillStyle = '#10B981';
        ctx.textAlign = 'left';
        ctx.fillText(tpText, rx + 12, yTarget - 4);

        // 4. 'SL' (Stop Loss) Line & Tag
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(rx, yStop);
        ctx.lineTo(rx + rw, yStop);
        ctx.stroke();
        ctx.setLineDash([]);

        const slText = `SL: ${formatPrice(stopP, asset.symbol)} (-${slPct}%)`;
        const slTextW = ctx.measureText(slText).width + 12;
        ctx.fillStyle = isDark ? 'rgba(11, 15, 23, 0.92)' : 'rgba(255, 255, 255, 0.94)';
        ctx.fillRect(rx + 6, yStop + 2, slTextW, 15);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 6, yStop + 2, slTextW, 15);
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'left';
        ctx.fillText(slText, rx + 12, yStop + 14);

        // 5. 'ENTRY' Line & Tag
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(rx, yEntry);
        ctx.lineTo(rx + rw, yEntry);
        ctx.stroke();

        const entryText = `${isLong ? 'BUY' : 'SELL'} @ ${formatPrice(entryP, asset.symbol)}`;
        const entryTextW = ctx.measureText(entryText).width + 12;
        ctx.fillStyle = isDark ? 'rgba(11, 15, 23, 0.92)' : 'rgba(255, 255, 255, 0.94)';
        ctx.fillRect(rx + 6, yEntry - 8, entryTextW, 16);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 6, yEntry - 8, entryTextW, 16);
        ctx.fillStyle = '#38BDF8';
        ctx.textAlign = 'left';
        ctx.fillText(entryText, rx + 12, yEntry + 4);

        // 6. Dynamic Center Risk/Reward Ratio Label Card
        const cardW = 146;
        const cardH = 34;
        const cardX = midX - cardW / 2;
        const cardY = yEntry - cardH / 2;

        ctx.save();
        ctx.fillStyle = isDark ? 'rgba(11, 15, 23, 0.95)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = isSelected
          ? '#38BDF8'
          : isDark
          ? 'rgba(148, 163, 184, 0.4)'
          : 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = isSelected ? 1.5 : 1;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(cardX, cardY, cardW, cardH, 6);
        } else {
          ctx.rect(cardX, cardY, cardW, cardH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillStyle =
          Number(rr) >= 2.0 ? '#10B981' : Number(rr) >= 1.0 ? '#38BDF8' : '#F59E0B';
        ctx.fillText(`⚖️ R:R 1 : ${rr}`, midX, cardY + 12);

        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.fillStyle = textMuted;
        ctx.fillText(`TP: +${tpPct}% | SL: -${slPct}%`, midX, cardY + 26);
        ctx.restore();

        // 7. Interactive Handles when Selected
        if (isSelected) {
          // TP handle (green)
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(midX, yTarget, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // SL handle (red)
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(midX, yStop, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Width handle (sky)
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(rx + rw, yEntry, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Left entry anchor (sky)
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(rx, yEntry, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (d.tool === 'measure') {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.max(Math.abs(x2 - x1), 10);
        const rh = Math.max(Math.abs(y2 - y1), 10);
        const diff = d.p2 - d.p1;
        const pct = (diff / Math.max(d.p1, 0.0001)) * 100;

        ctx.fillStyle = pct >= 0 ? 'rgba(56, 189, 248, 0.18)' : 'rgba(244, 63, 94, 0.18)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = pct >= 0 ? '#0284C7' : '#E11D48';
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.setLineDash([]);

        const badge = `${diff >= 0 ? '+' : ''}${formatPrice(diff, asset.symbol)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = textStrong;
        ctx.textAlign = 'center';
        ctx.fillText(badge, rx + rw / 2, ry + rh / 2 + 4);
      } else if (d.tool === 'text') {
        const noteText = d.label || 'ចំណុចសំខាន់';
        ctx.font = '600 12px "Plus Jakarta Sans", "Kantumruy Pro", sans-serif';
        const tw = ctx.measureText(noteText).width + 16;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(x1, y1 - 22, tw, 24);
        ctx.strokeStyle = strokeColor;
        ctx.strokeRect(x1, y1 - 22, tw, 24);
        ctx.fillStyle = textStrong;
        ctx.textAlign = 'left';
        ctx.fillText(noteText, x1 + 8, y1 - 6);
      }

      // Draw anchor handles for other tools
      if (d.tool !== 'risk_reward' && d.tool !== 'long_pos' && d.tool !== 'short_pos') {
        ctx.fillStyle = isSelected ? '#F59E0B' : bgCanvas;
        ctx.beginPath();
        ctx.arc(x1, y1, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (d.tool !== 'horizontal' && d.tool !== 'text') {
          ctx.beginPath();
          ctx.arc(x2, y2, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    });

    // 8. Live Market Price & Exness Bid / Ask Horizontal Lines & Axis Badges
    const latestPrice = asset.price;
    const latestY = priceToY(latestPrice);
    const bidY = priceToY(exnessQuote.bid);
    const askY = priceToY(exnessQuote.ask);

    if (showExnessBidAskLines) {
      // Exness ASK Line (Emerald)
      if (askY >= 0 && askY <= mainPaneH) {
        ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.75)' : 'rgba(5, 150, 105, 0.75)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, askY);
        ctx.lineTo(chartW, askY);
        ctx.stroke();
      }
      // Exness BID Line (Rose)
      if (bidY >= 0 && bidY <= mainPaneH) {
        ctx.strokeStyle = isDark ? 'rgba(244, 63, 94, 0.75)' : 'rgba(225, 29, 72, 0.75)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, bidY);
        ctx.lineTo(chartW, bidY);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else if (latestY >= 0 && latestY <= mainPaneH) {
      const isUp = asset.change24h >= 0;
      const liveColor = isUp ? bullColor : bearColor;
      ctx.strokeStyle = liveColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, latestY);
      ctx.lineTo(chartW, latestY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore(); // End Main Pane Clip

    // Live Price / Exness Bid-Ask Tags on Right Axis
    if (showExnessBidAskLines && Math.abs(askY - bidY) >= 16) {
      if (askY >= 8 && askY <= mainPaneH - 8) {
        ctx.fillStyle = bullColor; // Green for BUY / ឡើង
        ctx.fillRect(chartW, askY - 8, rightAxisWidth, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`▲ ${formatPrice(exnessQuote.ask, asset.symbol)}`, chartW + 3, askY + 3);
      }
      if (bidY >= 8 && bidY <= mainPaneH - 8) {
        ctx.fillStyle = bearColor; // Red for SELL / ចុះ
        ctx.fillRect(chartW, bidY - 8, rightAxisWidth, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`▼ ${formatPrice(exnessQuote.bid, asset.symbol)}`, chartW + 3, bidY + 3);
      }
    } else if (latestY >= 8 && latestY <= mainPaneH - 8) {
      const isUp = asset.change24h >= 0;
      ctx.fillStyle = isUp ? bullColor : bearColor;
      ctx.fillRect(chartW, latestY - 10, rightAxisWidth, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(latestPrice, asset.symbol), chartW + 6, latestY + 4);
    }

    // 9. Sub-Pane Divider & Sub-Pane Rendering (RSI / MACD / Volume)
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, subPaneTop);
    ctx.lineTo(dimensions.width, subPaneTop);
    ctx.stroke();

    // Extract all RSI alerts for this symbol
    const rsiAlerts = activeAlerts.filter(
      (a) =>
        a.symbol === asset.symbol &&
        (a.condition === 'rsi_overbought' ||
          a.condition === 'rsi_oversold' ||
          a.condition === 'rsi_channel_breakout')
    );

    const hasActiveRsiAlert = rsiAlerts.some(
      (a) => a.status === 'active' || a.status === 'triggered'
    );

    const isRsiActive = (indicators.includes('RSI') || hasActiveRsiAlert) && Boolean(computedIndicators.rsi);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, subPaneTop, chartW, subPaneH);
    ctx.clip();

    if (isRsiActive && computedIndicators.rsi) {
      const y70 = subPaneTop + subPaneH - (70 / 100) * (subPaneH - 16) - 8;
      const y30 = subPaneTop + subPaneH - (30 / 100) * (subPaneH - 16) - 8;
      ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.07)' : 'rgba(124, 58, 237, 0.07)';
      ctx.fillRect(0, y70, chartW, y30 - y70);

      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.3)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(chartW, y70);
      ctx.moveTo(0, y30);
      ctx.lineTo(chartW, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      const lastRsi = computedIndicators.rsi[activeGlobalIdx] ?? 50;

      // Check if any active alert is currently triggered or meeting trigger condition
      const triggeredAlert = rsiAlerts.find((al) => {
        if (al.status === 'triggered') return true;
        if (al.status !== 'active') return false;
        if (al.condition === 'rsi_overbought') {
          return lastRsi >= (al.threshold || 70);
        }
        if (al.condition === 'rsi_oversold') {
          return lastRsi <= (al.threshold || 30);
        }
        if (al.condition === 'rsi_channel_breakout') {
          let lower = al.rsiLowerBound ?? 45;
          let upper = al.rsiUpperBound ?? 65;
          let dir = al.rsiBreakoutDirection ?? 'above';
          if (al.note && al.note.includes('[RSI_CHANNEL:')) {
            const m = al.note.match(/\[RSI_CHANNEL:\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*(above|below|both)\]/i);
            if (m) {
              lower = parseFloat(m[1]);
              upper = parseFloat(m[2]);
              dir = m[3] as any;
            }
          }
          if (dir === 'above') return lastRsi >= upper;
          if (dir === 'below') return lastRsi <= lower;
          return lastRsi >= upper || lastRsi <= lower;
        }
        return false;
      });

      // Extract user-selected trigger color if available
      let triggerColor: string | undefined = triggeredAlert?.rsiTriggerColor;
      if (!triggerColor && triggeredAlert?.note && triggeredAlert.note.includes('[RSI_COLOR:')) {
        const cm = triggeredAlert.note.match(/\[RSI_COLOR:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*\]/i);
        if (cm) triggerColor = cm[1];
      }

      const defaultRsiColor = isDark ? '#A855F7' : '#7C3AED';
      const effectiveRsiColor = triggerColor || defaultRsiColor;

      ctx.save();
      ctx.strokeStyle = effectiveRsiColor;
      ctx.lineWidth = triggerColor ? 2.4 : 1.6;
      if (triggerColor) {
        ctx.shadowColor = triggerColor;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      renderedCandles.forEach(({ gIdx, x }, i) => {
        const val = computedIndicators.rsi![gIdx] ?? 50;
        const y = subPaneTop + subPaneH - (val / 100) * (subPaneH - 16) - 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = effectiveRsiColor;
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `RSI(14): ${lastRsi.toFixed(1)}${triggerColor ? ' ⚡ ALERT TRIGGERED' : ''}`,
        10,
        subPaneTop + 14
      );

      // Render active RSI(14) technical indicator alert lines inside the RSI sub-pane
      rsiAlerts
        .filter((a) => a.status === 'active' || a.status === 'triggered')
        .forEach((al) => {
          let customColor = al.rsiTriggerColor;
          if (!customColor && al.note && al.note.includes('[RSI_COLOR:')) {
            const cm = al.note.match(/\[RSI_COLOR:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*\]/i);
            if (cm) customColor = cm[1];
          }

          if (al.condition === 'rsi_overbought' || al.condition === 'rsi_oversold') {
            const isOverbought = al.condition === 'rsi_overbought';
            const rsiTarget = Math.min(
              99,
              Math.max(1, al.threshold || (isOverbought ? 70 : 30))
            );
            const ry = subPaneTop + subPaneH - (rsiTarget / 100) * (subPaneH - 16) - 8;
            const defaultLineColor = isOverbought ? '#EF4444' : '#10B981';
            const lineColor = customColor || defaultLineColor;

            // 1. Subtle trigger zone shading for visual clarity
            ctx.save();
            if (isOverbought) {
              ctx.fillStyle = customColor ? `${customColor}15` : 'rgba(239, 68, 68, 0.08)';
              ctx.fillRect(0, subPaneTop, chartW, Math.max(0, ry - subPaneTop));
            } else {
              ctx.fillStyle = customColor ? `${customColor}15` : 'rgba(16, 185, 129, 0.08)';
              ctx.fillRect(0, ry, chartW, Math.max(0, subPaneTop + subPaneH - ry));
            }

            // 2. High-visibility dashed horizontal line at the RSI threshold across the chart
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([7, 4]);
            ctx.beginPath();
            ctx.moveTo(0, ry);
            ctx.lineTo(chartW, ry);
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. Visual Confirmation Pill / Badge on the dashed line
            const badgeText = `🔔 RSI ${isOverbought ? '≥' : '≤'} ${rsiTarget} (${isOverbought ? 'Overbought' : 'Oversold'} Alert)`;
            ctx.font = '600 10px "JetBrains Mono", monospace';
            const textMetrics = ctx.measureText(badgeText);
            const badgeW = textMetrics.width + 16;
            const badgeH = 18;
            const badgeX = Math.max(10, chartW - badgeW - 10);
            const badgeY = Math.max(subPaneTop + 2, Math.min(subPaneTop + subPaneH - badgeH - 2, ry - badgeH / 2));

            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') {
              (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
            } else {
              ctx.rect(badgeX, badgeY, badgeW, badgeH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = lineColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, badgeX + 8, badgeY + badgeH / 2);
            ctx.restore();
          } else if (al.condition === 'rsi_channel_breakout') {
            let lower = al.rsiLowerBound ?? 45;
            let upper = al.rsiUpperBound ?? 65;
            if (al.note && al.note.includes('[RSI_CHANNEL:')) {
              const m = al.note.match(/\[RSI_CHANNEL:\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*(above|below|both)\]/i);
              if (m) {
                lower = parseFloat(m[1]);
                upper = parseFloat(m[2]);
              }
            }
            const yUpper = subPaneTop + subPaneH - (upper / 100) * (subPaneH - 16) - 8;
            const yLower = subPaneTop + subPaneH - (lower / 100) * (subPaneH - 16) - 8;
            const lineColor = customColor || '#8B5CF6';

            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.4;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(0, yUpper);
            ctx.lineTo(chartW, yUpper);
            ctx.moveTo(0, yLower);
            ctx.lineTo(chartW, yLower);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = lineColor;
            ctx.font = '600 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`🔔 Ceiling ${upper}`, chartW - 8, yUpper - 3);
            ctx.fillText(`🔔 Floor ${lower}`, chartW - 8, yLower + 10);
          }
        });
    } else if (indicators.includes('MACD') && computedIndicators.macd) {
      const { macd, signal, histogram } = computedIndicators.macd;
      let maxAbs = 0.0001;
      for (let i = 0; i < renderedCandles.length; i++) {
        const idx = renderedCandles[i].gIdx;
        maxAbs = Math.max(
          maxAbs,
          Math.abs(macd[idx] || 0),
          Math.abs(signal[idx] || 0),
          Math.abs(histogram[idx] || 0)
        );
      }
      const zeroY = subPaneTop + subPaneH / 2;
      const barW = Math.max(2, Math.min(candleStep * 0.6, 12));

      renderedCandles.forEach(({ gIdx, x }) => {
        const hVal = histogram[gIdx] || 0;
        const barH = (hVal / maxAbs) * (subPaneH * 0.4);
        ctx.fillStyle = hVal >= 0 ? 'rgba(16, 185, 129, 0.55)' : 'rgba(239, 68, 68, 0.55)';
        ctx.fillRect(x - barW / 2, hVal >= 0 ? zeroY - barH : zeroY, barW, Math.abs(barH));
      });

      const drawSubLine = (arr: number[], col: string) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        renderedCandles.forEach(({ gIdx, x }, i) => {
          const val = arr[gIdx] || 0;
          const y = zeroY - (val / maxAbs) * (subPaneH * 0.42);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };
      drawSubLine(macd, isDark ? '#38BDF8' : '#0284C7');
      drawSubLine(signal, isDark ? '#F59E0B' : '#D97706');

      ctx.fillStyle = isDark ? '#38BDF8' : '#0284C7';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `MACD(12,26,9): ${(macd[activeGlobalIdx] || 0).toFixed(2)}`,
        10,
        subPaneTop + 14
      );
    } else {
      let maxVol = 1;
      renderedCandles.forEach(({ candle: c }) => {
        if (c.volume > maxVol) maxVol = c.volume;
      });
      const barW = Math.max(2, Math.min(candleStep * 0.68, 16));
      renderedCandles.forEach(({ candle: c, x }) => {
        const isBull = c.close >= c.open;
        const h = (c.volume / maxVol) * (subPaneH - 22);
        ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.42)' : 'rgba(239, 68, 68, 0.42)';
        ctx.fillRect(x - barW / 2, subPaneTop + subPaneH - h, barW, h);
      });
      ctx.fillStyle = textMuted;
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `VOL: ${activeCandle ? Math.round(activeCandle.volume).toLocaleString() : '0'}`,
        10,
        subPaneTop + 14
      );
    }

    ctx.restore();

    // Right & Bottom Axis Border Lines
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(chartW, 0);
    ctx.lineTo(chartW, dimensions.height);
    ctx.moveTo(0, totalChartH);
    ctx.lineTo(dimensions.width, totalChartH);
    ctx.stroke();

    // Right Axis Ticks & Badges for RSI Sub-Pane
    if (isRsiActive) {
      const y70 = subPaneTop + subPaneH - (70 / 100) * (subPaneH - 16) - 8;
      const y30 = subPaneTop + subPaneH - (30 / 100) * (subPaneH - 16) - 8;
      const y50 = subPaneTop + subPaneH - (50 / 100) * (subPaneH - 16) - 8;

      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = textMuted;
      ctx.fillText('70', chartW + 6, y70 + 3);
      ctx.fillText('50', chartW + 6, y50 + 3);
      ctx.fillText('30', chartW + 6, y30 + 3);

      // Render active RSI alert threshold badges directly on the right axis
      rsiAlerts
        .filter(
          (a) =>
            (a.status === 'active' || a.status === 'triggered') &&
            (a.condition === 'rsi_overbought' || a.condition === 'rsi_oversold')
        )
        .forEach((al) => {
          let customColor = al.rsiTriggerColor;
          if (!customColor && al.note && al.note.includes('[RSI_COLOR:')) {
            const cm = al.note.match(/\[RSI_COLOR:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*\]/i);
            if (cm) customColor = cm[1];
          }
          const isOverbought = al.condition === 'rsi_overbought';
          const rsiTarget = Math.min(
            99,
            Math.max(1, al.threshold || (isOverbought ? 70 : 30))
          );
          const ry = subPaneTop + subPaneH - (rsiTarget / 100) * (subPaneH - 16) - 8;
          const lineColor = customColor || (isOverbought ? '#EF4444' : '#10B981');

          ctx.fillStyle = lineColor;
          ctx.fillRect(chartW + 2, ry - 8, rightAxisWidth - 4, 16);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`RSI ${rsiTarget}`, chartW + rightAxisWidth / 2, ry);
        });
    }

    // 10. Interactive Crosshair & Axis Readouts
    if (mousePos && mousePos.x <= chartW && mousePos.y <= totalChartH) {
      ctx.strokeStyle = isDark ? 'rgba(226, 232, 240, 0.35)' : 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, totalChartH);
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartW, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (mousePos.y <= mainPaneH) {
        const hoverPrice = yToPrice(mousePos.y);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(chartW, mousePos.y - 10, rightAxisWidth, 20);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(chartW, mousePos.y - 10, rightAxisWidth, 20);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(formatPrice(hoverPrice, asset.symbol), chartW + 6, mousePos.y + 4);
      } else if (isRsiActive) {
        const hoverRsi = Math.max(
          0,
          Math.min(100, Math.round((1 - (mousePos.y - subPaneTop - 8) / (subPaneH - 16)) * 100))
        );
        ctx.fillStyle = '#7C3AED';
        ctx.fillRect(chartW + 2, mousePos.y - 8, rightAxisWidth - 4, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`RSI ${hoverRsi}`, chartW + rightAxisWidth / 2, mousePos.y);
      }

      const hoverTimeSec = xToTime(mousePos.x);
      const hoverDate = new Date(hoverTimeSec * 1000);
      const label = timeframe.endsWith('s')
        ? hoverDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : timeframe === '1M' || timeframe === '3M' || timeframe === '6M' || timeframe === '1Y'
        ? hoverDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          })
        : hoverDate.toLocaleString('en-GB', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
      const bw = 104;
      const bx = Math.min(Math.max(mousePos.x - bw / 2, 2), chartW - bw - 2);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(bx, totalChartH + 2, bw, 20);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(bx, totalChartH + 2, bw, 20);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + bw / 2, totalChartH + 15);
    }
  }, [
    dimensions,
    theme,
    renderedCandles,
    visibleCount,
    scrollOffset,
    chartW,
    mainPaneH,
    subPaneTop,
    subPaneH,
    totalChartH,
    candleStep,
    priceToY,
    yToPrice,
    timeToX,
    xToTime,
    chartType,
    indicators,
    computedIndicators,
    activeAlerts,
    drawings,
    draftDrawing,
    selectedDrawingId,
    asset,
    compareAsset,
    compareCandles,
    comparePriceToY,
    yToComparePrice,
    activeCompareCandle,
    timeframe,
    mousePos,
    activeCandle,
    activeGlobalIdx,
    exnessQuote,
    showExnessBidAskLines,
    candleIntervalSec,
    mt5Positions,
    volumeProfileData,
  ]);

  // Helper to check distance from point (px, py) to segment (x1, y1)-(x2, y2)
  const distToSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  const startFreePan = (x: number, y: number) => {
    const currentCenter = lockedPriceBounds
      ? lockedPriceBounds.center
      : (autoPriceBounds.min + autoPriceBounds.max) / 2;
    const currentSpan = lockedPriceBounds
      ? lockedPriceBounds.span
      : autoPriceBounds.max - autoPriceBounds.min;

    panRef.current = {
      active: true,
      startX: x,
      startY: y,
      startScrollOffset: scrollOffset,
      startPriceCenter: currentCenter,
      startPriceSpan: currentSpan,
    };
    setLockedPriceBounds({ center: currentCenter, span: currentSpan });
    setIsPanning(true);
  };

  // Mouse handlers for drawing, selecting, resizing, and 2D free panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (contextMenu) {
      setContextMenu(null);
    }
    // Ignore right-click or middle-click so right-clicking a drawn trendline opens the context menu cleanly
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Check Sub-Pane Horizontal Divider Drag (Resize Main Chart vs Oscillator Height)
    if (x <= chartW && Math.abs(y - subPaneTop) <= 6) {
      setAxisDragMode('divider');
      setAxisDragStartCoord(y);
      setAxisDragStartVal(mainPaneRatio);
      return;
    }

    // 2. Check Right Price Axis Drag (Scale Vertical Price Range Up/Down)
    if (x > chartW && y <= mainPaneH) {
      setAxisDragMode('price');
      setAxisDragStartCoord(y);
      setAxisDragStartVal(priceScaleZoom);
      return;
    }

    // 3. Check Bottom Time Axis Drag (Scale Horizontal Visible Candles Left/Right)
    if (y > totalChartH && x <= chartW) {
      setAxisDragMode('time');
      setAxisDragStartCoord(x);
      setAxisDragStartVal(visibleCount);
      return;
    }

    if (x > chartW || y > mainPaneH) {
      // Allow horizontal & vertical panning when dragging inside the sub-pane
      if (x <= chartW && y <= totalChartH) {
        startFreePan(x, y);
      }
      return;
    }

    const clickTime = xToTime(x);
    const clickPrice = yToPrice(y);

    if (activeTool === 'cursor') {
      // Check if user grabbed a drawing anchor or drawing body
      for (let i = drawings.length - 1; i >= 0; i--) {
        const d = drawings[i];
        const x1 = timeToX(d.t1);
        const y1 = priceToY(d.p1);
        const x2 = timeToX(d.t2);
        const y2 = priceToY(d.p2);

        // Dedicated hit testing for Risk/Reward tools (TP line, SL line, Entry, Width, Body)
        if (d.tool === 'risk_reward' || d.tool === 'long_pos' || d.tool === 'short_pos') {
          const isLong = d.tool === 'short_pos' ? false : (d.tool === 'long_pos' ? true : d.p2 >= d.p1);
          const entryP = d.p1;
          const targetP = d.p2;
          const stopP =
            d.p3 ??
            (isLong
              ? entryP - Math.abs(targetP - entryP) * 0.5
              : entryP + Math.abs(entryP - targetP) * 0.5);

          const yEntry = priceToY(entryP);
          const yTarget = priceToY(targetP);
          const yStop = priceToY(stopP);
          const rx = Math.min(x1, x2);
          const rw = Math.max(Math.abs(x2 - x1), 120);
          const midX = rx + rw / 2;

          // 1. Check Take Profit (TP) handle or line
          if (
            Math.hypot(x - midX, y - yTarget) <= 14 ||
            (Math.abs(y - yTarget) <= 8 && x >= rx - 4 && x <= rx + rw + 4)
          ) {
            onSelectDrawing(d.id);
            setDraggingDrawingState({
              drawing: d,
              handle: 'target',
              startX: x,
              startY: y,
            });
            return;
          }

          // 2. Check Stop Loss (SL) handle or line
          if (
            Math.hypot(x - midX, y - yStop) <= 14 ||
            (Math.abs(y - yStop) <= 8 && x >= rx - 4 && x <= rx + rw + 4)
          ) {
            onSelectDrawing(d.id);
            setDraggingDrawingState({
              drawing: d,
              handle: 'stop',
              startX: x,
              startY: y,
            });
            return;
          }

          // 3. Check Width / Time handle at right edge
          if (Math.hypot(x - (rx + rw), y - yEntry) <= 14) {
            onSelectDrawing(d.id);
            setDraggingDrawingState({
              drawing: d,
              handle: 'width',
              startX: x,
              startY: y,
            });
            return;
          }

          // 4. Check Entry line or center label card
          if (
            (Math.abs(y - yEntry) <= 9 && x >= rx && x <= rx + rw) ||
            (Math.abs(x - midX) <= 75 && Math.abs(y - yEntry) <= 20)
          ) {
            onSelectDrawing(d.id);
            setDraggingDrawingState({
              drawing: d,
              handle: 'entry',
              startX: x,
              startY: y,
            });
            return;
          }

          // 5. Check Rectangle Body hit (inside either Profit or Loss rectangle) to move the whole setup
          const minY = Math.min(yTarget, yStop, yEntry) - 4;
          const maxY = Math.max(yTarget, yStop, yEntry) + 4;
          if (x >= rx - 6 && x <= rx + rw + 6 && y >= minY && y <= maxY) {
            onSelectDrawing(d.id);
            setDraggingDrawingState({
              drawing: d,
              handle: 'move',
              startX: x,
              startY: y,
            });
            return;
          }
        }

        const distP1 = Math.hypot(x - x1, y - y1);
        const distP2 = Math.hypot(x - x2, y - y2);

        if (distP1 <= 11) {
          onSelectDrawing(d.id);
          setDraggingDrawingState({
            drawing: d,
            handle: d.tool === 'horizontal' || d.tool === 'text' ? 'move' : 'p1',
            startX: x,
            startY: y,
          });
          return;
        }

        if (d.tool !== 'horizontal' && d.tool !== 'text' && distP2 <= 11) {
          onSelectDrawing(d.id);
          setDraggingDrawingState({
            drawing: d,
            handle: 'p2',
            startX: x,
            startY: y,
          });
          return;
        }

        let bodyHit = false;
        if (d.tool === 'horizontal') {
          bodyHit = Math.abs(y - y1) <= 7;
        } else if (d.tool === 'text') {
          bodyHit = x >= x1 - 4 && x <= x1 + 140 && y >= y1 - 24 && y <= y1 + 4;
        } else if (
          d.tool === 'rect' ||
          d.tool === 'fib' ||
          d.tool === 'measure'
        ) {
          const minX = Math.min(x1, x2) - 6;
          const maxX = Math.max(x1, x2) + 6;
          const minY = Math.min(y1, y2) - 6;
          const maxY = Math.max(y1, y2) + 6;
          bodyHit = x >= minX && x <= maxX && y >= minY && y <= maxY;
        } else {
          bodyHit = distToSegment(x, y, x1, y1, x2, y2) <= 9;
        }

        if (bodyHit) {
          onSelectDrawing(d.id);
          setDraggingDrawingState({
            drawing: d,
            handle: 'move',
            startX: x,
            startY: y,
          });
          return;
        }
      }

      onSelectDrawing(null);
      startFreePan(x, y);
      return;
    }

    // Dedicated single-click placement for Risk/Reward Ratio tool
    if (activeTool === 'risk_reward' || activeTool === 'long_pos' || activeTool === 'short_pos') {
      const isShort = activeTool === 'short_pos';
      const intervalSec = getIntervalSeconds(timeframe);
      const t2Calc = clickTime + intervalSec * 24;
      const tpDist = clickPrice * 0.024; // +2.4% TP
      const slDist = clickPrice * 0.012; // -1.2% SL
      const targetPrice = isShort ? clickPrice - tpDist : clickPrice + tpDist;
      const stopPrice = isShort ? clickPrice + slDist : clickPrice - slDist;

      const created: ChartDrawing = {
        id: `draw_${Date.now()}`,
        tool: activeTool,
        t1: clickTime,
        p1: Number(clickPrice.toPrecision(7)),
        t2: t2Calc,
        p2: Number(targetPrice.toPrecision(7)),
        p3: Number(stopPrice.toPrecision(7)),
        color: isShort ? '#EF4444' : '#10B981',
        label: 'R:R 1:2.00',
      };
      onAddDrawing(created);
      onSelectDrawing(created.id);
      return;
    }

    if (activeTool === 'horizontal') {
      const created: ChartDrawing = {
        id: `draw_${Date.now()}`,
        tool: 'horizontal',
        t1: clickTime,
        p1: Number(clickPrice.toPrecision(7)),
        t2: clickTime,
        p2: Number(clickPrice.toPrecision(7)),
        color: '#D97706',
      };
      onAddDrawing(created);
      onSelectDrawing(created.id);
      return;
    }

    if (activeTool === 'text') {
      setTextPromptPos({ t: clickTime, p: Number(clickPrice.toPrecision(7)), x, y });
      setTextInputVal('');
      return;
    }

    if (!draftDrawing) {
      const colorMap: Record<string, string> = {
        risk_reward: '#0284C7',
        trendline: '#0284C7',
        fib: '#7C3AED',
        channel: '#059669',
        rect: '#D97706',
        long_pos: '#059669',
        short_pos: '#DC2626',
        measure: '#0284C7',
      };
      setDraftDrawing({
        id: `draw_${Date.now()}`,
        tool: activeTool,
        t1: clickTime,
        p1: Number(clickPrice.toPrecision(7)),
        t2: clickTime,
        p2: Number((clickPrice * 1.005).toPrecision(7)),
        color: colorMap[activeTool] || '#0284C7',
      });
    } else {
      const completed: ChartDrawing = {
        ...draftDrawing,
        t2: clickTime,
        p2: Number(clickPrice.toPrecision(7)),
      };
      onAddDrawing(completed);
      onSelectDrawing(completed.id);
      setDraftDrawing(null);
    }
  };

  // Right-click handler on canvas: detects drawn Trendlines and opens 'Set Price Alert' context menu
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (draftDrawing) {
      setDraftDrawing(null);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x > chartW || y > mainPaneH) {
      setContextMenu(null);
      return;
    }

    const latestCandleTime =
      candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000);
    const clickTime = xToTime(x);

    // 1. Check direct hit on any drawn Trendline (including its projected ray to latest candle)
    let matchedTrendline: ChartDrawing | null = null;
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      if (d.tool !== 'trendline') continue;
      const x1 = timeToX(d.t1);
      const y1 = priceToY(d.p1);
      const x2 = timeToX(d.t2);
      const y2 = priceToY(d.p2);

      const segDist = distToSegment(x, y, x1, y1, x2, y2);
      const projX = timeToX(latestCandleTime);
      const projY = priceToY(getTrendlinePriceAtTime(d, latestCandleTime));
      const rightEndX = d.t2 >= d.t1 ? x2 : x1;
      const rightEndY = d.t2 >= d.t1 ? y2 : y1;
      const projDist = distToSegment(x, y, rightEndX, rightEndY, projX, projY);

      if (segDist <= 16 || projDist <= 14) {
        matchedTrendline = d;
        break;
      }
    }

    // 2. Fallback: if a trendline is currently selected and user right-clicks near it
    if (!matchedTrendline && selectedDrawingId) {
      const sel = drawings.find((d) => d.id === selectedDrawingId && d.tool === 'trendline');
      if (sel) {
        const x1 = timeToX(sel.t1);
        const y1 = priceToY(sel.p1);
        const x2 = timeToX(sel.t2);
        const y2 = priceToY(sel.p2);
        if (distToSegment(x, y, x1, y1, x2, y2) <= 36) {
          matchedTrendline = sel;
        }
      }
    }

    if (matchedTrendline) {
      onSelectDrawing(matchedTrendline.id);
      const linePriceAtLatest = Number(
        getTrendlinePriceAtTime(matchedTrendline, latestCandleTime).toPrecision(7)
      );
      const linePriceAtCursor = Number(
        getTrendlinePriceAtTime(matchedTrendline, clickTime).toPrecision(7)
      );
      setContextMenu({
        x,
        y,
        drawing: matchedTrendline,
        linePriceAtCursor,
        linePriceAtLatest,
      });
    } else {
      setContextMenu(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // 1. Sub-pane divider drag
    if (axisDragMode === 'divider') {
      const nextRatio = Math.min(0.86, Math.max(0.45, y / Math.max(totalChartH, 100)));
      setMainPaneRatio(nextRatio);
      return;
    }

    // 2. Right price axis vertical zoom drag
    if (axisDragMode === 'price') {
      const dy = y - axisDragStartCoord;
      const factor = Math.exp(dy * 0.0065);
      setPriceScaleZoom(Math.min(4.0, Math.max(0.2, axisDragStartVal * factor)));
      return;
    }

    // 3. Bottom time axis horizontal zoom drag (8 to 365 candles)
    if (axisDragMode === 'time') {
      const dx = x - axisDragStartCoord;
      const deltaCandles = Math.round(dx * 0.55);
      const nextCount = Math.min(
        maxVisibleCount,
        Math.max(minVisibleCount, axisDragStartVal + deltaCandles)
      );
      setVisibleCount(nextCount);
      return;
    }

    // 4. Dragging or Resizing an Existing Technical Drawing
    if (draggingDrawingState && onUpdateDrawing) {
      const { drawing, handle, startX, startY } = draggingDrawingState;
      if (
        drawing.tool === 'risk_reward' ||
        drawing.tool === 'long_pos' ||
        drawing.tool === 'short_pos'
      ) {
        const curPrice = Number(yToPrice(y).toPrecision(7));
        const curTime = xToTime(x);
        if (handle === 'target') {
          onUpdateDrawing({
            ...drawing,
            p2: curPrice,
          });
          return;
        } else if (handle === 'stop') {
          onUpdateDrawing({
            ...drawing,
            p3: curPrice,
          });
          return;
        } else if (handle === 'entry') {
          const dp = curPrice - drawing.p1;
          onUpdateDrawing({
            ...drawing,
            p1: curPrice,
            p2: Number((drawing.p2 + dp).toPrecision(7)),
            p3: drawing.p3 !== undefined ? Number((drawing.p3 + dp).toPrecision(7)) : undefined,
          });
          return;
        } else if (handle === 'width') {
          onUpdateDrawing({
            ...drawing,
            t2: curTime,
          });
          return;
        } else if (handle === 'move') {
          const dt = xToTime(x) - xToTime(startX);
          const dp = yToPrice(y) - yToPrice(startY);
          onUpdateDrawing({
            ...drawing,
            t1: drawing.t1 + dt,
            p1: Number((drawing.p1 + dp).toPrecision(7)),
            t2: drawing.t2 + dt,
            p2: Number((drawing.p2 + dp).toPrecision(7)),
            p3: drawing.p3 !== undefined ? Number((drawing.p3 + dp).toPrecision(7)) : undefined,
          });
          return;
        }
      }

      if (handle === 'p1') {
        onUpdateDrawing({
          ...drawing,
          t1: xToTime(x),
          p1: Number(yToPrice(y).toPrecision(7)),
        });
      } else if (handle === 'p2') {
        onUpdateDrawing({
          ...drawing,
          t2: xToTime(x),
          p2: Number(yToPrice(y).toPrecision(7)),
        });
      } else {
        const dt = xToTime(x) - xToTime(startX);
        const dp = yToPrice(y) - yToPrice(startY);
        onUpdateDrawing({
          ...drawing,
          t1: drawing.t1 + dt,
          p1: Number((drawing.p1 + dp).toPrecision(7)),
          t2: drawing.t2 + dt,
          p2: Number((drawing.p2 + dp).toPrecision(7)),
          p3: drawing.p3 !== undefined ? Number((drawing.p3 + dp).toPrecision(7)) : undefined,
        });
      }
      return;
    }

    // 5. 1:1 Free 2D Chart Panning (Candles stay 100% locked where dragged — middle, left, right, top, bottom)
    if (panRef.current && panRef.current.active) {
      const deltaX = x - panRef.current.startX;
      const deltaY = y - panRef.current.startY;
      const candlesDelta = deltaX / Math.max(candleStep, 1);
      setScrollOffset(clampScroll(panRef.current.startScrollOffset + candlesDelta));

      const effectiveSpan = panRef.current.startPriceSpan * priceScaleZoom;
      const priceDelta = (deltaY / Math.max(mainPaneH - 28, 1)) * effectiveSpan;
      setLockedPriceBounds({
        center: panRef.current.startPriceCenter + priceDelta,
        span: panRef.current.startPriceSpan,
      });
      return;
    }

    if (draftDrawing && x <= chartW && y <= mainPaneH) {
      setDraftDrawing({
        ...draftDrawing,
        t2: xToTime(x),
        p2: Number(yToPrice(y).toPrecision(7)),
      });
    }
  };

  const handleMouseUp = () => {
    if (draftDrawing) {
      const x1 = timeToX(draftDrawing.t1);
      const y1 = priceToY(draftDrawing.p1);
      const x2 = timeToX(draftDrawing.t2);
      const y2 = priceToY(draftDrawing.p2);
      if (Math.hypot(x2 - x1, y2 - y1) > 12) {
        onAddDrawing(draftDrawing);
        onSelectDrawing(draftDrawing.id);
        setDraftDrawing(null);
      }
    }
    if (panRef.current?.active || isPanning) {
      if (panRef.current) panRef.current.active = false;
      setIsPanning(false);
    }
    if (axisDragMode !== 'none') setAxisDragMode('none');
    if (draggingDrawingState) setDraggingDrawingState(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Double-click on the right price axis resets vertical scale; double-click on canvas resets full view
    if (x > chartW) {
      setPriceScaleZoom(1);
      setLockedPriceBounds(null);
    } else {
      setPriceScaleZoom(1);
      setLockedPriceBounds(null);
      setScrollOffset(0);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Scrolling over the Right Price Axis zooms the vertical price scale
    if (x > chartW || e.altKey) {
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      setPriceScaleZoom((prev) => Math.min(4.0, Math.max(0.2, prev * factor)));
      return;
    }

    // Horizontal pan when holding Shift + Wheel or horizontal trackpad swipe
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2) {
      const step = e.deltaX / Math.max(candleStep * 0.6, 4);
      setScrollOffset((prev) => clampScroll(prev - step));
      return;
    }

    // Seamless Multi-Horizon Zoom (1s ↔ 1Y): if user zooms out past 220 candles (or zooms in below 10 candles)
    // and Auto-Horizon Zoom is active, smoothly step timeframe from Seconds up to Years!
    const nowMs = Date.now();
    if (
      autoHorizonZoom &&
      onChangeTimeframe &&
      nowMs - lastHorizonStepRef.current > 240
    ) {
      if (e.deltaY > 0 && visibleCount >= 220 && currentTfIndex < ALL_TIMEFRAMES_ORDERED.length - 1) {
        lastHorizonStepRef.current = nowMs;
        onChangeTimeframe(ALL_TIMEFRAMES_ORDERED[currentTfIndex + 1]);
        setVisibleCount(75);
        setScrollOffset(0);
        return;
      }
      if (e.deltaY < 0 && visibleCount <= 12 && currentTfIndex > 0) {
        lastHorizonStepRef.current = nowMs;
        onChangeTimeframe(ALL_TIMEFRAMES_ORDERED[currentTfIndex - 1]);
        setVisibleCount(90);
        setScrollOffset(0);
        return;
      }
    }

    // Cursor-centered smooth zoom in/out (8 to 365 candles) that preserves the candle position under cursor
    const zoomStep =
      e.deltaY > 0
        ? Math.max(5, Math.round(visibleCount * 0.14))
        : -Math.max(5, Math.round(visibleCount * 0.14));
    const nextCount = Math.min(maxVisibleCount, Math.max(minVisibleCount, visibleCount + zoomStep));
    if (nextCount !== visibleCount) {
      const cursorRatio = Math.min(1, Math.max(0, x / Math.max(chartW, 1)));
      const countDiff = nextCount - visibleCount;
      const offsetAdjust = (1 - cursorRatio) * countDiff;
      setVisibleCount(nextCount);
      setScrollOffset((prev) => clampScroll(prev - offsetAdjust));
    }
  };

  // Touch Gesture Handlers for Mobile / Tablet / Touchscreens
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const currentCenter = lockedPriceBounds
      ? lockedPriceBounds.center
      : (autoPriceBounds.min + autoPriceBounds.max) / 2;
    const currentSpan = lockedPriceBounds
      ? lockedPriceBounds.span
      : autoPriceBounds.max - autoPriceBounds.min;

    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startOffset: scrollOffset,
        startPriceCenter: currentCenter,
        startPriceSpan: currentSpan,
        startDist: null,
        startVisibleCount: visibleCount,
      };
      setLockedPriceBounds({ center: currentCenter, span: currentSpan });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStateRef.current = {
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startOffset: scrollOffset,
        startPriceCenter: currentCenter,
        startPriceSpan: currentSpan,
        startDist: Math.hypot(dx, dy),
        startVisibleCount: visibleCount,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const st = touchStateRef.current;
    if (!st) return;

    if (e.touches.length === 2 && st.startDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.max(10, Math.hypot(dx, dy));
      const scale = st.startDist / dist;
      const nextCount = Math.min(
        maxVisibleCount,
        Math.max(minVisibleCount, Math.round(st.startVisibleCount * scale))
      );
      setVisibleCount(nextCount);
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const deltaX = t.clientX - st.startX;
      const deltaY = t.clientY - st.startY;
      const candlesDelta = deltaX / Math.max(candleStep, 1);
      setScrollOffset(clampScroll(st.startOffset + candlesDelta));

      const effectiveSpan = st.startPriceSpan * priceScaleZoom;
      const priceDelta = (deltaY / Math.max(mainPaneH - 28, 1)) * effectiveSpan;
      setLockedPriceBounds({
        center: st.startPriceCenter + priceDelta,
        span: st.startPriceSpan,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current = null;
  };

  const hoverCrosshairPrice =
    mousePos && mousePos.y <= mainPaneH ? yToPrice(mousePos.y) : asset.price;

  const isCustomScaled =
    lockedPriceBounds !== null ||
    Math.abs(priceScaleZoom - 1) > 0.01 ||
    Math.abs(scrollOffset) > 0.25;

  // Dynamic cursor style depending on hover zone and drag state
  const canvasCursorClass = useMemo(() => {
    if (axisDragMode === 'divider' || (mousePos && mousePos.x <= chartW && Math.abs(mousePos.y - subPaneTop) <= 6)) {
      return 'cursor-row-resize';
    }
    if (axisDragMode === 'price' || (mousePos && mousePos.x > chartW && mousePos.y <= mainPaneH)) {
      return 'cursor-ns-resize';
    }
    if (axisDragMode === 'time' || (mousePos && mousePos.y > totalChartH && mousePos.x <= chartW)) {
      return 'cursor-ew-resize';
    }
    if (isPanning || draggingDrawingState) {
      return 'cursor-grabbing';
    }
    return activeTool === 'cursor' ? 'cursor-grab' : 'cursor-cell';
  }, [axisDragMode, mousePos, chartW, subPaneTop, mainPaneH, totalChartH, isPanning, draggingDrawingState, activeTool]);

  // Active trades for current asset symbol
  const activeSymbolPositions = useMemo(
    () => mt5Positions.filter((p) => p.symbol === asset.symbol && p.status === 'OPEN'),
    [mt5Positions, asset.symbol]
  );
  const primaryPos = activeSymbolPositions[0];
  const containerTradeClass = primaryPos
    ? primaryPos.direction === 'BUY'
      ? 'border-t-2 border-t-[#10B981] ring-1 ring-inset ring-[#10B981]/25'
      : 'border-t-2 border-t-[#EF4444] ring-1 ring-inset ring-[#EF4444]/25'
    : '';

  return (
    <div
      className={`flex flex-col flex-1 w-full h-full min-h-0 select-none overflow-hidden bg-white dark:bg-[#0B0F17] transition-all ${containerTradeClass}`}
    >
      {/* Unified Top Control Header Bar (ប្តូរផ្ទាំងបញ្ជាក្រាហ្វទាំងអស់ទៅខាងលើ) */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/95 dark:bg-[#0B0F17] px-2.5 py-1.5 flex flex-col gap-1.5 z-20">
        {/* Top Row 1: Primary Action Buttons (AI Signals, Volume Profile, Price Alert, Spike/Drop, Compare) & Live OHLC / Exness Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Group: Primary Chart Tools & Quick Actions (AI Signals, Volume Profile, Alert, Spike/Drop, Compare) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {onToggleIndicator && (
              <>
                <button
                  type="button"
                  onClick={() => onToggleIndicator('AI_SIGNALS')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                    indicators.includes('AI_SIGNALS')
                      ? 'bg-emerald-500/20 text-[#10B981] dark:text-[#10B981] border-emerald-500/45 shadow-xs ring-1 ring-emerald-500/30'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="បើក/បិទ សញ្ញាទិញ-លក់ AI ឆ្លាតវៃលើទៀនក្រាហ្វ (▲ BUY / ▼ SELL)"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>AI Signals</span>
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-extrabold ${
                      indicators.includes('AI_SIGNALS')
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {indicators.includes('AI_SIGNALS') ? 'បើក' : 'បិទ'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleIndicator('VP')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                    indicators.includes('VP')
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/45 shadow-xs ring-1 ring-amber-500/30'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-500/40 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="បើក/បិទ Volume Profile (VPVR) បង្ហាញកម្រិតបរិមាណទិញលក់តាមតម្លៃនៅខាងស្តាំ"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Volume Profile</span>
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-extrabold ${
                      indicators.includes('VP')
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {indicators.includes('VP') ? 'បើក' : 'បិទ'}
                  </span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onQuickPriceAlert(Number(hoverCrosshairPrice.toPrecision(6)))}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-800 dark:text-amber-300 text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              title="បង្កើតការជូនដំណឹងតម្លៃ (Price Alert)"
            >
              <BellPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>ដាក់ Alert តម្លៃ</span>
            </button>

            <button
              type="button"
              onClick={() => onSimulateSpike('up')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              title="សាកល្បងការហក់ឡើងតម្លៃខ្លាំងភ្លាមៗ (+2.4%)"
            >
              <Zap className="w-3 h-3 shrink-0" />
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>Spike +2.4%</span>
            </button>

            <button
              type="button"
              onClick={() => onSimulateSpike('down')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-800 dark:text-rose-300 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              title="សាកល្បងការធ្លាក់ចុះតម្លៃខ្លាំងភ្លាមៗ (-2.4%)"
            >
              <Zap className="w-3 h-3 shrink-0" />
              <TrendingDown className="w-3 h-3 shrink-0" />
              <span>Drop -2.4%</span>
            </button>

            {/* Secondary Asset Overlay Selector for Correlation Analysis */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
              <GitCompare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0 hidden sm:inline">
                ប្រៀបធៀប៖
              </span>
              <select
                value={compareAsset ? compareAsset.symbol : ''}
                onChange={(e) => setCompareSymbol(e.target.value)}
                aria-label="Overlay secondary asset for correlation analysis"
                className="bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  + ជ្រើសរើសក្រាហ្វប្រៀបធៀប (Overlay)
                </option>
                {allAssets
                  .filter((a) => a.symbol !== asset.symbol)
                  .map((a) => (
                    <option
                      key={a.symbol}
                      value={a.symbol}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {a.symbol} — {a.khmerName}
                    </option>
                  ))}
              </select>

              {compareAsset && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setOverlayScaleMode((prev) => (prev === 'dual' ? 'percent' : 'dual'))
                    }
                    className="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[10px] font-mono font-semibold text-cyan-700 dark:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
                    title="ប្តូររបៀបមាត្រដ្ឋានតម្លៃ (Dual Axis vs Relative % Performance)"
                  >
                    {overlayScaleMode === 'dual' ? 'Dual Scale' : '% Perf'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareSymbol('')}
                    className="p-0.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors"
                    title="បិទក្រាហ្វប្រៀបធៀប (Remove Overlay)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Group: Active Trade Badges + Asset / Exness Bid-Ask / Live OHLC Telemetry */}
          <div className="flex flex-wrap items-center gap-1.5">
            {activeSymbolPositions.map((pos) => {
              const isBuy = pos.direction === 'BUY';
              const closeP = isBuy ? exnessQuote.bid : exnessQuote.ask;
              const diff = isBuy ? closeP - pos.entryPrice : pos.entryPrice - closeP;
              const spec = getExnessContractSpec(pos.symbol, pos.accountType);
              const livePnL = Number(
                (
                  diff * pos.lots * spec.contractSize -
                  pos.lots * spec.commissionPerLotUSD[pos.accountType]
                ).toFixed(2)
              );
              return (
                <div
                  key={pos.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-2xs border transition-all ${
                    isBuy
                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                      : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                  }`}
                  title={`Active ${pos.direction} #${pos.ticket} ${pos.symbol} @ ${formatPrice(pos.entryPrice, asset.symbol)}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-white text-[8px] font-black ${
                      isBuy ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                    }`}
                  >
                    {isBuy ? '▲' : '▼'}
                  </span>
                  <span className="font-extrabold">{pos.direction}</span>
                  <span>{pos.lots.toFixed(2)}L</span>
                  <span className="text-[11px] opacity-80">
                    @{formatPrice(pos.entryPrice, asset.symbol)}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-black ${
                      livePnL >= 0
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : 'bg-[#EF4444]/20 text-[#EF4444]'
                    }`}
                  >
                    {livePnL >= 0 ? `+$${livePnL.toFixed(2)}` : `-$${Math.abs(livePnL).toFixed(2)}`}
                  </span>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
              <div className="flex items-center gap-1.5">
                <AssetBadgeIcon asset={asset} size="xs" />
                <span className="font-bold text-slate-900 dark:text-slate-100">{asset.symbol}</span>
              </div>
              <a
                href="https://my.exness.direct/webtrading/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFCF01]/20 hover:bg-[#FFCF01]/35 text-amber-800 dark:text-[#FFCF01] border border-[#FFCF01]/40 font-mono text-[10px] font-bold transition-colors"
                title="ភ្ជាប់ផ្ទាល់ជាមួយ Exness WebTrading (https://my.exness.direct/webtrading/)"
              >
                <span>Exness: {exnessQuote.exnessSymbol}</span>
                <span className="text-rose-500">B:{formatPrice(exnessQuote.bid, asset.symbol)}</span>
                <span className="text-emerald-500">A:{formatPrice(exnessQuote.ask, asset.symbol)}</span>
              </a>
              <span className="text-slate-400">·</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{timeframe}</span>
              {activeCandle && (
                <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
                  <span>
                    <span className="text-slate-500 mr-0.5">O</span>
                    <span className={activeCandle.close >= activeCandle.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatPrice(activeCandle.open, asset.symbol)}
                    </span>
                  </span>
                  <span>
                    <span className="text-slate-500 mr-0.5">H</span>
                    <span className={activeCandle.close >= activeCandle.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatPrice(activeCandle.high, asset.symbol)}
                    </span>
                  </span>
                  <span>
                    <span className="text-slate-500 mr-0.5">L</span>
                    <span className={activeCandle.close >= activeCandle.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatPrice(activeCandle.low, asset.symbol)}
                    </span>
                  </span>
                  <span>
                    <span className="text-slate-500 mr-0.5">C</span>
                    <span className={activeCandle.close >= activeCandle.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatPrice(activeCandle.close, asset.symbol)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Row 2: Zoom / Candle Count / 1s-to-1Y Horizon Slider / Center / Auto-Fit / Clear Drawings + Active Indicator Readout */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (visibleCount <= 14 && autoHorizonZoom && onChangeTimeframe && currentTfIndex > 0) {
                  onChangeTimeframe(ALL_TIMEFRAMES_ORDERED[currentTfIndex - 1]);
                  setVisibleCount(85);
                  setScrollOffset(0);
                  return;
                }
                const nextCount = Math.max(minVisibleCount, visibleCount - 16);
                const countDiff = nextCount - visibleCount;
                setVisibleCount(nextCount);
                setScrollOffset((prev) => clampScroll(prev - countDiff * 0.5));
              }}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md transition-colors cursor-pointer"
              title="ពង្រីកទៀនមើលជិត ដល់កម្រិតវិនាទី (Zoom In to Seconds)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Smooth Horizontal Candle Compression Slider (8 to 365 candles) */}
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <input
                type="range"
                min={minVisibleCount}
                max={maxVisibleCount}
                value={maxVisibleCount + minVisibleCount - visibleCount}
                onChange={(e) => {
                  const inverted = Number(e.target.value);
                  const nextCount = Math.min(
                    maxVisibleCount,
                    Math.max(minVisibleCount, maxVisibleCount + minVisibleCount - inverted)
                  );
                  const countDiff = nextCount - visibleCount;
                  setVisibleCount(nextCount);
                  setScrollOffset((prev) => clampScroll(prev - countDiff * 0.5));
                }}
                aria-label="បង្រួម ឬ ពង្រីកចំនួនទៀន (8 ដល់ 365 ទៀន)"
                title="អូសដើម្បីបង្រួមទៀនឱ្យតូចឃើញទូលាយ (រហូតដល់ 365 ទៀន) ឬពង្រីកមើលជិត"
                className="w-16 sm:w-20 h-1.5 accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap shrink-0">
                {visibleCount} ទៀន
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (
                  visibleCount >= 220 &&
                  autoHorizonZoom &&
                  onChangeTimeframe &&
                  currentTfIndex < ALL_TIMEFRAMES_ORDERED.length - 1
                ) {
                  onChangeTimeframe(ALL_TIMEFRAMES_ORDERED[currentTfIndex + 1]);
                  setVisibleCount(85);
                  setScrollOffset(0);
                  return;
                }
                const nextCount = Math.min(maxVisibleCount, visibleCount + 24);
                const countDiff = nextCount - visibleCount;
                setVisibleCount(nextCount);
                setScrollOffset((prev) => clampScroll(prev - countDiff * 0.5));
              }}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-md transition-colors cursor-pointer"
              title="បង្រួមទៀនមើលទូលាយ ពីវិនាទីដល់ឆ្នាំ (Zoom Out up to Years)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Master 1s-to-1Y Horizon Slider & Quick Span Buttons (បង្រួមទៀន ពីវិនាទី ដល់ ឆ្នាំ) */}
            {onChangeTimeframe && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 whitespace-nowrap shrink-0">
                  វិនាទី (1s)
                </span>
                <input
                  type="range"
                  min={0}
                  max={ALL_TIMEFRAMES_ORDERED.length - 1}
                  step={1}
                  value={currentTfIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const nextTf = ALL_TIMEFRAMES_ORDERED[idx];
                    if (nextTf) {
                      onChangeTimeframe(nextTf);
                    }
                  }}
                  aria-label="អូសបង្រួមទៀនពីវិនាទីដល់ឆ្នាំ (1s to 1Y Horizon Slider)"
                  title="អូសដើម្បីបង្រួម ឬ ពង្រីកទៀនពីកម្រិត វិនាទី (1s) រហូតដល់ ឆ្នាំ (1Y)"
                  className="w-16 sm:w-24 h-1.5 accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
                  ឆ្នាំ (1Y)
                </span>

                <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[10px] font-mono tabular-nums font-bold whitespace-nowrap shrink-0">
                  {TIMEFRAME_METADATA.find((m) => m.id === timeframe)?.khmerLabel || timeframe} ·{' '}
                  {formatVisibleDurationKhmer(visibleSpanSeconds)}
                </span>

                <button
                  type="button"
                  onClick={() => setAutoHorizonZoom((prev) => !prev)}
                  title="បើក/បិទ ការបង្រួមឆ្លងពីវិនាទីទៅឆ្នាំដោយស្វ័យប្រវត្តិពេលរំកិលកង់ម៉ៅ (Auto-Scale 1s↔1Y on Wheel Zoom)"
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    autoHorizonZoom
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                      : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  Auto 1s↔1Y
                </button>
              </div>
            )}

            {/* Vertical Price Scale Zoom +/- */}
            <div className="flex items-center rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setPriceScaleZoom((z) => Math.max(0.25, z * 0.82))}
                className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="ពង្រីកកម្ពស់តម្លៃ (Expand Vertical Price Scale)"
              >
                ↕+
              </button>
              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800" />
              <button
                type="button"
                onClick={() => setPriceScaleZoom((z) => Math.min(4.0, z * 1.22))}
                className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="បង្រួមកម្ពស់តម្លៃ (Compress Vertical Price Scale)"
              >
                ↕-
              </button>
            </div>

            {/* 1-Click Compress Full 365 Candles */}
            <button
              type="button"
              onClick={() => {
                setVisibleCount(maxVisibleCount);
                setScrollOffset(0);
              }}
              className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="បង្រួមទៀនទាំងអស់ឱ្យឃើញទូលាយបំផុតលើអេក្រង់ (Fit All Candles)"
            >
              បង្រួមអតិបរមា ({maxVisibleCount} ទៀន)
            </button>

            {/* 1-Click Center Candles on Canvas */}
            <button
              type="button"
              onClick={handleCenterCandlesOnCanvas}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="ដាក់ទៀននៅចំកណ្តាលអេក្រង់ ដោយមិនរត់ទៅវិញ (Center Candles on Screen)"
            >
              <Crosshair className="w-3 h-3" />
              <span>ដាក់កណ្តាល</span>
            </button>

            {/* Auto-Fit / Reset 2D Pan & Zoom */}
            <button
              type="button"
              onClick={() => {
                setScrollOffset(0);
                setVisibleCount(85);
                setPriceScaleZoom(1);
                setLockedPriceBounds(null);
                setMainPaneRatio(0.74);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isCustomScaled
                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="កំណត់ទំហំ និងទីតាំងក្រាហ្វមកដើមវិញ (Auto-Fit / Reset Pan & Zoom)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Auto-Fit</span>
            </button>

            {onToggleMaximize && (
              <button
                type="button"
                onClick={onToggleMaximize}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title={isMaximized ? 'បង្រួមផ្ទាំងក្រាហ្វមកធម្មតា' : 'ពង្រីកផ្ទាំងក្រាហ្វពេញអេក្រង់'}
              >
                {isMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-sky-500" />
                    <span>បង្រួមផ្ទាំង</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>ពេញអេក្រង់</span>
                  </>
                )}
              </button>
            )}

            {selectedDrawingId &&
              (() => {
                const selDrawing = drawings.find((d) => d.id === selectedDrawingId);
                const latestT =
                  candles.length > 0
                    ? candles[candles.length - 1].time
                    : Math.floor(Date.now() / 1000);
                const trendlineTargetPrice =
                  selDrawing?.tool === 'trendline'
                    ? Number(getTrendlinePriceAtTime(selDrawing, latestT).toPrecision(7))
                    : null;
                return (
                  <>
                    {selDrawing?.tool === 'trendline' && trendlineTargetPrice !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateDrawing?.({ ...selDrawing, hasAlert: true });
                          if (onSetTrendlineAlert) {
                            onSetTrendlineAlert(selDrawing, trendlineTargetPrice);
                          } else {
                            onQuickPriceAlert(trendlineTargetPrice);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="ដាក់ការជូនដំណឹងនៅពេលតម្លៃប៉ះខ្សែ Trendline នេះ (Set Price Alert on Trendline)"
                      >
                        <BellPlus className="w-3.5 h-3.5" />
                        <span>Set Price Alert (Trendline)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteDrawing(selectedDrawingId)}
                      className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>លុបគំនូរនេះ</span>
                    </button>
                  </>
                );
              })()}

            {drawings.length > 0 && (
              <button
                type="button"
                onClick={onClearDrawings}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/35 hover:border-rose-500 font-bold text-[11px] shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="សម្អាតគំនូរទាំងអស់លើក្រាហ្វ"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>សម្អាតគំនូរ ({drawings.length})</span>
              </button>
            )}
          </div>

          {/* Right Group on Row 2: Active Indicator & Correlation Telemetry Readout */}
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono tabular-nums">
            {compareAsset && activeCompareCandle && correlationStats && (
              <div className="flex flex-wrap items-center gap-2 px-2 py-0.5 rounded bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300">
                <span className="font-bold">
                  Overlay {compareAsset.symbol}: {formatPrice(activeCompareCandle.close, compareAsset.symbol)}
                </span>
                <span>·</span>
                <span>
                  Corr(r):{' '}
                  <strong
                    className={
                      correlationStats.r >= 0.5
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : correlationStats.r <= -0.5
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {correlationStats.r >= 0 ? '+' : ''}
                    {correlationStats.r.toFixed(2)}
                  </strong>{' '}
                  ({correlationStats.labelKh})
                </span>
                <span>·</span>
                <span>
                  Spread: {correlationStats.spreadPct >= 0 ? '+' : ''}
                  {correlationStats.spreadPct.toFixed(2)}%
                </span>
              </div>
            )}
            {computedIndicators.ema20 && computedIndicators.ema20[activeGlobalIdx] && (
              <span className="text-sky-600 dark:text-sky-400 font-medium whitespace-nowrap">
                EMA(20): {formatPrice(computedIndicators.ema20[activeGlobalIdx]!, asset.symbol)}
              </span>
            )}
            {computedIndicators.ema50 && computedIndicators.ema50[activeGlobalIdx] && (
              <span className="text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                EMA(50): {formatPrice(computedIndicators.ema50[activeGlobalIdx]!, asset.symbol)}
              </span>
            )}
            {computedIndicators.sma200 && computedIndicators.sma200[activeGlobalIdx] && (
              <span className="text-purple-600 dark:text-purple-400 font-medium whitespace-nowrap">
                SMA(200): {formatPrice(computedIndicators.sma200[activeGlobalIdx]!, asset.symbol)}
              </span>
            )}
            {computedIndicators.vwap && computedIndicators.vwap[activeGlobalIdx] && (
              <span className="text-pink-600 dark:text-pink-400 font-medium whitespace-nowrap">
                VWAP: {formatPrice(computedIndicators.vwap[activeGlobalIdx]!, asset.symbol)}
              </span>
            )}
            {indicators.includes('VP') && volumeProfileData && (
              <span className="text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                VP POC: {formatPrice(volumeProfileData.pocPrice, asset.symbol)} | VA: {formatPrice(volumeProfileData.valPrice, asset.symbol)}-{formatPrice(volumeProfileData.vahPrice, asset.symbol)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pure Unobstructed Interactive Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full min-h-0 overflow-hidden"
      >
        {/* Right-Click Context Menu for Drawn Trendline ('Set Price Alert') */}
        {contextMenu && (
          <div
            className="absolute z-30 w-72 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800"
            style={{
              left: Math.max(12, Math.min(contextMenu.x, chartW - 296)),
              top: Math.max(12, Math.min(contextMenu.y, mainPaneH - 185)),
            }}
          >
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <PenTool className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  ខ្សែនិន្នាការ (Trendline)
                </span>
              </div>
              <span className="text-[11px] font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
                @ {formatPrice(contextMenu.linePriceAtLatest, asset.symbol)}
              </span>
            </div>

            <div className="p-1.5 space-y-1">
              <button
                type="button"
                onClick={() => {
                  const updatedDrawing: ChartDrawing = {
                    ...contextMenu.drawing,
                    hasAlert: true,
                  };
                  onUpdateDrawing?.(updatedDrawing);
                  if (onSetTrendlineAlert) {
                    onSetTrendlineAlert(updatedDrawing, contextMenu.linePriceAtLatest);
                  } else {
                    onQuickPriceAlert(contextMenu.linePriceAtLatest);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="whitespace-nowrap">Set Price Alert</div>
                    <div className="text-[10px] font-normal text-slate-600 dark:text-slate-300">
                      ជូនដំណឹងពេលតម្លៃប៉ះខ្សែ Trendline នេះ
                    </div>
                  </div>
                </div>
                <span className="font-mono tabular-nums text-[11px] font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0">
                  {formatPrice(contextMenu.linePriceAtLatest, asset.symbol)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onQuickPriceAlert(contextMenu.linePriceAtCursor);
                  setContextMenu(null);
                }}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <BellPlus className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>កំណត់ក្នុងផ្ទាំង Alert (Customize)</span>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                  {formatPrice(contextMenu.linePriceAtCursor, asset.symbol)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteDrawing(contextMenu.drawing.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>លុបខ្សែ Trendline នេះ (Delete Line)</span>
              </button>
            </div>
          </div>
        )}

        {/* Text Annotation Input Popover */}
        {textPromptPos && (
          <div
            className="absolute z-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 shadow-xl flex items-center gap-2"
            style={{
              left: Math.min(textPromptPos.x, chartW - 240),
              top: Math.max(40, textPromptPos.y - 20),
            }}
          >
            <input
              type="text"
              value={textInputVal ?? ''}
              onChange={(e) => setTextInputVal(e.target.value)}
              placeholder="បញ្ចូលកំណត់ចំណាំលើក្រាហ្វ..."
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 w-44"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textInputVal.trim()) {
                  onAddDrawing({
                    id: `draw_${Date.now()}`,
                    tool: 'text',
                    t1: textPromptPos.t,
                    p1: textPromptPos.p,
                    t2: textPromptPos.t,
                    p2: textPromptPos.p,
                    color: '#0284C7',
                    label: textInputVal.trim().slice(0, 60),
                  });
                  setTextPromptPos(null);
                } else if (e.key === 'Escape') {
                  setTextPromptPos(null);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (textInputVal.trim()) {
                  onAddDrawing({
                    id: `draw_${Date.now()}`,
                    tool: 'text',
                    t1: textPromptPos.t,
                    p1: textPromptPos.p,
                    t2: textPromptPos.t,
                    p2: textPromptPos.p,
                    color: '#0284C7',
                    label: textInputVal.trim().slice(0, 60),
                  });
                }
                setTextPromptPos(null);
              }}
              className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded transition-colors whitespace-nowrap shrink-0"
            >
              ដាក់ចំណាំ
            </button>
          </div>
        )}

        {/* Interactive HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full h-full block touch-none ${canvasCursorClass}`}
        />
      </div>
    </div>
  );
};
