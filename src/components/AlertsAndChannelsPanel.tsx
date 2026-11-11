import React, { useState } from 'react';
import {
  AlertCondition,
  AlertLogRecord,
  AssetClass,
  MarketAsset,
  NotificationConfigRecord,
  PriceAlertRecord,
} from '../types/market';
import { formatPrice } from '../services/marketEngine';
import {
  Activity,
  Bell,
  BellRing,
  CheckCircle2,
  ExternalLink,
  History,
  Layers,
  Mail,
  Pause,
  Play,
  Send,
  Settings2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  Palette,
} from 'lucide-react';

interface AlertsAndChannelsPanelProps {
  currentAsset: MarketAsset;
  currentRsi?: number;
  alerts: PriceAlertRecord[];
  alertLogs: AlertLogRecord[];
  notificationConfig: NotificationConfigRecord;
  presetAlertPrice: number | null;
  onClearPresetPrice: () => void;
  onCreateAlert: (alert: {
    symbol: string;
    assetClass: AssetClass;
    condition: AlertCondition;
    threshold: number;
    notifyTelegram: boolean;
    notifyEmail: boolean;
    note: string;
    rsiLowerBound?: number;
    rsiUpperBound?: number;
    rsiBreakoutDirection?: 'above' | 'below' | 'both';
    rsiTriggerColor?: string;
  }) => Promise<void>;
  onToggleAlertStatus: (alert: PriceAlertRecord) => Promise<void>;
  onDeleteAlert: (id: string) => Promise<void>;
  onMarkLogReviewed: (log: AlertLogRecord, reviewNote: string) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onClearAllLogs?: () => void;
  onSaveNotificationConfig: (cfg: NotificationConfigRecord) => Promise<void>;
  onSendTestNotification: (cfg: NotificationConfigRecord) => Promise<{
    ok: boolean;
    message: string;
    emailPreviewUrl?: string;
  }>;
}

export const CONDITION_LABELS: Record<AlertCondition, string> = {
  price_above: 'តម្លៃឡើងលើស (Price ≥)',
  price_below: 'តម្លៃធ្លាក់ក្រោម (Price ≤)',
  pct_spike_up: 'ហក់ឡើងខ្លាំងភ្លាមៗ (% Spike Up ≥)',
  pct_drop_down: 'ធ្លាក់ចុះខ្លាំងភ្លាមៗ (% Drop Down ≥)',
  volatility_burst: 'បម្រែបម្រួលតម្លៃខ្លាំង (Volatility ≥ %)',
  rsi_overbought: 'RSI(14) ឆ្លងលើសកម្រិតទិញជ្រុល (Crosses Above 70 — Overbought)',
  rsi_oversold: 'RSI(14) ឆ្លងក្រោមកម្រិតលក់ជ្រុល (Crosses Below 30 — Oversold)',
  rsi_channel_breakout: 'RSI(14) ធ្លាយចេញពី Trend Channel (Channel Breakout)',
  trendline_touch: 'តម្លៃប៉ះខ្សែនិន្នាការ (Trendline Touch Alert)',
};

export const RSI_TRIGGER_COLOR_OPTIONS = [
  { hex: '#EF4444', label: 'ក្រហម (Red)', desc: 'Overbought / ធ្លាក់ចុះ' },
  { hex: '#10B981', label: 'បៃតង (Emerald)', desc: 'Oversold / ងើបឡើង' },
  { hex: '#F59E0B', label: 'លឿងទុំ (Amber)', desc: 'Warning / ប្រយ័ត្ន' },
  { hex: '#06B6D4', label: 'ខៀវខ្ចី (Cyan)', desc: 'Spike / សន្ទុះ' },
  { hex: '#3B82F6', label: 'ខៀវ (Royal Blue)', desc: 'Momentum / កម្លាំង' },
  { hex: '#8B5CF6', label: 'ស្វាយ (Violet)', desc: 'Channel / បណ្តាញ' },
  { hex: '#EC4899', label: 'ផ្កាឈូក (Pink)', desc: 'High Contrast' },
  { hex: '#F97316', label: 'ទឹកក្រូច (Orange)', desc: 'Breakout / ធ្លាយចេញ' },
];

export function parseRsiChannel(alert: PriceAlertRecord): {
  lowerBound: number;
  upperBound: number;
  direction: 'above' | 'below' | 'both';
  triggerColor?: string;
  cleanNote: string;
} {
  let lowerBound = alert.rsiLowerBound ?? 45;
  let upperBound = alert.rsiUpperBound ?? 65;
  let direction: 'above' | 'below' | 'both' = alert.rsiBreakoutDirection ?? 'above';
  let triggerColor = alert.rsiTriggerColor;
  let cleanNote = alert.note || '';

  if (cleanNote.includes('[RSI_CHANNEL:')) {
    const match = cleanNote.match(/\[RSI_CHANNEL:\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*(above|below|both)\]/i);
    if (match) {
      lowerBound = parseFloat(match[1]);
      upperBound = parseFloat(match[2]);
      direction = match[3] as 'above' | 'below' | 'both';
      cleanNote = cleanNote.replace(/\[RSI_CHANNEL:[^\]]+\]\s*/i, '').trim();
    }
  }

  if (cleanNote.includes('[RSI_COLOR:')) {
    const colorMatch = cleanNote.match(/\[RSI_COLOR:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*\]/i);
    if (colorMatch) {
      triggerColor = colorMatch[1];
      cleanNote = cleanNote.replace(/\[RSI_COLOR:[^\]]+\]\s*/i, '').trim();
    }
  }

  return { lowerBound, upperBound, direction, triggerColor, cleanNote };
}

export const AlertsAndChannelsPanel: React.FC<AlertsAndChannelsPanelProps> = ({
  currentAsset,
  currentRsi = 50,
  alerts,
  alertLogs,
  notificationConfig,
  presetAlertPrice,
  onClearPresetPrice,
  onCreateAlert,
  onToggleAlertStatus,
  onDeleteAlert,
  onMarkLogReviewed,
  onDeleteLog,
  onClearAllLogs,
  onSaveNotificationConfig,
  onSendTestNotification,
}) => {
  const [subTab, setSubTab] = useState<'alerts' | 'logs' | 'channels'>('alerts');

  const [condition, setCondition] = useState<AlertCondition>('price_above');
  const [threshold, setThreshold] = useState<string>(() =>
    (currentAsset.price * 1.01).toPrecision(6)
  );
  const [notifyTelegram, setNotifyTelegram] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // User-defined RSI Trend Channel & Trigger Color state
  const [rsiLowerBound, setRsiLowerBound] = useState<string>('45');
  const [rsiUpperBound, setRsiUpperBound] = useState<string>('65');
  const [rsiDirection, setRsiDirection] = useState<'above' | 'below' | 'both'>('above');
  const [rsiTriggerColor, setRsiTriggerColor] = useState<string>('#EF4444');

  const [cfgForm, setCfgForm] = useState<NotificationConfigRecord>(notificationConfig);
  const [isSavingCfg, setIsSavingCfg] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    ok: boolean;
    message: string;
    emailPreviewUrl?: string;
  } | null>(null);

  React.useEffect(() => {
    setCfgForm(notificationConfig);
  }, [notificationConfig]);

  React.useEffect(() => {
    if (presetAlertPrice !== null) {
      setSubTab('alerts');
      setCondition(presetAlertPrice >= currentAsset.price ? 'price_above' : 'price_below');
      setThreshold(String(presetAlertPrice));
      onClearPresetPrice();
    }
  }, [presetAlertPrice, currentAsset.price, onClearPresetPrice]);

  const handleConditionChange = (nextCond: AlertCondition) => {
    setCondition(nextCond);
    if (nextCond === 'price_above' || nextCond === 'trendline_touch') {
      setThreshold((currentAsset.price * 1.005).toPrecision(6));
      if (nextCond === 'trendline_touch' && !note.trim()) {
        setNote(`${currentAsset.symbol} តម្លៃប៉ះខ្សែ Trendline (Trendline Touch Alert)`);
      }
    } else if (nextCond === 'price_below') {
      setThreshold((currentAsset.price * 0.99).toPrecision(6));
    } else if (nextCond === 'rsi_overbought') {
      setThreshold('70');
      setRsiTriggerColor('#EF4444');
      if (!note.trim()) {
        setNote(`${currentAsset.symbol} RSI(14) ឆ្លងលើសកម្រិតទិញជ្រុល 70 (Overbought)`);
      }
    } else if (nextCond === 'rsi_oversold') {
      setThreshold('30');
      setRsiTriggerColor('#10B981');
      if (!note.trim()) {
        setNote(`${currentAsset.symbol} RSI(14) ឆ្លងក្រោមកម្រិតលក់ជ្រុល 30 (Oversold)`);
      }
    } else if (nextCond === 'rsi_channel_breakout') {
      const lower = parseFloat(rsiLowerBound) || 45;
      const upper = parseFloat(rsiUpperBound) || 65;
      setThreshold(rsiDirection === 'below' ? String(lower) : String(upper));
      setRsiTriggerColor('#8B5CF6');
      if (!note.trim()) {
        setNote(`${currentAsset.symbol} RSI(14) ធ្លាយចេញពីបណ្តាញ Trend Channel [${lower} - ${upper}]`);
      }
    } else {
      setThreshold('1.5');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isRsiChannel = condition === 'rsi_channel_breakout';
    const isRsi = condition.startsWith('rsi_');
    const numLower = Math.max(1, Math.min(98, parseFloat(rsiLowerBound) || 45));
    const numUpper = Math.max(numLower + 1, Math.min(99, parseFloat(rsiUpperBound) || 65));
    const numVal = isRsiChannel
      ? (rsiDirection === 'below' ? numLower : numUpper)
      : parseFloat(threshold);

    if (isNaN(numVal) || numVal <= 0) return;
    setIsCreating(true);
    try {
      let finalNote = note.trim();
      let defaultNote = '';

      if (isRsiChannel) {
        defaultNote =
          rsiDirection === 'above'
            ? `ជូនដំណឹងនៅពេល ${currentAsset.symbol} RSI(14) ធ្លាយឡើងផុត Channel Ceiling ${numUpper} (Bullish Momentum Breakout)`
            : rsiDirection === 'below'
            ? `ជូនដំណឹងនៅពេល ${currentAsset.symbol} RSI(14) ធ្លាក់ចុះធ្លាយបាត Channel Floor ${numLower} (Bearish Breakdown)`
            : `ជូនដំណឹងនៅពេល ${currentAsset.symbol} RSI(14) ធ្លាយចេញពីបណ្តាញ Trend Channel [${numLower} - ${numUpper}]`;
        const userText = finalNote || defaultNote;
        finalNote = `[RSI_CHANNEL:${numLower},${numUpper},${rsiDirection}][RSI_COLOR:${rsiTriggerColor}] ${userText}`;
      } else {
        defaultNote =
          condition === 'rsi_overbought'
            ? `ជូនដំណឹងនៅពេល ${currentAsset.symbol} RSI(14) ឆ្លងលើស ${numVal} (Overbought / ទិញជ្រុល)`
            : condition === 'rsi_oversold'
            ? `ជូនដំណឹងនៅពេល ${currentAsset.symbol} RSI(14) ឆ្លងក្រោម ${numVal} (Oversold / លក់ជ្រុល)`
            : condition === 'trendline_touch'
            ? `ជូនដំណឹងនៅពេល ${currentAsset.symbol} ប៉ះខ្សែ Trendline @ ${formatPrice(numVal, currentAsset.symbol)}`
            : `ជូនដំណឹងនៅពេល ${currentAsset.symbol} ${CONDITION_LABELS[condition]} ${numVal}`;
        const userText = finalNote || defaultNote;
        finalNote = isRsi ? `[RSI_COLOR:${rsiTriggerColor}] ${userText}` : userText;
      }

      await onCreateAlert({
        symbol: currentAsset.symbol,
        assetClass: currentAsset.assetClass,
        condition,
        threshold: numVal,
        notifyTelegram,
        notifyEmail,
        note: finalNote,
        rsiLowerBound: isRsiChannel ? numLower : undefined,
        rsiUpperBound: isRsiChannel ? numUpper : undefined,
        rsiBreakoutDirection: isRsiChannel ? rsiDirection : undefined,
        rsiTriggerColor: isRsi ? rsiTriggerColor : undefined,
      });
      setNote('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveChannels = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCfg(true);
    setTestFeedback(null);
    try {
      await onSaveNotificationConfig(cfgForm);
      setTestFeedback({
        ok: true,
        message: 'បានរក្សាទុកការកំណត់ប្រព័ន្ធជូនដំណឹង (Email & Telegram) ដោយជោគជ័យ។',
      });
    } finally {
      setIsSavingCfg(false);
    }
  };

  const handleTestDispatch = async () => {
    setIsTesting(true);
    setTestFeedback(null);
    try {
      const res = await onSendTestNotification(cfgForm);
      setTestFeedback(res);
    } finally {
      setIsTesting(false);
    }
  };

  const isRsiCondition = condition === 'rsi_overbought' || condition === 'rsi_oversold';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-Navigation Bar */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => setSubTab('alerts')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            subTab === 'alerts'
              ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>កំណត់ Alert ({alerts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('logs')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            subTab === 'logs'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>ប្រវត្តិ ({alertLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('channels')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            subTab === 'channels'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Email / Telegram</span>
        </button>
      </div>

      {/* TAB 1: CREATE & MANAGE PRICE / VOLATILITY / RSI(14) TECHNICAL ALERTS */}
      {subTab === 'alerts' && (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/80">
          <form onSubmit={handleCreateSubmit} className="p-3.5 space-y-3 bg-slate-50/80 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                បង្កើតការជូនដំណឹងសម្រាប់ {currentAsset.symbol}
              </span>
              <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                <span className="text-sky-600 dark:text-sky-400">
                  {formatPrice(currentAsset.price, currentAsset.symbol)}
                </span>
                <span className="text-slate-400">·</span>
                <span
                  className={
                    currentRsi >= 70
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : currentRsi <= 30
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-purple-600 dark:text-purple-400'
                  }
                >
                  RSI(14): {currentRsi.toFixed(1)}
                </span>
              </div>
            </div>

            {/* 1-Click Technical Indicator & Price Presets */}
            <div className="space-y-1">
              <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                ជ្រើសរើសរហ័ស — សូចនាករបច្ចេកទេស RSI(14) ឬ Trend Channel៖
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleConditionChange('rsi_overbought')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    condition === 'rsi_overbought'
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-800 dark:text-purple-300 font-semibold'
                      : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-500/40'
                  }`}
                  title="Overbought > 70"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>RSI &gt; 70</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionChange('rsi_oversold')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    condition === 'rsi_oversold'
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-800 dark:text-purple-300 font-semibold'
                      : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-500/40'
                  }`}
                  title="Oversold < 30"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>RSI &lt; 30</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConditionChange('rsi_channel_breakout')}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded border text-[10px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    condition === 'rsi_channel_breakout'
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-800 dark:text-purple-300 font-semibold ring-1 ring-purple-500/40'
                      : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-500/40'
                  }`}
                  title="RSI Trend Channel Breakout [45 - 65]"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>RSI Channel</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                លក្ខខណ្ឌជូនដំណឹង (Alert Condition)
              </label>
              <select
                value={condition}
                onChange={(e) => handleConditionChange(e.target.value as AlertCondition)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <optgroup label="សូចនាករ & គំនូរបច្ចេកទេស (Technical Indicators & Channels)">
                  <option value="rsi_channel_breakout">⚡ {CONDITION_LABELS.rsi_channel_breakout}</option>
                  <option value="rsi_overbought">{CONDITION_LABELS.rsi_overbought}</option>
                  <option value="rsi_oversold">{CONDITION_LABELS.rsi_oversold}</option>
                  <option value="trendline_touch">{CONDITION_LABELS.trendline_touch}</option>
                </optgroup>
                <optgroup label="លក្ខខណ្ឌតម្លៃ & បម្រែបម្រួល (Price & Volatility)">
                  <option value="price_above">{CONDITION_LABELS.price_above}</option>
                  <option value="price_below">{CONDITION_LABELS.price_below}</option>
                  <option value="pct_spike_up">{CONDITION_LABELS.pct_spike_up}</option>
                  <option value="pct_drop_down">{CONDITION_LABELS.pct_drop_down}</option>
                  <option value="volatility_burst">{CONDITION_LABELS.volatility_burst}</option>
                </optgroup>
              </select>
            </div>

            {/* Custom RSI Trend Channel Builder (Triggered when rsi_channel_breakout is selected) */}
            {condition === 'rsi_channel_breakout' ? (
              <div className="p-3 rounded-lg bg-purple-500/10 dark:bg-purple-500/[0.08] border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-200">
                    <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>បណ្តាញនិន្នាការ RSI (User Trend Channel)</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-400/40">
                    RSI បច្ចុប្បន្ន: {currentRsi.toFixed(1)}
                  </span>
                </div>

                {/* Visual Channel Position Gauge */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span>0</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">បាត: {rsiLowerBound}</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">RSI: {currentRsi.toFixed(1)}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">ដំបូល: {rsiUpperBound}</span>
                    <span>100</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 relative overflow-hidden flex items-center">
                    {/* Channel Zone Highlight */}
                    <div
                      className="absolute h-full bg-purple-500/35 border-x-2 border-purple-500"
                      style={{
                        left: `${Math.max(0, Math.min(99, parseFloat(rsiLowerBound) || 45))}%`,
                        width: `${Math.max(2, Math.min(100, (parseFloat(rsiUpperBound) || 65) - (parseFloat(rsiLowerBound) || 45)))}%`,
                      }}
                    />
                    {/* Current RSI Cursor Pointer */}
                    <div
                      className="absolute top-0 bottom-0 w-2.5 -ml-1.25 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-950 z-10 transition-all"
                      style={{ left: `${Math.max(0, Math.min(100, currentRsi))}%` }}
                      title={`RSI(14) ជាក់ស្តែង = ${currentRsi.toFixed(1)}`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-between pt-0.5">
                    <span>
                      {currentRsi > parseFloat(rsiUpperBound)
                        ? '⚡ សញ្ញាធ្លាយឡើងលើដំបូល Channel (Bullish Breakout Zone!)'
                        : currentRsi < parseFloat(rsiLowerBound)
                        ? '⚠️ សញ្ញាធ្លាក់ចុះក្រោមបាត Channel (Bearish Breakdown Zone!)'
                        : '✅ RSI កំពុងស្ថិតក្នុងបណ្តាញនិន្នាការ (Inside Channel)'}
                    </span>
                  </p>
                </div>

                {/* Quick Channel Presets */}
                <div className="space-y-1">
                  <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    យុទ្ធសាស្ត្រគំរូ (Quick Trend Channel Presets)៖
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setRsiLowerBound('40');
                        setRsiUpperBound('65');
                        setRsiDirection('above');
                      }}
                      className="px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-left transition-colors cursor-pointer shadow-2xs"
                    >
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">🐂 Bullish Trend [40 - 65]</span>
                      <span className="text-[9px] text-slate-500">ធ្លាយឡើងលើ (Breakout Above)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRsiLowerBound('35');
                        setRsiUpperBound('60');
                        setRsiDirection('below');
                      }}
                      className="px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-left transition-colors cursor-pointer shadow-2xs"
                    >
                      <span className="font-semibold text-rose-600 dark:text-rose-400 block">🐻 Bearish Trend [35 - 60]</span>
                      <span className="text-[9px] text-slate-500">ធ្លាក់ចុះក្រោម (Breakdown Below)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRsiLowerBound('45');
                        setRsiUpperBound('55');
                        setRsiDirection('both');
                      }}
                      className="px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-left transition-colors cursor-pointer shadow-2xs"
                    >
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400 block">⚡ Squeeze [45 - 55]</span>
                      <span className="text-[9px] text-slate-500">ធ្លាយសងខាង (Either Side)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRsiLowerBound('40');
                        setRsiUpperBound('80');
                        setRsiDirection('above');
                      }}
                      className="px-2 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 text-left transition-colors cursor-pointer shadow-2xs"
                    >
                      <span className="font-semibold text-purple-600 dark:text-purple-400 block">👑 Cardwell [40 - 80]</span>
                      <span className="text-[9px] text-slate-500">Super Bullish Channel</span>
                    </button>
                  </div>
                </div>

                {/* Boundary Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-0.5">
                      របាំងខាងក្រោម (Floor / Support)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="98"
                      step="1"
                      value={rsiLowerBound}
                      onChange={(e) => setRsiLowerBound(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-0.5">
                      របាំងខាងលើ (Ceiling / Resistance)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="99"
                      step="1"
                      value={rsiUpperBound}
                      onChange={(e) => setRsiUpperBound(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Breakout Direction Selection */}
                <div>
                  <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                    ទិសដៅធ្លាយចេញដែលត្រូវជូនដំណឹង (Breakout Trigger)៖
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setRsiDirection('above')}
                      className={`px-2 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                        rsiDirection === 'above'
                          ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ↗ ធ្លាយឡើងលើ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsiDirection('below')}
                      className={`px-2 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                        rsiDirection === 'below'
                          ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ↘ ធ្លាក់ចុះក្រោម
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsiDirection('both')}
                      className={`px-2 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                        rsiDirection === 'both'
                          ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ↕ ធ្លាយសងខាង
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400">
                    {condition.startsWith('price_') || condition === 'trendline_touch'
                      ? `តម្លៃគោលដៅ (${currentAsset.symbol.endsWith('CSX') ? '៛' : '$'})`
                      : condition === 'rsi_overbought'
                      ? 'កម្រិត RSI(14) ទិញជ្រុល (Overbought Threshold — ស្តង់ដារ 70)'
                      : condition === 'rsi_oversold'
                      ? 'កម្រិត RSI(14) លក់ជ្រុល (Oversold Threshold — ស្តង់ដារ 30)'
                      : 'កម្រិតភាគរយបម្រែបម្រួល (% Change Threshold)'}
                  </label>
                  {(condition === 'rsi_overbought' || condition === 'rsi_oversold') && (
                    <button
                      type="button"
                      onClick={() => setThreshold(condition === 'rsi_overbought' ? '70' : '30')}
                      className="text-[10px] font-mono text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      កំណត់ {condition === 'rsi_overbought' ? '70' : '30'}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  min={condition.startsWith('rsi_') ? 1 : undefined}
                  max={condition.startsWith('rsi_') ? 99 : undefined}
                  value={threshold ?? ''}
                  onChange={(e) => setThreshold(e.target.value)}
                  className={`w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums focus:outline-none ${
                    condition.startsWith('rsi_')
                      ? 'text-purple-700 dark:text-purple-300 focus:border-purple-500'
                      : 'text-amber-700 dark:text-amber-400 focus:border-amber-500'
                  }`}
                />
                {(condition === 'rsi_overbought' || condition === 'rsi_oversold') && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-purple-500 shrink-0" />
                    <span>
                      {condition === 'rsi_overbought'
                        ? `លោតជូនដំណឹងភ្លាមៗនៅពេល RSI(14) ឆ្លងឡើងលើស ${threshold || 70} (សញ្ញាទិញជ្រុល / អាចកែតម្រូវចុះ)`
                        : `លោតជូនដំណឹងភ្លាមៗនៅពេល RSI(14) ឆ្លងធ្លាក់ក្រោម ${threshold || 30} (សញ្ញាលក់ជ្រុល / អាចងើបឡើងវិញ)`}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* RSI Alert Trigger Line Color Customizer */}
            {condition.startsWith('rsi_') && (
              <div className="p-3 rounded-lg bg-slate-100/90 dark:bg-slate-950/70 border border-purple-500/30 dark:border-purple-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Palette className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>ពណ៌ខ្សែសូចនាករ RSI ពេល Alert ដំណើរការ (RSI Trigger Color)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-900 shadow-xs"
                      style={{ backgroundColor: rsiTriggerColor }}
                    />
                    <span className="text-[10px] font-mono font-bold" style={{ color: rsiTriggerColor }}>
                      {rsiTriggerColor}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  ជ្រើសរើសពណ៌សម្រាប់បង្ហាញខ្សែ RSI និងបន្ទាត់ Trigger នៅលើក្រាហ្វ ដើម្បីងាយស្រួលមើលឃើញភ្លាមៗនៅពេលមានសញ្ញា Alert៖
                </p>

                {/* Color Palette Swatches */}
                <div className="grid grid-cols-4 gap-1.5">
                  {RSI_TRIGGER_COLOR_OPTIONS.map((c) => {
                    const isSelected = rsiTriggerColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setRsiTriggerColor(c.hex)}
                        className={`flex items-center gap-1.5 p-1.5 rounded-md border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 border-purple-500 shadow-2xs ring-1 ring-purple-500/50'
                            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                        title={c.desc}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div className="min-w-0">
                          <span className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate">
                            {c.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input & Live Canvas Preview */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                      ពណ៌ផ្ទាល់ខ្លួន (Custom Hex):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={rsiTriggerColor}
                        onChange={(e) => setRsiTriggerColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                        title="ជ្រើសរើសពណ៌ពី Color Picker"
                      />
                      <input
                        type="text"
                        value={rsiTriggerColor}
                        onChange={(e) => setRsiTriggerColor(e.target.value)}
                        placeholder="#EF4444"
                        className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Interactive Visual Chart Indicator Line Preview */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 text-white text-[10px] font-mono shadow-xs border shrink-0"
                    style={{ borderColor: `${rsiTriggerColor}66` }}
                  >
                    <span className="text-[9px] text-slate-400">គំរូខ្សែលើក្រាហ្វ:</span>
                    <svg className="w-14 h-4 overflow-visible" viewBox="0 0 56 16">
                      <path
                        d="M 0 12 Q 14 2 28 8 T 56 4"
                        fill="none"
                        stroke={rsiTriggerColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="56" cy="4" r="3" fill={rsiTriggerColor} />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center flex-wrap gap-2.5 pt-0.5">
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(notifyTelegram)}
                onClick={() => setNotifyTelegram(!notifyTelegram)}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs transition-all cursor-pointer select-none ${
                  notifyTelegram
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Telegram</span>
                <span
                  className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                    notifyTelegram ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                      notifyTelegram ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className="text-[10px] font-bold">
                  {notifyTelegram ? 'បើក' : 'បិទ'}
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={Boolean(notifyEmail)}
                onClick={() => setNotifyEmail(!notifyEmail)}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs transition-all cursor-pointer select-none ${
                  notifyEmail
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Email</span>
                <span
                  className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                    notifyEmail ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                      notifyEmail ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className="text-[10px] font-bold">
                  {notifyEmail ? 'បើក' : 'បិទ'}
                </span>
              </button>
            </div>

            <div>
              <input
                type="text"
                value={note ?? ''}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="សារកំណត់ចំណាំពេលលោតជូនដំណឹង..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <BellRing className="w-4 h-4" />
              <span>{isCreating ? 'កំពុងបង្កើត...' : 'ដាក់ការជូនដំណឹងភ្លាមៗ'}</span>
            </button>
          </form>

          {/* Active & Triggered Alerts List */}
          <div className="p-3.5 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              ការជូនដំណឹងដែលបានកំណត់ ({alerts.length})
            </h4>

            {alerts.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg px-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  មិនទាន់មានការកំណត់ Alert ផ្ទាល់ខ្លួនទេ។ ប្រព័ន្ធចាប់សញ្ញាបម្រែបម្រួលតម្លៃខ្លាំងស្វ័យប្រវត្តិ (±{notificationConfig.autoSpikeThresholdPct}%) កំពុងដំណើរការ។
                </p>
              </div>
            ) : (
              alerts.map((al) => {
                const isRsiChannel = al.condition === 'rsi_channel_breakout';
                const channelData = isRsiChannel ? parseRsiChannel(al) : null;
                const isRsi =
                  al.condition === 'rsi_overbought' ||
                  al.condition === 'rsi_oversold' ||
                  isRsiChannel;
                const isTrendline = al.condition === 'trendline_touch';
                const rsiAlertColor =
                  al.rsiTriggerColor ||
                  channelData?.triggerColor ||
                  (al.note?.includes('[RSI_COLOR:')
                    ? al.note.match(/\[RSI_COLOR:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\s*\]/i)?.[1]
                    : undefined);
                return (
                  <div
                    key={al.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 transition-all"
                    style={isRsi && rsiAlertColor ? { borderLeft: `3.5px solid ${rsiAlertColor}` } : undefined}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {al.symbol}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">·</span>
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            isRsiChannel
                              ? 'text-purple-600 dark:text-purple-300'
                              : isRsi
                              ? 'text-purple-700 dark:text-purple-300'
                              : isTrendline
                              ? 'text-sky-700 dark:text-sky-300'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {al.condition.startsWith('price_')
                            ? `${al.condition === 'price_above' ? '≥' : '≤'} ${formatPrice(al.threshold, al.symbol)}`
                            : al.condition === 'trendline_touch'
                            ? `Trendline Touch ≈ ${formatPrice(al.threshold, al.symbol)}`
                            : al.condition === 'rsi_overbought'
                            ? `RSI(14) ↗ ≥ ${al.threshold} (Overbought)`
                            : al.condition === 'rsi_oversold'
                            ? `RSI(14) ↘ ≤ ${al.threshold} (Oversold)`
                            : isRsiChannel && channelData
                            ? `RSI Channel [${channelData.lowerBound} - ${channelData.upperBound}] ${
                                channelData.direction === 'above'
                                  ? '↗ ធ្លាយឡើង'
                                  : channelData.direction === 'below'
                                  ? '↘ ធ្លាក់ចុះ'
                                  : '↕ សងខាង'
                              }`
                            : `±${al.threshold}%`}
                        </span>
                        {isRsi && rsiAlertColor && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xs"
                            title={`ពណ៌ខ្សែ RSI ពេល Alert៖ ${rsiAlertColor}`}
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block shrink-0 shadow-2xs"
                              style={{ backgroundColor: rsiAlertColor }}
                            />
                            <span style={{ color: rsiAlertColor }}>
                              {rsiAlertColor}
                            </span>
                          </span>
                        )}
                      </div>
                      {channelData ? (
                        channelData.cleanNote && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                            {channelData.cleanNote}
                          </p>
                        )
                      ) : al.note ? (
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                          {al.note}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          ស្ថានភាព:{' '}
                          <strong
                            className={
                              al.status === 'active'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : al.status === 'triggered'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-500'
                            }
                          >
                            {al.status === 'active'
                              ? 'កំពុងតាមដាន'
                              : al.status === 'triggered'
                              ? 'បានលោតជូនដំណឹង'
                              : 'ផ្អាក'}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>លោត {al.triggerCount} ដង</span>
                        {(al.notifyTelegram || al.notifyEmail) && (
                          <>
                            <span>·</span>
                            <span>
                              {[al.notifyTelegram && 'TG', al.notifyEmail && 'Email']
                                .filter(Boolean)
                                .join('+')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleAlertStatus(al)}
                        className="p-1.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        title={al.status === 'active' ? 'ផ្អាក' : 'ដំណើរការឡើងវិញ'}
                      >
                        {al.status === 'active' ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAlert(al.id)}
                        className="p-1.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="លុប"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRIGGERED ALERT LOGS FOR POST-MARKET REVIEW */}
      {subTab === 'logs' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <History className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                ប្រវត្តិជូនដំណឹង ({alertLogs.length})
              </h4>
            </div>

            {onClearAllLogs && (
              <button
                type="button"
                onClick={onClearAllLogs}
                disabled={alertLogs.length === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all whitespace-nowrap shrink-0 ${
                  alertLogs.length > 0
                    ? 'bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border-rose-500/35 hover:border-rose-500 shadow-xs hover:shadow-md hover:shadow-rose-600/20 active:scale-95 cursor-pointer'
                    : 'bg-slate-200/60 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-300/60 dark:border-slate-800 cursor-not-allowed'
                }`}
                title="សម្អាតប្រវត្តិជូនដំណឹងទាំងអស់"
              >
                {alertLogs.length > 0 ? (
                  <>
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>សម្អាតប្រវត្តិ ({alertLogs.length})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    <span>បានសម្អាត</span>
                  </>
                )}
              </button>
            )}
          </div>

          {alertLogs.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg px-4 space-y-2">
              <History className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                មិនទាន់មានប្រវត្តិជូនដំណឹងនៅឡើយទេ
              </p>
              <p className="text-[11px] text-slate-500">
                អ្នកអាចចុចប៊ូតុង &ldquo;Spike +2.4%&rdquo; ឬ &ldquo;Drop -2.4%&rdquo; នៅលើក្រាហ្វដើម្បីសាកល្បងការជូនដំណឹងតម្លៃ និង RSI(14) ភ្លាមៗ។
              </p>
            </div>
          ) : (
            alertLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{log.symbol}</span>
                      <span className="text-slate-400 dark:text-slate-500">·</span>
                      <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        @{formatPrice(log.triggerPrice, log.symbol)}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">·</span>
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          log.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {log.changePercent >= 0 ? '+' : ''}
                        {log.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">{log.conditionLabel}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteLog(log.id)}
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                    title="លុបប្រវត្តិនេះ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/70">
                  <span>
                    បញ្ជូនតាម: <strong className="text-slate-700 dark:text-slate-300">{log.deliveryChannels}</strong>
                  </span>
                  <span className="font-mono">
                    {new Date(log.createdAtMs).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                {log.emailPreviewUrl && (
                  <a
                    href={log.emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>មើលអ៊ីមែលជូនដំណឹងដែលបានផ្ញើ (SMTP Receipt)</span>
                  </a>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onMarkLogReviewed(
                        log,
                        log.reviewed ? log.reviewNote : 'បានពិនិត្យរួចរាល់ក្រោយព្រឹត្តិការណ៍ទីផ្សារ'
                      )
                    }
                    className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                      log.reviewed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {log.reviewed ? 'បានត្រួតពិនិត្យរួច (Reviewed)' : 'កត់ត្រាថាបានពិនិត្យ'}
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: EMAIL & TELEGRAM NOTIFICATION CHANNEL CONFIGURATION */}
      {subTab === 'channels' && (
        <form
          onSubmit={handleSaveChannels}
          className="flex-1 overflow-y-auto p-3.5 space-y-4"
        >
          {/* Automatic Volatility Spike Detector */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                ប្រព័ន្ធចាប់បម្រែបម្រួលតម្លៃខ្លាំងស្វ័យប្រវត្តិ
              </span>
              <button
                type="button"
                onClick={() =>
                  setCfgForm((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
                }
                className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500"
              >
                {cfgForm.soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>សំឡេងបើក</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-500">សំឡេងបិទ</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                ជូនដំណឹងភ្លាមៗនៅពេលតម្លៃប្រែប្រួលលើសពី (% ក្នុង 1 នាទី)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="25"
                value={cfgForm.autoSpikeThresholdPct ?? 1.5}
                onChange={(e) =>
                  setCfgForm((prev) => ({
                    ...prev,
                    autoSpikeThresholdPct: Math.max(0.2, parseFloat(e.target.value) || 1.5),
                  }))
                }
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono tabular-nums text-amber-700 dark:text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Email Integration */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  ការជូនដំណឹងតាមអ៊ីមែល (Email Alert)
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(cfgForm.emailEnabled)}
                onClick={() =>
                  setCfgForm((prev) => ({ ...prev, emailEnabled: !prev.emailEnabled }))
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs transition-all cursor-pointer select-none shrink-0 ${
                  cfgForm.emailEnabled
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 font-bold'
                    : 'bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <span
                  className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                    cfgForm.emailEnabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                      cfgForm.emailEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className="text-[10px]">
                  {cfgForm.emailEnabled ? 'បើក' : 'បិទ'}
                </span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                អាសយដ្ឋានអ៊ីមែលទទួលដំណឹង (Recipient Email)
              </label>
              <input
                type="email"
                value={cfgForm.recipientEmail ?? ''}
                onChange={(e) =>
                  setCfgForm((prev) => ({ ...prev, recipientEmail: e.target.value }))
                }
                placeholder="vanndatree98@gmail.com"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Email Webhook URL (ស្រេចចិត្ត — ទុកទំនេរដើម្បីប្រើប្រព័ន្ធ SMTP ផ្ទាល់)
              </label>
              <input
                type="url"
                value={cfgForm.emailWebhookUrl ?? ''}
                onChange={(e) =>
                  setCfgForm((prev) => ({ ...prev, emailWebhookUrl: e.target.value }))
                }
                placeholder="https://hook.eu1.make.com/..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Telegram Bot Integration */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Send className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  ការជូនដំណឹងតាម Telegram Bot
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(cfgForm.telegramEnabled)}
                onClick={() =>
                  setCfgForm((prev) => ({ ...prev, telegramEnabled: !prev.telegramEnabled }))
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs transition-all cursor-pointer select-none shrink-0 ${
                  cfgForm.telegramEnabled
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 font-bold'
                    : 'bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <span
                  className={`w-7 h-4 rounded-full transition-colors relative inline-flex items-center ${
                    cfgForm.telegramEnabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                      cfgForm.telegramEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className="text-[10px]">
                  {cfgForm.telegramEnabled ? 'បើក' : 'បិទ'}
                </span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Telegram Bot Token (ពី @BotFather)
              </label>
              <input
                type="password"
                value={cfgForm.telegramBotToken ?? ''}
                onChange={(e) =>
                  setCfgForm((prev) => ({ ...prev, telegramBotToken: e.target.value }))
                }
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Telegram Chat ID ឬ Channel ID
              </label>
              <input
                type="text"
                value={cfgForm.telegramChatId ?? ''}
                onChange={(e) =>
                  setCfgForm((prev) => ({ ...prev, telegramChatId: e.target.value }))
                }
                placeholder="ឧ. 987654321 ឬ @my_trading_channel"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {testFeedback && (
            <div
              className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                testFeedback.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              <p>{testFeedback.message}</p>
              {testFeedback.emailPreviewUrl && (
                <a
                  href={testFeedback.emailPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-300 hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>បើកមើលអ៊ីមែលសាកល្បងដែលបានផ្ញើចេញ (View Delivered Email)</span>
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              disabled={isSavingCfg}
              className="py-2 px-3 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              {isSavingCfg ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកំណត់'}
            </button>
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestDispatch}
              className="py-2 px-3 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-100 font-medium text-xs border border-slate-300 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {isTesting ? 'កំពុងផ្ញើសាកល្បង...' : 'សាកល្បងផ្ញើដំណឹង'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
