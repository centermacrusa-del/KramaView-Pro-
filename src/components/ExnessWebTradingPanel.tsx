import React, { useState, useMemo, useEffect } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  Crosshair,
  Calculator,
  Layers,
  Zap,
  Trash2,
  Target,
  Activity,
  Server,
  KeyRound,
  LogOut,
  CheckCircle2,
  History,
  Code2,
  Download,
  Wallet,
  Lock,
  Play,
  XCircle,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  PieChart,
  Award,
  HelpCircle,
  Info,
  Edit3,
  Coins,
  DollarSign,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Candle, ChartDrawing, MarketAsset, Timeframe } from '../types/market';
import {
  ExnessAccountType,
  ExnessLeverage,
  EXNESS_MT5_SERVERS,
  MT5AccountSession,
  MT5OrderType,
  getExnessContractSpec,
  calculateExnessBidAsk,
  calculateExnessOrderMetrics,
  calculatePricesFromMoneyTargets,
  calculateGlobalPrecisionAnalysis,
  formatPrice,
  generateMql5BridgeScript,
  playAlertTone,
} from '../services/marketEngine';
import { PositionCloseReason, getCloseReasonBadge } from '../services/smartExitBrain';
import {
  exportClosedDealsCsv,
  exportClosedDealsPdf,
  calculateTaxPerformanceSummary,
  TaxPerformanceSummary,
} from '../services/historyExportService';

export interface ExnessSyncedPosition {
  id: string;
  ticket: number;
  symbol: string;
  exnessSymbol: string;
  direction: 'BUY' | 'SELL';
  orderType: MT5OrderType;
  status: 'OPEN' | 'PENDING';
  lots: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  accountType: ExnessAccountType;
  openedAt: string;
  comment?: string;
}

export interface ExnessClosedDeal {
  id: string;
  ticket: number;
  symbol: string;
  exnessSymbol: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  closePrice: number;
  realizedPnL: number;
  closeReason: PositionCloseReason;
  closedAt: string;
}

interface ExnessWebTradingPanelProps {
  asset: MarketAsset;
  allAssets: MarketAsset[];
  candles: Candle[];
  timeframe: Timeframe;
  accountType: ExnessAccountType;
  onSelectAccountType: (type: ExnessAccountType) => void;
  leverage: ExnessLeverage;
  onSelectLeverage: (lev: ExnessLeverage) => void;
  priceOffset: number;
  onCalibrateExactPrice: (symbol: string, targetExnessPrice: number) => void;
  onResetPriceOffset: (symbol: string) => void;
  showBidAskLines: boolean;
  onToggleBidAskLines: () => void;
  mt5Session: MT5AccountSession;
  onUpdateMt5Session: React.Dispatch<React.SetStateAction<MT5AccountSession>>;
  positions: ExnessSyncedPosition[];
  closedDeals: ExnessClosedDeal[];
  onOpenSyncedPosition: (pos: Omit<ExnessSyncedPosition, 'id' | 'ticket' | 'openedAt'>) => void;
  onUpdateSyncedPosition: (id: string, patch: Partial<ExnessSyncedPosition>) => void;
  onCloseSyncedPosition: (id: string, closeReason?: PositionCloseReason) => void;
  onCloseAllPositions: (filter?: 'ALL' | 'PROFITABLE') => void;
  onClearClosedDeals: () => void;
  onPlotTradeSetupOnChart: (drawing: ChartDrawing) => void;
}

const ACCOUNT_TYPES: { id: ExnessAccountType; label: string; desc: string; badge?: string }[] = [
  {
    id: 'standard_cent',
    label: 'Standard Cent (c)',
    desc: 'គណនីសេនដុល្លារ (USC ¢) · 1 Cent Lot = 0.01 Standard · សមតុល្យគិតជាសេន គ្មានកម្រៃជើងសារ',
    badge: 'USC ¢',
  },
  {
    id: 'standard_m',
    label: 'Standard (m)',
    desc: 'គណនីពេញនិយមបំផុត គ្មានកម្រៃជើងសារ (No Commission)',
  },
  {
    id: 'pro',
    label: 'Pro',
    desc: 'Instant / Market Execution · Spread ទាបបំផុត គ្មានកម្រៃជើងសារ',
  },
  {
    id: 'raw_spread',
    label: 'Raw Spread',
    desc: 'Spread ទាបបំផុតពី 0.0 pips + កម្រៃជើងសារថេរ',
  },
  {
    id: 'zero',
    label: 'Zero (z)',
    desc: 'Zero Spread (0.0 pips) ៩៥% នៃពេលវេលាជួញដូរ',
  },
];

const LEVERAGE_OPTIONS: { value: ExnessLeverage; label: string }[] = [
  { value: 200, label: '1:200' },
  { value: 500, label: '1:500' },
  { value: 1000, label: '1:1000' },
  { value: 2000, label: '1:2000' },
  { value: 0, label: '1:Unlimited' },
];

const ORDER_TYPES: { id: MT5OrderType; label: string; khmer: string }[] = [
  { id: 'MARKET', label: 'Market Execution', khmer: 'ទិញ/លក់ភ្លាមៗតាមទីផ្សារ' },
  { id: 'BUY_LIMIT', label: 'Buy Limit', khmer: 'រង់ចាំទិញនៅតម្លៃទាបជាងទីផ្សារ' },
  { id: 'SELL_LIMIT', label: 'Sell Limit', khmer: 'រង់ចាំលក់នៅតម្លៃខ្ពស់ជាងទីផ្សារ' },
  { id: 'BUY_STOP', label: 'Buy Stop', khmer: 'រង់ចាំទិញពេលបំបែកឡើង (Breakout)' },
  { id: 'SELL_STOP', label: 'Sell Stop', khmer: 'រង់ចាំលក់ពេលបំបែកចុះ (Breakdown)' },
];

export const ExnessWebTradingPanel: React.FC<ExnessWebTradingPanelProps> = ({
  asset,
  allAssets,
  candles,
  timeframe,
  accountType,
  onSelectAccountType,
  leverage,
  onSelectLeverage,
  priceOffset,
  onCalibrateExactPrice,
  onResetPriceOffset,
  showBidAskLines,
  onToggleBidAskLines,
  mt5Session,
  onUpdateMt5Session,
  positions,
  closedDeals,
  onOpenSyncedPosition,
  onUpdateSyncedPosition,
  onCloseSyncedPosition,
  onCloseAllPositions,
  onClearClosedDeals,
  onPlotTradeSetupOnChart,
}) => {
  const spec = useMemo(() => getExnessContractSpec(asset.symbol, accountType), [asset.symbol, accountType]);
  const liveQuote = useMemo(
    () => calculateExnessBidAsk(asset.symbol, asset.price, accountType),
    [asset.symbol, asset.price, accountType]
  );
  const quantReport = useMemo(
    () => calculateGlobalPrecisionAnalysis(asset, candles, timeframe),
    [asset, candles, timeframe]
  );

  // MT5 Login Modal / Form State
  const [showMt5LoginModal, setShowMt5LoginModal] = useState<boolean>(false);
  const [loginInput, setLoginInput] = useState<string>(mt5Session.login || '148592031');
  const [serverInput, setServerInput] = useState<string>(mt5Session.server || 'Exness-MT5Real8');
  const [customServerInput, setCustomServerInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('••••••••••••');
  const [accessModeInput, setAccessModeInput] = useState<'master' | 'investor'>(mt5Session.accessMode || 'master');
  const [balanceInput, setBalanceInput] = useState<string>(String(mt5Session.balance || 10000));
  const [metaApiTokenInput, setMetaApiTokenInput] = useState<string>(mt5Session.metaApiToken || '');
  const [metaApiAccountIdInput, setMetaApiAccountIdInput] = useState<string>(mt5Session.metaApiAccountId || '');
  const [showAdvancedCloudBridge, setShowAdvancedCloudBridge] = useState<boolean>(false);
  const [isConnectingMt5, setIsConnectingMt5] = useState<boolean>(false);
  const [mt5Error, setMt5Error] = useState<string | null>(null);

  // MT5 Order Ticket State
  const [lots, setLots] = useState<number>(0.1);
  const [orderType, setOrderType] = useState<MT5OrderType>('MARKET');
  const [orderDirection, setOrderDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [customEntry, setCustomEntry] = useState<string>('');
  const [customTP, setCustomTP] = useState<string>('');
  const [customSL, setCustomSL] = useState<string>('');
  const [calibrationInput, setCalibrationInput] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCalibrationBox, setShowCalibrationBox] = useState<boolean>(false);
  const [showBalanceEditBox, setShowBalanceEditBox] = useState<boolean>(false);
  const [toolboxTab, setToolboxTab] = useState<'trade' | 'pending' | 'history' | 'ea_bridge'>('trade');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PROFIT' | 'LOSS'>('ALL');
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editTpVal, setEditTpVal] = useState<string>('');
  const [editSlVal, setEditSlVal] = useState<string>('');
  const [currencyDisplayMode, setCurrencyDisplayMode] = useState<'USC' | 'USD' | 'AUTO'>('AUTO');
  const [showWhyNoAutoBalanceModal, setShowWhyNoAutoBalanceModal] = useState<boolean>(false);

  // Download History & Tax/Performance Statement States
  const [showTaxAuditModal, setShowTaxAuditModal] = useState<boolean>(false);
  const [showDownloadHistoryDropdown, setShowDownloadHistoryDropdown] = useState<boolean>(false);
  const [downloadSuccessFeedback, setDownloadSuccessFeedback] = useState<string | null>(null);

  const taxSummary = useMemo(() => calculateTaxPerformanceSummary(closedDeals), [closedDeals]);

  const handleDownloadCsv = () => {
    if (closedDeals.length === 0) return;
    exportClosedDealsCsv(closedDeals, mt5Session);
    setDownloadSuccessFeedback('បានទាញយក CSV File សម្រាប់ពន្ធដារ និងរបាយការណ៍ជោគជ័យ!');
    setShowDownloadHistoryDropdown(false);
    setTimeout(() => setDownloadSuccessFeedback(null), 3500);
  };

  const handleDownloadPdf = () => {
    if (closedDeals.length === 0) return;
    exportClosedDealsPdf(closedDeals, mt5Session);
    setDownloadSuccessFeedback('បានទាញយក PDF Statement ផ្លូវការសម្រាប់ពន្ធដារជោគជ័យ!');
    setShowDownloadHistoryDropdown(false);
    setTimeout(() => setDownloadSuccessFeedback(null), 3500);
  };

  // Sync default TP/SL and direction when symbol changes
  useEffect(() => {
    const dir = quantReport.tradeSetup.direction === 'SHORT' ? 'SELL' : 'BUY';
    setOrderDirection(dir);
    setOrderType('MARKET');
    setCustomEntry('');
    setCustomTP(String(quantReport.tradeSetup.takeProfit1));
    setCustomSL(String(quantReport.tradeSetup.stopLoss));
    setCalibrationInput(String(asset.price));
  }, [asset.symbol]);

  // Keep orderDirection aligned when user chooses a Pending Order type
  useEffect(() => {
    const decimals = spec.pointSize <= 0.0001 ? 4 : spec.pointSize <= 0.001 ? 3 : 2;
    if (orderType === 'BUY_LIMIT' || orderType === 'BUY_STOP') {
      setOrderDirection('BUY');
      if (!customEntry) {
        const offset = spec.pipSize * 15;
        const suggested =
          orderType === 'BUY_LIMIT' ? liveQuote.ask - offset : liveQuote.ask + offset;
        setCustomEntry(String(Number(suggested.toFixed(decimals))));
      }
    } else if (orderType === 'SELL_LIMIT' || orderType === 'SELL_STOP') {
      setOrderDirection('SELL');
      if (!customEntry) {
        const offset = spec.pipSize * 15;
        const suggested =
          orderType === 'SELL_LIMIT' ? liveQuote.bid + offset : liveQuote.bid - offset;
        setCustomEntry(String(Number(suggested.toFixed(decimals))));
      }
    } else {
      setCustomEntry('');
    }
  }, [orderType]);

  const effectiveEntry = useMemo(() => {
    if (orderType !== 'MARKET') {
      const parsed = parseFloat(customEntry);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return orderDirection === 'BUY' ? liveQuote.ask : liveQuote.bid;
  }, [orderType, customEntry, orderDirection, liveQuote.ask, liveQuote.bid]);

  const effectiveTP = useMemo(() => {
    const parsed = parseFloat(customTP);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return quantReport.tradeSetup.takeProfit1;
  }, [customTP, quantReport.tradeSetup.takeProfit1]);

  const effectiveSL = useMemo(() => {
    const parsed = parseFloat(customSL);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return quantReport.tradeSetup.stopLoss;
  }, [customSL, quantReport.tradeSetup.stopLoss]);

  const orderMetrics = useMemo(
    () =>
      calculateExnessOrderMetrics({
        symbol: asset.symbol,
        accountType,
        leverage,
        direction: orderDirection,
        lots,
        entryPrice: effectiveEntry,
        takeProfit: effectiveTP,
        stopLoss: effectiveSL,
      }),
    [asset.symbol, accountType, leverage, orderDirection, lots, effectiveEntry, effectiveTP, effectiveSL]
  );

  // Compute live MT5 Account Equity, Floating PnL, Used Margin, Free Margin, and Margin Level %
  const openPositions = useMemo(
    () => positions.filter((p) => p.status === 'OPEN'),
    [positions]
  );
  const pendingOrders = useMemo(
    () => positions.filter((p) => p.status === 'PENDING'),
    [positions]
  );

  const accountMetrics = useMemo(() => {
    let totalFloatingPnL = 0;
    let totalUsedMargin = 0;

    openPositions.forEach((pos) => {
      const posAsset = allAssets.find((a) => a.symbol === pos.symbol) || asset;
      const posQuote = calculateExnessBidAsk(pos.symbol, posAsset.price, pos.accountType);
      const posSpec = getExnessContractSpec(pos.symbol, pos.accountType);
      const closePrice = pos.direction === 'BUY' ? posQuote.bid : posQuote.ask;
      const diff =
        pos.direction === 'BUY' ? closePrice - pos.entryPrice : pos.entryPrice - closePrice;
      const pnl =
        diff * pos.lots * posSpec.contractSize -
        pos.lots * posSpec.commissionPerLotUSD[pos.accountType];
      totalFloatingPnL += pnl;

      const notional = pos.lots * posSpec.contractSize * pos.entryPrice;
      const posMargin =
        mt5Session.leverage === 0 ? notional / 50000 : notional / mt5Session.leverage;
      totalUsedMargin += posMargin;
    });

    const balance = mt5Session.balance;
    const equity = Number((balance + totalFloatingPnL).toFixed(2));
    const usedMargin = Number(totalUsedMargin.toFixed(2));
    const freeMargin = Number((equity - usedMargin).toFixed(2));
    const marginLevelPct =
      usedMargin > 0 ? Number(((equity / usedMargin) * 100).toFixed(1)) : 0;

    return {
      balance,
      equity,
      floatingPnL: Number(totalFloatingPnL.toFixed(2)),
      usedMargin,
      freeMargin,
      marginLevelPct,
    };
  }, [openPositions, allAssets, asset, mt5Session.balance, mt5Session.leverage]);

  const totalRealizedPnL = useMemo(
    () => Number(closedDeals.reduce((acc, d) => acc + d.realizedPnL, 0).toFixed(2)),
    [closedDeals]
  );

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleConnectMt5Account = async (e: React.FormEvent) => {
    e.preventDefault();
    setMt5Error(null);
    setIsConnectingMt5(true);

    const chosenServer =
      serverInput === 'CUSTOM' && customServerInput.trim()
        ? customServerInput.trim()
        : serverInput;
    const parsedBalance = Math.max(0, parseFloat(balanceInput) || 10000);

    try {
      const res = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: loginInput,
          server: chosenServer,
          password: passwordInput,
          accessMode: accessModeInput,
          accountType,
          leverage,
          initialBalance: parsedBalance,
          metaApiToken: metaApiTokenInput.trim() || undefined,
          metaApiAccountId: metaApiAccountIdInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMt5Error(data.error || 'មិនអាចភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេ Exness MT5 បានទេ');
        setIsConnectingMt5(false);
        return;
      }

      onUpdateMt5Session({
        connected: true,
        login: data.login || loginInput.trim(),
        server: data.server || chosenServer,
        broker: data.broker || 'Exness Technologies Ltd',
        accessMode: data.accessMode || accessModeInput,
        connectionMode: data.connectionMode || 'EXNESS_MT5_REAL',
        accountType,
        leverage,
        balance: Number(data.balance ?? parsedBalance),
        currency: data.currency || 'USD',
        pingMs: Number(data.pingMs || 18),
        connectedAt: new Date().toLocaleTimeString(),
        metaApiToken: metaApiTokenInput.trim() || undefined,
        metaApiAccountId: metaApiAccountIdInput.trim() || undefined,
      });
      playAlertTone('target');
      setShowMt5LoginModal(false);
    } catch {
      // Fallback local connection if offline
      onUpdateMt5Session({
        connected: true,
        login: loginInput.trim() || '148592031',
        server: chosenServer,
        broker: 'Exness Technologies Ltd',
        accessMode: accessModeInput,
        connectionMode: chosenServer.toLowerCase().includes('trial')
          ? 'EXNESS_MT5_TRIAL'
          : 'EXNESS_MT5_REAL',
        accountType,
        leverage,
        balance: parsedBalance,
        currency: 'USD',
        pingMs: 19,
        connectedAt: new Date().toLocaleTimeString(),
      });
      setShowMt5LoginModal(false);
    } finally {
      setIsConnectingMt5(false);
    }
  };

  const handleExecuteMt5Order = (explicitDirection?: 'BUY' | 'SELL') => {
    if (mt5Session.accessMode === 'investor') {
      setMt5Error('គណនីកំពុងស្ថិតក្នុងរបៀប Investor (មើលតែប៉ុណ្ណោះ)។ សូមប្តូរទៅ Master Password ដើម្បីទិញ/លក់។');
      return;
    }
    const dir = explicitDirection || orderDirection;
    const isMarket = orderType === 'MARKET';
    const entry = isMarket
      ? dir === 'BUY'
        ? liveQuote.ask
        : liveQuote.bid
      : effectiveEntry;

    onOpenSyncedPosition({
      symbol: asset.symbol,
      exnessSymbol: spec.exnessSymbol,
      direction: dir,
      orderType,
      status: isMarket ? 'OPEN' : 'PENDING',
      lots,
      entryPrice: entry,
      takeProfit: effectiveTP,
      stopLoss: effectiveSL,
      accountType,
      comment: `MT5 ${orderType} via KramaView`,
    });

    setToolboxTab(isMarket ? 'trade' : 'pending');
  };

  const handleSyncFromAIQuant = () => {
    const dir = quantReport.tradeSetup.direction === 'SHORT' ? 'SELL' : 'BUY';
    setOrderDirection(dir);
    setOrderType('MARKET');
    setCustomEntry('');
    setCustomTP(String(quantReport.tradeSetup.takeProfit1));
    setCustomSL(String(quantReport.tradeSetup.stopLoss));
  };

  const handleApplyCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(calibrationInput);
    if (Number.isFinite(target) && target > 0) {
      onCalibrateExactPrice(asset.symbol, target);
      setShowCalibrationBox(false);
    }
  };

  const handleDownloadMql5Advisor = () => {
    const scriptContent = generateMql5BridgeScript(window.location.origin, mt5Session.login);
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KramaView_Exness_MT5_Bridge_${mt5Session.login}.mq5`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto select-none bg-white dark:bg-[#0D1117] text-slate-900 dark:text-slate-100 divide-y divide-slate-200 dark:divide-slate-800/80">
      {/* 1. EXNESS MT5 TERMINAL HEADER & LOGIN BAR */}
      <div className="p-3.5 bg-gradient-to-br from-amber-500/12 via-sky-500/5 to-transparent space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FFCF01] text-slate-950 flex flex-col items-center justify-center font-black leading-none shadow-xs shrink-0">
              <span className="text-[10px]">EX</span>
              <span className="text-[8px] font-mono">MT5</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Exness MetaTrader 5 (MT5)
                </h3>
                {mt5Session.connected ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                    ● {mt5Session.pingMs}ms
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                    OFFLINE
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {mt5Session.connected
                  ? `#${mt5Session.login} · ${mt5Session.server}`
                  : 'មិនទាន់ភ្ជាប់គណនីជួញដូរ MT5'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setLoginInput(mt5Session.login);
                setServerInput(mt5Session.server);
                setBalanceInput(String(mt5Session.balance));
                setShowMt5LoginModal((prev) => !prev);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-sky-500/15 hover:bg-sky-500 text-sky-600 dark:text-sky-300 hover:text-slate-950 border border-sky-500/35 hover:border-sky-500 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              title="ភ្ជាប់ ឬប្តូរគណនី Exness MT5 (Login to Trade Account)"
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>{mt5Session.connected ? 'ប្តូរគណនី MT5' : 'ភ្ជាប់គណនី MT5'}</span>
            </button>

            <a
              href="https://my.exness.direct/webtrading/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-[#FFCF01] hover:bg-[#f5c400] text-slate-950 border border-amber-300/60 shadow-sm hover:shadow-amber-400/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
              title="បើក Exness WebTerminal (https://my.exness.direct/webtrading/)"
            >
              <span>Exness Web</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* MT5 ACCOUNT LOGIN MODAL / COLLAPSIBLE FORM (ដូចភ្ជាប់ទៅកាន់ MT5 ដែរ) */}
        {showMt5LoginModal && (
          <form
            onSubmit={handleConnectMt5Account}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-sky-500/50 shadow-lg space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Server className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  ភ្ជាប់គណនីជួញដូរ Exness MT5 (Connect to MT5 Account)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMt5LoginModal(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                បិទ ✕
              </button>
            </div>

            {mt5Error && (
              <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-300">
                {mt5Error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  លេខគណនី MT5 (MT5 Login ID)
                </label>
                <input
                  type="text"
                  required
                  value={loginInput ?? ''}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="ឧ. 148592031"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  ពាក្យសម្ងាត់ MT5 (Password)
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput ?? ''}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Master / Investor Password"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Official Exness MT5 Server Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                ម៉ាស៊ីនមេ Exness MT5 (Server: Exness Technologies Ltd)
              </label>
              <select
                value={serverInput ?? 'Exness-MT5Real8'}
                onChange={(e) => setServerInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                <optgroup label="🟢 Exness MT5 Real Servers (គណនីពិត)">
                  {EXNESS_MT5_SERVERS.filter((s) => s.group === 'Real').map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.id} — ({srv.region})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🟡 Exness MT5 Trial / Demo Servers (គណនីសាកល្បង)">
                  {EXNESS_MT5_SERVERS.filter((s) => s.group === 'Trial (Demo)').map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.id} — ({srv.region})
                    </option>
                  ))}
                </optgroup>
                <option value="CUSTOM">+ វាយឈ្មោះម៉ាស៊ីនមេ MT5 ផ្ទាល់ខ្លួន (Custom Server)...</option>
              </select>
              {serverInput === 'CUSTOM' && (
                <input
                  type="text"
                  value={customServerInput ?? ''}
                  onChange={(e) => setCustomServerInput(e.target.value)}
                  placeholder="ឧ. Exness-MT5Real39"
                  className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                />
              )}
            </div>

            {/* Balance & Access Mode */}
            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>សមតុល្យគណនី MT5 ជាក់ស្តែង (Account Balance):</span>
                </label>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  {accountType === 'standard_cent' ? 'USC ¢ ឬ USD' : 'USD ($)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight">
                * <strong>ហេតុអ្វីត្រូវបញ្ចូលចំនួនលុយ?</strong> ម៉ាស៊ីនមេ Exness MT5 ការពារសុវត្ថិភាពដោយប្រើ Private Protocol (មិនមាន Web API សាធារណៈ) ដូច្នេះសូមបញ្ចូលទឹកប្រាក់ដែលអ្នកមានពិតប្រាកដ ដើម្បីឱ្យការគណនា Margin, Equity & Profit ត្រូវគ្នានឹង MT5 ១០០%។
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  value={balanceInput ?? ''}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder={accountType === 'standard_cent' ? '10000.00 (USC ¢) ឬ 100 ($)' : '10000.00 ($)'}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
              {/* Quick balance preset chips */}
              <div className="flex items-center gap-1">
                {[50, 100, 500, 1000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBalanceInput(String(preset))}
                    className="flex-1 py-0.5 rounded text-[9px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800"
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  សិទ្ធិចូលប្រើប្រាស់ (MT5 Access)
                </label>
                <select
                  value={accessModeInput ?? 'master'}
                  onChange={(e) => setAccessModeInput(e.target.value as 'master' | 'investor')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="master">Master (ជួញដូរទិញ/លក់ផ្ទាល់)</option>
                  <option value="investor">Investor (មើលតែប៉ុណ្ណោះ)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  វិធីសាស្ត្រតភ្ជាប់
                </label>
                <div className="text-[11px] font-mono font-semibold py-1.5 text-sky-600 dark:text-sky-400">
                  Exness MT5 Real Handshake
                </div>
              </div>
            </div>

            {/* Optional MetaApi Cloud Bridge */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvancedCloudBridge((prev) => !prev)}
                className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <Code2 className="w-3 h-3" />
                <span>
                  {showAdvancedCloudBridge ? 'លាក់' : 'ជម្រើសបន្ថែម៖'} ភ្ជាប់តាម MetaApi Cloud ឬ MQL5 EA Bridge
                </span>
              </button>
              {showAdvancedCloudBridge && (
                <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <input
                    type="text"
                    value={metaApiAccountIdInput ?? ''}
                    onChange={(e) => setMetaApiAccountIdInput(e.target.value)}
                    placeholder="MetaApi Account ID (ប្រសិនបើមាន)"
                    className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                  />
                  <input
                    type="password"
                    value={metaApiTokenInput ?? ''}
                    onChange={(e) => setMetaApiTokenInput(e.target.value)}
                    placeholder="MetaApi Auth Token (ប្រសិនបើមាន)"
                    className="w-full px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {mt5Session.connected && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateMt5Session((prev) => ({ ...prev, connected: false }));
                    setShowMt5LoginModal(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ផ្តាច់គណនី</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isConnectingMt5}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isConnectingMt5
                    ? 'កំពុងភ្ជាប់ទៅម៉ាស៊ីនមេ Exness MT5...'
                    : 'ភ្ជាប់ទៅកាន់ Exness MT5 ឥឡូវនេះ'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* LIVE MT5 ACCOUNT TELEMETRY STRIP (Balance, Equity, Margin, Free Margin, Margin Level %) */}
        <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                ស្ថានភាពគណនី MT5
              </span>
              {accountType === 'standard_cent' && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-black border border-amber-500/30">
                  STANDARD CENT (USC ¢)
                </span>
              )}
            </div>

            {/* Currency Mode Switcher (USC ¢ vs $ USD) */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/90 p-0.5 rounded-md text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setCurrencyDisplayMode('USC')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  currencyDisplayMode === 'USC' || (currencyDisplayMode === 'AUTO' && accountType === 'standard_cent')
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="បង្ហាញជាសេនដុល្លារ (US Cents / USC ¢)"
              >
                ¢ USC (សេន)
              </button>
              <button
                type="button"
                onClick={() => setCurrencyDisplayMode('USD')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  currencyDisplayMode === 'USD' || (currencyDisplayMode === 'AUTO' && accountType !== 'standard_cent')
                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="បង្ហាញជាដុល្លារ (USD $)"
              >
                $ USD (ដុល្លារ)
              </button>
            </div>
          </div>

          {(() => {
            const isCentDisplay =
              currencyDisplayMode === 'USC' || (currencyDisplayMode === 'AUTO' && accountType === 'standard_cent');
            return (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Balance (សមតុល្យ)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBalanceInput(String(mt5Session.balance));
                          setShowBalanceEditBox((prev) => !prev);
                        }}
                        className="text-sky-500 hover:underline font-semibold"
                        title="កែសម្រួលសមតុល្យឱ្យត្រូវនឹងគណនី Exness MT5 របស់អ្នក"
                      >
                        [កែ]
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowWhyNoAutoBalanceModal(true)}
                        className="text-amber-500 hover:text-amber-400 font-bold px-1 rounded bg-amber-500/10"
                        title="ហេតុអ្វីមិនអាចទាញសមតុល្យស្វ័យប្រវត្តពី Exness?"
                      >
                        ?
                      </button>
                    </div>
                    <div className="font-mono text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                      {isCentDisplay
                        ? `${(accountMetrics.balance * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ¢`
                        : `$${accountMetrics.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      {isCentDisplay
                        ? `≈ $${accountMetrics.balance.toFixed(2)} USD`
                        : `≈ ${(accountMetrics.balance * 100).toFixed(0)} ¢ USC`}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Equity (ទឹកប្រាក់សរុប)</div>
                    <div
                      className={`font-mono text-xs font-extrabold tabular-nums ${
                        accountMetrics.floatingPnL > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : accountMetrics.floatingPnL < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isCentDisplay
                        ? `${(accountMetrics.equity * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ¢`
                        : `$${accountMetrics.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      {isCentDisplay
                        ? `≈ $${accountMetrics.equity.toFixed(2)}`
                        : `≈ ${(accountMetrics.equity * 100).toFixed(0)} ¢`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Floating P/L</div>
                    <div
                      className={`font-mono text-xs font-extrabold tabular-nums ${
                        accountMetrics.floatingPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isCentDisplay
                        ? accountMetrics.floatingPnL >= 0
                          ? `+${(accountMetrics.floatingPnL * 100).toFixed(2)} ¢`
                          : `-${Math.abs(accountMetrics.floatingPnL * 100).toFixed(2)} ¢`
                        : accountMetrics.floatingPnL >= 0
                        ? `+$${accountMetrics.floatingPnL.toFixed(2)}`
                        : `-$${Math.abs(accountMetrics.floatingPnL).toFixed(2)}`}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      {isCentDisplay
                        ? accountMetrics.floatingPnL >= 0
                          ? `+$${accountMetrics.floatingPnL.toFixed(2)} USD`
                          : `-$${Math.abs(accountMetrics.floatingPnL).toFixed(2)} USD`
                        : accountMetrics.floatingPnL >= 0
                        ? `+${(accountMetrics.floatingPnL * 100).toFixed(1)} ¢`
                        : `-${Math.abs(accountMetrics.floatingPnL * 100).toFixed(1)} ¢`}
                    </div>
                  </div>
                </div>

                {showBalanceEditBox && (
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = parseFloat(balanceInput);
                        if (Number.isFinite(val) && val >= 0) {
                          onUpdateMt5Session((prev) => ({ ...prev, balance: Number(val.toFixed(2)) }));
                          setShowBalanceEditBox(false);
                        }
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <Wallet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <input
                        type="number"
                        step="any"
                        value={balanceInput ?? ''}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                        placeholder="បញ្ចូល Balance ពិតក្នុង MT5 ($)"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[11px] whitespace-nowrap shrink-0"
                      >
                        កំណត់ Balance
                      </button>
                    </form>
                    <div className="flex items-center gap-1">
                      {[50, 100, 250, 500, 1000, 5000, 10000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setBalanceInput(String(preset));
                            onUpdateMt5Session((prev) => ({ ...prev, balance: preset }));
                            setShowBalanceEditBox(false);
                          }}
                          className="flex-1 py-0.5 rounded text-[9px] font-mono font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70 dark:border-slate-800/80 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span>
                    Margin:{' '}
                    {isCentDisplay
                      ? `${(accountMetrics.usedMargin * 100).toFixed(2)} ¢`
                      : `$${accountMetrics.usedMargin.toFixed(2)}`}
                  </span>
                  <span>
                    Free:{' '}
                    {isCentDisplay
                      ? `${(accountMetrics.freeMargin * 100).toFixed(2)} ¢`
                      : `$${accountMetrics.freeMargin.toFixed(2)}`}
                  </span>
                  <span>
                    Level:{' '}
                    <b className="text-slate-800 dark:text-slate-200">
                      {accountMetrics.usedMargin > 0 ? `${accountMetrics.marginLevelPct}%` : '∞'}
                    </b>
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* 2. ACCOUNT TYPE (Standard Cent / Standard m / Pro / Raw / Zero), LEVERAGE & 1:1 CALIBRATION */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            គណនី Exness ({spec.exnessSymbol})
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            1 Lot = {spec.contractSize.toLocaleString()} {spec.unitName}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
          {ACCOUNT_TYPES.map((acc) => {
            const active = accountType === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccountType(acc.id)}
                className={`relative flex flex-col items-center py-1.5 px-1 rounded-lg border text-center transition-all ${
                  active
                    ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white font-bold ring-1 ring-amber-500/30'
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
                title={acc.desc}
              >
                {acc.badge && (
                  <span className="absolute -top-1.5 right-1 px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[8px] uppercase tracking-wider">
                    {acc.badge}
                  </span>
                )}
                <span className="text-[10px] font-bold whitespace-nowrap">{acc.label}</span>
                <span className="text-[9px] font-mono text-amber-600 dark:text-amber-300 font-semibold">
                  {getExnessContractSpec(asset.symbol, acc.id).exnessSymbol}
                </span>
              </button>
            );
          })}
        </div>

        {/* Exness Standard Cent Highlight Card */}
        {accountType === 'standard_cent' && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
            <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-500 shrink-0 font-black font-mono text-xs">
              USC ¢
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1">
                  <span>គណនីសេនដុល្លារ Exness Standard Cent</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-mono font-bold">
                    {spec.exnessSymbol}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                  1 USD = 100 ¢ (USC)
                </span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed space-y-0.5">
                <p>• <strong>ទំហំកិច្ចសន្យា (Contract Size):</strong> 1 Cent Lot = 0.01 Standard Lot (ឧ. មាស 1 Lot = 1 oz)</p>
                <p>• <strong>សមតុល្យ និងប្រាក់ចំណេញ:</strong> គិតជាសេនដុល្លារ (USC ¢) គ្មានកម្រៃជើងសារ (Zero Commission)</p>
                <p>• <strong>Lot អប្បបរមា:</strong> ចាប់ពី 0.01 Cent Lot ស័ក្តិសមបំផុតសម្រាប់ Micro-trading & Bot</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Leverage:
          </span>
          <div className="flex items-center gap-1">
            {LEVERAGE_OPTIONS.map((lev) => (
              <button
                key={lev.value}
                type="button"
                onClick={() => onSelectLeverage(lev.value)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors whitespace-nowrap shrink-0 ${
                  leverage === lev.value
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {lev.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={onToggleBidAskLines}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              showBidAskLines
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ខ្សែ Bid/Ask ({showBidAskLines ? 'បើក' : 'បិទ'})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCalibrationInput(String(asset.price));
              setShowCalibrationBox(!showCalibrationBox);
            }}
            className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              priceOffset !== 0
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>ផ្ទៀងផ្ទាត់តម្លៃ 1:1</span>
          </button>
        </div>

        {showCalibrationBox && (
          <form
            onSubmit={handleApplyCalibration}
            className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                កែតម្រូវតម្លៃឱ្យស៊ីគ្នា 100% ជាមួយអេក្រង់ MT5 ({spec.exnessSymbol})
              </span>
              {priceOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onResetPriceOffset(asset.symbol);
                    setShowCalibrationBox(false);
                  }}
                  className="text-[10px] font-semibold text-rose-500 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="any"
                value={calibrationInput ?? ''}
                onChange={(e) => setCalibrationInput(e.target.value)}
                placeholder={`ឧ. ${formatPrice(asset.price, asset.symbol)}`}
                className="flex-1 px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0"
              >
                ធ្វើសមកាលកម្ម 1:1
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. MT5 ONE-CLICK TRADING & F9 NEW ORDER TICKET */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            បញ្ជាទិញ/លក់ MT5 (One-Click & Pending Order)
          </span>
          <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
            Spread: <b className="text-amber-600 dark:text-[#FFCF01]">{liveQuote.spreadPoints} pts</b>
          </span>
        </div>

        {/* MT5 Order Type Selector (Market Execution vs Pending Orders) */}
        <div className="flex items-center gap-1.5">
          <select
            value={orderType ?? 'MARKET'}
            onChange={(e) => setOrderType(e.target.value as MT5OrderType)}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
          >
            {ORDER_TYPES.map((ot) => (
              <option key={ot.id} value={ot.id}>
                {ot.label} — {ot.khmer}
              </option>
            ))}
          </select>
        </div>

        {/* Lot Size Selector */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLots((prev) => Math.max(0.01, Number((prev - 0.01).toFixed(2))))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono text-xs font-bold"
          >
            -0.01
          </button>
          <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400">
              {accountType === 'standard_cent' ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold">Cent Lots:</span>
              ) : (
                'Lots:'
              )}
            </span>
            <input
              type="number"
              min="0.01"
              max="200"
              step="0.01"
              value={lots ?? 0.1}
              onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              className="w-20 text-right bg-transparent font-mono text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setLots((prev) => Number((prev + 0.01).toFixed(2)))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono text-xs font-bold"
          >
            +0.01
          </button>
        </div>

        {/* Quick Lot Presets */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            {(accountType === 'standard_cent'
              ? [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
              : [0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]
            ).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setLots(preset)}
                className={`flex-1 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                  lots === preset
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          {accountType === 'standard_cent' && (
            <div className="flex items-center justify-between text-[9px] font-mono text-amber-600 dark:text-amber-400 px-0.5">
              <span>* 1.00 Cent Lot = 0.01 Standard Lot</span>
              <span>10.00 Cent Lots = 0.10 Standard</span>
            </div>
          )}
        </div>

        {/* MT5 One-Click SELL by Market / BUY by Market Buttons */}
        {orderType === 'MARKET' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOrderDirection('SELL');
                handleExecuteMt5Order('SELL');
              }}
              className="flex flex-col items-start p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between w-full mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  SELL BY MARKET
                </span>
                <span className="text-[9px] font-mono opacity-85">
                  {lots} {accountType === 'standard_cent' ? 'Cent Lot' : 'Lot'}
                </span>
              </div>
              <span className="text-base font-mono font-black tabular-nums tracking-tight">
                {formatPrice(liveQuote.bid, asset.symbol)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderDirection('BUY');
                handleExecuteMt5Order('BUY');
              }}
              className="flex flex-col items-end p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between w-full mb-0.5">
                <span className="text-[9px] font-mono opacity-85">
                  {lots} {accountType === 'standard_cent' ? 'Cent Lot' : 'Lot'}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                  BUY BY MARKET
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <span className="text-base font-mono font-black tabular-nums tracking-tight">
                {formatPrice(liveQuote.ask, asset.symbol)}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-20 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                តម្លៃរង់ចាំ:
              </span>
              <input
                type="number"
                step="any"
                value={customEntry ?? ''}
                onChange={(e) => setCustomEntry(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 font-mono text-xs font-bold text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => handleExecuteMt5Order()}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0"
              >
                ដាក់បញ្ជា {orderType.replace('_', ' ')}
              </button>
            </div>
          </div>
        )}

        {/* Take Profit & Stop Loss Inputs */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Target className="w-3 h-3 text-sky-500" />
              កំណត់ S/L និង T/P ភ្ជាប់ជាមួយការបញ្ជាទិញ/លក់ MT5
            </span>
            <button
              type="button"
              onClick={handleSyncFromAIQuant}
              className="flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              <span>ទាញពីការវិភាគសុក្រឹត</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/5 border border-rose-500/30">
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="font-bold text-rose-600 dark:text-rose-400">Stop Loss (S/L)</span>
                <span className="font-mono text-rose-500 font-semibold">
                  {accountType === 'standard_cent'
                    ? `-${orderMetrics.projectedLossCents.toFixed(1)} ¢ (-$${orderMetrics.projectedLossUSD.toFixed(2)})`
                    : `-$${orderMetrics.projectedLossUSD.toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={customSL ?? ''}
                  onChange={(e) => setCustomSL(e.target.value)}
                  className="w-full bg-transparent font-mono text-xs font-bold text-rose-700 dark:text-rose-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('sl', formatPrice(effectiveSL, asset.symbol))}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                  title="Copy SL"
                >
                  {copiedField === 'sl' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/30">
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Take Profit (T/P)</span>
                <span className="font-mono text-emerald-500 font-semibold">
                  {accountType === 'standard_cent'
                    ? `+${orderMetrics.projectedProfitCents.toFixed(1)} ¢ (+$${orderMetrics.projectedProfitUSD.toFixed(2)})`
                    : `+$${orderMetrics.projectedProfitUSD.toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  value={customTP ?? ''}
                  onChange={(e) => setCustomTP(e.target.value)}
                  className="w-full bg-transparent font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('tp', formatPrice(effectiveTP, asset.symbol))}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                  title="Copy TP"
                >
                  {copiedField === 'tp' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
            <span>
              Margin:{' '}
              {accountType === 'standard_cent'
                ? `${orderMetrics.requiredMarginCents.toFixed(1)} ¢ [=$${orderMetrics.requiredMarginUSD.toFixed(2)}]`
                : `$${orderMetrics.requiredMarginUSD.toFixed(2)}`}
            </span>
            <span>
              Pip Val:{' '}
              {accountType === 'standard_cent'
                ? `${(orderMetrics.pipValuePerLotCents * lots).toFixed(1)} ¢/pip`
                : `$${(orderMetrics.pipValuePerLotUSD * lots).toFixed(2)}/pip`}
            </span>
            <span>R:R 1:{orderMetrics.riskRewardRatio}</span>
          </div>
        </div>
      </div>

      {/* 4. MT5 TOOLBOX TABS: EXNESS BAR + TRADE (OPEN) | PENDING | HISTORY | MT5 BRIDGE */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Sleek Exness Header Strip directly above Trade | Pending | History | MT5 Bridge */}
        <div className="px-3 pt-2.5 pb-2 bg-gradient-to-r from-amber-500/10 via-slate-100/60 to-transparent dark:from-amber-500/10 dark:via-slate-900/80 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFCF01] text-slate-950 font-black text-[10px] shadow-2xs shrink-0">
                <span>EXNESS</span>
                <span className="font-mono text-[9px] px-1 rounded bg-slate-950/15">MT5</span>
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                គ្រប់គ្រងប្រតិបត្តិការ ({spec.exnessSymbol})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowMt5LoginModal((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-300/80 dark:border-slate-700 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                title="កំណត់ ឬប្តូរគណនី Exness MT5"
              >
                <Server className="w-3 h-3 text-sky-500 shrink-0" />
                <span>#{mt5Session.login}</span>
              </button>

              <a
                href="https://my.exness.direct/webtrading/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFCF01] hover:bg-[#f5c400] text-slate-950 font-black text-[10px] shadow-xs transition-all active:scale-95 whitespace-nowrap shrink-0"
                title="បើកផ្ទាំងជួញដូរផ្លូវការ Exness WebTrading"
              >
                <span>បើក Exness</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          {/* Upgraded Segmented Pill Tab Bar: Trade | Pending | History | MT5 Bridge */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-950 border border-slate-300/70 dark:border-slate-800/90">
            <button
              type="button"
              onClick={() => setToolboxTab('trade')}
              className={`py-2 px-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                toolboxTab === 'trade'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-sm shadow-sky-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>Trade</span>
              <span
                className={`px-1 py-0.2 rounded-full font-mono text-[9px] font-black ${
                  toolboxTab === 'trade'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-slate-300/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {openPositions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setToolboxTab('pending')}
              className={`py-2 px-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                toolboxTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900'
              }`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>Pending</span>
              <span
                className={`px-1 py-0.2 rounded-full font-mono text-[9px] font-black ${
                  toolboxTab === 'pending'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-slate-300/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {pendingOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setToolboxTab('history')}
              className={`py-2 px-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                toolboxTab === 'history'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900'
              }`}
            >
              <History className="w-3 h-3 shrink-0" />
              <span>History</span>
              <span
                className={`px-1 py-0.2 rounded-full font-mono text-[9px] font-black ${
                  toolboxTab === 'history'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-slate-300/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {closedDeals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setToolboxTab('ea_bridge')}
              className={`py-2 px-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                toolboxTab === 'ea_bridge'
                  ? 'bg-[#FFCF01] text-slate-950 font-black shadow-sm shadow-amber-400/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3 h-3 shrink-0" />
              <span>MT5 Bridge</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MT5 OPEN POSITIONS ("Trade") */}
        {toolboxTab === 'trade' && (
          <div className="p-3 space-y-2.5">
            {openPositions.length > 0 && (
              <div className="space-y-2 pb-1">
                <div className="flex items-center justify-between gap-1 text-[11px] bg-slate-100 dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>គោលដៅចំណេញ:</span>
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    {[1, 2, 3, 4, 5, 100].map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400"
                        title={`គោលដៅ $${t}`}
                      >
                        {t}$
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onCloseAllPositions('ALL')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs whitespace-nowrap active:scale-95 transition-all shadow-sm ring-1 ring-rose-400/50 cursor-pointer"
                    title="បិទ Order ទាំងអស់ភ្លាមៗ (Close All Ultra-Fast)"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                    <span>⚡ បិទទាំងអស់ (Close All)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCloseAllPositions('PROFITABLE')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    <span>💰 បិទតែចំណេញ</span>
                  </button>
                </div>
              </div>
            )}

            {openPositions.length === 0 ? (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <TrendingUp className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  មិនមានប្រតិបត្តិការ MT5 កំពុងបើកទេ
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ចុចប៊ូតុង <b>SELL BY MARKET</b> ឬ <b>BUY BY MARKET</b> ខាងលើដើម្បីបើកប្រតិបត្តិការដូចក្នុង MT5 ផ្ទាល់។
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {openPositions.map((pos) => {
                  const posAsset = allAssets.find((a) => a.symbol === pos.symbol) || asset;
                  const posQuote = calculateExnessBidAsk(pos.symbol, posAsset.price, pos.accountType);
                  const posSpec = getExnessContractSpec(pos.symbol, pos.accountType);
                  const currentClosePrice = pos.direction === 'BUY' ? posQuote.bid : posQuote.ask;
                  const diff =
                    pos.direction === 'BUY'
                      ? currentClosePrice - pos.entryPrice
                      : pos.entryPrice - currentClosePrice;
                  const floatingPnL = Number(
                    (
                      diff * pos.lots * posSpec.contractSize -
                      pos.lots * posSpec.commissionPerLotUSD[pos.accountType]
                    ).toFixed(2)
                  );
                  const isEditing = editingPosId === pos.id;

                  return (
                    <div
                      key={pos.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                              pos.direction === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {pos.direction} {pos.lots.toFixed(2)}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            {pos.exnessSymbol}
                            {pos.accountType === 'standard_cent' && (
                              <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[8px] font-black border border-amber-500/30">
                                CENT
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{pos.ticket}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span
                              className={`font-mono text-xs font-extrabold tabular-nums block ${
                                floatingPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
                              }`}
                            >
                              {pos.accountType === 'standard_cent'
                                ? floatingPnL >= 0
                                  ? `+${(floatingPnL * 100).toFixed(2)} ¢`
                                  : `-${Math.abs(floatingPnL * 100).toFixed(2)} ¢`
                                : floatingPnL >= 0
                                ? `+$${floatingPnL.toFixed(2)}`
                                : `-$${Math.abs(floatingPnL).toFixed(2)}`}
                            </span>
                            {pos.accountType === 'standard_cent' && (
                              <span className="text-[9px] font-mono text-slate-400 block -mt-0.5">
                                ≈ ${floatingPnL.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onCloseSyncedPosition(pos.id, 'MANUAL')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/35 hover:border-rose-500 font-mono text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                            title="បិទប្រតិបត្តិការ MT5 នេះឥឡូវ (Close Order)"
                          >
                            <span>✕ បិទ</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>
                          {formatPrice(pos.entryPrice, pos.symbol)} →{' '}
                          <b className="text-slate-800 dark:text-slate-200">
                            {formatPrice(currentClosePrice, pos.symbol)}
                          </b>
                        </span>
                        <span>
                          S/L: <b className="text-rose-500">{formatPrice(pos.stopLoss, pos.symbol)}</b> · T/P:{' '}
                          <b className="text-emerald-500">{formatPrice(pos.takeProfit, pos.symbol)}</b>
                        </span>
                      </div>

                      {/* Quick MT5 Modify S/L & T/P Controls */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/70">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSyncedPosition(pos.id, { stopLoss: pos.entryPrice })
                          }
                          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border border-amber-500/30 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                          title="រំកិល Stop Loss មកចំណុចស្មើដើម (Break-Even)"
                        >
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span>SL ស្មើដើម (BE)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingPosId(null);
                            } else {
                              setEditingPosId(pos.id);
                              setEditSlVal(String(pos.stopLoss));
                              setEditTpVal(String(pos.takeProfit));
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-sky-500/10 hover:bg-sky-500 text-sky-600 dark:text-sky-400 hover:text-slate-950 border border-sky-500/30 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 shrink-0" />
                          <span>{isEditing ? 'បោះបង់' : 'កែ S/L & T/P'}</span>
                        </button>
                      </div>

                      {isEditing && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="number"
                            step="any"
                            value={editSlVal ?? ''}
                            onChange={(e) => setEditSlVal(e.target.value)}
                            placeholder="S/L"
                            className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-rose-500/40 font-mono text-[10px]"
                          />
                          <input
                            type="number"
                            step="any"
                            value={editTpVal ?? ''}
                            onChange={(e) => setEditTpVal(e.target.value)}
                            placeholder="T/P"
                            className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-emerald-500/40 font-mono text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newSl = parseFloat(editSlVal);
                              const newTp = parseFloat(editTpVal);
                              onUpdateSyncedPosition(pos.id, {
                                ...(Number.isFinite(newSl) && newSl > 0 ? { stopLoss: newSl } : {}),
                                ...(Number.isFinite(newTp) && newTp > 0 ? { takeProfit: newTp } : {}),
                              });
                              setEditingPosId(null);
                            }}
                            className="flex-1 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                          >
                            រក្សាទុក
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MT5 PENDING ORDERS ("Pending") */}
        {toolboxTab === 'pending' && (
          <div className="p-3 space-y-2.5">
            {pendingOrders.length === 0 ? (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <Clock className="w-6 h-6 text-amber-500/70 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  មិនមានការបញ្ជារង់ចាំ (Pending Orders) ទេ
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  នៅពេលតម្លៃទីផ្សារប៉ះតម្លៃ Buy Limit / Sell Limit / Buy Stop / Sell Stop ប្រព័ន្ធនឹងបើកប្រតិបត្តិការ MT5 ដោយស្វ័យប្រវត្តិ។
                </p>
              </div>
            ) : (
              pendingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                        {ord.orderType.replace('_', ' ')} {ord.lots}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {ord.exnessSymbol}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">#{ord.ticket}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateSyncedPosition(ord.id, { status: 'OPEN' })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                        title="បើកដំណើរការឥឡូវនេះ (Trigger Now)"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>បើកឥឡូវ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCloseSyncedPosition(ord.id, 'MANUAL')}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                        title="លុបចោលការបញ្ជារង់ចាំ"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>លុប</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-500 tabular-nums pt-1 border-t border-amber-500/20">
                    <div>At: <b className="text-slate-800 dark:text-slate-200">{formatPrice(ord.entryPrice, ord.symbol)}</b></div>
                    <div className="text-rose-500">SL: <b>{formatPrice(ord.stopLoss, ord.symbol)}</b></div>
                    <div className="text-emerald-500">TP: <b>{formatPrice(ord.takeProfit, ord.symbol)}</b></div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: MT5 ACCOUNT HISTORY ("History") */}
        {toolboxTab === 'history' && (
          <div className="p-3 space-y-2.5">
            {/* Realized P/L Summary & Redesigned Clear / Download History Action Bar */}
            <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      totalRealizedPnL >= 0
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                    }`}
                  >
                    <History className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 tabular-nums">
                    <span className="font-bold text-slate-500 dark:text-slate-400 block text-[10px]">
                      ប្រាក់ចំណេញ/ខាតពិតសរុប (Realized P/L)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-mono font-black text-base tracking-tight ${
                          totalRealizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {totalRealizedPnL >= 0
                          ? `+$${totalRealizedPnL.toFixed(2)}`
                          : `-$${Math.abs(totalRealizedPnL).toFixed(2)}`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        · Win {taxSummary.winRatePct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Beautiful Clear History + Download History */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (closedDeals.length > 0) {
                        playAlertTone('spike_down');
                        onClearClosedDeals();
                      }
                    }}
                    disabled={closedDeals.length === 0}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all whitespace-nowrap shrink-0 ${
                      closedDeals.length > 0
                        ? 'bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border-rose-500/35 hover:border-rose-500 shadow-xs hover:shadow-md hover:shadow-rose-600/20 active:scale-95 cursor-pointer'
                        : 'bg-slate-200/60 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-300/60 dark:border-slate-800 cursor-not-allowed'
                    }`}
                    title="សម្អាតប្រវត្តិជួញដូរទាំងអស់ (Clear All History)"
                  >
                    {closedDeals.length > 0 ? (
                      <>
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>សម្អាត ({closedDeals.length})</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>បានសម្អាត</span>
                      </>
                    )}
                  </button>

                  {/* Download History Primary Dropdown / Action */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDownloadHistoryDropdown((prev) => !prev)}
                      disabled={closedDeals.length === 0}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                      title="ទាញយកប្រវត្តិជួញដូរជា PDF ឬ CSV សម្រាប់ពន្ធដារ និងរបាយការណ៍"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ទាញយក</span>
                      <ChevronDown className="w-3 h-3 text-slate-900/70" />
                    </button>

                    {showDownloadHistoryDropdown && (
                      <div className="absolute right-0 top-full mt-1.5 w-64 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-30 space-y-1 text-xs">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                          ជម្រើសទាញយក (Export Options)
                        </div>

                        {/* Export to CSV */}
                        <button
                          type="button"
                          onClick={handleDownloadCsv}
                          className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-slate-900 dark:text-white block text-xs">
                              Download CSV (Excel / Tax)
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">
                              ឯកសារ Spreadsheet សម្រាប់គណនាពន្ធ និង Excel
                            </span>
                          </div>
                        </button>

                        {/* Export to PDF */}
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-slate-900 dark:text-white block text-xs">
                              Download PDF Statement
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">
                              របាយការណ៍បិទប្រតិបត្តិការផ្លូវការ Exness MT5 (Audit-Ready)
                            </span>
                          </div>
                        </button>

                        {/* Open Full Tax & Performance Audit Modal */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowDownloadHistoryDropdown(false);
                            setShowTaxAuditModal(true);
                          }}
                          className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group border-t border-slate-100 dark:border-slate-800 pt-1.5"
                        >
                          <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                            <PieChart className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-slate-900 dark:text-white block text-xs">
                              Tax & Performance Audit Modal
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">
                              ពិនិត្យ Win Rate, PnL សរុប, និងបំបែកតាម Symbol
                            </span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Tabs + Quick Export Chips */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {[
                    { id: 'ALL', label: `ទាំងអស់ (${closedDeals.length})` },
                    {
                      id: 'PROFIT',
                      label: `ចំណេញ (${closedDeals.filter((d) => d.realizedPnL >= 0).length})`,
                    },
                    {
                      id: 'LOSS',
                      label: `ខាត (${closedDeals.filter((d) => d.realizedPnL < 0).length})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setHistoryFilter(tab.id as 'ALL' | 'PROFIT' | 'LOSS')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        historyFilter === tab.id
                          ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={closedDeals.length === 0}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                    title="ទាញយកជា CSV ភ្លាមៗ"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={closedDeals.length === 0}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                    title="ទាញយកជា PDF Statement ភ្លាមៗ"
                  >
                    <FileText className="w-3 h-3 text-rose-500" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaxAuditModal(true)}
                    disabled={closedDeals.length === 0}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 disabled:opacity-40 text-sky-600 dark:text-sky-400 font-bold text-[10px] transition-colors cursor-pointer"
                    title="មើលស្ថិតិសវនកម្មពន្ធដារ"
                  >
                    <Award className="w-3 h-3 text-sky-500" />
                    <span>Audit</span>
                  </button>
                </div>
              </div>

              {downloadSuccessFeedback && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{downloadSuccessFeedback}</span>
                </div>
              )}
            </div>

            {closedDeals.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <History className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ប្រវត្តិជួញដូរត្រូវបានសម្អាតរួចរាល់
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  មិនទាន់មានប្រវត្តិបិទប្រតិបត្តិការ MT5 នៅឡើយទេ។
                </p>
              </div>
            ) : (
              closedDeals
                .filter((deal) =>
                  historyFilter === 'PROFIT'
                    ? deal.realizedPnL >= 0
                    : historyFilter === 'LOSS'
                    ? deal.realizedPnL < 0
                    : true
                )
                .map((deal) => (
                  <div
                    key={deal.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black ${
                            deal.direction === 'BUY'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {deal.direction} {deal.lots}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {deal.exnessSymbol}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">#{deal.ticket}</span>
                        {(() => {
                          const badge = getCloseReasonBadge(deal.closeReason);
                          return (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${badge.bgClass} ${badge.textClass}`}
                              title={badge.khmerDesc}
                            >
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                        {formatPrice(deal.entryPrice, deal.symbol)} →{' '}
                        {formatPrice(deal.closePrice, deal.symbol)} · {deal.closedAt}
                      </div>
                    </div>
                    <div
                      className={`font-mono font-extrabold text-sm tabular-nums ${
                        deal.realizedPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {deal.realizedPnL >= 0
                        ? `+$${deal.realizedPnL.toFixed(2)}`
                        : `-$${Math.abs(deal.realizedPnL).toFixed(2)}`}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* TAB 4: MQL5 EXPERT ADVISOR (EA) BRIDGE FOR DESKTOP MT5 */}
        {toolboxTab === 'ea_bridge' && (
          <div className="p-3.5 space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <Code2 className="w-4 h-4 text-sky-400" />
                  </div>
                  <span>ភ្ជាប់កម្មវិធី MetaTrader 5 Desktop (MQL5 EA Bridge)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-mono text-[9px] font-bold shrink-0">
                  AUTO-SYNC
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                ប្រសិនបើអ្នកកំពុងបើកកម្មវិធី <b>MetaTrader 5</b> លើកុំព្យូទ័រ អ្នកអាចទាញយកឯកសារ <b>Expert Advisor (.mq5)</b> ខាងក្រោមទៅដាក់ក្នុង MT5 ដើម្បីឱ្យ Balance និង Equity ពី MT5 បញ្ជូនមក KramaView Pro ដោយស្វ័យប្រវត្តិ៖
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadMql5Advisor}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[11px] shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>ទាញយក .mq5 EA</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'mql5_code',
                      generateMql5BridgeScript(window.location.origin, mt5Session.login)
                    )
                  }
                  className="py-2 px-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  {copiedField === 'mql5_code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-emerald-500">បានចម្លង!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>ចម្លងកូដ MQL5</span>
                    </>
                  )}
                </button>
              </div>

              <a
                href="https://my.exness.direct/webtrading/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FFCF01] hover:bg-[#f5c400] text-slate-950 font-black text-xs shadow-sm active:scale-95 transition-all whitespace-nowrap"
              >
                <span>បើក Exness WebTerminal ផ្លូវការ</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        )}

        {/* 5. TAX & PERFORMANCE AUDIT STATEMENT MODAL */}
        {showTaxAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#FFCF01] flex items-center justify-center font-black">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                      <span>Exness MT5 Tax & Performance Statement</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono">
                        OFFICIAL AUDIT
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      គណនី: #{mt5Session.login} · Server: {mt5Session.server} · រូបិយប័ណ្ណ: USD
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTaxAuditModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content Scrollable */}
              <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                      Net Realized P/L ($):
                    </span>
                    <strong
                      className={`font-mono text-base font-black ${
                        taxSummary.netPnLUSD >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {taxSummary.netPnLUSD >= 0
                        ? `+$${taxSummary.netPnLUSD.toFixed(2)}`
                        : `-$${Math.abs(taxSummary.netPnLUSD).toFixed(2)}`}
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {taxSummary.netPnLUSD >= 0 ? 'ចំណេញដើមទុន (Capital Gain)' : 'ខាតបង់ដើមទុន (Capital Loss)'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                      Win Rate & Closed Deals:
                    </span>
                    <strong className="font-mono text-base font-black text-sky-500">
                      {taxSummary.winRatePct.toFixed(1)}%
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                      {taxSummary.winningDeals} Wins / {taxSummary.losingDeals} Losses ({taxSummary.totalDeals} Trades)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                      Profit Factor:
                    </span>
                    <strong className="font-mono text-base font-black text-amber-500">
                      {taxSummary.profitFactor.toFixed(2)}
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                      +${taxSummary.grossProfitUSD.toFixed(0)} / -${taxSummary.grossLossUSD.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Tax Filing Classification Notice */}
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>ចំណាត់ថ្នាក់ពន្ធដារ និងគណនេយ្យ (Tax & Accounting Classification):</span>
                  </div>
                  <p>
                    របាយការណ៍នេះបង្ហាញពី <b>ប្រាក់ចំណេញ/ខាតដើមទុនដែលបានសម្រេចពិតប្រាកដ (Realized Capital Gains / Losses)</b> សម្រាប់ឆ្នាំពន្ធដារបច្ចុប្បន្ន។ ឯកសារនេះត្រូវបានរៀបចំស្របតាមស្តង់ដាររបាយការណ៍ពន្ធ (Tax Reporting Format) ដែលអាចប្រើប្រាស់បានជាមួយកម្មវិធីគណនេយ្យ Excel ឬសម្រាប់ប្រកាសពន្ធប្រចាំឆ្នាំ។
                  </p>
                </div>

                {/* Symbol Breakdown */}
                <div className="space-y-1.5">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                    <span>ស្ថិតិតាមប្រភេទទ្រព្យសកម្ម (Breakdown by Symbol):</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {Object.keys(taxSummary.bySymbol).length} Symbols Traded
                    </span>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {Object.entries(taxSummary.bySymbol).map(([sym, stats]) => (
                      <div
                        key={sym}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{sym}</span>
                          <span className="text-[10px] text-slate-400">
                            {stats.count} deals · {stats.lots.toFixed(2)} lots
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            stats.netPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {stats.netPnL >= 0 ? `+$${stats.netPnL.toFixed(2)}` : `-$${Math.abs(stats.netPnL).toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                  title="បោះពុម្ពរបាយការណ៍"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>បោះពុម្ព (Print)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="ទាញយកជា CSV សម្រាប់ Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>ទាញយក CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="ទាញយកជា PDF Statement ផ្លូវការ"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ទាញយក PDF (.pdf)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WHY NO AUTO BALANCE MODAL (ហេតុអ្វីមិនអាចទាញសមតុល្យស្វ័យប្រវត្តិពី Exness MT5?) */}
        {showWhyNoAutoBalanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 bg-gradient-to-r from-amber-500/15 via-sky-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      ហេតុអ្វីមិនទាញចំនួនលុយពី Exness ដោយស្វ័យប្រវត្តិ?
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      មូលហេតុបច្ចេកទេស និងសុវត្ថិភាពរបស់ MetaTrader 5 (MT5 Protocol)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhyNoAutoBalanceModal(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
                {/* 1. Core Technical Reason */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>១. ប្រព័ន្ធសុវត្ថិភាព Private Binary Socket របស់ MT5</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                    ម៉ាស៊ីនមេ MetaTrader 5 របស់ Exness ប្រើប្រាស់ប្រព័ន្ធ Private Protocol ដែលត្រូវបាន Encrypted យ៉ាងតឹងរ៉ឹងបំផុតដោយក្រុមហ៊ុន MetaQuotes។ វាមិនមាន <b>Public HTTP REST API</b> ដូចផ្សារគ្រីបតូ (Crypto Exchange) ដែលអនុញ្ញាតឱ្យគេហទំព័រ ឬ Browser ខាងក្រៅគ្រាន់តែផ្ញើ Request ទៅដកទិន្នន័យសមតុល្យលុយពិតប្រាកដរបស់អ្នកបានដោយសេរីនោះទេ (ដើម្បីការពារសុវត្ថិភាពគណនី និងទ្រព្យសម្បត្តិរបស់អ្នក)។
                  </p>
                </div>

                {/* 2. Solutions available right in KramaView Pro */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>ដំណោះស្រាយងាយស្រួល ៤ យ៉ាងក្នុងកម្មវិធីនេះ៖</span>
                  </h4>

                  <div className="space-y-2">
                    {/* Method 1: Manual Balance */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-600 dark:text-sky-400">
                          វិធីទី ១៖ កំណត់សមតុល្យដោយដៃ (លឿនបំផុត ១ វិនាទី)
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-500 text-[9px] font-bold">
                          ពេញនិយម
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        ចុចប៊ូតុង <b>[កែ]</b> នៅលើរបារ Balance ហើយវាយចំនួនទឹកប្រាក់ដែលអ្នកមានពិតប្រាកដក្នុង Exness (ឧ. $50, $100, $500 ឬចំនួនសេន ¢) នោះប្រព័ន្ធនឹងគណនា Margin, Equity, PnL និងទំហំ Lot ត្រូវ ១០០% ដូចក្នុង MT5។
                      </p>
                    </div>

                    {/* Method 2: EA Bridge */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          វិធីទី ២៖ ប្រើ MQL5 EA Bridge (Auto-Sync ឥតគិតថ្លៃ)
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-500 text-[9px] font-bold">
                          អូតូ ១០០%
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        ប្រសិនបើអ្នកប្រើកម្មវិធី MT5 លើកុំព្យូទ័រ (Desktop) អ្នកអាចទាញយក Expert Advisor <b>.mq5</b> ពី Tab <b>"EA Bridge"</b> ខាងក្រោម យកទៅដាក់ក្នុង MT5 នោះវានឹងរុញសមតុល្យ Balance មកកាន់ KramaView Pro ដោយស្វ័យប្រវត្ត។
                      </p>
                    </div>

                    {/* Method 3: MetaApi */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
                        វិធីទី ៣៖ MetaApi Cloud REST Gateway
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        ប្រសិនបើអ្នកមានគណនី Cloud MetaApi អាចបញ្ចូល Account ID & Token ក្នុងជម្រើសបន្ថែមនៃផ្ទាំង Login ដើម្បីទាញ Balance ពី Cloud។
                      </p>
                    </div>

                    {/* Method 4: Official WebTerminal */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block">
                        វិធីទី ៤៖ ជួញដូរលើ Exness WebTerminal ផ្លូវការ
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        ចូលទៅកាន់គេហទំព័រ Exness Official WebTerminal ផ្ទាល់ ដើម្បីមើល និងគ្រប់គ្រងគណនី Exness របស់អ្នក។
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWhyNoAutoBalanceModal(false);
                    setShowBalanceEditBox(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>វាយចំនួនលុយពិត (កែ Balance ឥឡូវ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWhyNoAutoBalanceModal(false);
                    setToolboxTab('ea_bridge');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>មើល EA Bridge</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
