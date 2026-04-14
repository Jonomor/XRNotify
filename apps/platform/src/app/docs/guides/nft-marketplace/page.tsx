import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NFT Marketplace Integration: XRNotify Docs',
  description:
    'End-to-end guide for tracking the full NFT lifecycle (mint, list, sale, and burn) in your XRPL marketplace using XRNotify webhooks.',
};

export default function NftMarketplacePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">
              Docs
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#guides" className="text-zinc-500 hover:text-zinc-300 no-underline">Guides</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">NFT Marketplace</span>
          </div>
          <Link
            href="/"
            className="text-zinc-400 hover:text-white transition-colors text-sm no-underline"
          >
            Home →
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 mb-4">
            Guides
          </span>
          <h1 className="text-3xl font-bold text-white mb-3">NFT Marketplace Integration</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Keep your marketplace listings automatically in sync with on-chain state by
            subscribing to NFT lifecycle events via XRNotify webhooks.
          </p>
        </div>

        {/* What you'll build */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">What you&apos;ll build</h2>
          <p className="text-zinc-300 leading-relaxed mb-4">
            By the end of this guide, your marketplace backend will automatically respond
            to every stage of an NFT&apos;s on-chain lifecycle:
          </p>
          <ul className="space-y-2 text-zinc-300 text-sm">
            <li className="flex gap-2">
              <span className="text-emerald-400 mt-0.5">→</span>
              <span><strong className="text-white">Mint</strong>: index new NFTs as soon as they appear on-chain</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 mt-0.5">→</span>
              <span><strong className="text-white">Offer created</strong>: mark NFTs as &quot;listed for sale&quot; or record incoming bids</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 mt-0.5">→</span>
              <span><strong className="text-white">Offer accepted</strong>: transfer ownership and record the sale</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 mt-0.5">→</span>
              <span><strong className="text-white">Offer cancelled</strong>: remove stale listings and bids</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400 mt-0.5">→</span>
              <span><strong className="text-white">Burn</strong>: delist and archive burned tokens</span>
            </li>
          </ul>
        </section>

        {/* Subscribe to NFT events */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Subscribe to NFT events</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            Create a single webhook that covers all NFT event types. Because this webhook
            has no <code className="text-emerald-400 bg-zinc-800 px-1 rounded">account_filters</code>, it will fire for any NFT activity on the network,
            suitable for a public marketplace. You can add filters later to narrow scope.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://api.yourmarket.com/webhooks/nft",
    "event_types": [
      "nft.minted",
      "nft.burned",
      "nft.offer_created",
      "nft.offer_accepted",
      "nft.offer_cancelled"
    ]
  }'`}
            </pre>
          </div>
        </section>

        {/* Central dispatcher */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Central event dispatcher</h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            A single route handles all NFT events and dispatches to the appropriate handler
            via a <code className="text-emerald-400 bg-zinc-800 px-1 rounded">switch</code> on{' '}
            <code className="text-emerald-400 bg-zinc-800 px-1 rounded">event.event_type</code>.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-6">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`app.post('/webhooks/nft', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['x-xrnotify-signature'];
  if (!verifySignature(req.body, sig, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  // Idempotency guard
  const deliveryId = req.headers['x-xrnotify-delivery-id'];
  if (await cache.get(\`delivery:\${deliveryId}\`)) return res.sendStatus(200);

  switch (event.event_type) {
    case 'nft.minted':       await handleMinted(event);          break;
    case 'nft.offer_created':  await handleOfferCreated(event);   break;
    case 'nft.offer_accepted': await handleOfferAccepted(event);  break;
    case 'nft.offer_cancelled':await handleOfferCancelled(event); break;
    case 'nft.burned':       await handleBurned(event);          break;
  }

  await cache.set(\`delivery:\${deliveryId}\`, 'done', 86400);
  res.sendStatus(200);
});`}
            </pre>
          </div>
        </section>

        {/* Handling nft.minted */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">
            Handling <code className="text-emerald-400">nft.minted</code>
          </h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            When an NFT is minted, add it to your index. The issuer is also the initial
            owner. Decode the <code className="text-emerald-400 bg-zinc-800 px-1 rounded">uri_decoded</code> field (already hex-decoded by XRNotify) to
            get the metadata URL.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`async function handleMinted(event) {
  const { nft_id, issuer, uri_decoded, flags, taxon } = event.payload;

  await db.nfts.create({
    id: nft_id,
    issuer,
    owner: issuer,         // Owner is issuer on mint
    metadata_url: uri_decoded,
    taxon,
    is_transferable: !(flags & 8), // tfBurnable flag check
    status: 'unlisted',
    created_at: event.timestamp,
  });
}`}
            </pre>
          </div>
        </section>

        {/* Handling nft.offer_created */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">
            Handling <code className="text-emerald-400">nft.offer_created</code>
          </h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            The payload distinguishes between sell offers (listings) and buy offers (bids)
            via the <code className="text-emerald-400 bg-zinc-800 px-1 rounded">is_sell_offer</code> boolean.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`async function handleOfferCreated(event) {
  const { nft_id, owner, amount, is_sell_offer, offer_id } = event.payload;

  if (is_sell_offer) {
    // Mark the NFT as listed with price and the offer ID
    await db.nfts.update(nft_id, {
      status: 'listed',
      list_price: amount,
      list_offer_id: offer_id,
    });
  } else {
    // Record the incoming bid
    await db.bids.create({
      nft_id,
      bidder: owner,
      amount,
      offer_id,
      created_at: event.timestamp,
    });
  }
}`}
            </pre>
          </div>
        </section>

        {/* Handling nft.offer_accepted */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">
            Handling <code className="text-emerald-400">nft.offer_accepted</code>
          </h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            A sale is final. Transfer ownership in your database, clear the listing status,
            and record the sale for provenance.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`async function handleOfferAccepted(event) {
  const { nft_id, buyer, seller, price } = event.payload;

  await db.nfts.update(nft_id, {
    owner: buyer,
    status: 'unlisted',
    list_price: null,
    list_offer_id: null,
    last_sale: price,
  });

  await db.sales.create({
    nft_id,
    buyer,
    seller,
    price,
    timestamp: event.timestamp,
  });

  // Remove any outstanding bids now that the NFT has sold
  await db.bids.deleteWhere({ nft_id });
}`}
            </pre>
          </div>
        </section>

        {/* Handling nft.offer_cancelled */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">
            Handling <code className="text-emerald-400">nft.offer_cancelled</code>
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`async function handleOfferCancelled(event) {
  const { nft_id, offer_id, is_sell_offer } = event.payload;

  if (is_sell_offer) {
    // Only unlist if this is the active listing offer
    const nft = await db.nfts.findById(nft_id);
    if (nft?.list_offer_id === offer_id) {
      await db.nfts.update(nft_id, {
        status: 'unlisted',
        list_price: null,
        list_offer_id: null,
      });
    }
  } else {
    await db.bids.deleteWhere({ offer_id });
  }
}`}
            </pre>
          </div>
        </section>

        {/* Handling nft.burned */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">
            Handling <code className="text-emerald-400">nft.burned</code>
          </h2>
          <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
            A burned NFT is permanently destroyed. Remove it from active listings and
            archive any associated bids.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`async function handleBurned(event) {
  const { nft_id } = event.payload;

  await db.nfts.update(nft_id, {
    status: 'burned',
    list_price: null,
    list_offer_id: null,
    burned_at: event.timestamp,
  });

  // Remove all bids - there is nothing left to bid on
  await db.bids.deleteWhere({ nft_id });
}`}
            </pre>
          </div>
        </section>

        {/* Real-time UI updates */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Real-time UI updates</h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            Once your webhook handler updates the database, you can push the change to any
            connected browser clients so listings update without a page refresh. After
            calling the relevant <code className="text-emerald-400 bg-zinc-800 px-1 rounded">db.*</code> method, emit an event on a shared
            in-process emitter (or a Redis pub/sub channel if you run multiple instances):
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-zinc-300 text-sm font-mono whitespace-pre">
{`// After updating the DB inside handleOfferAccepted:
nftEventEmitter.emit('nft-update', {
  type: 'sold',
  nft_id,
  buyer,
  price,
});

// SSE endpoint your frontend connects to:
app.get('/api/nft-stream/:nftId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const listener = (update) => {
    if (update.nft_id === req.params.nftId) {
      res.write(\`data: \${JSON.stringify(update)}\\n\\n\`);
    }
  };

  nftEventEmitter.on('nft-update', listener);
  req.on('close', () => nftEventEmitter.off('nft-update', listener));
});`}
            </pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300">
            For multi-instance deployments, replace the in-process event emitter with a
            Redis pub/sub channel so all server instances broadcast the update to their
            connected SSE clients.
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Next steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/docs/reference/event-schema', label: 'Event Schema', desc: 'Full payload shapes for all 23 event types' },
              { href: '/docs/guides/handling-failures', label: 'Handling Failures', desc: 'Retry policy, idempotency, and the Replay API' },
              { href: '/docs/events', label: 'Event Types', desc: 'Full reference for every NFT event payload field' },
              { href: '/docs/verify-signatures', label: 'Verifying Signatures', desc: 'Secure your webhook endpoint' },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors no-underline"
              >
                <div className="text-sm font-medium text-white mb-1">{label}</div>
                <div className="text-xs text-zinc-500">{desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
