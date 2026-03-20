'use client';

import { useState, useEffect, useCallback } from 'react';

const TX_TYPES = [
  { type: 'payment.xrp', label: 'XRP Payment', color: '#10b981', icon: '💸' },
  { type: 'payment.issued', label: 'Token Transfer', color: '#14b8a6', icon: '🪙' },
  { type: 'nft.minted', label: 'NFT Minted', color: '#8b5cf6', icon: '🎨' },
  { type: 'nft.offer_accepted', label: 'NFT Sold', color: '#a855f7', icon: '🏷️' },
  { type: 'dex.offer_created', label: 'DEX Order', color: '#f59e0b', icon: '📊' },
  { type: 'dex.offer_filled', label: 'Trade Filled', color: '#eab308', icon: '✅' },
  { type: 'trustline.created', label: 'Trustline Set', color: '#06b6d4', icon: '🔗' },
];

const WEBHOOK_ENDPOINTS = [
  { name: 'Wallet App', url: 'api.mywallet.io/webhook' },
  { name: 'NFT Marketplace', url: 'hooks.nftmarket.xyz/xrpl' },
  { name: 'Exchange Bot', url: 'bot.trading.com/events' },
];

interface Transaction {
  id: string;
  type: typeof TX_TYPES[number];
  hash: string;
  amount?: string;
  timestamp: number;
  status: 'incoming' | 'processing' | 'delivered';
  targetEndpoint?: number;
}

interface DeliveryLog {
  id: string;
  endpoint: string;
  latency: number;
}

function generateTxHash(): string {
  const chars = 'ABCDEF0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateAmount(): string {
  const amounts = ['12.5 XRP', '1,000 USD', '500 XRP', '2.3M SOLO', '15 XRP'];
  return amounts[Math.floor(Math.random() * amounts.length)] ?? '10 XRP';
}

export function HeroAnimation() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [ledgerIndex, setLedgerIndex] = useState(89_547_832);
  const [eventsProcessed, setEventsProcessed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const generateTransaction = useCallback(() => {
    if (isPaused) return;

    const type = TX_TYPES[Math.floor(Math.random() * TX_TYPES.length)];
    if (!type) return;

    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      hash: generateTxHash(),
      amount: generateAmount(),
      timestamp: Date.now(),
      status: 'incoming',
      targetEndpoint: Math.floor(Math.random() * WEBHOOK_ENDPOINTS.length),
    };

    setTransactions(prev => [...prev.slice(-6), tx]);
    setLedgerIndex(prev => prev + Math.floor(Math.random() * 3));

    setTimeout(() => {
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'processing' } : t));
    }, 400);

    setTimeout(() => {
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'delivered' } : t));
      setEventsProcessed(prev => prev + 1);

      const endpointIndex = tx.targetEndpoint ?? 0;
      const endpoint = WEBHOOK_ENDPOINTS[endpointIndex];
      if (!endpoint) return;

      setDeliveryLogs(prev => [...prev.slice(-4), {
        id: `log-${Date.now()}`,
        endpoint: endpoint.name,
        latency: 50 + Math.floor(Math.random() * 150),
      }]);
    }, 800 + Math.random() * 400);
  }, [isPaused]);

  useEffect(() => {
    const interval = setInterval(generateTransaction, 1500 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, [generateTransaction]);

  useEffect(() => {
    const t1 = setTimeout(generateTransaction, 300);
    const t2 = setTimeout(generateTransaction, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="relative bg-[#0d0d14] border border-zinc-800/50 rounded-2xl overflow-hidden">

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-zinc-500 font-medium">LIVE</span>
            </div>
            <div className="text-xs text-zinc-500">
              Ledger <span className="text-zinc-300 font-mono">{ledgerIndex.toLocaleString()}</span>
            </div>
            <div className="text-xs text-zinc-500">
              <span className="text-emerald-400 font-mono font-medium">{eventsProcessed}</span>
              <span className="ml-1 hidden sm:inline">events</span>
            </div>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-2.5 py-1 text-xs rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300 transition-colors"
          >
            {isPaused ? '▶' : '⏸'}
            <span className="hidden sm:inline ml-1">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>

        {/* Body — stacked on mobile, 3-col on md+ */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 divide-y divide-zinc-800/50 md:divide-y-0 md:divide-x md:divide-zinc-800/50">

          {/* Column 1: XRPL Feed */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs">⛓️</span>
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">XRPL Mainnet</span>
            </div>

            <div className="space-y-2">
              {transactions.slice(-4).map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                  className={[
                    'w-full text-left p-2.5 rounded-lg transition-all duration-200',
                    selectedTx?.id === tx.id
                      ? 'bg-zinc-800/80 ring-1 ring-emerald-500/40'
                      : 'bg-zinc-900/50 hover:bg-zinc-800/40',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{tx.type.icon}</span>
                      <span className="text-xs font-medium text-zinc-300 truncate">{tx.type.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {tx.amount && (
                        <span className="text-[10px] text-zinc-500 hidden sm:block">{tx.amount}</span>
                      )}
                      <div
                        className="w-2 h-2 rounded-full shrink-0 transition-colors duration-300"
                        style={{
                          backgroundColor:
                            tx.status === 'delivered' ? '#10b981'
                            : tx.status === 'processing' ? '#f59e0b'
                            : '#3b82f6',
                        }}
                      />
                    </div>
                  </div>
                  <code className="text-[10px] text-zinc-600 font-mono mt-1 block">{tx.hash}...</code>
                </button>
              ))}

              {transactions.length === 0 && (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
                  <span className="text-xs text-zinc-600">Waiting for transactions…</span>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: XRNotify hub */}
          <div className="p-4 sm:p-5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 self-start md:self-center">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                <span className="text-xs">⚡</span>
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">XRNotify</span>
            </div>

            {/* Hub visualization — visible on md+, simplified row on mobile */}
            <div className="hidden md:flex flex-col items-center justify-center flex-1 w-full">
              <div className="relative flex items-center justify-center w-full" style={{ height: '160px' }}>
                {/* Clipped container so rings don't bleed */}
                <div className="relative" style={{ width: '128px', height: '128px' }}>
                  <div
                    className="absolute rounded-full border border-emerald-500/20"
                    style={{ inset: '-20px', animation: 'spin 12s linear infinite' }}
                  />
                  <div
                    className="absolute rounded-full border border-teal-500/10"
                    style={{ inset: '-36px', animation: 'spin 8s linear infinite reverse' }}
                  />
                  <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex flex-col items-center justify-center">
                    <span className="text-2xl mb-1">⚡</span>
                    <span className="text-[10px] text-zinc-400 text-center px-2">Filter · Sign · Deliver</span>
                  </div>
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                        style={{ animation: 'bounce 0.6s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: horizontal feature pills instead of hub */}
            <div className="flex md:hidden flex-row flex-wrap gap-2 w-full">
              <span className="px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">HMAC-SHA256</span>
              <span className="px-2.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400">Auto-Retry</span>
              <span className="px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">&lt;100ms</span>
              <span className="px-2.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-400">Filter · Sign</span>
            </div>

            {/* Desktop feature pills */}
            <div className="hidden md:flex flex-wrap justify-center gap-2 mt-2">
              <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">HMAC-SHA256</span>
              <span className="px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400">Auto-Retry</span>
              <span className="px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">&lt;100ms</span>
            </div>
          </div>

          {/* Column 3: Endpoints + delivery log */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs">🎯</span>
              </div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Your Endpoints</span>
            </div>

            {/* On mobile show as compact 1-col, on sm+ as normal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-2">
              {WEBHOOK_ENDPOINTS.map((endpoint) => (
                <div
                  key={endpoint.name}
                  className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-zinc-300 truncate mr-2">{endpoint.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-zinc-500">Active</span>
                    </div>
                  </div>
                  <code className="text-[10px] text-zinc-600 font-mono block truncate">
                    {endpoint.url}
                  </code>
                </div>
              ))}
            </div>

            {/* Delivery log */}
            {deliveryLogs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800/50">
                <div className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Recent</div>
                <div className="space-y-1.5">
                  {deliveryLogs.slice(-3).map((log, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-emerald-500 text-[10px] shrink-0">✓</span>
                        <span className="text-[10px] text-zinc-400 truncate">{log.endpoint}</span>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono shrink-0 ml-2">{log.latency}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction detail panel */}
        {selectedTx && (
          <div className="relative border-t border-zinc-800 bg-zinc-900/95 px-4 py-3 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                  <span>{selectedTx.type.icon}</span>
                  <span className="text-sm font-medium text-zinc-200">{selectedTx.type.label}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] shrink-0"
                    style={{ backgroundColor: `${selectedTx.type.color}20`, color: selectedTx.type.color }}
                  >
                    {selectedTx.type.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>Hash: <code className="text-zinc-400">{selectedTx.hash}…</code></span>
                  {selectedTx.amount && <span>Amount: <span className="text-zinc-300">{selectedTx.amount}</span></span>}
                  <span>Status: <span className={selectedTx.status === 'delivered' ? 'text-emerald-400' : 'text-amber-400'}>{selectedTx.status}</span></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="shrink-0 text-zinc-500 hover:text-zinc-300 p-1 -mr-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-zinc-600 mt-3">
        Live simulation · Tap transactions to inspect · Real webhooks deliver in &lt;100ms
      </p>
    </div>
  );
}

export default HeroAnimation;
