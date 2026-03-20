'use client';

import { useState, useEffect, useCallback } from 'react';

// Simulated XRPL transaction types with realistic data
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
  { name: 'Wallet App', url: 'api.mywallet.io/webhook', status: 'active' },
  { name: 'NFT Marketplace', url: 'hooks.nftmarket.xyz/xrpl', status: 'active' },
  { name: 'Exchange Bot', url: 'bot.trading.com/events', status: 'active' },
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
  txId: string;
  endpoint: string;
  status: 'success' | 'pending';
  latency: number;
  timestamp: number;
}

function generateTxHash(): string {
  const chars = 'ABCDEF0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateAmount(): string {
  const amounts = ['12.5 XRP', '1,000 USD', '0.5 ETH', '500 XRP', '2.3M SOLO', '15 XRP'];
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

    setTransactions(prev => [...prev.slice(-8), tx]);
    setLedgerIndex(prev => prev + Math.floor(Math.random() * 3));

    setTimeout(() => {
      setTransactions(prev =>
        prev.map(t => t.id === tx.id ? { ...t, status: 'processing' } : t)
      );
    }, 400);

    setTimeout(() => {
      setTransactions(prev =>
        prev.map(t => t.id === tx.id ? { ...t, status: 'delivered' } : t)
      );
      setEventsProcessed(prev => prev + 1);

      const latency = 50 + Math.floor(Math.random() * 150);
      const endpointIndex = tx.targetEndpoint ?? 0;
      const endpoint = WEBHOOK_ENDPOINTS[endpointIndex];
      if (!endpoint) return;

      setDeliveryLogs(prev => [...prev.slice(-4), {
        id: `log-${Date.now()}`,
        txId: tx.id,
        endpoint: endpoint.name,
        status: 'success',
        latency,
        timestamp: Date.now(),
      }]);
    }, 800 + Math.random() * 400);
  }, [isPaused]);

  useEffect(() => {
    const interval = setInterval(generateTransaction, 1500 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, [generateTransaction]);

  useEffect(() => {
    const t1 = setTimeout(generateTransaction, 500);
    const t2 = setTimeout(generateTransaction, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div
        className="relative bg-[#0d0d14] border border-zinc-800/50 rounded-2xl p-6 overflow-hidden"
        style={{ minHeight: '420px' }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Header stats bar */}
        <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-zinc-500">LIVE</span>
            </div>
            <div className="text-xs text-zinc-500">
              Ledger <span className="text-zinc-300 font-mono">{ledgerIndex.toLocaleString()}</span>
            </div>
            <div className="text-xs text-zinc-500">
              Events <span className="text-emerald-400 font-mono">{eventsProcessed}</span>
            </div>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3 py-1 text-xs rounded-md bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300 transition-colors"
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>

        {/* Three-column layout */}
        <div className="relative grid grid-cols-12 gap-4">

          {/* Left: XRPL Ledger feed */}
          <div className="col-span-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs">⛓️</span>
              </div>
              <span className="text-xs font-medium text-zinc-400">XRPL Mainnet</span>
            </div>

            <div className="space-y-2 min-h-[280px]">
              {transactions.slice(-5).map((tx, i) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                  className={[
                    'relative p-3 rounded-lg cursor-pointer transition-all duration-300',
                    selectedTx?.id === tx.id
                      ? 'bg-zinc-800/80 ring-1 ring-emerald-500/50'
                      : 'bg-zinc-900/50 hover:bg-zinc-800/50',
                  ].join(' ')}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{tx.type.icon}</span>
                      <span className="text-xs font-medium text-zinc-300">{tx.type.label}</span>
                    </div>
                    <div
                      className="w-2 h-2 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor:
                          tx.status === 'delivered' ? '#10b981'
                          : tx.status === 'processing' ? '#f59e0b'
                          : '#3b82f6',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-[10px] text-zinc-500 font-mono">{tx.hash}...</code>
                    {tx.amount && <span className="text-[10px] text-zinc-400">{tx.amount}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: XRNotify Processing */}
          <div className="col-span-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <span className="text-xs">⚡</span>
              </div>
              <span className="text-xs font-medium text-zinc-400">XRNotify</span>
            </div>

            <div className="relative flex flex-col items-center justify-center min-h-[280px]">
              <div className="relative">
                <div className="absolute -inset-8 rounded-full border border-emerald-500/20" style={{ animation: 'spin 12s linear infinite' }} />
                <div className="absolute -inset-12 rounded-full border border-teal-500/10" style={{ animation: 'spin 8s linear infinite reverse' }} />

                <div className="relative w-32 h-32 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex flex-col items-center justify-center">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-[10px] text-zinc-400 text-center px-2">
                    Filter · Sign · Deliver
                  </div>

                  <div className="absolute -bottom-6 flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                        style={{ animation: `bounce 0.6s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">HMAC-SHA256</span>
                <span className="px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400">Auto-Retry</span>
                <span className="px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">&lt;100ms</span>
              </div>
            </div>
          </div>

          {/* Right: Webhook Endpoints */}
          <div className="col-span-4">
            <div className="flex items-center justify-end gap-2 mb-3">
              <span className="text-xs font-medium text-zinc-400">Your Endpoints</span>
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-xs">🎯</span>
              </div>
            </div>

            <div className="space-y-3 min-h-[200px]">
              {WEBHOOK_ENDPOINTS.map((endpoint) => (
                <div
                  key={endpoint.name}
                  className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-300">{endpoint.name}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-zinc-500">Active</span>
                    </div>
                  </div>
                  <code className="text-[10px] text-zinc-500 font-mono block truncate">
                    https://{endpoint.url}
                  </code>
                </div>
              ))}
            </div>

            {/* Delivery log */}
            <div className="mt-4 pt-3 border-t border-zinc-800/50">
              <div className="text-[10px] text-zinc-500 mb-2">Recent Deliveries</div>
              <div className="space-y-1.5">
                {deliveryLogs.slice(-3).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span className="text-zinc-400">{log.endpoint}</span>
                    </div>
                    <span className="text-zinc-500 font-mono">{log.latency}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selected transaction detail panel */}
        {selectedTx && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-900/95 border-t border-zinc-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span>{selectedTx.type.icon}</span>
                  <span className="text-sm font-medium text-zinc-200">{selectedTx.type.label}</span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px]"
                    style={{
                      backgroundColor: `${selectedTx.type.color}20`,
                      color: selectedTx.type.color,
                    }}
                  >
                    {selectedTx.type.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Hash: <code className="text-zinc-400">{selectedTx.hash}...</code></span>
                  {selectedTx.amount && <span>Amount: <span className="text-zinc-300">{selectedTx.amount}</span></span>}
                  <span>Status: <span className={selectedTx.status === 'delivered' ? 'text-emerald-400' : 'text-amber-400'}>{selectedTx.status}</span></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Caption */}
      <p className="text-center text-xs text-zinc-500 mt-4">
        ▶ Live simulation · Click transactions to inspect · Real webhooks deliver in &lt;100ms
      </p>
    </div>
  );
}

export default HeroAnimation;
