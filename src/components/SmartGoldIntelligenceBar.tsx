import React, { useState, useEffect } from 'react';
import { MarketAsset } from '../types/market';
import {
  calculateCambodiaGoldBreakdown,
  calculateSmartOilBreakdown,
  formatPrice,
  GOLD_CONVERSION,
  OIL_CONVERSION,
} from '../services/marketEngine';
import { Calculator, Coins, Flame, Gauge, Pause, Play, Scale, X } from 'lucide-react';

interface SmartGoldIntelligenceBarProps {
  assets: MarketAsset[];
  currentAsset: MarketAsset;
  onSelectSymbol: (symbol: string) => void;
  onQuickGoldAlert: (symbol: string, targetPrice: number) => void;
}

export type TickerSpeed = 'slow' | 'medium' | 'fast';

export const SPEED_CONFIG: Record<
  TickerSpeed,
  { duration: number; label: string; khmerLabel: string; speedMultiplier: string }
> = {
  slow: { duration: 68, label: 'Slow', khmerLabel: 'យឺត', speedMultiplier: '0.6x' },
  medium: { duration: 42, label: 'Medium', khmerLabel: 'មធ្យម', speedMultiplier: '1.0x' },
  fast: { duration: 22, label: 'Fast', khmerLabel: 'លឿន', speedMultiplier: '1.8x' },
};

type WeightUnit = 'damleung' | 'chi' | 'hun' | 'gram' | 'oz';
type GoldPurity = '9999' | '965' | '900' | '750';
type OilUnit = 'barrel' | 'lot' | 'minilot' | 'ton' | 'liter';
type OilBenchmark = 'USOIL' | 'UKOIL';

const PURITY_FACTORS: Record<GoldPurity, { label: string; factor: number }> = {
  '9999': { label: 'មាសគីឡូ 99.99% (24K)', factor: 1.0 },
  '965': { label: 'មាស 96.5% (ស្តង់ដារថៃ)', factor: 0.965 },
  '900': { label: 'មាសគ្រឿងអលង្ការ 90% (22K)', factor: 0.9 },
  '750': { label: 'មាសផ្លាកទីន 75% (18K)', factor: 0.75 },
};

export const SmartGoldIntelligenceBar: React.FC<SmartGoldIntelligenceBarProps> = ({
  assets,
  currentAsset,
  onSelectSymbol,
  onQuickGoldAlert,
}) => {
  const isCurrentEnergy =
    currentAsset.subCategory === 'energy' ||
    currentAsset.symbol === 'USOIL' ||
    currentAsset.symbol === 'UKOIL' ||
    currentAsset.symbol === 'NATGAS';

  const [activeMode, setActiveMode] = useState<'gold' | 'oil'>(
    isCurrentEnergy ? 'oil' : 'gold'
  );
  const [showCalc, setShowCalc] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [tickerSpeed, setTickerSpeed] = useState<TickerSpeed>(() => {
    try {
      const saved = localStorage.getItem('kramaview_ticker_speed');
      if (saved === 'slow' || saved === 'medium' || saved === 'fast') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'medium';
  });

  useEffect(() => {
    try {
      localStorage.setItem('kramaview_ticker_speed', tickerSpeed);
    } catch {
      // ignore
    }
  }, [tickerSpeed]);

  // Sync bar mode automatically when user picks an oil or gold instrument
  useEffect(() => {
    if (isCurrentEnergy) {
      setActiveMode('oil');
    } else if (currentAsset.assetClass === 'gold') {
      setActiveMode('gold');
    }
  }, [currentAsset.symbol, currentAsset.assetClass, isCurrentEnergy]);

  // Gold calculator states
  const [weightAmount, setWeightAmount] = useState<string>('1');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('damleung');
  const [purity, setPurity] = useState<GoldPurity>('9999');

  // USOIL calculator states
  const [oilQty, setOilQty] = useState<string>('10');
  const [oilUnit, setOilUnit] = useState<OilUnit>('barrel');
  const [oilBenchmark, setOilBenchmark] = useState<OilBenchmark>('USOIL');

  const goldAssets = assets.filter(
    (a) => a.assetClass === 'gold' && a.subCategory !== 'energy'
  );
  const energyAssets = assets.filter((a) => a.subCategory === 'energy');

  const spotGold = assets.find((a) => a.symbol === 'XAU/USD') || goldAssets[0];
  const spotSilver = assets.find((a) => a.symbol === 'XAG/USD');
  const comexGold = assets.find((a) => a.symbol === 'COMEX-GC');
  const wtiOil = assets.find((a) => a.symbol === 'USOIL');
  const brentOil = assets.find((a) => a.symbol === 'UKOIL');

  const spotOzPrice = spotGold ? spotGold.price : 2684.5;
  const wtiPrice = wtiOil ? wtiOil.price : 69.85;
  const brentPrice = brentOil ? brentOil.price : 73.65;

  const breakdown = calculateCambodiaGoldBreakdown(spotOzPrice);
  const oilBreakdown = calculateSmartOilBreakdown(wtiPrice, brentPrice, spotOzPrice);

  const goldSilverRatio =
    spotSilver && spotSilver.price > 0 ? spotOzPrice / spotSilver.price : 85.4;
  const comexSpread = comexGold ? comexGold.price - spotOzPrice : 13.9;

  // Smart Gold Calculator Math
  const numericGoldQty = Math.max(0, parseFloat(weightAmount) || 0);
  const unitGrams =
    weightUnit === 'damleung'
      ? GOLD_CONVERSION.DAMLEUNG_GRAMS
      : weightUnit === 'chi'
      ? GOLD_CONVERSION.CHI_GRAMS
      : weightUnit === 'hun'
      ? GOLD_CONVERSION.HUN_GRAMS
      : weightUnit === 'gram'
      ? 1
      : GOLD_CONVERSION.TROY_OZ_GRAMS;

  const totalGrams = numericGoldQty * unitGrams;
  const purityFactor = PURITY_FACTORS[purity].factor;
  const calculatedUsd = totalGrams * breakdown.perGram9999 * purityFactor;
  const calculatedKhr = Math.round((calculatedUsd * GOLD_CONVERSION.KHR_PER_USD) / 100) * 100;

  // Smart USOIL Calculator Math
  const numericOilQty = Math.max(0, parseFloat(oilQty) || 0);
  const selectedBarrelPrice = oilBenchmark === 'UKOIL' ? brentPrice : wtiPrice;
  const totalBarrels =
    oilUnit === 'barrel'
      ? numericOilQty
      : oilUnit === 'lot'
      ? numericOilQty * OIL_CONVERSION.BARRELS_PER_LOT
      : oilUnit === 'minilot'
      ? numericOilQty * 100
      : oilUnit === 'ton'
      ? numericOilQty * OIL_CONVERSION.BARRELS_PER_TON
      : numericOilQty / OIL_CONVERSION.LITERS_PER_BARREL;

  const totalLiters = totalBarrels * OIL_CONVERSION.LITERS_PER_BARREL;
  const totalOilUsd = totalBarrels * selectedBarrelPrice;
  const totalOilKhr = Math.round((totalOilUsd * OIL_CONVERSION.KHR_PER_USD) / 100) * 100;
  const pnlPerDollarMove = totalBarrels * 1.0;

  // Rich real-time ticker items that glide from right to left smoothly
  const renderTickerItems = () => {
    if (activeMode === 'gold') {
      return (
        <>
          {/* Main Gold Assets (Clickable to switch chart symbol) */}
          {goldAssets.map((g) => {
            const isSelected = g.symbol === currentAsset.symbol;
            const isUp = g.change24h >= 0;
            return (
              <button
                key={`asset-${g.symbol}`}
                type="button"
                onClick={() => onSelectSymbol(g.symbol)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/60 font-semibold shadow-2xs'
                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-amber-400/60 hover:text-slate-950 dark:hover:text-slate-100 shadow-2xs'
                }`}
                title={`ចុចដើម្បីបង្ហាញក្រាហ្វ ${g.symbol}`}
              >
                <Coins className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-semibold">{g.symbol}</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  ${formatPrice(g.price, g.symbol)}
                </span>
                <span
                  className={`text-[11px] font-semibold flex items-center ${
                    isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isUp ? '+' : ''}
                  {g.change24h.toFixed(2)}%
                </span>
              </button>
            );
          })}

          {/* Quick USOIL Shortcut Pill */}
          {wtiOil && (
            <button
              type="button"
              onClick={() => {
                setActiveMode('oil');
                onSelectSymbol('USOIL');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
              title="ប្តូរទៅក្រាហ្វប្រេងឆៅអាមេរិក USOIL (WTI Crude)"
            >
              <Flame className="w-3 h-3 text-cyan-500 shrink-0" />
              <span className="font-bold">USOIL</span>
              <span>${formatPrice(wtiOil.price, 'USOIL')}</span>
              <span
                className={
                  wtiOil.change24h >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold'
                    : 'text-rose-600 dark:text-rose-400 text-[11px] font-semibold'
                }
              >
                {wtiOil.change24h >= 0 ? '+' : ''}
                {wtiOil.change24h.toFixed(2)}%
              </span>
            </button>
          )}

          {/* Live Cambodia Gold Metrics */}
          <div
            onClick={() => {
              setWeightAmount('1');
              setWeightUnit('damleung');
              setPurity('9999');
              setShowCalc(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-amber-500/15 dark:bg-amber-500/[0.12] border border-amber-500/35 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer hover:bg-amber-500/25 transition-colors shadow-2xs"
            title="ចុចដើម្បីបើកម៉ាស៊ីនគណនាមាសដំឡឹង"
          >
            <span className="text-amber-700 dark:text-amber-300 font-sans font-semibold">១ ដំឡឹង (37.5g)៖</span>
            <strong className="text-amber-900 dark:text-amber-200 font-bold">
              ${breakdown.perDamleung9999.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              ({breakdown.perDamleungKhr.toLocaleString()} ៛)
            </span>
          </div>

          <div
            onClick={() => {
              setWeightAmount('1');
              setWeightUnit('chi');
              setPurity('9999');
              setShowCalc(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer hover:border-amber-400/50 transition-colors shadow-2xs"
            title="ចុចដើម្បីគណនាមាសជី"
          >
            <span className="text-slate-600 dark:text-slate-400 font-sans font-medium">១ ជី (3.75g)៖</span>
            <strong className="text-amber-700 dark:text-amber-300 font-bold">
              ${breakdown.perChi9999.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">
              ({Math.round((breakdown.perChi9999 * GOLD_CONVERSION.KHR_PER_USD) / 100 * 100).toLocaleString()} ៛)
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
            <span className="text-slate-600 dark:text-slate-400 font-sans">១ ហ៊ុន (0.375g)៖</span>
            <strong className="text-amber-600 dark:text-amber-400 font-bold">
              ${breakdown.perHun9999.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
            <span className="text-slate-600 dark:text-slate-400 font-sans">មាស 24K (1g)៖</span>
            <strong className="text-amber-700 dark:text-amber-300 font-bold">
              ${breakdown.perGram9999.toFixed(2)}/g
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
            <span className="text-slate-600 dark:text-slate-400 font-sans">មាស 96.5% (ថៃ)៖</span>
            <strong className="text-amber-700 dark:text-amber-300 font-bold">
              ${(breakdown.perDamleung9999 * 0.965).toFixed(2)}
            </strong>
            <span className="text-slate-400 dark:text-slate-500 text-[10px]">/ដំឡឹង</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
            <span className="text-slate-600 dark:text-slate-400 font-sans">មាស 18K ផ្លាកទីន (75%)៖</span>
            <strong className="text-amber-700 dark:text-amber-300 font-bold">
              ${breakdown.perDamleung18K.toFixed(2)}
            </strong>
            <span className="text-slate-400 dark:text-slate-500 text-[10px]">/ដំឡឹង</span>
          </div>

          {/* Ratios & Spreads */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-sky-500/10 dark:bg-sky-500/[0.08] border border-sky-500/25 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
            <span className="text-sky-600 dark:text-sky-400 font-sans">XAU/XAG Ratio៖</span>
            <strong className="text-sky-700 dark:text-sky-300 font-bold">
              {goldSilverRatio.toFixed(1)}x
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-cyan-500/10 dark:bg-cyan-500/[0.08] border border-cyan-500/25 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
            <span className="text-cyan-600 dark:text-cyan-400 font-sans">Gold / USOIL៖</span>
            <strong className="text-cyan-700 dark:text-cyan-300 font-bold">
              {oilBreakdown.goldToOilRatio.toFixed(1)} bbl/oz
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
            <span className="text-slate-600 dark:text-slate-400 font-sans">COMEX Spread៖</span>
            <strong
              className={`font-bold ${
                comexSpread >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {comexSpread >= 0 ? '+' : ''}${comexSpread.toFixed(2)}
            </strong>
          </div>
        </>
      );
    }

    // Energy / USOIL Mode items
    return (
      <>
        {energyAssets.map((eAsset) => {
          const isSelected = eAsset.symbol === currentAsset.symbol;
          const isUp = eAsset.change24h >= 0;
          return (
            <button
              key={`energy-${eAsset.symbol}`}
              type="button"
              onClick={() => onSelectSymbol(eAsset.symbol)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/25 text-cyan-900 dark:text-cyan-200 border border-cyan-500/60 font-semibold shadow-2xs'
                  : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-cyan-400/60 hover:text-slate-950 dark:hover:text-slate-100 shadow-2xs'
              }`}
              title={`ចុចដើម្បីបង្ហាញក្រាហ្វ ${eAsset.symbol}`}
            >
              <Flame className="w-3 h-3 text-cyan-500 shrink-0" />
              <span className="font-semibold">{eAsset.symbol}</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">
                ${formatPrice(eAsset.price, eAsset.symbol)}
              </span>
              <span
                className={`text-[11px] font-semibold flex items-center ${
                  isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {isUp ? '+' : ''}
                {eAsset.change24h.toFixed(2)}%
              </span>
            </button>
          );
        })}

        {/* Quick Gold Shortcut Pill */}
        {spotGold && (
          <button
            type="button"
            onClick={() => {
              setActiveMode('gold');
              onSelectSymbol('XAU/USD');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
            title="ប្តូរទៅក្រាហ្វមាសអន្តរជាតិ XAU/USD"
          >
            <Coins className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="font-bold">XAU/USD</span>
            <span>${formatPrice(spotGold.price, 'XAU/USD')}</span>
          </button>
        )}

        <div
          onClick={() => {
            setOilQty('1');
            setOilUnit('barrel');
            setShowCalc(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-cyan-500/15 dark:bg-cyan-500/[0.12] border border-cyan-500/35 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer hover:bg-cyan-500/25 transition-colors shadow-2xs"
          title="ចុចដើម្បីគណនាថ្លៃប្រេង"
        >
          <span className="text-cyan-700 dark:text-cyan-300 font-sans font-semibold">១ បារ៉ែល (159L)៖</span>
          <strong className="text-cyan-900 dark:text-cyan-200 font-bold">${wtiPrice.toFixed(2)}</strong>
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            ({Math.round((wtiPrice * OIL_CONVERSION.KHR_PER_USD) / 100 * 100).toLocaleString()} ៛)
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
          <span className="text-slate-600 dark:text-slate-400 font-sans">Brent-WTI Spread៖</span>
          <strong
            className={`font-bold ${
              oilBreakdown.brentWtiSpread >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {oilBreakdown.brentWtiSpread >= 0 ? '+' : ''}${oilBreakdown.brentWtiSpread.toFixed(2)}
          </strong>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
          <span className="text-slate-600 dark:text-slate-400 font-sans">ប្រេងឆៅ ១ លីត្រ៖</span>
          <strong className="text-slate-900 dark:text-slate-100 font-bold">
            ${oilBreakdown.rawCrudePerLiterUsd.toFixed(2)}
          </strong>
          <span className="text-slate-400 dark:text-slate-500 text-[11px]">
            ({oilBreakdown.rawCrudePerLiterKhr.toLocaleString()} ៛)
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-amber-500/10 dark:bg-amber-500/[0.08] border border-amber-500/25 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
          <span className="text-amber-600 dark:text-amber-400 font-sans">Gold / Oil Ratio៖</span>
          <strong className="text-amber-700 dark:text-amber-300 font-bold">
            {oilBreakdown.goldToOilRatio.toFixed(1)} bbl/oz
          </strong>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
          <span className="text-slate-600 dark:text-slate-400 font-sans">1 Lot (1,000 bbl)៖</span>
          <strong className="text-cyan-700 dark:text-cyan-300 font-bold">
            ${(wtiPrice * 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums bg-emerald-500/10 dark:bg-emerald-500/[0.08] border border-emerald-500/20 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 shadow-2xs">
          <span className="text-emerald-700 dark:text-emerald-300 font-sans">PnL ±$1/bbl៖</span>
          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
            ±${pnlPerDollarMove.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
      </>
    );
  };

  return (
    <div
      className={`border-b border-slate-200 dark:border-slate-800/90 px-3 py-1.5 shrink-0 transition-colors overflow-hidden ${
        activeMode === 'oil'
          ? 'bg-sky-50/75 dark:bg-cyan-500/[0.04]'
          : 'bg-amber-50/75 dark:bg-amber-500/[0.04]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Left: Mode Switcher + Live Indicator + Play/Pause Button (Pinned) */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-inherit pr-1">
          {/* Segmented Mode Switcher */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-md border border-slate-300 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveMode('gold');
                if (isCurrentEnergy) onSelectSymbol('XAU/USD');
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeMode === 'gold'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>មាសឆ្លាតវៃ</span>
              <span className="relative flex h-2 w-2 ml-0.5" title="ផ្សាយផ្ទាល់ 24/7 (Live Ticker)">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('oil');
                if (!isCurrentEnergy) onSelectSymbol('USOIL');
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeMode === 'oil'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
              <span>USOIL & ថាមពល</span>
            </button>
          </div>

          {/* Marquee Play/Pause Button */}
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer flex items-center justify-center ${
              isPaused
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
            title={isPaused ? 'បន្តចលនារត់ពីស្តាំទៅឆ្វេង (Play)' : 'ផ្អាកចលនារត់ពីស្តាំទៅឆ្វេង (Pause)'}
            aria-label={isPaused ? 'Play motion' : 'Pause motion'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* User-Selectable Marquee Speed Control (Fast, Medium, Slow) */}
          <div
            className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-md border border-slate-300 dark:border-slate-800 shadow-2xs"
            role="group"
            aria-label="Ticker speed selection"
          >
            <span
              className="pl-1.5 pr-1 text-slate-400 dark:text-slate-500 hidden sm:flex items-center gap-0.5 select-none"
              title="កម្រិតល្បឿនរត់ (Marquee Speed)"
            >
              <Gauge className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
            </span>
            {(['slow', 'medium', 'fast'] as TickerSpeed[]).map((spd) => {
              const isSelected = tickerSpeed === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setTickerSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-sans transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? activeMode === 'oil'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-2xs'
                        : 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={`ល្បឿន ${SPEED_CONFIG[spd].khmerLabel} (${SPEED_CONFIG[spd].label} - ${SPEED_CONFIG[spd].duration}s, ${SPEED_CONFIG[spd].speedMultiplier})`}
                >
                  <span>{SPEED_CONFIG[spd].khmerLabel}</span>
                  <span className="hidden xl:inline text-[9px] opacity-75 ml-0.5 font-mono">
                    ({SPEED_CONFIG[spd].speedMultiplier})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Live Scrolling Marquee running from right to left slowly */}
        <div className="flex-1 min-w-0 overflow-hidden relative group py-0.5">
          {/* Subtle gradient edge masks so items emerge seamlessly from right and fade out to left */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-1 bg-gradient-to-r from-amber-50/95 dark:from-[#0B0F17]/95 via-amber-50/50 dark:via-[#0B0F17]/50 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-1 bg-gradient-to-l from-amber-50/95 dark:from-[#0B0F17]/95 via-amber-50/50 dark:via-[#0B0F17]/50 to-transparent" />

          {/* Continuous Infinite Track (Rendered twice for seamless loop) */}
          <div
            className={`animate-marquee-slow items-center gap-3 select-none ${
              isPaused ? 'is-paused' : ''
            }`}
            style={{ animationDuration: `${SPEED_CONFIG[tickerSpeed].duration}s` }}
            title="ដាក់ Mouse លើដើម្បីផ្អាកអានតម្លៃ ឬចុចជ្រើសរើស Asset"
          >
            {/* Track 1 */}
            <div className="flex items-center gap-2.5 shrink-0">
              {renderTickerItems()}
            </div>
            {/* Track 2 (Seamless loop duplicate) */}
            <div className="flex items-center gap-2.5 shrink-0" aria-hidden="true">
              {renderTickerItems()}
            </div>
          </div>
        </div>

        {/* Right: Context-Aware Calculator Toggle (Pinned) */}
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-inherit pl-1">
          <button
            type="button"
            onClick={() => setShowCalc((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-sans font-medium transition-colors whitespace-nowrap cursor-pointer shadow-2xs ${
              activeMode === 'oil'
                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-800 dark:text-cyan-300'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeMode === 'oil' ? 'គណនាថ្លៃប្រេង USOIL' : 'គណនាហាងឆេងមាស'}
            </span>
            <span className="sm:hidden">គណនា</span>
          </button>
        </div>
      </div>

      {/* Expandable Smart Calculator Drawer (Gold OR USOIL depending on activeMode) */}
      {showCalc && activeMode === 'gold' && (
        <div className="mt-2 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-white dark:bg-slate-950/75 rounded-lg p-3 shadow-xs">
          <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 mr-1">
              <Scale className="w-4 h-4" />
              <span>គណនាទម្ងន់ និងទឹកមាស៖</span>
            </div>

            <input
              type="number"
              step="any"
              min="0.01"
              value={weightAmount ?? ''}
              onChange={(e) => setWeightAmount(e.target.value)}
              className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />

            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="damleung">ដំឡឹង (37.5g)</option>
              <option value="chi">ជី (3.75g)</option>
              <option value="hun">ហ៊ុន (0.375g)</option>
              <option value="gram">ក្រាម (Gram)</option>
              <option value="oz">អោន (Troy Oz 31.1g)</option>
            </select>

            <select
              value={purity}
              onChange={(e) => setPurity(e.target.value as GoldPurity)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {Object.entries(PURITY_FACTORS).map(([k, val]) => (
                <option key={k} value={k}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1.5">ទម្ងន់សរុប៖</span>
              <strong className="text-slate-900 dark:text-slate-200">{totalGrams.toFixed(2)} ក្រាម</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1.5">តម្លៃសរុប (USD)៖</span>
              <strong className="text-amber-700 dark:text-amber-400 text-sm">
                ${calculatedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1.5">គិតជាប្រាក់រៀល៖</span>
              <strong className="text-emerald-600 dark:text-emerald-400">
                {calculatedKhr.toLocaleString()} ៛
              </strong>
            </div>
          </div>

          <div className="lg:col-span-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectSymbol('GOLD-KH');
                onQuickGoldAlert(
                  'GOLD-KH',
                  Number((breakdown.perDamleung9999 * 1.005).toFixed(2))
                );
              }}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              ដាក់ Alert មាសដំឡឹង
            </button>
            <button
              type="button"
              onClick={() => setShowCalc(false)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded"
              title="បិទ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showCalc && activeMode === 'oil' && (
        <div className="mt-2 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-white dark:bg-slate-950/75 rounded-lg p-3 shadow-xs">
          <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 mr-1">
              <Flame className="w-4 h-4" />
              <span>គណនាប្រេងឆៅ USOIL៖</span>
            </div>

            <input
              type="number"
              step="any"
              min="0.01"
              value={oilQty ?? ''}
              onChange={(e) => setOilQty(e.target.value)}
              className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />

            <select
              value={oilUnit}
              onChange={(e) => setOilUnit(e.target.value as OilUnit)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="barrel">បារ៉ែល (Barrel = 159 លីត្រ)</option>
              <option value="lot">កុងត្រាស្តង់ដារ (1 Lot = 1,000 បារ៉ែល)</option>
              <option value="minilot">កុងត្រាតូច (Mini = 100 បារ៉ែល)</option>
              <option value="ton">តោនប្រេងឆៅ (Ton ≈ 7.33 បារ៉ែល)</option>
              <option value="liter">លីត្រ (Liters)</option>
            </select>

            <select
              value={oilBenchmark}
              onChange={(e) => setOilBenchmark(e.target.value as OilBenchmark)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="USOIL">USOIL (WTI Crude ${wtiPrice.toFixed(2)})</option>
              <option value="UKOIL">UKOIL (Brent Crude ${brentPrice.toFixed(2)})</option>
            </select>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1.5">បរិមាណសរុប៖</span>
              <strong className="text-slate-900 dark:text-slate-200">
                {totalBarrels.toFixed(2)} bbl ({Math.round(totalLiters).toLocaleString()}L)
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1.5">តម្លៃសរុប (USD)៖</span>
              <strong className="text-cyan-700 dark:text-cyan-400 text-sm">
                ${totalOilUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
            <div title="ផលចំណេញ/ខាត រាល់ពេលតម្លៃប្រេងប្រែប្រួល $1.00 ក្នុង ១ បារ៉ែល">
              <span className="text-slate-500 dark:text-slate-400 font-sans mr-1">±$1/bbl PnL៖</span>
              <strong className="text-emerald-600 dark:text-emerald-400">
                ±${pnlPerDollarMove.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalOilKhr.toLocaleString()} ៛)
              </strong>
            </div>
          </div>

          <div className="lg:col-span-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectSymbol(oilBenchmark);
                onQuickGoldAlert(
                  oilBenchmark,
                  Number((selectedBarrelPrice * 1.01).toFixed(2))
                );
              }}
              className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              ដាក់ Alert {oilBenchmark}
            </button>
            <button
              type="button"
              onClick={() => setShowCalc(false)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded"
              title="បិទ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
