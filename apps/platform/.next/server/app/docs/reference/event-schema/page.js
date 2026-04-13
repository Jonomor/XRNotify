(()=>{var e={};e.id=3233,e.ids=[3233],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},30687:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>i.a,__next_app__:()=>x,originalPathname:()=>m,pages:()=>o,routeModule:()=>h,tree:()=>c}),s(51271),s(30290),s(93056);var a=s(93443),n=s(98498),r=s(23516),i=s.n(r),d=s(68902),l={};for(let e in d)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>d[e]);s.d(t,l);let c=["",{children:["docs",{children:["reference",{children:["event-schema",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,51271)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/reference/event-schema/page.tsx"]}]},{}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}],o=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/reference/event-schema/page.tsx"],m="/docs/reference/event-schema/page",x={require:s,loadChunk:()=>Promise.resolve()},h=new a.AppPageRouteModule({definition:{kind:n.x.APP_PAGE,page:"/docs/reference/event-schema/page",pathname:"/docs/reference/event-schema",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},82505:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,47726,23))},51271:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>i,metadata:()=>r});var a=s(81299),n=s(13492);let r={title:"Event Schema — XRNotify Docs",description:"Canonical structure, TypeScript interface, and JSON Schema for every event delivered by XRNotify."};function i(){return(0,a.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[a.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,a.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[a.jsx(n.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),a.jsx("span",{className:"text-zinc-600",children:"/"}),a.jsx(n.default,{href:"/docs#reference",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Reference"}),a.jsx("span",{className:"text-zinc-600",children:"/"}),a.jsx("span",{className:"text-zinc-300",children:"Event Schema"})]}),a.jsx(n.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,a.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,a.jsxs)("div",{className:"mb-10",children:[a.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 mb-4",children:"Reference"}),a.jsx("h1",{className:"text-3xl font-bold text-white mb-3",children:"Event Schema"}),(0,a.jsxs)("p",{className:"text-zinc-400 text-lg leading-relaxed",children:["Every event delivered by XRNotify follows a canonical top-level structure. The event-type-specific data lives inside the ",a.jsx("code",{className:"text-emerald-400",children:"payload"})," field."]})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Overview"}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm leading-relaxed mb-4",children:["Regardless of whether the event is a payment, NFT mint, DEX trade, or any other activity, the outer envelope is identical. This makes it straightforward to write a single parsing layer and then branch on"," ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"event_type"})," to reach type-specific payload handling."]}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm leading-relaxed",children:["Events are delivered as HTTP POST requests with a"," ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"Content-Type: application/json"})," header and a signed body. Always verify the ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"X-XRNotify-Signature"})," header before trusting the payload."]})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"TypeScript interface"}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`interface XRNotifyEvent<T = Record<string, unknown>> {
  /** Unique event identifier in format xrpl:<ledger>:<txhash>:<type>[:<idx>] */
  event_id: string;

  /** Event type string (e.g. "payment.xrp", "nft.minted") */
  event_type: EventType;

  /** XRPL ledger index this event occurred in */
  ledger_index: number;

  /** ISO 8601 timestamp of ledger close */
  timestamp: string;

  /** Network: "mainnet" | "testnet" | "devnet" */
  network: string;

  /** The webhook that triggered this delivery */
  webhook_id: string;

  /** Event-type-specific payload */
  payload: T;
}`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Field descriptions"}),a.jsx("div",{className:"overflow-x-auto",children:(0,a.jsxs)("table",{className:"w-full text-sm border-collapse",children:[a.jsx("thead",{children:(0,a.jsxs)("tr",{className:"border-b border-zinc-800",children:[a.jsx("th",{className:"text-left py-2 pr-6 text-zinc-400 font-medium",children:"Field"}),a.jsx("th",{className:"text-left py-2 pr-6 text-zinc-400 font-medium",children:"Type"}),a.jsx("th",{className:"text-left py-2 text-zinc-400 font-medium",children:"Description"})]})}),a.jsx("tbody",{className:"divide-y divide-zinc-800/50",children:[["event_id","string","Globally unique, deterministic ID. Format: xrpl:<ledger>:<txhash>:<type>[:<idx>]"],["event_type","string","One of the 23 supported event types (see EventType union below)"],["ledger_index","number","XRPL ledger sequence number in which the transaction was validated"],["timestamp","string","ISO 8601 datetime, always UTC, matching the ledger close time"],["network","string",'Always "mainnet" for production. "testnet" or "devnet" for test webhooks'],["webhook_id","string","wh_ prefixed ID of the webhook that triggered this delivery"],["payload","object","Event-type-specific fields. Schema varies by event_type"]].map(([e,t,s])=>(0,a.jsxs)("tr",{children:[a.jsx("td",{className:"py-2.5 pr-6",children:a.jsx("code",{className:"text-emerald-400 text-xs",children:e})}),a.jsx("td",{className:"py-2.5 pr-6",children:a.jsx("code",{className:"text-zinc-400 text-xs",children:t})}),a.jsx("td",{className:"py-2.5 text-zinc-300 text-xs leading-relaxed",children:s})]},e))})]})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[(0,a.jsxs)("h2",{className:"text-xl font-semibold text-white mb-4",children:["The ",a.jsx("code",{className:"text-emerald-400",children:"event_id"})," format"]}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["Event IDs are deterministically generated from on-chain data, so the same ledger event always produces the same ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"event_id"}),". This makes them safe to use as idempotency keys in your processing layer."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`# Pattern:
xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]

# Examples:
xrpl:84512701:A1B2C3D4E5F6...1234:payment.xrp
xrpl:84512705:F6E5D4C3B2A1...5678:nft.offer_accepted
xrpl:84512710:123456789ABC...ABCD:dex.offer_partial:0
xrpl:84512710:123456789ABC...ABCD:dex.offer_partial:1`})}),(0,a.jsxs)("p",{className:"text-zinc-400 text-sm leading-relaxed",children:["The optional ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:":sub_index"})," suffix appears when a single transaction generates multiple events of the same type (e.g., a single DEX trade filling multiple offers). Each resulting event gets a unique numeric index."]})]}),(0,a.jsxs)("section",{className:"mb-10",children:[(0,a.jsxs)("h2",{className:"text-xl font-semibold text-white mb-4",children:[a.jsx("code",{className:"text-emerald-400",children:"EventType"})," union (all 23 values)"]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`type EventType =
  // Payments
  | 'payment.xrp'
  | 'payment.issued'

  // NFTs
  | 'nft.minted'
  | 'nft.burned'
  | 'nft.offer_created'
  | 'nft.offer_accepted'
  | 'nft.offer_cancelled'

  // DEX
  | 'dex.offer_created'
  | 'dex.offer_cancelled'
  | 'dex.offer_filled'
  | 'dex.offer_partial'

  // Trustlines
  | 'trustline.created'
  | 'trustline.modified'
  | 'trustline.deleted'

  // Accounts
  | 'account.created'
  | 'account.deleted'
  | 'account.settings_changed'

  // Escrows
  | 'escrow.created'
  | 'escrow.finished'
  | 'escrow.cancelled'

  // Checks
  | 'check.created'
  | 'check.cashed'
  | 'check.cancelled';`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Sample event (payment.xrp)"}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`{
  "event_id": "xrpl:84512701:A1B2C3D4E5F67890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678:payment.xrp",
  "event_type": "payment.xrp",
  "ledger_index": 84512701,
  "timestamp": "2024-01-15T14:23:07Z",
  "network": "mainnet",
  "webhook_id": "wh_abc123def456",
  "payload": {
    "sender": "rN7n3473SaZBCG4dFL75SqSGPpvNRRBXtK",
    "receiver": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "amount": "25000000",
    "destination_tag": 1042,
    "tx_hash": "A1B2C3D4E5F67890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678"
  }
}`})})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"JSON Schema (top-level envelope)"}),(0,a.jsxs)("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:["Use this schema to validate inbound webhook bodies with any JSON Schema v2020-12 compatible validator (e.g., ",a.jsx("code",{className:"text-emerald-400 bg-zinc-800 px-1 rounded",children:"ajv"})," in Node.js)."]}),a.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:a.jsx("pre",{className:"text-zinc-300 text-sm font-mono whitespace-pre",children:`{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://www.xrnotify.io/schemas/event.json",
  "type": "object",
  "required": [
    "event_id",
    "event_type",
    "ledger_index",
    "timestamp",
    "network",
    "webhook_id",
    "payload"
  ],
  "properties": {
    "event_id": {
      "type": "string",
      "pattern": "^xrpl:\\\\d+:[A-F0-9]+:[a-z.]+(?::\\\\d+)?$"
    },
    "event_type": {
      "type": "string"
    },
    "ledger_index": {
      "type": "integer",
      "minimum": 1
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "network": {
      "type": "string",
      "enum": ["mainnet", "testnet", "devnet"]
    },
    "webhook_id": {
      "type": "string",
      "pattern": "^wh_"
    },
    "payload": {
      "type": "object"
    }
  },
  "additionalProperties": false
}`})}),(0,a.jsxs)("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-zinc-300",children:["Payload schemas for each event type — including all field names, types, and optional fields — are documented in the"," ",a.jsx(n.default,{href:"/docs/events",className:"text-emerald-400 hover:text-emerald-300",children:"Event Types"})," ","section."]})]}),(0,a.jsxs)("section",{className:"mb-10",children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Delivery HTTP headers"}),a.jsx("p",{className:"text-zinc-300 text-sm mb-4 leading-relaxed",children:"Every webhook POST includes the following headers alongside the event body:"}),a.jsx("div",{className:"overflow-x-auto",children:(0,a.jsxs)("table",{className:"w-full text-sm border-collapse",children:[a.jsx("thead",{children:(0,a.jsxs)("tr",{className:"border-b border-zinc-800",children:[a.jsx("th",{className:"text-left py-2 pr-6 text-zinc-400 font-medium",children:"Header"}),a.jsx("th",{className:"text-left py-2 text-zinc-400 font-medium",children:"Description"})]})}),a.jsx("tbody",{className:"divide-y divide-zinc-800/50",children:[["X-XRNotify-Signature","HMAC-SHA256 signature of the raw request body. Format: sha256=<hex>"],["X-XRNotify-Delivery-Id","Unique delivery attempt ID (dlv_ prefixed). Use for idempotency."],["X-XRNotify-Event-Id","The event_id from the body, repeated as a header for quick access"],["X-XRNotify-Event-Type","The event_type from the body, repeated as a header"],["X-XRNotify-Timestamp","Unix timestamp of when this delivery was dispatched"],["Content-Type","Always application/json"]].map(([e,t])=>(0,a.jsxs)("tr",{children:[a.jsx("td",{className:"py-2.5 pr-6",children:a.jsx("code",{className:"text-emerald-400 text-xs whitespace-nowrap",children:e})}),a.jsx("td",{className:"py-2.5 text-zinc-300 text-xs leading-relaxed",children:t})]},e))})]})})]}),(0,a.jsxs)("section",{children:[a.jsx("h2",{className:"text-xl font-semibold text-white mb-4",children:"Next steps"}),a.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:[{href:"/docs/events",label:"Event Types",desc:"Per-type payload schemas for all 23 event types"},{href:"/docs/verify-signatures",label:"Verifying Signatures",desc:"How to validate X-XRNotify-Signature"},{href:"/docs/reference/error-codes",label:"Error Codes",desc:"API error format and code reference"},{href:"/docs/guides/payment-notifications",label:"Payment Notifications Guide",desc:"End-to-end payment webhook tutorial"}].map(({href:e,label:t,desc:s})=>(0,a.jsxs)(n.default,{href:e,className:"block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors no-underline",children:[a.jsx("div",{className:"text-sm font-medium text-white mb-1",children:t}),a.jsx("div",{className:"text-xs text-zinc-500",children:s})]},e))})]})]})]})}},98176:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>n});var a=s(19820);let n=e=>[{type:"image/svg+xml",sizes:"any",url:(0,a.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>r}),s(81299);var a=s(19820);let n={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function r(e){let{__metadata_id__:t,...s}=e.params,r=(0,a.fillMetadataSegment)(".",s,"opengraph-image"),{generateImageMetadata:i}=n;function d(e,t){let s={alt:e.alt,type:e.contentType||"image/png",url:r+(t?"/"+t:"")+"?47293fb50e72780a"},{size:a}=e;return a&&(s.width=a.width,s.height=a.height),s}return i?(await i({params:s})).map((e,t)=>{let s=(e.id||t)+"";return d(e,s)}):[d(n,"")]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[5584,6876,9820,2676],()=>s(30687));module.exports=a})();