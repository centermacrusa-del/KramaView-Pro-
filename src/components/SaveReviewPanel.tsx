import React, { useState } from 'react';
import {
  ChartDrawing,
  ChartType,
  IndicatorId,
  MarketAsset,
  SavedAnalysisRecord,
  Timeframe,
} from '../types/market';
import { formatPrice } from '../services/marketEngine';
import {
  BookmarkPlus,
  Check,
  Eye,
  FileText,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
} from 'lucide-react';
import { Language, t } from '../services/i18n';

interface SaveReviewPanelProps {
  currentAsset: MarketAsset;
  allAssets: MarketAsset[];
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorId[];
  drawings: ChartDrawing[];
  savedAnalyses: SavedAnalysisRecord[];
  isSaving: boolean;
  language?: Language;
  onSaveAnalysis: (data: {
    title: string;
    targetPrice: number;
    stopLossPrice: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    notes: string;
  }) => Promise<void>;
  onLoadAnalysis: (record: SavedAnalysisRecord) => void;
  onUpdateAnalysisNotes: (record: SavedAnalysisRecord, newNotes: string) => Promise<void>;
  onDeleteAnalysis: (id: string) => Promise<void>;
}

export const SaveReviewPanel: React.FC<SaveReviewPanelProps> = ({
  currentAsset,
  allAssets,
  timeframe,
  indicators,
  drawings,
  savedAnalyses,
  isSaving,
  language = 'km',
  onSaveAnalysis,
  onLoadAnalysis,
  onUpdateAnalysisNotes,
  onDeleteAnalysis,
}) => {
  const [title, setTitle] = useState('');
  const [direction, setDirection] = useState<'bullish' | 'bearish' | 'neutral'>('bullish');
  const [targetPrice, setTargetPrice] = useState<string>(() =>
    (currentAsset.price * 1.04).toPrecision(6)
  );
  const [stopLossPrice, setStopLossPrice] = useState<string>(() =>
    (currentAsset.price * 0.98).toPrecision(6)
  );
  const [notes, setNotes] = useState('');
  const [filterSymbol, setFilterSymbol] = useState<'ALL' | 'CURRENT'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Detect active Risk/Reward tool from chart drawings
  const activeRRDrawing = React.useMemo(() => {
    return drawings.find(
      (d) => d.tool === 'risk_reward' || d.tool === 'long_pos' || d.tool === 'short_pos'
    );
  }, [drawings]);

  const activeRRInfo = React.useMemo(() => {
    if (!activeRRDrawing) return null;
    const isLong =
      activeRRDrawing.tool === 'short_pos'
        ? false
        : activeRRDrawing.tool === 'long_pos'
        ? true
        : activeRRDrawing.p2 >= activeRRDrawing.p1;
    const entry = activeRRDrawing.p1;
    const target = activeRRDrawing.p2;
    const stop =
      activeRRDrawing.p3 ??
      (isLong
        ? entry - Math.abs(target - entry) * 0.5
        : entry + Math.abs(entry - target) * 0.5);
    const reward = Math.abs(target - entry);
    const risk = Math.max(Math.abs(entry - stop), 0.00001);
    const ratio = (reward / risk).toFixed(2);
    return {
      isLong,
      entry,
      target,
      stop,
      reward,
      risk,
      ratio,
    };
  }, [activeRRDrawing]);

  // Dynamic live R:R ratio calculation based on current form inputs and asset price
  const tpNum = parseFloat(targetPrice) || 0;
  const slNum = parseFloat(stopLossPrice) || 0;
  const formReward = tpNum > 0 ? Math.abs(tpNum - currentAsset.price) : 0;
  const formRisk = slNum > 0 ? Math.max(Math.abs(currentAsset.price - slNum), 0.00001) : 0;
  const dynamicFormRR = formRisk > 0 && formReward > 0 ? (formReward / formRisk).toFixed(2) : '1.00';

  React.useEffect(() => {
    if (activeRRInfo) {
      setTargetPrice(activeRRInfo.target.toPrecision(6));
      setStopLossPrice(activeRRInfo.stop.toPrecision(6));
      setDirection(activeRRInfo.isLong ? 'bullish' : 'bearish');
    } else if (!title) {
      setTargetPrice((currentAsset.price * 1.04).toPrecision(6));
      setStopLossPrice((currentAsset.price * 0.98).toPrecision(6));
    }
  }, [currentAsset.symbol, currentAsset.price, activeRRInfo, title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle =
      title.trim() || `${currentAsset.symbol} (${timeframe}) — ការវិភាគបច្ចេកទេស`;
    const tp = parseFloat(targetPrice) || currentAsset.price * 1.03;
    const sl = parseFloat(stopLossPrice) || currentAsset.price * 0.98;

    await onSaveAnalysis({
      title: cleanTitle,
      targetPrice: tp,
      stopLossPrice: sl,
      direction,
      notes: notes.trim() || 'រក្សាទុកទិន្នន័យក្រាហ្វ និងគំនូរបច្ចេកទេសសម្រាប់ត្រួតពិនិត្យក្រោយ។',
    });

    setTitle('');
    setNotes('');
  };

  const filteredRecords = savedAnalyses.filter((item) =>
    filterSymbol === 'ALL' ? true : item.symbol === currentAsset.symbol
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/80">
      {/* Form to Save Current Chart Snapshot & Technical Setup */}
      <form onSubmit={handleSubmit} className="p-3.5 space-y-3 bg-slate-50/80 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {t('save.currentTitle', language)} ({currentAsset.symbol})
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {language === 'km' ? 'គំនូរ' : 'Drawings'}: {drawings.length} · Indicators: {indicators.length}
          </span>
        </div>

        <div>
          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
            {t('save.analysisTitle', language)}
          </label>
          <input
            type="text"
            value={title ?? ''}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={`e.g. ${currentAsset.symbol} Support & Resistance (${timeframe})`}
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Directional Bias Selector */}
        <div>
          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
            {t('save.marketBias', language)}
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-white dark:bg-slate-950 p-1 rounded-md border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDirection('bullish')}
              className={`flex items-center justify-center gap-1 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                direction === 'bullish'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('save.bullish', language)}</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection('bearish')}
              className={`flex items-center justify-center gap-1 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                direction === 'bearish'
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{t('save.bearish', language)}</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection('neutral')}
              className={`flex items-center justify-center gap-1 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                direction === 'neutral'
                  ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>{t('save.neutral', language)}</span>
            </button>
          </div>
        </div>

        {/* Active Risk/Reward Tool Setup Detected on Chart */}
        {activeRRInfo && (
          <div className="flex items-center justify-between p-2 rounded-md bg-sky-500/10 border border-sky-500/30 text-[11px]">
            <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-medium">
              <Scale className="w-3.5 h-3.5 shrink-0 text-sky-500" />
              <span>
                ឧបករណ៍ R:R លើក្រាហ្វ៖ <strong>1:{activeRRInfo.ratio}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTargetPrice(activeRRInfo.target.toPrecision(6));
                setStopLossPrice(activeRRInfo.stop.toPrecision(6));
                setDirection(activeRRInfo.isLong ? 'bullish' : 'bearish');
              }}
              className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-[10px] transition-colors"
            >
              បញ្ចូលតម្លៃ TP/SL
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
              តម្លៃគោលដៅ (Take Profit)
            </label>
            <input
              type="number"
              step="any"
              value={targetPrice ?? ''}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
              កាត់ខាត (Stop Loss)
            </label>
            <input
              type="number"
              step="any"
              value={stopLossPrice ?? ''}
              onChange={(e) => setStopLossPrice(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-rose-600 dark:text-rose-400 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Dynamic Risk/Reward Ratio Calculation Pill */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono tabular-nums">
          <span className="text-slate-500">ផលធៀប R:R គណនាជាក់ស្តែង៖</span>
          <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-sky-500" />
            1 : {dynamicFormRR}
          </span>
        </div>

        <div>
          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
            កំណត់ហេតុវិភាគសម្រាប់ពិនិត្យក្រោយ (Analysis Notes)
          </label>
          <textarea
            rows={2}
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="កត់ត្រាមូលហេតុនៃការចូលទិញ/លក់ ខ្សែ Trendline ឬកម្រិត Fibonacci..."
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
        >
          <BookmarkPlus className="w-4 h-4" />
          <span>{isSaving ? t('save.saving', language) : t('save.button', language)}</span>
        </button>
      </form>

      {/* Saved Analyses List for Later Review */}
      <div className="p-3.5 space-y-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {t('save.listTitle', language)} ({filteredRecords.length})
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFilterSymbol('ALL')}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors whitespace-nowrap shrink-0 ${
                filterSymbol === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              ទាំងអស់
            </button>
            <button
              type="button"
              onClick={() => setFilterSymbol('CURRENT')}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors whitespace-nowrap shrink-0 ${
                filterSymbol === 'CURRENT'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {currentAsset.symbol}
            </button>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-8 text-center space-y-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg px-4">
            <FileText className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              មិនទាន់មានទិន្នន័យវិភាគត្រូវបានរក្សាទុកនៅឡើយទេ
            </p>
            <p className="text-[11px] text-slate-500">
              គូរខ្សែបច្ចេកទេសលើក្រាហ្វ រួចចុចប៊ូតុង &ldquo;រក្សាទុកទិន្នន័យវិភាគនេះ&rdquo; ដើម្បីតាមដានលទ្ធផលនៅពេលក្រោយ។
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRecords.map((rec) => {
              const liveAsset =
                allAssets.find((a) => a.symbol === rec.symbol) || currentAsset;
              const livePrice = liveAsset.price;
              const perfPct =
                ((livePrice - rec.savedPrice) / Math.max(rec.savedPrice, 0.0001)) * 100;

              const hitTarget =
                rec.direction === 'bullish'
                  ? livePrice >= rec.targetPrice
                  : rec.direction === 'bearish'
                  ? livePrice <= rec.targetPrice
                  : false;

              const hitStop =
                rec.direction === 'bullish'
                  ? livePrice <= rec.stopLossPrice
                  : rec.direction === 'bearish'
                  ? livePrice >= rec.stopLossPrice
                  : false;

              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2"
                >
                  {/* Card Header: Title + Unboxed Metadata */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {rec.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                          {rec.symbol}
                        </span>
                        <span>·</span>
                        <span>{rec.timeframe}</span>
                        <span>·</span>
                        <span
                          className={
                            rec.direction === 'bullish'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : rec.direction === 'bearish'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {rec.direction === 'bullish'
                            ? 'ទិសដៅឡើង'
                            : rec.direction === 'bearish'
                            ? 'ទិសដៅចុះ'
                            : 'រង់ចាំមើល'}
                        </span>
                        <span>·</span>
                        <span>គំនូរ {rec.drawings.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onLoadAnalysis(rec)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0"
                        title="ផ្ទុកក្រាហ្វ និងគំនូរបច្ចេកទេសនេះឡើងវិញ"
                      >
                        <Eye className="w-3 h-3" />
                        <span>បើកលើក្រាហ្វ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAnalysis(rec.id)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                        title="លុប"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Post-Save Performance Comparison Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/70 text-[11px] font-mono tabular-nums">
                    <div>
                      <span className="block text-slate-500 font-sans text-[10px]">
                        តម្លៃពេលរក្សាទុក
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {formatPrice(rec.savedPrice, rec.symbol)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-sans text-[10px]">
                        តម្លៃបច្ចុប្បន្ន
                      </span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {formatPrice(livePrice, rec.symbol)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-slate-500 font-sans text-[10px]">
                        បម្រែបម្រួល
                      </span>
                      <span
                        className={
                          perfPct >= 0
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-rose-600 dark:text-rose-400 font-semibold'
                        }
                      >
                        {perfPct >= 0 ? '+' : ''}
                        {perfPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Target / Stop-Loss & Dynamic R:R Audit Row */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>
                      TP: <strong className="text-emerald-600 dark:text-emerald-400">{formatPrice(rec.targetPrice, rec.symbol)}</strong>
                      {' · '}
                      SL: <strong className="text-rose-600 dark:text-rose-400">{formatPrice(rec.stopLossPrice, rec.symbol)}</strong>
                      {rec.savedPrice && rec.targetPrice && rec.stopLossPrice && (
                        <>
                          {' · '}
                          <span className="text-sky-600 dark:text-sky-400 font-semibold">
                            R:R 1:{(Math.abs(rec.targetPrice - rec.savedPrice) / Math.max(Math.abs(rec.savedPrice - rec.stopLossPrice), 0.00001)).toFixed(2)}
                          </span>
                        </>
                      )}
                    </span>
                    {hitTarget && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                        ✓ ដល់គោលដៅ (TP Hit)
                      </span>
                    )}
                    {hitStop && (
                      <span className="text-rose-600 dark:text-rose-400 font-sans font-medium">
                        ⚠ ប៉ះ Stop Loss
                      </span>
                    )}
                  </div>

                  {/* Notes & Post-Review Annotation */}
                  {editingId === rec.id ? (
                    <div className="space-y-1.5 pt-1">
                      <textarea
                        rows={2}
                        value={editingNoteText ?? ''}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        >
                          បោះបង់
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onUpdateAnalysisNotes(rec, editingNoteText);
                            setEditingId(null);
                          }}
                          className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-semibold text-[11px]"
                        >
                          <Check className="w-3 h-3" />
                          <span>រក្សាទុកកំណត់ចំណាំ</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingId(rec.id);
                        setEditingNoteText(rec.notes);
                      }}
                      className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950/60 border border-slate-200/70 dark:border-transparent rounded px-2.5 py-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-950 transition-colors"
                      title="ចុចដើម្បីកែប្រែកំណត់ហេតុត្រួតពិនិត្យ"
                    >
                      {rec.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
