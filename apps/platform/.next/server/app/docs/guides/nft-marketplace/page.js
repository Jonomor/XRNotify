(()=>{var e={};e.id=8578,e.ids=[8578],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},74161:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>r.a,__next_app__:()=>x,originalPathname:()=>m,pages:()=>o,routeModule:()=>h,tree:()=>c}),s(8789),s(30290),s(93056);var a=s(93443),n=s(98498),i=s(23516),r=s.n(i),l=s(68902),d={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>l[e]);s.d(t,d);let c=["",{children:["docs",{children:["guides",{children:["nft-marketplace",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,8789)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/guides/nft-marketplace/page.tsx"]}]},{}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}],o=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/guides/nft-marketplace/page.tsx"],m="/docs/guides/nft-marketplace/page",x={require:s,loadChunk:()=>Promise.resolve()},h=new a.AppPageRouteModule({definition:{kind:n.x.APP_PAGE,page:"/docs/guides/nft-marketplace/page",pathname:"/docs/guides/nft-marketplace",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},82505:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,47726,23))},8789:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>r,metadata:()=>i});var a=s(81299),n=s(13492);let i={title:"NFT Marketplace Integration — XRNotify Docs",description:"End-to-end guide for tracking the full NFT lifecycle — mint, list, sale, and burn — in your XRPL marketplace using XRNotify webhooks."};function r(){return(0,a.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[a.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,a.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[a.jsx(n.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),a.jsx("span",{className:"text-zinc-600",children:"/"}),a.jsx(n.default,{href:"/docs#guides",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Guides"}),a.jsx("span",{className:"text-zinc-600",children:"/"}),a.jsx("span",{className:"text-zinc-300",children:"NFT Marketplace"})]}),a.jsx(n.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,a.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,a.jsxs)("div",{className:"mb-10",children:[a.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 mb-4",children:"Guides"}),a.jsx("h1",{className:"text-3xl font-bold text-white mb-3",children:"NFT Marketplace Integration"}),a.jsx("p",{className:"text-zinc-400 text-lg leading-relaxed",children:"Keep your marketplace listings automatically in sync with on-chain state by subscribing to NFT lifecycle events via XRNotify webhooks."})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"What you'll build"}),a.jsx("p",{className:"text-zinc-300 leading-relaxed mb-4",children:"By the end of this guide, your marketplace backend will automatically respond to every stage of an NFT's on-chain lifecycle:"}),(0,a.jsxs)("ul",{className:"space-y-2 text-zinc-300 text-sm",children:[(0,a.jsxs)("li",{className:"flex gap-2",children:[a.jsx("span",{className:"text-emerald-400 mt-0.5",children:"→"}),(0,a.jsxs)("span",{children:[a.jsx("strong",{className:"text-white",children:"Mint"})," — index new NFTs as soon as they appear on-chain"]})]}),(0,a.jsxs)("li",{className:"flex gap-2",children:[a.jsx("span",{className:"text-emerald-400 mt-0.5",children:"→"}),(0,a.jsxs)("span",{children:[a.jsx("strong",{className:"text-white",children:"Offer created"}),' — mark NFTs as "listed for sale" or record incoming bids']})]}),(0,a.jsxs)("li",{className:"flex gap-2",children:[a.jsx("span",{className:"text-emerald-400 mt-0.5",children:"→"}),(0,a.jsxs)("span",{children:[a.jsx("strong",{className:"text-white",children:"Offer accepted"})," — transfer ownership and record the sale"]})]}),(0,a.jsxs)("li",{className:"flex gap-2",children:[a.jsx("span",{className:"text-emerald-400 mt-0.5",children:"→"}),(0,a.jsxs)("span",{children:[a.jsx("strong",{className:"text-white",children:"Offer cancelled"})," — remove stale listings and bids"]})]}),(0,a.jsxs)("li",{className:"flex gap-2",children:[a.jsx("span",{className:"text-emerald-400 mt-0.5",children:"→"}),(0,a.jsxs)("span",{children:[a.jsx("strong",{className:"text-white",children:"Burn"})," — delist and archive burned tokens"]})]})]})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Subscribe to NFT events"}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["Create a single webhook that covers all NFT event types. Because this webhook has no ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"account_filters"}),", it will fire for any NFT activity on the network — suitable for a public marketplace. You can add filters later to narrow scope."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`curl -X POST https://api.xrnotify.io/v1/webhooks \\
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
  }'`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Central event dispatcher"}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["A single route handles all NFT events and dispatches to the appropriate handler via a ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"switch"})," on"," ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"event.event_type"}),"."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-6",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`app.post('/webhooks/nft', express.raw({ type: 'application/json' }), async (req, res) => {
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
});`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[(0,a.jsxs)("h2",{className:"text-xl font-semibold text-white mb-2",children:["Handling ",a.jsx("code",{className:"text-emerald-400",children:"nft.minted"})]}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["When an NFT is minted, add it to your index. The issuer is also the initial owner. Decode the ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"uri_decoded"})," field (already hex-decoded by XRNotify) to get the metadata URL."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`async function handleMinted(event) {
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
}`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[(0,a.jsxs)("h2",{className:"text-xl font-semibold text-white mb-2",children:["Handling ",a.jsx("code",{className:"text-emerald-400",children:"nft.offer_created"})]}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["The payload distinguishes between sell offers (listings) and buy offers (bids) via the ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"is_sell_offer"})," boolean."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`async function handleOfferCreated(event) {
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
}`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[(0,a.jsxs)("h2",{className:"text-xl font-semibold text-white mb-2",children:["Handling ",a.jsx("code",{className:"text-emerald-400",children:"nft.offer_accepted"})]}),a.jsx("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:"A sale is final. Transfer ownership in your database, clear the listing status, and record the sale for provenance."}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`async function handleOfferAccepted(event) {
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
}`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[(0,a.jsxs)("h2",{className:"text-xl font-semibold text-white mb-2",children:["Handling ",a.jsx("code",{className:"text-emerald-400",children:"nft.offer_cancelled"})]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`async function handleOfferCancelled(event) {
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
}`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[(0,a.jsxs)("h2",{className:"text-xl font-semibold text-white mb-2",children:["Handling ",a.jsx("code",{className:"text-emerald-400",children:"nft.burned"})]}),a.jsx("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:"A burned NFT is permanently destroyed. Remove it from active listings and archive any associated bids."}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`async function handleBurned(event) {
  const { nft_id } = event.payload;

  await db.nfts.update(nft_id, {
    status: 'burned',
    list_price: null,
    list_offer_id: null,
    burned_at: event.timestamp,
  });

  // Remove all bids — there is nothing left to bid on
  await db.bids.deleteWhere({ nft_id });
}`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Real-time UI updates"}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm leading-relaxed mb-4",children:["Once your webhook handler updates the database, you can push the change to any connected browser clients so listings update without a page refresh. After calling the relevant ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"db.*"})," method, emit an event on a shared in-process emitter (or a Redis pub/sub channel if you run multiple instances):"]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`// After updating the DB inside handleOfferAccepted:
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
});`})}),a.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300",children:"For multi-instance deployments, replace the in-process event emitter with a Redis pub/sub channel so all server instances broadcast the update to their connected SSE clients."})]}),(0,a.jsxs)("section",{children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Next steps"}),a.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:[{href:"/docs/reference/event-schema",label:"Event Schema",desc:"Full payload shapes for all 23 event types"},{href:"/docs/guides/handling-failures",label:"Handling Failures",desc:"Retry policy, idempotency, and the Replay API"},{href:"/docs/events",label:"Event Types",desc:"Full reference for every NFT event payload field"},{href:"/docs/verify-signatures",label:"Verifying Signatures",desc:"Secure your webhook endpoint"}].map(({href:e,label:t,desc:s})=>(0,a.jsxs)(n.default,{href:e,className:"block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors no-underline",children:[a.jsx("div",{className:"text-sm font-medium text-white mb-1",children:t}),a.jsx("div",{className:"text-xs text-zinc-500",children:s})]},e))})]})]})]})}},98176:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>n});var a=s(19820);let n=e=>[{type:"image/svg+xml",sizes:"any",url:(0,a.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>i}),s(81299);var a=s(19820);let n={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function i(e){let{__metadata_id__:t,...s}=e.params,i=(0,a.fillMetadataSegment)(".",s,"opengraph-image"),{generateImageMetadata:r}=n;function l(e,t){let s={alt:e.alt,type:e.contentType||"image/png",url:i+(t?"/"+t:"")+"?47293fb50e72780a"},{size:a}=e;return a&&(s.width=a.width,s.height=a.height),s}return r?(await r({params:s})).map((e,t)=>{let s=(e.id||t)+"";return l(e,s)}):[l(n,"")]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[5584,6876,9820,2676],()=>s(74161));module.exports=a})();