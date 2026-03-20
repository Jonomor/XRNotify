'use client';

// =============================================================================
// XRNotify Hero Animation Component
// =============================================================================
// Animated visualization showing: XRPL → XRNotify → Webhook endpoints
// =============================================================================

export function HeroAnimation() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 p-6 backdrop-blur-sm sm:p-8">
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes flow {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes packet {
          0% { opacity: 0; transform: translateX(-10px); }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateX(10px); }
        }
        @keyframes arrive {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .flow-line {
          stroke-dasharray: 4 4;
          animation: flow 0.8s linear infinite;
        }
        .pulse-text {
          animation: pulse 2s ease-in-out infinite;
        }
        .packet {
          animation: packet 1.5s ease-out infinite;
        }
        .packet-2 { animation-delay: 0.3s; }
        .packet-3 { animation-delay: 0.6s; }
        .arrive {
          animation: arrive 0.4s ease-out forwards;
          opacity: 0;
        }
        .arrive-2 { animation-delay: 0.2s; }
        .arrive-3 { animation-delay: 0.4s; }
        .flow-delay-1 { animation-delay: 0.1s; }
        .flow-delay-2 { animation-delay: 0.2s; }
        .flow-delay-3 { animation-delay: 0.3s; }
      `}</style>

      <svg
        viewBox="0 0 680 280"
        className="w-full"
        aria-label="XRNotify webhook flow: XRPL transactions are processed by XRNotify and delivered to your endpoints"
      >
        <defs>
          <linearGradient id="xrpl-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="xrn-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="ep-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>

        {/* XRPL Ledger Box */}
        <g transform="translate(40,90)">
          <rect width="120" height="100" rx="12" fill="url(#xrpl-grad)" opacity="0.15" />
          <rect width="120" height="100" rx="12" fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0.5" />
          <text x="60" y="35" textAnchor="middle" fill="#93C5FD" fontSize="11" fontFamily="system-ui">
            XRP LEDGER
          </text>
          <rect x="15" y="50" width="90" height="18" rx="4" fill="#1E40AF" opacity="0.5" />
          <text x="60" y="63" textAnchor="middle" fill="#BFDBFE" fontSize="10" fontFamily="monospace" className="pulse-text">
            Payment tx...
          </text>
          <rect x="15" y="72" width="90" height="18" rx="4" fill="#1E40AF" opacity="0.3" />
          <text x="60" y="85" textAnchor="middle" fill="#93C5FD" fontSize="10" fontFamily="monospace" opacity="0.7">
            NFT mint...
          </text>
        </g>

        {/* Flow from XRPL to XRNotify */}
        <g>
          <line x1="165" y1="140" x2="250" y2="140" stroke="#10b981" strokeWidth="2" className="flow-line" />
          <circle cx="190" cy="140" r="4" fill="#10b981" className="packet" />
          <circle cx="210" cy="140" r="4" fill="#10b981" className="packet packet-2" />
          <circle cx="230" cy="140" r="4" fill="#10b981" className="packet packet-3" />
        </g>

        {/* XRNotify Center Box */}
        <g transform="translate(255,70)">
          <rect width="170" height="140" rx="16" fill="url(#xrn-grad)" opacity="0.12" />
          <rect width="170" height="140" rx="16" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
          {/* Logo */}
          <rect x="50" y="12" width="70" height="28" rx="6" fill="url(#xrn-grad)" />
          <path d="M85 20 L78 28 L82 28 L80 36 L92 26 L87 26 L90 20 Z" fill="white" />
          <text x="85" y="55" textAnchor="middle" fill="#6EE7B7" fontSize="12" fontWeight="500" fontFamily="system-ui">
            XRNotify
          </text>
          <text x="85" y="75" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="system-ui" opacity="0.8">
            Filter + Sign
          </text>
          {/* Feature badges */}
          <g transform="translate(25,90)">
            <rect width="56" height="22" rx="4" fill="#065F46" opacity="0.5" />
            <text x="28" y="15" textAnchor="middle" fill="#6EE7B7" fontSize="9" fontFamily="monospace">
              HMAC
            </text>
          </g>
          <g transform="translate(89,90)">
            <rect width="56" height="22" rx="4" fill="#065F46" opacity="0.5" />
            <text x="28" y="15" textAnchor="middle" fill="#6EE7B7" fontSize="9" fontFamily="monospace">
              Retry
            </text>
          </g>
        </g>

        {/* Fan-out lines to endpoints */}
        <g>
          <line x1="430" y1="110" x2="520" y2="60" stroke="#8B5CF6" strokeWidth="1.5" className="flow-line flow-delay-1" />
          <line x1="430" y1="140" x2="520" y2="140" stroke="#8B5CF6" strokeWidth="1.5" className="flow-line flow-delay-2" />
          <line x1="430" y1="170" x2="520" y2="220" stroke="#8B5CF6" strokeWidth="1.5" className="flow-line flow-delay-3" />
        </g>

        {/* Endpoint 1: Wallet */}
        <g transform="translate(525,30)">
          <rect width="115" height="60" rx="8" fill="url(#ep-grad)" opacity="0.12" />
          <rect width="115" height="60" rx="8" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
          <text x="57" y="24" textAnchor="middle" fill="#C4B5FD" fontSize="10" fontFamily="system-ui">
            Wallet app
          </text>
          <text x="57" y="42" textAnchor="middle" fill="#A78BFA" fontSize="9" fontFamily="monospace" opacity="0.8">
            api.wallet.io
          </text>
          <circle cx="100" cy="15" r="6" fill="#22C55E" className="arrive" />
          <path d="M97 15 L99 17 L103 13" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="arrive" />
        </g>

        {/* Endpoint 2: NFT Marketplace */}
        <g transform="translate(525,110)">
          <rect width="115" height="60" rx="8" fill="url(#ep-grad)" opacity="0.12" />
          <rect width="115" height="60" rx="8" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
          <text x="57" y="24" textAnchor="middle" fill="#C4B5FD" fontSize="10" fontFamily="system-ui">
            NFT marketplace
          </text>
          <text x="57" y="42" textAnchor="middle" fill="#A78BFA" fontSize="9" fontFamily="monospace" opacity="0.8">
            nft.market/wh
          </text>
          <circle cx="100" cy="15" r="6" fill="#22C55E" className="arrive arrive-2" />
          <path d="M97 15 L99 17 L103 13" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="arrive arrive-2" />
        </g>

        {/* Endpoint 3: Exchange */}
        <g transform="translate(525,190)">
          <rect width="115" height="60" rx="8" fill="url(#ep-grad)" opacity="0.12" />
          <rect width="115" height="60" rx="8" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
          <text x="57" y="24" textAnchor="middle" fill="#C4B5FD" fontSize="10" fontFamily="system-ui">
            Exchange
          </text>
          <text x="57" y="42" textAnchor="middle" fill="#A78BFA" fontSize="9" fontFamily="monospace" opacity="0.8">
            ex.com/hook
          </text>
          <circle cx="100" cy="15" r="6" fill="#22C55E" className="arrive arrive-3" />
          <path d="M97 15 L99 17 L103 13" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="arrive arrive-3" />
        </g>

        {/* Labels */}
        <text x="100" y="220" textAnchor="middle" fill="#6B7280" fontSize="10" fontFamily="system-ui">
          Real-time events
        </text>
        <text x="340" y="240" textAnchor="middle" fill="#6B7280" fontSize="10" fontFamily="system-ui">
          Process + sign
        </text>
        <text x="582" y="270" textAnchor="middle" fill="#6B7280" fontSize="10" fontFamily="system-ui">
          Instant delivery
        </text>
      </svg>
    </div>
  );
}

export default HeroAnimation;
