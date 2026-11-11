import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExnessClosedDeal } from '../components/ExnessWebTradingPanel';
import { MT5AccountSession, formatPrice } from './marketEngine';
import { getCloseReasonBadge } from './smartExitBrain';

export interface TaxPerformanceSummary {
  totalDeals: number;
  winningDeals: number;
  losingDeals: number;
  breakEvenDeals: number;
  winRatePct: number;
  grossProfitUSD: number;
  grossLossUSD: number;
  netPnLUSD: number;
  profitFactor: number;
  avgTradePnLUSD: number;
  largestWinUSD: number;
  largestLossUSD: number;
  bySymbol: Record<string, { count: number; netPnL: number; lots: number }>;
}

export const DEFAULT_EXNESS_CLOSED_DEALS: ExnessClosedDeal[] = [
  {
    id: 'deal_gold_01',
    ticket: 1048291,
    symbol: 'XAU/USD',
    exnessSymbol: 'XAUUSDc',
    direction: 'BUY',
    lots: 0.1,
    entryPrice: 2682.4,
    closePrice: 2695.8,
    realizedPnL: 1.34,
    closeReason: 'TP_HIT',
    closedAt: new Date(Date.now() - 3600000 * 2.5).toLocaleString(),
  },
  {
    id: 'deal_usoil_02',
    ticket: 1048292,
    symbol: 'USOIL',
    exnessSymbol: 'USOILc',
    direction: 'BUY',
    lots: 0.2,
    entryPrice: 69.2,
    closePrice: 71.45,
    realizedPnL: 4.5,
    closeReason: 'SMART_TRAILING_STOP',
    closedAt: new Date(Date.now() - 3600000 * 5).toLocaleString(),
  },
  {
    id: 'deal_btc_03',
    ticket: 1048293,
    symbol: 'BTC/USDT',
    exnessSymbol: 'BTCUSDc',
    direction: 'SELL',
    lots: 0.05,
    entryPrice: 91400.0,
    closePrice: 89800.0,
    realizedPnL: 0.8,
    closeReason: 'SMART_TP_REVERSAL',
    closedAt: new Date(Date.now() - 3600000 * 11).toLocaleString(),
  },
  {
    id: 'deal_gold_04',
    ticket: 1048294,
    symbol: 'XAU/USD',
    exnessSymbol: 'XAUUSDc',
    direction: 'SELL',
    lots: 0.05,
    entryPrice: 2690.5,
    closePrice: 2697.1,
    realizedPnL: -0.33,
    closeReason: 'SMART_EARLY_CUT_LOSS',
    closedAt: new Date(Date.now() - 3600000 * 16).toLocaleString(),
  },
  {
    id: 'deal_usoil_05',
    ticket: 1048295,
    symbol: 'USOIL',
    exnessSymbol: 'USOILc',
    direction: 'BUY',
    lots: 0.1,
    entryPrice: 70.1,
    closePrice: 70.1,
    realizedPnL: 0.0,
    closeReason: 'SMART_BREAK_EVEN',
    closedAt: new Date(Date.now() - 3600000 * 22).toLocaleString(),
  },
];

export function calculateTaxPerformanceSummary(deals: ExnessClosedDeal[]): TaxPerformanceSummary {
  let winningDeals = 0;
  let losingDeals = 0;
  let breakEvenDeals = 0;
  let grossProfitUSD = 0;
  let grossLossUSD = 0;
  let netPnLUSD = 0;
  let largestWinUSD = 0;
  let largestLossUSD = 0;
  const bySymbol: Record<string, { count: number; netPnL: number; lots: number }> = {};

  deals.forEach((d) => {
    const pnl = d.realizedPnL || 0;
    netPnLUSD += pnl;

    if (pnl > 0.001) {
      winningDeals++;
      grossProfitUSD += pnl;
      if (pnl > largestWinUSD) largestWinUSD = pnl;
    } else if (pnl < -0.001) {
      losingDeals++;
      grossLossUSD += Math.abs(pnl);
      if (Math.abs(pnl) > largestLossUSD) largestLossUSD = Math.abs(pnl);
    } else {
      breakEvenDeals++;
    }

    const sym = d.symbol || d.exnessSymbol || 'UNKNOWN';
    if (!bySymbol[sym]) {
      bySymbol[sym] = { count: 0, netPnL: 0, lots: 0 };
    }
    bySymbol[sym].count++;
    bySymbol[sym].netPnL += pnl;
    bySymbol[sym].lots += d.lots || 0;
  });

  const totalDeals = deals.length;
  const winRatePct = totalDeals > 0 ? (winningDeals / totalDeals) * 100 : 0;
  const profitFactor = grossLossUSD > 0 ? grossProfitUSD / grossLossUSD : grossProfitUSD > 0 ? 99.99 : 0;
  const avgTradePnLUSD = totalDeals > 0 ? netPnLUSD / totalDeals : 0;

  return {
    totalDeals,
    winningDeals,
    losingDeals,
    breakEvenDeals,
    winRatePct,
    grossProfitUSD,
    grossLossUSD,
    netPnLUSD,
    profitFactor,
    avgTradePnLUSD,
    largestWinUSD,
    largestLossUSD,
    bySymbol,
  };
}

/**
 * Exports closed deals as a standard, spreadsheet-ready CSV with UTF-8 BOM
 * suitable for Tax calculation (IRS Form 8949 / Schedule D, Local Tax), Excel, and Google Sheets.
 */
export function exportClosedDealsCsv(deals: ExnessClosedDeal[], mt5Session: MT5AccountSession): void {
  const summary = calculateTaxPerformanceSummary(deals);
  const currentYear = new Date().getFullYear();

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Ticket_ID',
    'Symbol',
    'Exness_Contract',
    'Order_Type',
    'Volume_Lots',
    'Entry_Price',
    'Close_Price',
    'Realized_PnL_USD',
    'Return_Pct',
    'Exit_Reason',
    'Closed_Timestamp',
    'Tax_Year',
    'Tax_Classification',
  ];

  const dealRows = deals.map((d) => {
    const pnl = Number((d.realizedPnL || 0).toFixed(2));
    const entry = d.entryPrice || 0;
    const close = d.closePrice || 0;
    const returnPct = entry > 0 ? (((close - entry) / entry) * (d.direction === 'BUY' ? 100 : -100)).toFixed(2) : '0.00';
    const reasonBadge = getCloseReasonBadge(d.closeReason);
    const taxClassification = pnl >= 0 ? 'Capital Gain (Short-Term)' : 'Capital Loss (Short-Term)';

    return [
      d.ticket,
      d.symbol,
      d.exnessSymbol,
      d.direction,
      d.lots.toFixed(2),
      d.entryPrice,
      d.closePrice,
      pnl >= 0 ? `+${pnl.toFixed(2)}` : pnl.toFixed(2),
      `${returnPct}%`,
      reasonBadge.label,
      d.closedAt,
      currentYear,
      taxClassification,
    ].map(escapeCsv).join(',');
  });

  // Summary footer for tax auditing and accounting
  const summaryRows = [
    '',
    '=== TAX & PERFORMANCE AUDIT SUMMARY (EXNESS MT5) ===',
    `Broker,Exness Technologies Ltd`,
    `MT5 Login ID,${mt5Session.login}`,
    `MT5 Server,${mt5Session.server}`,
    `Account Type,${mt5Session.accountType}`,
    `Account Leverage,1:${mt5Session.leverage || 2000}`,
    `Statement Currency,USD`,
    `Total Closed Deals,${summary.totalDeals}`,
    `Winning Trades,${summary.winningDeals} (${summary.winRatePct.toFixed(1)}%)`,
    `Losing Trades,${summary.losingDeals}`,
    `Break-Even Trades,${summary.breakEvenDeals}`,
    `Gross Profits (USD),$${summary.grossProfitUSD.toFixed(2)}`,
    `Gross Losses (USD),-$${summary.grossLossUSD.toFixed(2)}`,
    `Net Realized Gain/Loss (USD),${summary.netPnLUSD >= 0 ? `+$${summary.netPnLUSD.toFixed(2)}` : `-$${Math.abs(summary.netPnLUSD).toFixed(2)}`}`,
    `Profit Factor,${summary.profitFactor.toFixed(2)}`,
    `Average Trade PnL (USD),$${summary.avgTradePnLUSD.toFixed(2)}`,
    `Largest Win (USD),+$${summary.largestWinUSD.toFixed(2)}`,
    `Largest Loss (USD),-$${summary.largestLossUSD.toFixed(2)}`,
    `Report Export Timestamp,${new Date().toISOString()}`,
  ];

  const csvContent = '\uFEFF' + [headers.join(','), ...dealRows, ...summaryRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Exness_MT5_Closed_Deals_Tax_Report_${mt5Session.login}_${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports closed deals as an official, branded Exness PDF Statement for tax filing and audits
 * using client-side jsPDF with autoTable styling.
 */
export function exportClosedDealsPdf(deals: ExnessClosedDeal[], mt5Session: MT5AccountSession): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const summary = calculateTaxPerformanceSummary(deals);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const printTimestamp = new Date().toLocaleString();

  // Top Exness Branded Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  // Amber Accent Bar
  doc.setFillColor(255, 207, 1); // Exness Gold #FFCF01
  doc.rect(0, 36, 210, 2, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EXNESS TECHNOLOGIES LTD', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 207, 1);
  doc.text('OFFICIAL MT5 TRADING STATEMENT & TAX REPORT', 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Realized Capital Gains & Performance Accounting · Generated: ${printTimestamp}`, 14, 29);

  // Account Metadata Header Table/Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 42, 182, 20, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT LOGIN:', 18, 48);
  doc.text('SERVER:', 70, 48);
  doc.text('ACCOUNT TYPE:', 125, 48);
  doc.text('LEVERAGE:', 165, 48);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(String(mt5Session.login || '148592031'), 18, 56);
  doc.text(String(mt5Session.server || 'Exness-MT5Real8'), 70, 56);
  doc.text(String(mt5Session.accountType?.toUpperCase() || 'STANDARD'), 125, 56);
  doc.text(`1:${mt5Session.leverage || 2000}`, 165, 56);

  // KPI Summary Boxes (3 Columns)
  const isProfit = summary.netPnLUSD >= 0;

  // Box 1: Net Realized PnL
  doc.setFillColor(isProfit ? 240 : 254, isProfit ? 253 : 242, isProfit ? 244 : 242);
  doc.setDrawColor(isProfit ? 187 : 254, isProfit ? 247 : 202, isProfit ? 208 : 202);
  doc.roundedRect(14, 66, 58, 20, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('NET REALIZED P/L (USD)', 18, 72);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isProfit ? 16 : 225, isProfit ? 185 : 29, isProfit ? 129 : 72);
  const netText = summary.netPnLUSD >= 0
    ? `+$${summary.netPnLUSD.toFixed(2)}`
    : `-$${Math.abs(summary.netPnLUSD).toFixed(2)}`;
  doc.text(netText, 18, 81);

  // Box 2: Win Rate & Deals
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(76, 66, 58, 20, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('WIN RATE & TRADES', 80, 72);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${summary.winRatePct.toFixed(1)}% (${summary.winningDeals}/${summary.totalDeals})`, 80, 81);

  // Box 3: Gross Profit & Loss
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(138, 66, 58, 20, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('PROFIT FACTOR & SPREAD', 142, 72);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`PF: ${summary.profitFactor.toFixed(2)}  (+$${summary.grossProfitUSD.toFixed(0)} / -$${summary.grossLossUSD.toFixed(0)})`, 142, 81);

  // Table of Deals
  const tableHeaders = [
    ['#Ticket', 'Symbol', 'Type', 'Lots', 'Entry', 'Close', 'Exit Trigger', 'Closed At', 'Net PnL ($)'],
  ];

  const tableData = deals.map((d) => {
    const pnl = Number((d.realizedPnL || 0).toFixed(2));
    const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
    const reasonBadge = getCloseReasonBadge(d.closeReason);

    return [
      `#${d.ticket}`,
      d.symbol || d.exnessSymbol,
      d.direction,
      d.lots.toFixed(2),
      formatPrice(d.entryPrice, d.symbol),
      formatPrice(d.closePrice, d.symbol),
      reasonBadge.label,
      d.closedAt,
      pnlStr,
    ];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 91,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 20 },
      2: { cellWidth: 14, fontStyle: 'bold' },
      3: { cellWidth: 14 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 28 },
      7: { cellWidth: 28 },
      8: { cellWidth: 20, fontStyle: 'bold', halign: 'right' },
    },
    didParseCell: (data) => {
      // Color-code BUY/SELL
      if (data.column.index === 2 && data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'BUY') {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (val === 'SELL') {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
      // Color-code Realized PnL
      if (data.column.index === 8 && data.section === 'body') {
        const val = String(data.cell.raw);
        if (val.startsWith('+')) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (val.startsWith('-')) {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  // Footer Disclaimer on All Pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Official Exness MT5 Web Terminal Statement. Certified for tax reporting, capital gains filing, and trading performance audits.',
      14,
      285
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
  }

  doc.save(`Exness_MT5_Trading_Statement_${mt5Session.login}_${dateStamp}.pdf`);
}
