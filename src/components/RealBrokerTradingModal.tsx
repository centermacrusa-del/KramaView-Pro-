import React, { useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  Zap,
  Server,
  Download,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  X,
  Globe,
  Coins,
} from 'lucide-react';
import { MarketAsset } from '../types/market';
import { MT5AccountSession, generateMql5BridgeScript } from '../services/marketEngine';

interface RealBrokerTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: MarketAsset;
  mt5Session: MT5AccountSession;
  onUpdateMt5Session: (session: MT5AccountSession) => void;
}

export const RealBrokerTradingModal: React.FC<RealBrokerTradingModalProps> = ({
  isOpen,
  onClose,
  asset,
  mt5Session,
  onUpdateMt5Session,
}) => {
  const [activeTab, setActiveTab] = useState<'exness' | 'binance' | 'ea_bridge' | 'metaapi'>('exness');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadEA = () => {
    const script = generateMql5BridgeScript(window.location.origin, mt5Session.login);
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KramaView_MT5_LiveBridge_${mt5Session.login}.mq5`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isCrypto = asset.assetClass === 'crypto';
  const binanceSymbol = asset.binanceSymbol || `${asset.symbol.replace('/', '')}`;
  const binanceUrl = `https://www.binance.com/en/trade/${binanceSymbol}?type=spot`;
  const exnessWebTerminalUrl = 'https://my.exness.com/pa/terminal/';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/15 via-sky-500/10 to-transparent border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ច្រកតភ្ជាប់ការជួញដូរពិត (Real Live Trading Gateways)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  REAL EXECUTION
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ជ្រើសរើសជម្រើសជួញដូរផ្ទាល់ជាមួយ Exness MT5, Binance Spot ឬ MQL5 EA Bridge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('exness')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'exness'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Exness MT5 WebTerminal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('binance')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'binance'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Binance Real Spot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ea_bridge')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'ea_bridge'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>MQL5 EA Bridge (MT5 Desktop)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metaapi')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'metaapi'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>MetaApi Cloud API</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* 1. EXNESS OFFICIAL WEB TERMINAL */}
          {activeTab === 'exness' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                  <Globe className="w-4 h-4" />
                  <span>ជួញដូរផ្ទាល់លើ Exness WebTerminal (ផ្លូវការ)</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  អ្នកអាចចូលប្រើប្រាស់ និងដាក់បញ្ជាទិញ/លក់ពិតប្រាកដជាមួយគណនី Exness របស់អ្នកនៅលើ Official WebTerminal។ ព័ត៌មានគណនីបច្ចុប្បន្នដែលអ្នកបានកំណត់៖
                </p>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">MT5 Login:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">#{mt5Session.login}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Server:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{mt5Session.server}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Account Type:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {mt5Session.accountType === 'standard_cent'
                        ? 'Standard Cent (USC ¢)'
                        : mt5Session.accountType?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {mt5Session.accountType === 'standard_cent' && (
                  <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <span className="font-bold font-mono px-1 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px]">USC ¢</span>
                    <span>គណនី Exness Standard Cent: រូបិយប័ណ្ណគិតជាសេនដុល្លារ (1 USD = 100 ¢), 1 Cent Lot = 0.01 Standard Lot។</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  ជំហានជួញដូរពិតលើ Exness WebTerminal៖
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <li>
                    ចុចប៊ូតុង <b>"បើក Exness WebTerminal ឥឡូវនេះ"</b> ខាងក្រោម។
                  </li>
                  <li>
                    បញ្ចូលលេខ Login <b>#{mt5Session.login}</b> និងជ្រើសរើស Server <b>{mt5Session.server}</b>។
                  </li>
                  <li>
                    បញ្ចូលពាក្យសម្ងាត់ Master Password របស់គណនី Exness របស់អ្នក ដើម្បីទិញ/លក់ពិត 100% លើទីផ្សារអន្តរជាតិ។
                  </li>
                  <li>
                    អ្នកក៏អាចប្រើប្រាស់កម្មវិធី KramaView Pro នេះដើម្បីវិភាគបច្ចេកទេស និងគណនាទំហំ Lot/ហានិភ័យមុននឹងចុចទិញ/លក់។
                  </li>
                </ol>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={exnessWebTerminalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.99]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>បើក Exness WebTerminal ផ្លូវការ (New Window)</span>
                </a>
              </div>
            </div>
          )}

          {/* 2. BINANCE SPOT DIRECT */}
          {activeTab === 'binance' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 space-y-2">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 font-bold">
                  <Coins className="w-4 h-4" />
                  <span>ជួញដូររូបិយប័ណ្ណគ្រីបតូពិតលើ Binance Spot</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  សម្រាប់រូបិយប័ណ្ណគ្រីបតូដូចជា <b>{asset.symbol}</b> ({asset.name}) អ្នកអាចភ្ជាប់ទៅកាន់ផ្សារជួញដូរ Binance Spot ផ្លូវការភ្លាមៗ។
                </p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs">
                  <span>គូជួញដូរ (Pair): <b>{binanceSymbol}</b></span>
                  <span className="text-emerald-500 font-bold">${asset.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  អត្ថប្រយោជន៍ជួញដូរគ្រីបតូតាម Binance Spot៖
                </h4>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <li>សាច់ប្រាក់ងាយស្រួលខ្ពស់បំផុតលើពិភពលោក (Deepest Liquidity)</li>
                  <li>តម្លៃបច្ចុប្បន្នត្រូវបាន sync តាម Binance Spot 24/7 ពេលវេលាជាក់ស្តែង</li>
                  <li>គាំទ្រការទិញលក់ទាំង Spot, Futures, និង Limit Orders</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={binanceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.99]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>បើកផ្ទាំងទិញលក់លើ Binance ({binanceSymbol})</span>
                </a>
              </div>
            </div>
          )}

          {/* 3. MQL5 EA BRIDGE */}
          {activeTab === 'ea_bridge' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 space-y-2">
                <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>MQL5 Live Expert Advisor (EA) Web Bridge</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  ភ្ជាប់កម្មវិធី Desktop MetaTrader 5 លើកុំព្យូទ័ររបស់អ្នកដោយផ្ទាល់មកកាន់ KramaView Pro។ រាល់ពេលអ្នកដាក់បញ្ជាទិញ/លក់ លើអេក្រង់នេះ EA នឹងបញ្ជាទៅ MT5 ពិតប្រាកដដោយស្វ័យប្រវត្តិ។
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  របៀបតម្លើង MQL5 EA លើ MetaTrader 5៖
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>ទាញយកឯកសារ <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">.mq5</code> តាមប៊ូតុងខាងក្រោម</li>
                  <li>បើកកម្មវិធី MT5 លើកុំព្យូទ័រ ➔ ចុច <b>File ➔ Open Data Folder ➔ MQL5 ➔ Experts</b> រួច Copy ឯកសារចូល</li>
                  <li>ក្នុង MT5 ចុច <b>Tools ➔ Options ➔ Expert Advisors</b> ➔ ធីក <b>Allow WebRequest for listed URL</b></li>
                  <li>បន្ថែម URL របស់ KramaView Pro នេះចូល</li>
                  <li>អូស EA ដាក់លើក្រាហ្វ MT5 ដើម្បីភ្ជាប់ការជួញដូរពិត 1:1</li>
                </ol>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadEA}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>ទាញយក MQL5 Expert Advisor Script (.mq5)</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. METAAPI CLOUD API */}
          {activeTab === 'metaapi' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-2">
                <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold">
                  <Lock className="w-4 h-4" />
                  <span>MetaApi Cloud MT5 REST API Gateway</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  បច្ចេកវិទ្យា Cloud API អនុញ្ញាតឱ្យបញ្ជូន Trade Orders ពី Web Browser ចូលទៅកាន់ម៉ាស៊ីនមេ MetaTrader 5 Real Server ដោយផ្ទាល់តាម REST API ក្នុងរយៈពេលតែប៉ុន្មានមីលីវិនាទី (Ultra Low Latency)។
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  បញ្ចូល MetaApi Account ID & Auth Token៖
                </label>
                <input
                  type="text"
                  placeholder="MetaApi Account ID (ឧ. 1f948a2-xxxx-xxxx)"
                  value={mt5Session.metaApiAccountId || ''}
                  onChange={(e) =>
                    onUpdateMt5Session({ ...mt5Session, metaApiAccountId: e.target.value.trim() })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                />
                <input
                  type="password"
                  placeholder="MetaApi Auth Token"
                  value={mt5Session.metaApiToken || ''}
                  onChange={(e) =>
                    onUpdateMt5Session({ ...mt5Session, metaApiToken: e.target.value.trim() })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-500">
                  * ទទួលបាន Token ឥតគិតថ្លៃតាមរយៈ <b>metaapi.cloud</b> ដើម្បីដំណើរការ Trade Execution លើ Cloud Server។
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>ប្រព័ន្ធការពារសុវត្ថិភាព 1:1 និង Encrypted Handshake</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs"
          >
            បិទ
          </button>
        </div>
      </div>
    </div>
  );
};
