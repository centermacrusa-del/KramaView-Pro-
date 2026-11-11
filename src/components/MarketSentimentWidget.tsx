import React, { useMemo } from 'react';
import { AssetClass, MarketAsset } from '../types/market';
import { ArrowDownRight, ArrowUpRight, Gauge } from 'lucide-react';

interface MarketSentimentWidgetProps {
  assets: MarketAsset[];
  assetFilter: 'ALL' | AssetClass;
  onSelectSymbol: (symbol: string) => void;
}

export const MarketSentimentWidget: React.FC<MarketSentimentWidgetProps> = ({
  assets,
  assetFilter,
  onSelectSymbol,
}) => {
  const targetAssets = useMemo(() => {
    if (assetFilter === 'ALL') return assets;
    const filtered = assets.filter((a) => a.assetClass === assetFilter);
    return filtered.length > 0 ? filtered : assets;
  }, [assets, assetFilter]);

  const sentiment = useMemo(() => {
    const total = Math.max(targetAssets.length, 1);
    let advancing = 0;
    let declining = 0;
    let weightedMomentumSum = 0;
    let rangeStrengthSum = 0;

    let topGainer = targetAssets[0];
    let topLoser = targetAssets[0];

    for (const item of targetAssets) {
      if (item.change24h >= 0) advancing++;
      else declining++;

      weightedMomentumSum += item.change24h;

      const span = Math.max(item.high24h - item.low24h, item.price * 0.001, 0.0001);
      const pos = Math.min(1, Math.max(0, (item.price - item.low24h) / span));
      rangeStrengthSum += pos;

      if (!topGainer || item.change24h > topGainer.change24h) {
        topGainer = item;
      }
      if (!topLoser || item.change24h < topLoser.change24h) {
        topLoser = item;
      }
    }

    // 1. Breadth component (0 - 100)
    const breadthScore = (advancing / total) * 100;

    // 2. Price momentum component (0 - 100) using smooth hyperbolic tangent scaling
    const avgChangePct = weightedMomentumSum / total;
    const momentumScore = (Math.tanh(avgChangePct / 2.4) + 1) * 50;

    // 3. Intraday 24h High-Low range position component (0 - 100)
    const rangeScore = (rangeStrengthSum / total) * 100;

    // Composite Fear & Greed Index (0 - 100)
    const rawScore = breadthScore * 0.35 + momentumScore * 0.4 + rangeScore * 0.25;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    let zoneEn = 'Neutral';
    let zoneKh = 'អព្យាក្រឹត (Neutral)';
    let biasLabel = 'តុល្យភាពទីផ្សារ';
    let colorClass = 'text-amber-600 dark:text-amber-400';
    let strokeHex = '#F59E0B';

    if (score <= 24) {
      zoneEn = 'Extreme Fear';
      zoneKh = 'ភ័យខ្លាចខ្លាំង (Extreme Fear)';
      biasLabel = 'ទំនោរលក់ចុះខ្លាំង (Strong Bearish)';
      colorClass = 'text-rose-600 dark:text-rose-400';
      strokeHex = '#F43F5E';
    } else if (score <= 44) {
      zoneEn = 'Fear';
      zoneKh = 'ភ័យខ្លាច (Fear)';
      biasLabel = 'ទំនោរធ្លាក់ចុះ (Bearish)';
      colorClass = 'text-orange-600 dark:text-orange-400';
      strokeHex = '#FB923C';
    } else if (score >= 75) {
      zoneEn = 'Extreme Greed';
      zoneKh = 'លោភលន់ខ្លាំង (Extreme Greed)';
      biasLabel = 'ទំនោរទិញឡើងខ្លាំង (Strong Bullish)';
      colorClass = 'text-emerald-600 dark:text-emerald-400';
      strokeHex = '#10B981';
    } else if (score >= 56) {
      zoneEn = 'Greed';
      zoneKh = 'លោភលន់ (Greed)';
      biasLabel = 'ទំនោរឡើងថ្លៃ (Bullish)';
      colorClass = 'text-emerald-600 dark:text-emerald-400';
      strokeHex = '#34D399';
    }

    return {
      score,
      zoneEn,
      zoneKh,
      biasLabel,
      colorClass,
      strokeHex,
      advancing,
      declining,
      avgChangePct,
      rangeScore: Math.round(rangeScore),
      topGainer,
      topLoser,
    };
  }, [targetAssets]);

  // Needle angle: -90deg (score 0, left) to +90deg (score 100, right)
  const needleAngleDeg = -90 + (sentiment.score / 100) * 180;
  const scopeLabel =
    assetFilter === 'ALL'
      ? 'ទីផ្សារទាំងមូល'
      : assetFilter === 'gold'
      ? 'មាស & លោហៈ'
      : assetFilter === 'crypto'
      ? 'គ្រីបតូ'
      : 'ភាគហ៊ុន';

  return (
    <div className="p-3 bg-white dark:bg-slate-900/45 shrink-0 space-y-2 transition-colors">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Gauge className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            អារម្មណ៍ទីផ្សារ (Market Sentiment)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
          {scopeLabel}
        </span>
      </div>

      {/* Main Gauge + Sentiment Telemetry Row */}
      <div className="flex items-center gap-3 pt-0.5">
        {/* Semi-Circular Fear & Greed SVG Dial */}
        <div className="relative w-28 h-16 shrink-0 flex flex-col items-center justify-end">
          <svg viewBox="0 0 120 68" className="w-28 h-16 overflow-visible">
            {/* Background Track Arc */}
            <path
              d="M 12 58 A 48 48 0 0 1 108 58"
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* 5-Zone Segmented Color Arcs (Extreme Fear -> Fear -> Neutral -> Greed -> Extreme Greed) */}
            <path
              d="M 12 58 A 48 48 0 0 1 21.2 29.8"
              fill="none"
              stroke="#F43F5E"
              strokeWidth="9"
              strokeLinecap="butt"
            />
            <path
              d="M 22.8 27.6 A 48 48 0 0 1 45.2 12.3"
              fill="none"
              stroke="#FB923C"
              strokeWidth="9"
              strokeLinecap="butt"
            />
            <path
              d="M 47.6 11.6 A 48 48 0 0 1 72.4 11.6"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="9"
              strokeLinecap="butt"
            />
            <path
              d="M 74.8 12.3 A 48 48 0 0 1 97.2 27.6"
              fill="none"
              stroke="#34D399"
              strokeWidth="9"
              strokeLinecap="butt"
            />
            <path
              d="M 98.8 29.8 A 48 48 0 0 1 108 58"
              fill="none"
              stroke="#10B981"
              strokeWidth="9"
              strokeLinecap="butt"
            />

            {/* Dynamic Gauge Needle */}
            <g transform={`translate(60, 58) rotate(${needleAngleDeg})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-38"
                stroke={sentiment.strokeHex}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="0" cy="0" r="4" fill={sentiment.strokeHex} />
            </g>
          </svg>

          {/* Numerical Index Score inside Dial */}
          <div className="absolute bottom-0 inset-x-0 text-center leading-none">
            <span className={`text-sm font-mono tabular-nums font-bold ${sentiment.colorClass}`}>
              {sentiment.score}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">/100</span>
          </div>
        </div>

        {/* Right Breakdown Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className={`text-xs font-bold truncate ${sentiment.colorClass}`}>
            {sentiment.zoneKh}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
            {sentiment.biasLabel}
          </div>

          {/* Advancers / Decliners / 24h Range Strength */}
          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums pt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ▲ {sentiment.advancing} ឡើង
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              ▼ {sentiment.declining} ចុះ
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-slate-600 dark:text-slate-400" title="មធ្យមភាគតម្លៃក្នុងប្រអប់ 24 ម៉ោង">
              កម្លាំង {sentiment.rangeScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Breadth Bar & Top Bullish / Bearish Movers */}
      <div className="space-y-1.5 pt-0.5">
        <div className="h-1.5 w-full rounded-full bg-rose-500/25 dark:bg-rose-950/80 overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{
              width: `${Math.round(
                (sentiment.advancing / Math.max(sentiment.advancing + sentiment.declining, 1)) * 100
              )}%`,
            }}
          />
        </div>

        {sentiment.topGainer && sentiment.topLoser && (
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
            <button
              type="button"
              onClick={() => onSelectSymbol(sentiment.topGainer.symbol)}
              className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline truncate"
              title="ចុចដើម្បីមើលក្រាហ្វដែលឡើងខ្លាំងជាងគេ"
            >
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              <span className="font-semibold">{sentiment.topGainer.symbol}</span>
              <span>
                +{ Math.max(0, sentiment.topGainer.change24h).toFixed(2)}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectSymbol(sentiment.topLoser.symbol)}
              className="flex items-center gap-1 text-rose-700 dark:text-rose-400 hover:underline truncate"
              title="ចុចដើម្បីមើលក្រាហ្វដែលធ្លាក់ខ្លាំងជាងគេ"
            >
              <ArrowDownRight className="w-3 h-3 shrink-0" />
              <span className="font-semibold">{sentiment.topLoser.symbol}</span>
              <span>
                {sentiment.topLoser.change24h >= 0 ? '+' : ''}
                {sentiment.topLoser.change24h.toFixed(2)}%
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
