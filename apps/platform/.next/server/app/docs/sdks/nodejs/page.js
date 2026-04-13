(()=>{var e={};e.id=253,e.ids=[253],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},72367:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>o.a,__next_app__:()=>p,originalPathname:()=>m,pages:()=>c,routeModule:()=>x,tree:()=>l}),s(16867),s(30290),s(93056);var a=s(93443),n=s(98498),r=s(23516),o=s.n(r),i=s(68902),d={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>i[e]);s.d(t,d);let l=["",{children:["docs",{children:["sdks",{children:["nodejs",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,16867)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/nodejs/page.tsx"]}]},{}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}],c=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/nodejs/page.tsx"],m="/docs/sdks/nodejs/page",p={require:s,loadChunk:()=>Promise.resolve()},x=new a.AppPageRouteModule({definition:{kind:n.x.APP_PAGE,page:"/docs/sdks/nodejs/page",pathname:"/docs/sdks/nodejs",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},82505:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,47726,23))},16867:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>o,metadata:()=>r});var a=s(81299),n=s(13492);let r={title:"Node.js SDK - XRNotify Docs",description:"XRNotify Node.js SDK reference. Installation, webhook management, signature verification, and TypeScript types."};function o(){return(0,a.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[a.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,a.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[a.jsx(n.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),a.jsx("span",{className:"text-zinc-600",children:"/"}),a.jsx(n.default,{href:"/docs#sdks",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"SDKs"}),a.jsx("span",{className:"text-zinc-600",children:"/"}),a.jsx("span",{className:"text-zinc-300",children:"Node.js"})]}),a.jsx(n.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,a.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,a.jsxs)("div",{className:"mb-10",children:[a.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4",children:"SDKs & Libraries"}),a.jsx("h1",{className:"text-4xl font-bold text-white mb-4",children:"Node.js SDK"}),a.jsx("p",{className:"text-zinc-400 text-lg leading-relaxed",children:"The official XRNotify Node.js SDK provides a typed, promise-based interface for managing webhooks, querying deliveries, and verifying webhook signatures. Supports both CommonJS and ESM. Requires Node.js 18 or later."})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Installation"}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`npm install @xrnotify/sdk
# or
yarn add @xrnotify/sdk
# or
pnpm add @xrnotify/sdk`})})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Initialization"}),a.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"Create a client instance with your API key. Store the key in an environment variable — never hard-code it."}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import { XRNotify } from '@xrnotify/sdk';

const client = new XRNotify({
  apiKey: process.env.XRNOTIFY_API_KEY!,
  // Optional: use test environment for development
  // environment: 'test'
});`})}),a.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,a.jsxs)("p",{className:"text-emerald-300 text-sm",children:[a.jsx("span",{className:"font-semibold",children:"Test environment:"})," Set ",a.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"environment: 'test'"})," to use test API keys (",a.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"xrn_test_..."}),"). Test mode delivers synthetic events only — no real XRPL data is consumed."]})})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Creating a webhook"}),(0,a.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Register a new webhook endpoint. The response includes a ",a.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"secret"})," field that is only returned once — store it securely in your secrets manager."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`const webhook = await client.webhooks.create({
  url: 'https://yourapp.com/webhooks/xrpl',
  eventTypes: ['payment.xrp', 'nft.minted'],
  accountFilters: ['rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
  description: 'Payment processor'
});

console.log(webhook.id);      // wh_abc123
console.log(webhook.secret);  // Only available on creation — store immediately`})}),a.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3",children:(0,a.jsxs)("p",{className:"text-amber-300 text-sm",children:[a.jsx("span",{className:"font-semibold",children:"Important:"})," The ",a.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"secret"})," field is only present in the creation response. It cannot be retrieved again. If lost, delete and recreate the webhook."]})})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Listing webhooks"}),(0,a.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Retrieve a paginated list of webhooks in your account. Use ",a.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"hasMore"})," and the last item's ID to paginate through results."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`const { data, hasMore } = await client.webhooks.list({ limit: 10 });

for (const webhook of data) {
  console.log(webhook.id, webhook.url, webhook.isActive);
}

// Fetch the next page
if (hasMore) {
  const nextPage = await client.webhooks.list({
    limit: 10,
    startingAfter: data[data.length - 1].id
  });
}`})})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Updating a webhook"}),a.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"Update any field of an existing webhook. Only the fields you provide are changed — unspecified fields retain their current values."}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`// Pause a webhook
await client.webhooks.update('wh_abc123', {
  isActive: false
});

// Change subscribed events
await client.webhooks.update('wh_abc123', {
  eventTypes: ['payment.xrp', 'payment.issued', 'nft.*']
});

// Update both URL and filters
await client.webhooks.update('wh_abc123', {
  url: 'https://newapp.com/webhooks/xrpl',
  accountFilters: ['rN7n3473SaZBCG4dFL83w7PB2bBdDiAkzN']
});`})})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Listing deliveries"}),a.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"Query delivery history for a webhook, filtered by status and time range. Useful for debugging failed deliveries."}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`const { data } = await client.deliveries.list({
  webhookId: 'wh_abc123',
  status: 'failed',
  since: new Date('2024-01-01')
});

for (const delivery of data) {
  console.log(
    delivery.id,
    delivery.eventType,
    delivery.statusCode,
    delivery.lastError
  );
}`})})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Verifying signatures"}),(0,a.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Always verify the ",a.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"X-XRNotify-Signature"})," header before processing an incoming webhook. The SDK provides a ",a.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"verifySignature"})," helper that uses a constant-time comparison to prevent timing attacks."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import { verifySignature } from '@xrnotify/sdk';
import express from 'express';

const app = express();

// Use express.raw() — NOT express.json() — to get the raw body buffer
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const isValid = verifySignature({
    payload: req.body,
    signature: req.headers['x-xrnotify-signature'] as string,
    secret: process.env.WEBHOOK_SECRET!
  });

  if (!isValid) {
    return res.status(401).send('Unauthorized');
  }

  const event = JSON.parse(req.body);

  switch (event.event_type) {
    case 'payment.xrp':
      console.log('XRP payment:', event.payload.amount_xrp, 'XRP');
      break;
    case 'nft.minted':
      console.log('NFT minted:', event.payload.nft_id);
      break;
  }

  res.sendStatus(200);
});`})}),a.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3",children:(0,a.jsxs)("p",{className:"text-amber-300 text-sm",children:[a.jsx("span",{className:"font-semibold",children:"Raw body required:"})," Signature verification operates on the raw bytes of the request body. Parsing JSON before calling ",a.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"verifySignature"})," will corrupt the comparison and cause all signatures to fail."]})})]}),(0,a.jsxs)("section",{className:"mb-12",children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"TypeScript types"}),a.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"The SDK exports full TypeScript types for all events and payloads. Use these to write type-safe event handlers."}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:a.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import type {
  WebhookEvent,
  PaymentXrpPayload,
  PaymentIssuedPayload,
  NftMintedPayload,
  NftOfferAcceptedPayload,
  DexOfferFilledPayload,
  TrustlineCreatedPayload
} from '@xrnotify/sdk';

function handleEvent(event: WebhookEvent): void {
  if (event.event_type === 'payment.xrp') {
    const payload = event.payload as PaymentXrpPayload;
    console.log(\`\${payload.amount_xrp} XRP from \${payload.sender} to \${payload.receiver}\`);
  }

  if (event.event_type === 'nft.minted') {
    const payload = event.payload as NftMintedPayload;
    console.log('New NFT:', payload.nft_id, 'URI:', payload.uri_decoded);
  }
}`})})]}),(0,a.jsxs)("section",{children:[a.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Related"}),(0,a.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4",children:[(0,a.jsxs)(n.default,{href:"/docs/sdks/python",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[a.jsx("p",{className:"text-white font-medium mb-1",children:"Python SDK"}),a.jsx("p",{className:"text-zinc-500 text-sm",children:"pip install xrnotify"})]}),(0,a.jsxs)(n.default,{href:"/docs/sdks/go",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[a.jsx("p",{className:"text-white font-medium mb-1",children:"Go SDK"}),a.jsx("p",{className:"text-zinc-500 text-sm",children:"go get github.com/xrnotify/xrnotify-go"})]}),(0,a.jsxs)(n.default,{href:"/docs/sdks/signature-helpers",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[a.jsx("p",{className:"text-white font-medium mb-1",children:"Signature Helpers"}),a.jsx("p",{className:"text-zinc-500 text-sm",children:"Copy-paste verification for any language"})]})]})]})]})]})}},98176:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>n});var a=s(19820);let n=e=>[{type:"image/svg+xml",sizes:"any",url:(0,a.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>r}),s(81299);var a=s(19820);let n={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function r(e){let{__metadata_id__:t,...s}=e.params,r=(0,a.fillMetadataSegment)(".",s,"opengraph-image"),{generateImageMetadata:o}=n;function i(e,t){let s={alt:e.alt,type:e.contentType||"image/png",url:r+(t?"/"+t:"")+"?47293fb50e72780a"},{size:a}=e;return a&&(s.width=a.width,s.height=a.height),s}return o?(await o({params:s})).map((e,t)=>{let s=(e.id||t)+"";return i(e,s)}):[i(n,"")]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[5584,6876,9820,2676],()=>s(72367));module.exports=a})();