/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'km' | 'en';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
];

export const translations = {
  km: {
    // Header & Top Nav
    'app.title': 'KramaView Pro',
    'nav.autobot': '⚡ Bot ស្វ័យប្រវត្តិ (ទិញ-លក់)',
    'nav.exness': 'ភ្ជាប់ Exness ផ្ទាល់',
    'nav.quant': 'វិភាគសុក្រិតពិភពលោក',
    'nav.goldOil': 'មាស & USOIL ឆ្លាតវៃ',
    'nav.stocksCrypto': 'ភាគហ៊ុន & គ្រីបតូ',
    'nav.saved': 'ទិន្នន័យរក្សាទុក',
    'nav.alerts': 'ប្រព័ន្ធជូនដំណឹង',
    'nav.realTrade': 'ជួញដូរពិត (Real Broker)',
    'nav.lightTheme': 'ផ្ទៃភ្លឺ (Light)',
    'nav.darkTheme': 'ផ្ទៃងងឹត (Dark)',
    'nav.cloudSignIn': 'ភ្ជាប់គណនីរក្សាទុក Cloud',
    'nav.signOut': 'ចាកចេញ',
    'nav.account': 'គណនី',
    'nav.language': 'ភាសា (Language)',
    'nav.languageSelect': 'ជ្រើសរើសភាសា',

    // Floating Triggers
    'float.market': 'ទីផ្សារ',
    'float.saved': 'រក្សាទុក',
    'float.alerts': 'ដាស់តឿន',
    'float.quant': 'សុក្រិត',
    'float.bot': 'Bot',
    'float.exness': 'Exness',

    // Drawing Tools
    'tool.cursor': 'Pointer',
    'tool.cursorDesc': 'រំកិលក្រាហ្វ / ជ្រើសរើស',
    'tool.riskReward': 'Risk/Reward Ratio',
    'tool.riskRewardDesc': 'គណនាផលធៀប Risk/Reward (TP/SL)',
    'tool.trendline': 'Trendline',
    'tool.trendlineDesc': 'ខ្សែនិន្នាការ (Trendline)',
    'tool.horizontal': 'Horizontal S/R',
    'tool.horizontalDesc': 'ខ្សែគាំទ្រ / រាំងខ្ទប់ (S/R Ray)',
    'tool.fib': 'Fibonacci',
    'tool.fibDesc': 'កម្រិត Fibonacci Retracement',
    'tool.channel': 'Parallel Channel',
    'tool.channelDesc': 'បណ្តាញស្រប (Parallel Channel)',
    'tool.rect': 'Supply/Demand Zone',
    'tool.rectDesc': 'ប្រអប់តំបន់ទិញ/លក់ (Zone)',
    'tool.longPos': 'Long Risk/Reward',
    'tool.longPosDesc': 'គណនាហានិភ័យទិញឡើង (Long R:R)',
    'tool.shortPos': 'Short Risk/Reward',
    'tool.shortPosDesc': 'គណនាហានិភ័យលក់ចុះ (Short R:R)',
    'tool.measure': 'Price Ruler',
    'tool.measureDesc': 'វាស់ភាគរយ និងតម្លៃ (Measure)',
    'tool.text': 'Text Note',
    'tool.textDesc': 'សរសេរចំណាំលើក្រាហ្វ (Text)',

    // Chart Types
    'chart.candles': 'ទៀន (Candles)',
    'chart.hollow': 'ទៀនប្រហោង (Hollow)',
    'chart.heikin': 'Heikin Ashi',
    'chart.area': 'ផ្ទៃ (Area)',
    'chart.line': 'ខ្សែបន្ទាត់ (Line)',

    // Quick Live Trading Bar
    'quick.liveExecution': 'ជួញដូរផ្ទាល់ល្បឿនលឿន (Quick Live Execution)',
    'quick.instantMarketOrder': 'បញ្ជាទិញ-លក់ទីផ្សារភ្លាមៗតាមកម្រិតល្បឿន Exness & Binance',
    'quick.buy': 'ទិញ BUY (ឡើង)',
    'quick.sell': 'លក់ SELL (ចុះ)',
    'quick.lot': 'ឡូត (Lot)',
    'quick.closeAllTarget': 'កំណត់ចំណេញបិទទាំងអស់ (Close All Target)',
    'quick.closeAllNow': 'បិទទាំងអស់ (Close All)',
    'quick.autoCloseTriggered': 'បានកេះបិទកិច្ចសន្យាទាំងអស់ដោយស្វ័យប្រវត្តិ!',

    // Active Positions Bar
    'pos.activeTitle': 'កិច្ចសន្យាសកម្ម',
    'pos.totalPnl': 'កម្រៃសរុប (Total P&L)',
    'pos.closeAll': 'បិទទាំងអស់ (Close All)',
    'pos.noPositions': 'មិនទាន់មានកិច្ចសន្យាបើកនៅឡើយទេ',
    'pos.entry': 'តម្លៃចូល',
    'pos.current': 'បច្ចុប្បន្ន',
    'pos.lots': 'ឡូត',
    'pos.pnl': 'ចំណេញ/ខាត',

    // Save & Review Panel
    'save.title': 'រក្សាទុក & ត្រួតពិនិត្យការវិភាគ',
    'save.currentTitle': 'រក្សាទុកការវិភាគបច្ចុប្បន្ន',
    'save.analysisTitle': 'ចំណងជើងការវិភាគ (Title)',
    'save.marketBias': 'ទិសដៅទីផ្សាររំពឹងទុក (Market Bias)',
    'save.bullish': 'ឡើង (Bullish)',
    'save.bearish': 'ចុះ (Bearish)',
    'save.neutral': 'រង់ចាំ (Neutral)',
    'save.tp': 'តម្លៃគោលដៅ (Take Profit)',
    'save.sl': 'កាត់ខាត (Stop Loss)',
    'save.rrDetected': 'ឧបករណ៍ R:R លើក្រាហ្វ៖',
    'save.applySetup': 'បញ្ចូលតម្លៃ TP/SL',
    'save.rrCalculated': 'ផលធៀប R:R គណនាជាក់ស្តែង៖',
    'save.notes': 'កំណត់ហេតុវិភាគសម្រាប់ពិនិត្យក្រោយ (Analysis Notes)',
    'save.button': 'រក្សាទុកទិន្នន័យវិភាគនេះ',
    'save.saving': 'កំពុងរក្សាទុក...',
    'save.listTitle': 'បញ្ជីទិន្នន័យរក្សាទុក',
    'save.filterAll': 'ទាំងអស់',
    'save.empty': 'មិនទាន់មានទិន្នន័យវិភាគត្រូវបានរក្សាទុកនៅឡើយទេ',
    'save.emptyDesc': 'គូរខ្សែបច្ចេកទេសលើក្រាហ្វ រួចចុចប៊ូតុង "រក្សាទុកទិន្នន័យវិភាគនេះ" ដើម្បីតាមដានលទ្ធផលនៅពេលក្រោយ។',
    'save.openOnChart': 'បើកលើក្រាហ្វ',
    'save.delete': 'លុប',
    'save.savedPrice': 'តម្លៃពេលរក្សាទុក',
    'save.currentPrice': 'តម្លៃបច្ចុប្បន្ន',
    'save.change': 'បម្រែបម្រួល',
    'save.tpHit': '✓ ដល់គោលដៅ (TP Hit)',
    'save.slHit': '⚠ ប៉ះ Stop Loss',

    // Alerts Panel
    'alert.title': 'ប្រព័ន្ធដាស់តឿនតម្លៃ & Telegram/Email',
    'alert.create': 'បង្កើតការដាស់តឿនថ្មី',
    'alert.condition': 'លក្ខខណ្ឌដាស់តឿន',
    'alert.threshold': 'តម្លៃកំណត់ (Threshold Price)',
    'alert.rsiOverbought': 'RSI កើនខ្ពស់លើសកម្រិត (Overbought)',
    'alert.rsiOversold': 'RSI ធ្លាក់ទាបលើសកម្រិត (Oversold)',
    'alert.telegram': 'ផ្ញើទៅកាន់ Telegram',
    'alert.email': 'ផ្ញើទៅកាន់ Email',
    'alert.save': 'រក្សាទុកការដាស់តឿន',
    'alert.activeAlerts': 'បញ្ជីដាស់តឿនសកម្ម',
    'alert.history': 'ប្រវត្តិដាស់តឿន',

    // Exness Panel
    'exness.title': 'ផ្ទាំងជួញដូរ Exness WebTrading & MT5',
    'exness.connected': 'បានភ្ជាប់ MT5 ជោគជ័យ',
    'exness.balance': 'សមតុល្យ (Balance)',
    'exness.equity': 'ដើមទុនបច្ចុប្បន្ន (Equity)',
    'exness.freeMargin': 'Margin នៅសល់ (Free Margin)',
    'exness.leverage': 'Leverage',
    'exness.contractSize': 'ទំហំកិច្ចសន្យា',

    // Bot Panel
    'bot.title': 'Smart AI Auto Trading Bot (Exness & Crypto)',
    'bot.status': 'ស្ថានភាព Bot',
    'bot.running': 'កំពុងដំណើរការ',
    'bot.paused': 'បានផ្អាក',
    'bot.smartExit': 'ខួរក្បាលឆ្លាតវៃ Smart Exit Brain',
    'bot.autoProtect': 'ការពារទុន និងចាក់សោចំណេញដោយស្វ័យប្រវត្តិ',

    // Precision Panel
    'quant.title': 'ផ្ទាំងវិភាគសុក្រិតកម្រិតស្ថាប័នសកល',
    'quant.score': 'ពិន្ទុវិភាគសុក្រិតសកល',
    'quant.pivots': 'ចំណុចគន្លឹះ Pivot Points',
    'quant.tradeSetup': 'ផែនការជួញដូរ Quant Setup',
    'quant.plotOnChart': 'គូសប្រអប់ផែនការលើក្រាហ្វ',

    // Gold Intelligence
    'gold.spot': 'មាសអន្តរជាតិ Spot Gold',
    'gold.damlung': '១ ដំឡឹង (37.5g)',
    'gold.chi': '១ ជី (3.75g)',
    'gold.oil': 'ប្រេងឆៅ USOIL',
    'gold.spread': 'គម្លាត Brent-WTI',
  },
  en: {
    // Header & Top Nav
    'app.title': 'KramaView Pro',
    'nav.autobot': '⚡ Auto Trading Bot',
    'nav.exness': 'Exness Direct',
    'nav.quant': 'Global Precision Analysis',
    'nav.goldOil': 'Smart Gold & Oil',
    'nav.stocksCrypto': 'Stocks & Crypto',
    'nav.saved': 'Saved Analyses',
    'nav.alerts': 'Alerts & Channels',
    'nav.realTrade': 'Real Trade (Broker)',
    'nav.lightTheme': 'Light Theme',
    'nav.darkTheme': 'Dark Theme',
    'nav.cloudSignIn': 'Sign in / Cloud Sync',
    'nav.signOut': 'Sign Out',
    'nav.account': 'Account',
    'nav.language': 'Language',
    'nav.languageSelect': 'Select Language',

    // Floating Triggers
    'float.market': 'Markets',
    'float.saved': 'Saved',
    'float.alerts': 'Alerts',
    'float.quant': 'Quant',
    'float.bot': 'Bot',
    'float.exness': 'Exness',

    // Drawing Tools
    'tool.cursor': 'Pointer',
    'tool.cursorDesc': 'Select & Pan Chart',
    'tool.riskReward': 'Risk/Reward Ratio',
    'tool.riskRewardDesc': 'Risk/Reward Calculation (TP/SL)',
    'tool.trendline': 'Trendline',
    'tool.trendlineDesc': 'Trendline Ray',
    'tool.horizontal': 'Horizontal S/R',
    'tool.horizontalDesc': 'Support & Resistance Ray',
    'tool.fib': 'Fibonacci',
    'tool.fibDesc': 'Fibonacci Retracement',
    'tool.channel': 'Parallel Channel',
    'tool.channelDesc': 'Parallel Channel',
    'tool.rect': 'Supply/Demand Zone',
    'tool.rectDesc': 'Supply & Demand Zone Box',
    'tool.longPos': 'Long Risk/Reward',
    'tool.longPosDesc': 'Long Position Risk/Reward',
    'tool.shortPos': 'Short Risk/Reward',
    'tool.shortPosDesc': 'Short Position Risk/Reward',
    'tool.measure': 'Price Ruler',
    'tool.measureDesc': 'Measure Price & Percentage',
    'tool.text': 'Text Note',
    'tool.textDesc': 'Chart Text Annotation',

    // Chart Types
    'chart.candles': 'Candles',
    'chart.hollow': 'Hollow Candles',
    'chart.heikin': 'Heikin Ashi',
    'chart.area': 'Area',
    'chart.line': 'Line',

    // Quick Live Trading Bar
    'quick.liveExecution': 'Quick Live Execution Bar',
    'quick.instantMarketOrder': 'Instant market buy/sell with Exness & Binance speed',
    'quick.buy': 'BUY (Long)',
    'quick.sell': 'SELL (Short)',
    'quick.lot': 'Lot',
    'quick.closeAllTarget': 'Close All Profit Target',
    'quick.closeAllNow': 'Close All',
    'quick.autoCloseTriggered': 'Auto-closed all active positions successfully!',

    // Active Positions Bar
    'pos.activeTitle': 'Active Positions',
    'pos.totalPnl': 'Total P&L',
    'pos.closeAll': 'Close All',
    'pos.noPositions': 'No open positions currently',
    'pos.entry': 'Entry',
    'pos.current': 'Current',
    'pos.lots': 'Lots',
    'pos.pnl': 'P&L',

    // Save & Review Panel
    'save.title': 'Save & Review Analyses',
    'save.currentTitle': 'Save Current Analysis',
    'save.analysisTitle': 'Analysis Title',
    'save.marketBias': 'Expected Market Bias',
    'save.bullish': 'Bullish (Up)',
    'save.bearish': 'Bearish (Down)',
    'save.neutral': 'Neutral',
    'save.tp': 'Take Profit (TP)',
    'save.sl': 'Stop Loss (SL)',
    'save.rrDetected': 'Chart R:R Setup:',
    'save.applySetup': 'Apply TP/SL',
    'save.rrCalculated': 'Dynamic Calculated R:R:',
    'save.notes': 'Analysis Notes & Rationale',
    'save.button': 'Save Analysis Setup',
    'save.saving': 'Saving...',
    'save.listTitle': 'Saved Analyses List',
    'save.filterAll': 'All',
    'save.empty': 'No saved chart analyses yet',
    'save.emptyDesc': 'Draw technical setups on the chart and click "Save Analysis Setup" to track review outcomes.',
    'save.openOnChart': 'Load on Chart',
    'save.delete': 'Delete',
    'save.savedPrice': 'Saved Price',
    'save.currentPrice': 'Current Price',
    'save.change': 'Return',
    'save.tpHit': '✓ Take Profit Hit',
    'save.slHit': '⚠ Stop Loss Hit',

    // Alerts Panel
    'alert.title': 'Price Alerts & Telegram/Email',
    'alert.create': 'Create New Alert',
    'alert.condition': 'Alert Condition',
    'alert.threshold': 'Threshold Price',
    'alert.rsiOverbought': 'RSI Overbought (≥ Threshold)',
    'alert.rsiOversold': 'RSI Oversold (≤ Threshold)',
    'alert.telegram': 'Send to Telegram',
    'alert.email': 'Send via Email',
    'alert.save': 'Save Alert',
    'alert.activeAlerts': 'Active Alerts',
    'alert.history': 'Alert Logs & History',

    // Exness Panel
    'exness.title': 'Exness WebTrading & MT5 Terminal',
    'exness.connected': 'Connected to MT5 Server',
    'exness.balance': 'Balance',
    'exness.equity': 'Equity',
    'exness.freeMargin': 'Free Margin',
    'exness.leverage': 'Leverage',
    'exness.contractSize': 'Contract Size',

    // Bot Panel
    'bot.title': 'Smart AI Auto Trading Bot (Exness & Crypto)',
    'bot.status': 'Bot Status',
    'bot.running': 'Running',
    'bot.paused': 'Paused',
    'bot.smartExit': 'Smart Exit Brain',
    'bot.autoProtect': 'Auto-protect capital and lock in profits',

    // Precision Panel
    'quant.title': 'Global Precision Institutional Analysis',
    'quant.score': 'Global Precision Score',
    'quant.pivots': 'Key Pivot Points',
    'quant.tradeSetup': 'Quant Trade Setup',
    'quant.plotOnChart': 'Plot Setup on Chart',

    // Gold Intelligence
    'gold.spot': 'Spot Gold (XAU/USD)',
    'gold.damlung': '1 Damlung (37.5g)',
    'gold.chi': '1 Chi (3.75g)',
    'gold.oil': 'WTI Crude Oil',
    'gold.spread': 'Brent-WTI Spread',
  },
} as const;

export type TranslationKey = keyof typeof translations['km'];

export const t = (key: TranslationKey, lang: Language = 'km'): string => {
  return (translations[lang] as any)?.[key] ?? translations['km']?.[key] ?? key;
};
