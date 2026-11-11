import React from 'react';
import { MarketAsset } from '../types/market';

export type AssetBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AssetBadgeIconProps {
  asset?: MarketAsset | { symbol: string; name?: string; assetClass?: string; subCategory?: string };
  symbol?: string;
  size?: AssetBadgeSize;
  className?: string;
  showGlow?: boolean;
}

const SIZE_MAP: Record<AssetBadgeSize, { px: number; containerClass: string }> = {
  xs: { px: 18, containerClass: 'w-[18px] h-[18px]' },
  sm: { px: 22, containerClass: 'w-[22px] h-[22px]' },
  md: { px: 28, containerClass: 'w-[28px] h-[28px]' },
  lg: { px: 36, containerClass: 'w-[36px] h-[36px]' },
  xl: { px: 44, containerClass: 'w-[44px] h-[44px]' },
};

/**
 * Authentic, ultra-crisp visual images & token badges for every asset in KramaView Pro:
 * - Gold (XAU/USD, GOLD-KH, PAXG, XAUt, COMEX, GLD): Detailed 3D bullion bar & Cambodian 99.99% gold coin
 * - Bitcoin (BTC/USDT): Physical golden Bitcoin coin with ₿ emblem & circuit tracks
 * - Ethereum (ETH/USDT): 3D faceted crystal diamond
 * - Crude Oil (USOIL / UKOIL): Industrial metal oil drums with crude oil droplet
 * - Natural Gas (NATGAS): Glowing blue-cyan gas flame
 * - Altcoins (SOL, BNB, XRP): Official token emblems
 * - Stocks (NVDA, AAPL, TSLA, MSFT, ABC-CSX, PPAP-CSX): Authentic brand shields & Cambodian CSX emblems
 */
export const AssetBadgeIcon: React.FC<AssetBadgeIconProps> = ({
  asset,
  symbol: propSymbol,
  size = 'md',
  className = '',
  showGlow = false,
}) => {
  const sym = (asset?.symbol || propSymbol || 'XAU/USD').toUpperCase();
  const { px, containerClass } = SIZE_MAP[size];

  // Helper to choose glow color by asset class
  const getGlowColor = () => {
    if (sym.includes('XAU') || sym.includes('GOLD') || sym.includes('PAXG') || sym.includes('XAUT') || sym.includes('GLD')) {
      return 'shadow-[0_0_12px_rgba(245,158,11,0.45)]';
    }
    if (sym.includes('BTC')) {
      return 'shadow-[0_0_12px_rgba(247,147,26,0.5)]';
    }
    if (sym.includes('ETH')) {
      return 'shadow-[0_0_12px_rgba(98,126,234,0.45)]';
    }
    if (sym.includes('SOL')) {
      return 'shadow-[0_0_12px_rgba(20,241,149,0.45)]';
    }
    if (sym.includes('OIL') || sym.includes('NATGAS')) {
      return 'shadow-[0_0_12px_rgba(6,182,212,0.45)]';
    }
    if (sym.includes('NVDA')) {
      return 'shadow-[0_0_12px_rgba(118,185,0,0.5)]';
    }
    if (sym.includes('TSLA')) {
      return 'shadow-[0_0_12px_rgba(227,25,55,0.45)]';
    }
    return 'shadow-[0_0_10px_rgba(56,189,248,0.35)]';
  };

  const glowClass = showGlow ? getGlowColor() : '';

  // Render specific SVG visual based on symbol
  const renderVisual = () => {
    // 1. BITCOIN (BTC/USDT) - The iconic physical golden Bitcoin coin
    if (sym.includes('BTC')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <defs>
            <radialGradient id="btcGold" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#FFF2A7" />
              <stop offset="25%" stopColor="#F7931A" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </radialGradient>
            <linearGradient id="btcRim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE57F" />
              <stop offset="50%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#FFF9C4" />
            </linearGradient>
            <linearGradient id="btcBevel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#78350F" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {/* Outer Coin Edge with serrations */}
          <circle cx="24" cy="24" r="23" fill="url(#btcRim)" stroke="#78350F" strokeWidth="0.8" />
          {/* Inner Coin Recess */}
          <circle cx="24" cy="24" r="20.5" fill="url(#btcGold)" />
          {/* Concentric track line */}
          <circle cx="24" cy="24" r="18" fill="none" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="1.5 1.5" opacity="0.85" />
          {/* Central Coin Field */}
          <circle cx="24" cy="24" r="15" fill="#F7931A" stroke="#B45309" strokeWidth="0.6" />
          {/* 3D Highlight Arch */}
          <path d="M12 20 A 15 15 0 0 1 36 20 Q 24 16 12 20" fill="url(#btcBevel)" opacity="0.4" />
          {/* Bitcoin Double-Barred "₿" Insignia */}
          <path
            d="M27.2 13v2.2c1.7.3 2.9 1 3.5 2.1.6 1.1.5 2.4-.2 3.6-.5.8-1.2 1.4-2.1 1.7 1.4.4 2.3 1.2 2.7 2.3.4 1.1.3 2.5-.4 3.7-.8 1.4-2.1 2.3-3.8 2.6v2.2h-2v-2.1h-1.8v2.1h-2v-2.1H17v-2.4h1.7c.6 0 .9-.2 1-.5V17c-.1-.3-.4-.5-1-.5H17v-2.4h4.1V12h2v2.1h1.8V12h2v2.1c.1 0 .2 0 .3-.1zm-4.1 4.5v4.2h2.2c.9 0 1.6-.2 2.1-.6.5-.4.7-1 .7-1.6 0-.6-.2-1.2-.7-1.5-.5-.3-1.2-.5-2.1-.5h-2.2zm0 6.6v4.7h2.6c1 0 1.8-.2 2.3-.7.5-.5.8-1.1.8-1.8 0-.7-.3-1.3-.8-1.7-.5-.4-1.3-.5-2.3-.5h-2.6z"
            fill="#FFFFFF"
            filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.5))"
          />
        </svg>
      );
    }

    // 2. CAMBODIA GOLD 99.99% (GOLD-KH) - Phnom Penh Damleung Gold Bar & Coin
    if (sym.includes('GOLD-KH')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <defs>
            <linearGradient id="khGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF9C4" />
              <stop offset="30%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id="khBorder" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
          {/* Gold Coin Outer Rim */}
          <circle cx="24" cy="24" r="23" fill="url(#khBorder)" stroke="#78350F" strokeWidth="1" />
          <circle cx="24" cy="24" r="20" fill="url(#khGold)" />
          <circle cx="24" cy="24" r="17.5" fill="none" stroke="#FEF3C7" strokeWidth="0.8" strokeDasharray="2 1" />
          {/* Gold Ingot Silhouette inside */}
          <rect x="13" y="15" width="22" height="18" rx="2.5" fill="#B45309" opacity="0.3" />
          <rect x="14" y="14" width="20" height="16" rx="2" fill="#FDE68A" stroke="#78350F" strokeWidth="0.6" />
          {/* 99.99% Inscription & Angkor/Lotus Stylized Crown */}
          <path d="M24 16.5 L26 19 L29 19.5 L26.5 21.5 L27 24.5 L24 23 L21 24.5 L21.5 21.5 L19 19.5 L22 19 Z" fill="#D97706" />
          <text x="24" y="27" textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" fill="#78350F">
            99.99%
          </text>
          <text x="24" y="38" textAnchor="middle" fontSize="5" fontWeight="800" fontFamily="sans-serif" fill="#FEF3C7">
            មាសគីឡូ
          </text>
        </svg>
      );
    }

    // 3. SPOT GOLD / GLOBAL GOLD (XAU/USD, PAXG, XAUt, COMEX, GLD-ETF)
    if (
      sym.includes('XAU') ||
      sym.includes('PAXG') ||
      sym.includes('XAUT') ||
      sym.includes('COMEX-GC') ||
      sym.includes('GLD-ETF') ||
      sym === 'GOLD'
    ) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <defs>
            <linearGradient id="goldBarBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="25%" stopColor="#FBBF24" />
              <stop offset="65%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id="goldHighlight" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="goldBasePlate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          {/* Rounded Badge Base */}
          <circle cx="24" cy="24" r="23" fill="url(#goldBasePlate)" stroke="#F59E0B" strokeWidth="1.2" />
          {/* Golden Bullion Bar 3D Trapeze (Isometric view) */}
          <g transform="translate(0, 0)">
            {/* Top Bevel Face */}
            <polygon points="12,17 36,17 32,13 16,13" fill="#FFFBEB" stroke="#B45309" strokeWidth="0.5" />
            {/* Main Front Face */}
            <polygon points="12,17 36,17 38,31 10,31" fill="url(#goldBarBody)" stroke="#78350F" strokeWidth="0.8" />
            {/* Right Bevel Face */}
            <polygon points="36,17 32,13 34,27 38,31" fill="#B45309" stroke="#78350F" strokeWidth="0.5" />
            {/* Bottom Front Shadow Bar */}
            <polygon points="10,31 38,31 38,33 10,33" fill="#78350F" />
            {/* Specular Shine Stripe across face */}
            <polygon points="16,17 22,17 18,31 12,31" fill="url(#goldHighlight)" opacity="0.6" />
            {/* Authentic Gold Hallmark Stamp */}
            <text x="24" y="23" textAnchor="middle" fontSize="5" fontWeight="900" fontFamily="monospace" fill="#78350F">
              999.9
            </text>
            <text x="24" y="28" textAnchor="middle" fontSize="4.2" fontWeight="800" fontFamily="monospace" fill="#78350F" letterSpacing="1">
              FINE GOLD
            </text>
          </g>
          {/* Star Sparkle on top-left edge */}
          <path d="M12 13 L13 10 L14 13 L17 14 L14 15 L13 18 L12 15 L9 14 Z" fill="#FFFBEB" />
        </svg>
      );
    }

    // 4. SPOT SILVER (XAG/USD) - Metallic Silver Ingot
    if (sym.includes('XAG') || sym.includes('SILVER')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <defs>
            <linearGradient id="silverBar" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#E2E8F0" />
              <stop offset="70%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="23" fill="#0F172A" stroke="#CBD5E1" strokeWidth="1.2" />
          <polygon points="12,17 36,17 32,13 16,13" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.5" />
          <polygon points="12,17 36,17 38,31 10,31" fill="url(#silverBar)" stroke="#475569" strokeWidth="0.8" />
          <polygon points="36,17 32,13 34,27 38,31" fill="#64748B" stroke="#334155" strokeWidth="0.5" />
          <text x="24" y="23" textAnchor="middle" fontSize="5" fontWeight="900" fontFamily="monospace" fill="#1E293B">
            999
          </text>
          <text x="24" y="28" textAnchor="middle" fontSize="4.2" fontWeight="800" fontFamily="monospace" fill="#1E293B">
            SILVER
          </text>
          <path d="M12 13 L13 10 L14 13 L17 14 L14 15 L13 18 L12 15 L9 14 Z" fill="#FFFFFF" />
        </svg>
      );
    }

    // 5. WTI CRUDE OIL (USOIL) & BRENT (UKOIL) - Metal Oil Drum with Crude Oil Drop
    if (sym.includes('USOIL') || sym.includes('UKOIL') || sym.includes('OIL') || sym.includes('CRUDE')) {
      const isBrent = sym.includes('UKOIL');
      const drumColor = isBrent ? '#0369A1' : '#D97706';
      const drumColorDark = isBrent ? '#0C4A6E' : '#78350F';
      const drumColorLight = isBrent ? '#38BDF8' : '#FDE68A';

      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <defs>
            <linearGradient id="oilDrum" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={drumColorDark} />
              <stop offset="35%" stopColor={drumColorLight} />
              <stop offset="70%" stopColor={drumColor} />
              <stop offset="100%" stopColor={drumColorDark} />
            </linearGradient>
            <linearGradient id="oilDrop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
          </defs>
          {/* Outer circular container */}
          <circle cx="24" cy="24" r="23" fill="#0B132B" stroke={isBrent ? '#38BDF8' : '#F59E0B'} strokeWidth="1.2" />
          {/* Oil Barrel Silhouette */}
          <g transform="translate(14, 10)">
            {/* Barrel Top Rim */}
            <ellipse cx="10" cy="4" rx="9" ry="2.5" fill={drumColorLight} stroke={drumColorDark} strokeWidth="0.8" />
            {/* Barrel Body */}
            <rect x="1" y="4" width="18" height="21" fill="url(#oilDrum)" stroke={drumColorDark} strokeWidth="0.8" />
            {/* Barrel Bottom Rim */}
            <ellipse cx="10" cy="25" rx="9" ry="2.5" fill={drumColor} stroke={drumColorDark} strokeWidth="0.8" />
            {/* Barrel Ribbing Rings */}
            <line x1="1" y1="10" x2="19" y2="10" stroke="#000000" strokeWidth="1.2" opacity="0.6" />
            <line x1="1" y1="17" x2="19" y2="17" stroke="#000000" strokeWidth="1.2" opacity="0.6" />
            {/* Golden or Jet-black Oil Droplet Badge */}
            <path
              d="M10 9 C10 9 6 15 6 18 C6 20.2 7.8 22 10 22 C12.2 22 14 20.2 14 18 C14 15 10 9 10 9 Z"
              fill="url(#oilDrop)"
              stroke={isBrent ? '#38BDF8' : '#F59E0B'}
              strokeWidth="0.8"
            />
            {/* Specular highlight on drop */}
            <circle cx="8.5" cy="17" r="1.2" fill="#FFFFFF" opacity="0.8" />
          </g>
          {/* Subtitle tag */}
          <text x="24" y="42" textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" fill="#F8FAFC">
            {isBrent ? 'BRENT' : 'WTI'}
          </text>
        </svg>
      );
    }

    // 6. NATURAL GAS (NATGAS) - Blue & Cyan Energy Flame
    if (sym.includes('NATGAS') || sym.includes('GAS')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#03254C" stroke="#38BDF8" strokeWidth="1.2" />
          {/* Outer Cyan Flame */}
          <path
            d="M24 7 C24 7 34 18 34 27 C34 33 29.5 37 24 37 C18.5 37 14 33 14 27 C14 18 24 7 24 7 Z"
            fill="url(#gasCyan)"
          />
          {/* Inner Blue-White Core Flame */}
          <path
            d="M24 16 C24 16 30 23 30 28 C30 31.5 27.5 34 24 34 C20.5 34 18 31.5 18 28 C18 23 24 16 24 16 Z"
            fill="#FFFFFF"
          />
          <defs>
            <linearGradient id="gasCyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    // 7. ETHEREUM (ETH/USDT) - 3D Faceted Crystal Diamond
    if (sym.includes('ETH')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#1C1E32" stroke="#627EEA" strokeWidth="1.2" />
          <g transform="translate(12, 8)">
            {/* Top Left Facet */}
            <polygon points="12,0 2,16 12,11" fill="#C0CBF6" />
            {/* Top Right Facet */}
            <polygon points="12,0 22,16 12,11" fill="#627EEA" />
            {/* Bottom Left Front Facet */}
            <polygon points="12,11 2,16 12,22" fill="#8A9CE8" />
            {/* Bottom Right Front Facet */}
            <polygon points="12,11 22,16 12,22" fill="#455FC9" />
            {/* Lower Diamond Left */}
            <polygon points="12,24 2,18 12,32" fill="#C0CBF6" />
            {/* Lower Diamond Right */}
            <polygon points="12,24 22,18 12,32" fill="#627EEA" />
          </g>
        </svg>
      );
    }

    // 8. SOLANA (SOL/USDT) - Gradient Horizontal S-Bars
    if (sym.includes('SOL')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <defs>
            <linearGradient id="solGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="23" fill="#111116" stroke="#14F195" strokeWidth="1.2" />
          <g transform="translate(10, 14)">
            {/* Top Bar */}
            <path d="M2.5 4.5 L24 4.5 L21.5 0 L0 0 Z" fill="url(#solGrad)" />
            {/* Middle Bar */}
            <path d="M0 10 L21.5 10 L24 14.5 L2.5 14.5 Z" fill="url(#solGrad)" />
            {/* Bottom Bar */}
            <path d="M2.5 20 L24 20 L21.5 15.5 L0 15.5 Z" fill="url(#solGrad)" />
          </g>
        </svg>
      );
    }

    // 9. BINANCE COIN (BNB/USDT) - Yellow/Gold Diamond Lattice
    if (sym.includes('BNB')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#181A20" stroke="#F3BA2F" strokeWidth="1.2" />
          <g transform="translate(12, 12)" fill="#F3BA2F">
            <polygon points="12,0 15,3 7,11 4,8" />
            <polygon points="12,0 9,3 17,11 20,8" />
            <polygon points="12,24 15,21 7,13 4,16" />
            <polygon points="12,24 9,21 17,13 20,16" />
            <polygon points="12,7 17,12 12,17 7,12" />
            <polygon points="0,12 3,9 6,12 3,15" />
            <polygon points="24,12 21,9 18,12 21,15" />
          </g>
        </svg>
      );
    }

    // 10. RIPPLE (XRP/USDT) - Modern Triple Curved Nodes
    if (sym.includes('XRP')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#000000" stroke="#23292F" strokeWidth="1.2" />
          <path
            d="M34 14 C33 13 31.8 13 30.6 14.2 L24 20.8 L17.4 14.2 C16.2 13 15 13 14 14 C13 15 13 16.2 14.2 17.4 L22.4 25.6 C23.3 26.5 24.7 26.5 25.6 25.6 L33.8 17.4 C35 16.2 35 15 34 14 Z M14 34 C15 35 16.2 35 17.4 33.8 L24 27.2 L30.6 33.8 C31.8 35 33 35 34 34 C35 33 35 31.8 33.8 30.6 L25.6 22.4 C24.7 21.5 23.3 21.5 22.4 22.4 L14.2 30.6 C13 31.8 13 33 14 34 Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    }

    // 11. NVIDIA (NVDA) - Iconic Neon Green Eye Logo
    if (sym.includes('NVDA')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#000000" stroke="#76B900" strokeWidth="1.2" />
          <path
            d="M12 28 C14 20 22 15 30 17 C34 18 36 21 36 21 C36 21 33 19 28 19 C22 19 16 23 15 28 C14 32 18 35 23 35 C27 35 30 33 30 33 C30 33 27 34 23 34 C17 34 12 32 12 28 Z M24 21 C28 21 31 23 32 25 C31 24 28 23 25 23 C20 23 18 26 18 28 C18 30 20 31 23 31 C25 31 27 30 27 30 C25 30 24 29 24 28 C24 27 25 26 26 26 C27 26 28 27 28 28 C28 30 26 32 22 32 C17 32 15 29 15 27 C15 24 19 21 24 21 Z"
            fill="#76B900"
          />
          <text x="24" y="42" textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" fill="#76B900">
            NVIDIA
          </text>
        </svg>
      );
    }

    // 12. APPLE (AAPL) - Metallic Silver Apple Logo
    if (sym.includes('AAPL')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#0A0A0A" stroke="#52525B" strokeWidth="1.2" />
          <path
            d="M27.5 14.5 C28.8 12.8 29.8 10.5 29.5 8 C27.5 8.2 25 9.5 23.6 11.2 C22.4 12.6 21.4 15 21.7 17.3 C24 17.5 26.3 16.1 27.5 14.5 Z M32.2 25.5 C32.2 21.8 35.2 20 35.4 19.8 C33.7 17.3 31 17 30.1 16.9 C27.8 16.6 25.6 18.2 24.4 18.2 C23.2 18.2 21.4 16.9 19.5 16.9 C17 16.9 14.7 18.4 13.5 20.6 C10.9 25 12.8 31.6 15.3 35.2 C16.5 37 17.9 39 19.8 38.9 C21.7 38.8 22.4 37.7 24.6 37.7 C26.8 37.7 27.5 38.9 29.5 38.9 C31.5 38.9 32.7 37.1 33.9 35.3 C35.3 33.3 35.9 31.3 36 31.2 C35.8 31.1 32.2 29.7 32.2 25.5 Z"
            fill="#E4E4E7"
          />
        </svg>
      );
    }

    // 13. TESLA (TSLA) - Red Tesla "T" Shield
    if (sym.includes('TSLA')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#18181B" stroke="#E31937" strokeWidth="1.2" />
          <path
            d="M24 14 C27.5 14 32.5 14.7 35.5 16.2 L36.5 12.5 C32.5 11 27.5 10.5 24 10.5 C20.5 10.5 15.5 11 11.5 12.5 L12.5 16.2 C15.5 14.7 20.5 14 24 14 Z M24 18.5 C25.8 18.5 28.5 18.9 31 19.8 L32.5 16.5 C29.5 15.5 26.5 15 24 15 C21.5 15 18.5 15.5 15.5 16.5 L17 19.8 C19.5 18.9 22.2 18.5 24 18.5 Z M22.5 22 L22.5 37 L25.5 37 L25.5 22 C28.5 21.8 32 23 34 24.5 L35.5 21.5 C32.5 19.5 28 18.8 24 18.8 C20 18.8 15.5 19.5 12.5 21.5 L14 24.5 C16 23 19.5 21.8 22.5 22 Z"
            fill="#E31937"
          />
        </svg>
      );
    }

    // 14. MICROSOFT (MSFT) - 4 Squares (Red, Green, Blue, Yellow)
    if (sym.includes('MSFT')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#18181B" stroke="#38BDF8" strokeWidth="1.2" />
          <rect x="13" y="13" width="10" height="10" fill="#F25022" />
          <rect x="25" y="13" width="10" height="10" fill="#7FBA00" />
          <rect x="13" y="25" width="10" height="10" fill="#00A4EF" />
          <rect x="25" y="25" width="10" height="10" fill="#FFB900" />
        </svg>
      );
    }

    // 15. ACLEDA BANK CSX (ABC-CSX) - Royal Blue Shield with Golden Mythological Bird
    if (sym.includes('ABC') || sym.includes('ACLEDA')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#02457A" stroke="#F59E0B" strokeWidth="1.4" />
          {/* Golden Shield */}
          <path d="M14 12 L34 12 L34 24 C34 31 24 37 24 37 C24 37 14 31 14 24 Z" fill="#002D54" stroke="#F59E0B" strokeWidth="1" />
          {/* Mythological Golden Bird Emblem */}
          <path d="M24 15 C21 17 18 21 18 24 C20 22 23 22 24 24 C25 22 28 22 30 24 C30 21 27 17 24 15 Z" fill="#F59E0B" />
          <circle cx="24" cy="20" r="2" fill="#FEF3C7" />
          <text x="24" y="32" textAnchor="middle" fontSize="5.5" fontWeight="900" fontFamily="sans-serif" fill="#FEF3C7">
            ABC
          </text>
        </svg>
      );
    }

    // 16. PHNOM PENH PORT CSX (PPAP-CSX) - Maritime Golden Anchor & Wheel
    if (sym.includes('PPAP') || sym.includes('PORT')) {
      return (
        <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm select-none" fill="none">
          <circle cx="24" cy="24" r="23" fill="#0F284E" stroke="#38BDF8" strokeWidth="1.2" />
          {/* Anchor */}
          <circle cx="24" cy="14" r="3" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
          <line x1="24" y1="17" x2="24" y2="34" stroke="#F59E0B" strokeWidth="2.2" />
          <line x1="17" y1="21" x2="31" y2="21" stroke="#F59E0B" strokeWidth="2" />
          <path d="M15 28 C18 34 30 34 33 28" stroke="#F59E0B" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <text x="24" y="42" textAnchor="middle" fontSize="6" fontWeight="900" fontFamily="sans-serif" fill="#38BDF8">
            PPAP
          </text>
        </svg>
      );
    }

    // DEFAULT / FALLBACK: Clean Monogram Badge with Asset Class Palette
    const isCrypto = asset?.assetClass === 'crypto';
    const isGoldClass = asset?.assetClass === 'gold';
    const bgGrad = isGoldClass
      ? 'from-amber-500 to-amber-700'
      : isCrypto
        ? 'from-sky-500 to-indigo-600'
        : 'from-emerald-500 to-teal-700';
    const initials = sym.replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'KV';

    return (
      <div
        className={`w-full h-full rounded-full bg-gradient-to-br ${bgGrad} flex items-center justify-center text-white font-black text-[10px] tracking-tight border border-white/20 select-none shadow-xs`}
      >
        {initials}
      </div>
    );
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full transition-transform hover:scale-105 ${containerClass} ${glowClass} ${className}`}
      title={`${asset?.name || sym} (${sym})`}
      style={{ width: `${px}px`, height: `${px}px` }}
    >
      {renderVisual()}
    </div>
  );
};
