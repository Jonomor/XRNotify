(()=>{var e={};e.id=9090,e.ids=[9090],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},65690:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>i.a,__next_app__:()=>u,originalPathname:()=>m,pages:()=>d,routeModule:()=>p,tree:()=>o}),a(60065),a(30290),a(93056);var s=a(93443),n=a(98498),r=a(23516),i=a.n(r),c=a(68902),l={};for(let e in c)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>c[e]);a.d(t,l);let o=["",{children:["docs",{children:["guides",{children:["realtime-balance",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,60065)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/guides/realtime-balance/page.tsx"]}]},{}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(a.bind(a,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(a.bind(a,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(a.bind(a,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(a.bind(a,60530))).default(e)],twitter:[],manifest:void 0}}],d=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/guides/realtime-balance/page.tsx"],m="/docs/guides/realtime-balance/page",u={require:a,loadChunk:()=>Promise.resolve()},p=new s.AppPageRouteModule({definition:{kind:n.x.APP_PAGE,page:"/docs/guides/realtime-balance/page",pathname:"/docs/guides/realtime-balance",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:o}})},82505:(e,t,a)=>{Promise.resolve().then(a.t.bind(a,47726,23))},60065:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>i,metadata:()=>r});var s=a(81299),n=a(13492);let r={title:"Real-time Balance Updates — XRNotify Docs",description:"Stream live XRP and token balance changes to your frontend using XRNotify webhooks and Server-Sent Events."};function i(){return(0,s.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[s.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,s.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,s.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[s.jsx(n.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),s.jsx("span",{className:"text-zinc-600",children:"/"}),s.jsx(n.default,{href:"/docs#guides",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Guides"}),s.jsx("span",{className:"text-zinc-600",children:"/"}),s.jsx("span",{className:"text-zinc-300",children:"Real-time Balance Updates"})]}),s.jsx(n.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,s.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,s.jsxs)("div",{className:"mb-10",children:[s.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 mb-4",children:"Guides"}),s.jsx("h1",{className:"text-3xl font-bold text-white mb-3",children:"Real-time Balance Updates"}),s.jsx("p",{className:"text-zinc-400 text-lg leading-relaxed",children:"Push live XRP and token balance changes directly to browser clients the instant a payment lands on-chain — no polling required."})]}),(0,s.jsxs)("section",{className:"mb-10",children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Overview"}),s.jsx("p",{className:"text-zinc-300 text-sm leading-relaxed mb-4",children:"There are two common approaches for delivering real-time balance data to your frontend:"}),(0,s.jsxs)("div",{className:"space-y-3 mb-4",children:[(0,s.jsxs)("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4",children:[s.jsx("div",{className:"text-sm font-medium text-white mb-1",children:"Approach 1 — Webhook-driven (this guide)"}),s.jsx("p",{className:"text-zinc-400 text-xs leading-relaxed",children:"XRNotify pushes a payment event to your server. Your server updates the database and emits a Server-Sent Event (SSE) to connected browser clients. Near-instant latency, no wasted requests."})]}),(0,s.jsxs)("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4",children:[s.jsx("div",{className:"text-sm font-medium text-white mb-1",children:"Approach 2 — Client polling"}),s.jsx("p",{className:"text-zinc-400 text-xs leading-relaxed",children:"The frontend polls your balance API on a fixed interval. Simpler to implement but introduces latency equal to the poll interval and generates unnecessary requests."})]})]}),s.jsx("p",{className:"text-zinc-300 text-sm leading-relaxed",children:"This guide covers Approach 1: XRNotify webhook → server handler → SSE stream → React hook. The end result is a balance that updates on-screen within a few seconds of a payment confirming on-chain."})]}),(0,s.jsxs)("section",{className:"mb-10",children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Setting up the webhook"}),(0,s.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["Subscribe to payment events and trustline creation for each wallet address you want to monitor. You can add multiple addresses to"," ",s.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"account_filters"}),", or omit it entirely to monitor all activity."]}),s.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:s.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://api.yourapp.com/webhooks/balance",
    "event_types": ["payment.xrp", "payment.issued", "trustline.created"],
    "account_filters": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"]
  }'`})})]}),(0,s.jsxs)("section",{className:"mb-10",children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Server-side handler (Node.js)"}),s.jsx("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:"The webhook handler verifies the signature, updates the balance in the database, then broadcasts the delta to any SSE clients listening on that address."}),s.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:s.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`app.post('/webhooks/balance', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verifySignature(req.body, req.headers['x-xrnotify-signature'], process.env.WEBHOOK_SECRET)) {
    return res.status(401).end();
  }

  // Idempotency: skip if already processed
  const deliveryId = req.headers['x-xrnotify-delivery-id'];
  if (await cache.get(\`delivery:\${deliveryId}\`)) return res.sendStatus(200);

  const event = JSON.parse(req.body);
  const { receiver, amount, currency, issuer } = event.payload;

  switch (event.event_type) {
    case 'payment.xrp': {
      const xrp = (parseInt(amount) / 1_000_000).toFixed(6);
      await updateXrpBalance(receiver, xrp);
      await broadcastBalanceUpdate(receiver, 'XRP', null, xrp);
      break;
    }
    case 'payment.issued': {
      const { value } = event.payload;
      await updateTokenBalance(receiver, currency, issuer, value);
      await broadcastBalanceUpdate(receiver, currency, issuer, value);
      break;
    }
    case 'trustline.created': {
      // A new trustline was established — client may want to show zero balance
      await broadcastTrustlineCreated(receiver, currency, issuer);
      break;
    }
  }

  await cache.set(\`delivery:\${deliveryId}\`, 'done', 86400);
  res.sendStatus(200);
});`})})]}),(0,s.jsxs)("section",{className:"mb-10",children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Broadcasting to connected clients (SSE)"}),s.jsx("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:"Server-Sent Events are a lightweight, browser-native alternative to WebSockets for one-way server-to-client streaming. They reconnect automatically on disconnect and work through HTTP/2."}),s.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:s.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`import { EventEmitter } from 'events';
export const balanceEmitter = new EventEmitter();
balanceEmitter.setMaxListeners(0); // Unlimited concurrent SSE clients

export async function broadcastBalanceUpdate(address, currency, issuer, delta) {
  balanceEmitter.emit('update', { address, currency, issuer, delta });
}

// SSE endpoint — authenticate before registering the listener
app.get('/api/balance-stream', requireAuth, (req, res) => {
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send a heartbeat comment every 15s to keep the connection alive
  const heartbeat = setInterval(() => res.write(': heartbeat\\n\\n'), 15_000);

  const listener = (update) => {
    // Only send updates belonging to this authenticated user's addresses
    if (isAddressOwnedByUser(update.address, userId)) {
      res.write(\`data: \${JSON.stringify(update)}\\n\\n\`);
    }
  };

  balanceEmitter.on('update', listener);

  req.on('close', () => {
    clearInterval(heartbeat);
    balanceEmitter.off('update', listener);
  });
});`})})]}),(0,s.jsxs)("section",{className:"mb-10",children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Frontend React hook"}),s.jsx("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:"This hook opens a single SSE connection for the authenticated user and applies incoming balance deltas to local state, giving a live-updating balance without any polling."}),s.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:s.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`import { useState, useEffect } from 'react';

interface BalanceUpdate {
  address: string;
  currency: string;
  issuer: string | null;
  delta: string;
}

function useRealtimeBalance(address: string, initialBalance: number = 0) {
  const [balance, setBalance] = useState<number>(initialBalance);

  useEffect(() => {
    if (!address) return;

    const es = new EventSource('/api/balance-stream');

    es.onmessage = (e) => {
      const update: BalanceUpdate = JSON.parse(e.data);
      if (update.address === address && update.currency === 'XRP') {
        setBalance(prev => Math.max(0, prev + parseFloat(update.delta)));
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects — no manual retry needed
      console.warn('SSE connection lost, reconnecting...');
    };

    return () => es.close();
  }, [address]);

  return balance;
}

// Usage in a component:
function WalletBalance({ address }: { address: string }) {
  const balance = useRealtimeBalance(address, 0);
  return <span>{balance.toFixed(6)} XRP</span>;
}`})})]}),(0,s.jsxs)("section",{className:"mb-10",children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Extending to token balances"}),(0,s.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["For issued currency tokens, key the balance by the"," ",s.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"(currency, issuer)"})," pair:"]}),s.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:s.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`function useRealtimeTokenBalance(address: string, currency: string, issuer: string) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const es = new EventSource('/api/balance-stream');

    es.onmessage = (e) => {
      const update: BalanceUpdate = JSON.parse(e.data);
      if (
        update.address === address &&
        update.currency === currency &&
        update.issuer === issuer
      ) {
        setBalance(prev => prev + parseFloat(update.delta));
      }
    };

    return () => es.close();
  }, [address, currency, issuer]);

  return balance;
}`})})]}),(0,s.jsxs)("section",{className:"mb-10",children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Reconnection and idempotency"}),(0,s.jsxs)("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300 mb-4",children:[s.jsx("strong",{className:"text-white",children:"EventSource reconnects automatically."})," The browser will re-establish the SSE connection with exponential backoff if it drops. You do not need to implement reconnection logic manually."]}),(0,s.jsxs)("p",{className:"text-zinc-300 text-sm leading-relaxed mb-4",children:["During an SSE reconnect, the browser sends the last seen"," ",s.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"Last-Event-ID"})," header if you set event IDs server-side. However, a simpler strategy is to initialize the balance from your REST API on mount, then apply SSE deltas on top — this way a reconnect just means a brief gap with no missed net balance change:"]}),s.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:s.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`function useRealtimeBalance(address: string) {
  const [balance, setBalance] = useState<number | null>(null);

  // 1. Fetch current balance on mount
  useEffect(() => {
    fetch(\`/api/balances/\${address}\`)
      .then(r => r.json())
      .then(data => setBalance(data.xrp_balance));
  }, [address]);

  // 2. Apply live deltas on top
  useEffect(() => {
    const es = new EventSource('/api/balance-stream');
    es.onmessage = (e) => {
      const update = JSON.parse(e.data);
      if (update.address === address && update.currency === 'XRP') {
        setBalance(prev => prev !== null ? prev + parseFloat(update.delta) : null);
      }
    };
    return () => es.close();
  }, [address]);

  return balance;
}`})}),(0,s.jsxs)("p",{className:"text-zinc-400 text-sm leading-relaxed",children:["Because XRNotify uses the"," ",s.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"X-XRNotify-Delivery-Id"})," header for every delivery (including retries), your webhook handler's idempotency cache prevents the same delta from being applied twice to the database — ensuring the REST API always returns an accurate balance even during retry storms."]})]}),(0,s.jsxs)("section",{children:[s.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Next steps"}),s.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:[{href:"/docs/guides/payment-notifications",label:"Payment Notifications",desc:"Send push notifications when XRP arrives"},{href:"/docs/guides/handling-failures",label:"Handling Failures",desc:"Ensure no payment event is ever missed"},{href:"/docs/reference/event-schema",label:"Event Schema",desc:"Full payload interface for payment events"},{href:"/docs/verify-signatures",label:"Verifying Signatures",desc:"HMAC-SHA256 signature verification guide"}].map(({href:e,label:t,desc:a})=>(0,s.jsxs)(n.default,{href:e,className:"block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors no-underline",children:[s.jsx("div",{className:"text-sm font-medium text-white mb-1",children:t}),s.jsx("div",{className:"text-xs text-zinc-500",children:a})]},e))})]})]})]})}},98176:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>n});var s=a(19820);let n=e=>[{type:"image/svg+xml",sizes:"any",url:(0,s.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>r}),a(81299);var s=a(19820);let n={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function r(e){let{__metadata_id__:t,...a}=e.params,r=(0,s.fillMetadataSegment)(".",a,"opengraph-image"),{generateImageMetadata:i}=n;function c(e,t){let a={alt:e.alt,type:e.contentType||"image/png",url:r+(t?"/"+t:"")+"?47293fb50e72780a"},{size:s}=e;return s&&(a.width=s.width,a.height=s.height),a}return i?(await i({params:a})).map((e,t)=>{let a=(e.id||t)+"";return c(e,a)}):[c(n,"")]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[5584,6876,9820,2676],()=>a(65690));module.exports=s})();