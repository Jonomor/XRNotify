(()=>{var e={};e.id=8881,e.ids=[8881],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},15162:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>i.a,__next_app__:()=>x,originalPathname:()=>m,pages:()=>c,routeModule:()=>p,tree:()=>l}),s(46745),s(30290),s(93056);var n=s(93443),a=s(98498),r=s(23516),i=s.n(r),o=s(68902),d={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>o[e]);s.d(t,d);let l=["",{children:["docs",{children:["sdks",{children:["python",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,46745)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/python/page.tsx"]}]},{}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}],c=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/python/page.tsx"],m="/docs/sdks/python/page",x={require:s,loadChunk:()=>Promise.resolve()},p=new n.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/docs/sdks/python/page",pathname:"/docs/sdks/python",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},82505:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,47726,23))},46745:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>i,metadata:()=>r});var n=s(81299),a=s(13492);let r={title:"Python SDK - XRNotify Docs",description:"XRNotify Python SDK reference. Installation, webhook management, signature verification, and Pydantic type models."};function i(){return(0,n.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[n.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,n.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,n.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[n.jsx(a.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),n.jsx("span",{className:"text-zinc-600",children:"/"}),n.jsx(a.default,{href:"/docs#sdks",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"SDKs"}),n.jsx("span",{className:"text-zinc-600",children:"/"}),n.jsx("span",{className:"text-zinc-300",children:"Python"})]}),n.jsx(a.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,n.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,n.jsxs)("div",{className:"mb-10",children:[n.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4",children:"SDKs & Libraries"}),n.jsx("h1",{className:"text-4xl font-bold text-white mb-4",children:"Python SDK"}),n.jsx("p",{className:"text-zinc-400 text-lg leading-relaxed",children:"The official XRNotify Python SDK provides a synchronous and async-compatible interface for managing webhooks, querying deliveries, and verifying signatures. Full Pydantic models are included for type-safe event handling."})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Installation"}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:"pip install xrnotify"})}),(0,n.jsxs)("div",{className:"grid grid-cols-3 gap-3",children:[(0,n.jsxs)("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center",children:[n.jsx("p",{className:"text-zinc-400 text-xs mb-1",children:"Python"}),n.jsx("p",{className:"text-white font-mono text-sm",children:"3.8+"})]}),(0,n.jsxs)("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center",children:[n.jsx("p",{className:"text-zinc-400 text-xs mb-1",children:"HTTP"}),n.jsx("p",{className:"text-white font-mono text-sm",children:"httpx"})]}),(0,n.jsxs)("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center",children:[n.jsx("p",{className:"text-zinc-400 text-xs mb-1",children:"Types"}),n.jsx("p",{className:"text-white font-mono text-sm",children:"pydantic"})]})]})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Initialization"}),n.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"Import and instantiate the client with your API key from an environment variable."}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import os
from xrnotify import XRNotify

client = XRNotify(api_key=os.environ["XRNOTIFY_API_KEY"])

# Optional: use the test environment
# client = XRNotify(
#     api_key=os.environ["XRNOTIFY_TEST_KEY"],
#     environment="test"
# )`})}),n.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,n.jsxs)("p",{className:"text-emerald-300 text-sm",children:[n.jsx("span",{className:"font-semibold",children:"Test environment:"})," Pass ",n.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:'environment="test"'})," to use test API keys. Synthetic events will be delivered without consuming real XRPL data."]})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Creating a webhook"}),(0,n.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Register a webhook endpoint. The ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"secret"})," attribute is only present on the creation response."]}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`webhook = client.webhooks.create(
    url="https://yourapp.com/webhooks/xrpl",
    event_types=["payment.xrp", "nft.minted"],
    account_filters=["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"],
    description="Payment processor"
)

print(webhook.id)      # wh_abc123
print(webhook.secret)  # Only available on creation — store immediately`})}),n.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3",children:(0,n.jsxs)("p",{className:"text-amber-300 text-sm",children:[n.jsx("span",{className:"font-semibold",children:"Important:"})," The ",n.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"secret"})," field is returned once at creation. It cannot be retrieved again. Store it in your secrets manager immediately."]})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Listing and updating webhooks"}),n.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"List all webhooks in your account and update existing ones. Only the keyword arguments you pass are changed."}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`# List webhooks
result = client.webhooks.list(limit=10)
for wh in result.data:
    print(wh.id, wh.url, wh.is_active)

# Paginate
if result.has_more:
    next_page = client.webhooks.list(
        limit=10,
        starting_after=result.data[-1].id
    )

# Pause a webhook
client.webhooks.update("wh_abc123", is_active=False)

# Update subscribed event types
client.webhooks.update("wh_abc123", event_types=["payment.*", "nft.*"])

# Delete a webhook
client.webhooks.delete("wh_abc123")`})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Listing deliveries"}),(0,n.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Query delivery history filtered by webhook, status, and time range. Pass a timezone-aware ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"datetime"})," for the ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"since"})," parameter."]}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`from datetime import datetime, timezone

result = client.deliveries.list(
    webhook_id="wh_abc123",
    status="failed",
    since=datetime(2024, 1, 1, tzinfo=timezone.utc)
)

for delivery in result.data:
    print(
        delivery.id,
        delivery.event_type,
        delivery.status_code,
        delivery.last_error
    )`})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Verifying signatures"}),(0,n.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Use ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"verify_signature"})," from the SDK to validate incoming webhook requests. The function uses ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"hmac.compare_digest"})," internally for constant-time comparison."]}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import os
from flask import Flask, request
from xrnotify import verify_signature

app = Flask(__name__)

@app.route("/webhooks/xrpl", methods=["POST"])
def handle_webhook():
    # Verify before parsing — use request.data (raw bytes)
    if not verify_signature(
        payload=request.data,
        signature=request.headers.get("X-XRNotify-Signature", ""),
        secret=os.environ["WEBHOOK_SECRET"]
    ):
        return "Unauthorized", 401

    event = request.get_json(force=True)
    handle_event(event)
    return "OK", 200


def handle_event(event: dict) -> None:
    event_type = event.get("event_type")
    if event_type == "payment.xrp":
        payload = event["payload"]
        print(f"XRP payment: {payload['amount_xrp']} XRP")
    elif event_type == "nft.minted":
        payload = event["payload"]
        print(f"NFT minted: {payload['nft_id']}")`})}),n.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3",children:(0,n.jsxs)("p",{className:"text-amber-300 text-sm",children:[n.jsx("span",{className:"font-semibold",children:"Raw body required:"})," Pass ",n.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"request.data"})," (bytes), not ",n.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"request.get_json()"}),". The signature is computed over the raw bytes before any JSON parsing."]})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Pydantic models"}),n.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"The SDK ships Pydantic v2 models for every event type. Use them for validation, serialization, and IDE autocompletion."}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`from xrnotify.models import (
    WebhookEvent,
    PaymentXrpPayload,
    PaymentIssuedPayload,
    NftMintedPayload,
    DexOfferFilledPayload,
)


def handle_event(data: dict) -> None:
    event = WebhookEvent(**data)

    if event.event_type == "payment.xrp":
        payload = PaymentXrpPayload(**event.payload)
        print(f"Received {payload.amount_xrp} XRP")
        print(f"From: {payload.sender} → {payload.receiver}")

    elif event.event_type == "nft.minted":
        payload = NftMintedPayload(**event.payload)
        print(f"NFT {payload.nft_id} minted by {payload.issuer}")
        if payload.uri_decoded:
            print(f"Metadata: {payload.uri_decoded}")`})})]}),(0,n.jsxs)("section",{children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Related"}),(0,n.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4",children:[(0,n.jsxs)(a.default,{href:"/docs/sdks/nodejs",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[n.jsx("p",{className:"text-white font-medium mb-1",children:"Node.js SDK"}),n.jsx("p",{className:"text-zinc-500 text-sm",children:"npm install @xrnotify/sdk"})]}),(0,n.jsxs)(a.default,{href:"/docs/sdks/go",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[n.jsx("p",{className:"text-white font-medium mb-1",children:"Go SDK"}),n.jsx("p",{className:"text-zinc-500 text-sm",children:"go get github.com/xrnotify/xrnotify-go"})]}),(0,n.jsxs)(a.default,{href:"/docs/sdks/signature-helpers",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[n.jsx("p",{className:"text-white font-medium mb-1",children:"Signature Helpers"}),n.jsx("p",{className:"text-zinc-500 text-sm",children:"Copy-paste verification for any language"})]})]})]})]})]})}},98176:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>a});var n=s(19820);let a=e=>[{type:"image/svg+xml",sizes:"any",url:(0,n.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>r}),s(81299);var n=s(19820);let a={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function r(e){let{__metadata_id__:t,...s}=e.params,r=(0,n.fillMetadataSegment)(".",s,"opengraph-image"),{generateImageMetadata:i}=a;function o(e,t){let s={alt:e.alt,type:e.contentType||"image/png",url:r+(t?"/"+t:"")+"?47293fb50e72780a"},{size:n}=e;return n&&(s.width=n.width,s.height=n.height),s}return i?(await i({params:s})).map((e,t)=>{let s=(e.id||t)+"";return o(e,s)}):[o(a,"")]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),n=t.X(0,[5584,6876,9820,2676],()=>s(15162));module.exports=n})();