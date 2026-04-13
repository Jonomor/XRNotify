(()=>{var e={};e.id=3226,e.ids=[3226],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},14265:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>a.a,__next_app__:()=>x,originalPathname:()=>m,pages:()=>c,routeModule:()=>h,tree:()=>d}),s(60596),s(30290),s(93056);var n=s(93443),r=s(98498),o=s(23516),a=s.n(o),i=s(68902),l={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>i[e]);s.d(t,l);let d=["",{children:["docs",{children:["sdks",{children:["go",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,60596)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/go/page.tsx"]}]},{}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}],c=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/go/page.tsx"],m="/docs/sdks/go/page",x={require:s,loadChunk:()=>Promise.resolve()},h=new n.AppPageRouteModule({definition:{kind:r.x.APP_PAGE,page:"/docs/sdks/go/page",pathname:"/docs/sdks/go",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},82505:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,47726,23))},60596:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>a,metadata:()=>o});var n=s(81299),r=s(13492);let o={title:"Go SDK - XRNotify Docs",description:"XRNotify Go SDK reference. Installation, webhook management, signature verification, and struct types."};function a(){return(0,n.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[n.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,n.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,n.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[n.jsx(r.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),n.jsx("span",{className:"text-zinc-600",children:"/"}),n.jsx(r.default,{href:"/docs#sdks",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"SDKs"}),n.jsx("span",{className:"text-zinc-600",children:"/"}),n.jsx("span",{className:"text-zinc-300",children:"Go"})]}),n.jsx(r.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,n.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,n.jsxs)("div",{className:"mb-10",children:[n.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4",children:"SDKs & Libraries"}),n.jsx("h1",{className:"text-4xl font-bold text-white mb-4",children:"Go SDK"}),(0,n.jsxs)("p",{className:"text-zinc-400 text-lg leading-relaxed",children:["The official XRNotify Go SDK provides an idiomatic, context-aware client for managing webhooks, querying deliveries, and verifying signatures. Requires Go 1.21 or later. All methods accept a ",n.jsx("code",{className:"font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-base",children:"context.Context"})," for cancellation and deadline propagation."]})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Installation"}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:"go get github.com/xrnotify/xrnotify-go"})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Client setup"}),n.jsx("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:"Create a client with your API key. The client is safe for concurrent use across goroutines."}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/xrnotify/xrnotify-go"
)

func main() {
    client := xrnotify.NewClient(os.Getenv("XRNOTIFY_API_KEY"))

    // Optional: use test environment
    // client := xrnotify.NewClient(
    //     os.Getenv("XRNOTIFY_TEST_KEY"),
    //     xrnotify.WithEnvironment(xrnotify.EnvironmentTest),
    // )

    ctx := context.Background()
    _ = client
    _ = ctx
}`})}),n.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,n.jsxs)("p",{className:"text-emerald-300 text-sm",children:[n.jsx("span",{className:"font-semibold",children:"Thread safety:"})," A single ",n.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"*xrnotify.Client"})," can be shared across goroutines. Create one at startup and reuse it throughout the lifetime of your application."]})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Creating a webhook"}),(0,n.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Register a webhook endpoint. The returned struct includes ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"Secret"})," — this field is only populated on the creation response."]}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`webhook, err := client.Webhooks.Create(ctx, &xrnotify.CreateWebhookParams{
    URL:            "https://yourapp.com/webhooks/xrpl",
    EventTypes:     []string{"payment.xrp", "nft.minted"},
    AccountFilters: []string{"rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"},
    Description:    "Payment processor",
})
if err != nil {
    log.Fatalf("create webhook: %v", err)
}

fmt.Println("ID:", webhook.ID)
fmt.Println("Secret:", webhook.Secret) // Store immediately — only available once`})}),n.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3",children:(0,n.jsxs)("p",{className:"text-amber-300 text-sm",children:[n.jsx("span",{className:"font-semibold",children:"Important:"})," ",n.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"webhook.Secret"})," is only set in the creation response. Subsequent fetches of the same webhook will return an empty string for this field."]})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Listing and managing webhooks"}),(0,n.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["List, update, and delete webhooks. The list method returns a paginated result; use ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"result.HasMore"})," and ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"StartingAfter"})," to page through results."]}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`// List webhooks
result, err := client.Webhooks.List(ctx, &xrnotify.ListWebhooksParams{
    Limit: 10,
})
if err != nil {
    log.Fatal(err)
}
for _, wh := range result.Data {
    fmt.Println(wh.ID, wh.URL, wh.IsActive)
}

// Paginate
if result.HasMore {
    lastID := result.Data[len(result.Data)-1].ID
    nextPage, _ := client.Webhooks.List(ctx, &xrnotify.ListWebhooksParams{
        Limit:         10,
        StartingAfter: lastID,
    })
    _ = nextPage
}

// Update a webhook
active := false
_, err = client.Webhooks.Update(ctx, "wh_abc123", &xrnotify.UpdateWebhookParams{
    IsActive: &active,
})

// Delete a webhook
err = client.Webhooks.Delete(ctx, "wh_abc123")`})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Listing deliveries"}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import "time"

since := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
deliveries, err := client.Deliveries.List(ctx, &xrnotify.ListDeliveriesParams{
    WebhookID: "wh_abc123",
    Status:    "failed",
    Since:     &since,
})
if err != nil {
    log.Fatal(err)
}
for _, d := range deliveries.Data {
    fmt.Println(d.ID, d.EventType, d.StatusCode, d.LastError)
}`})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Verifying signatures"}),(0,n.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["Use the ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"verify"})," sub-package to validate incoming webhook requests. The function uses ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"hmac.Equal"})," for constant-time comparison."]}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`package main

import (
    "encoding/json"
    "io"
    "log"
    "net/http"
    "os"

    "github.com/xrnotify/xrnotify-go"
    "github.com/xrnotify/xrnotify-go/verify"
)

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Bad request", http.StatusBadRequest)
        return
    }

    ok := verify.Signature(
        body,
        r.Header.Get("X-XRNotify-Signature"),
        os.Getenv("WEBHOOK_SECRET"),
    )
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    var event xrnotify.Event
    if err := json.Unmarshal(body, &event); err != nil {
        http.Error(w, "Bad request", http.StatusBadRequest)
        return
    }

    log.Printf("Received event: %s in ledger %d", event.EventType, event.LedgerIndex)

    switch event.EventType {
    case "payment.xrp":
        // unmarshal event.Payload into xrnotify.PaymentXrpPayload
    case "nft.minted":
        // unmarshal event.Payload into xrnotify.NftMintedPayload
    }

    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/webhooks/xrpl", webhookHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}`})}),n.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3",children:(0,n.jsxs)("p",{className:"text-amber-300 text-sm",children:[n.jsx("span",{className:"font-semibold",children:"Raw body required:"})," Read the body with ",n.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"io.ReadAll"})," before calling ",n.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"verify.Signature"}),". Do not use a JSON decoder directly on ",n.jsx("code",{className:"font-mono text-amber-200 bg-amber-500/10 px-1 rounded",children:"r.Body"})," before verification."]})})]}),(0,n.jsxs)("section",{className:"mb-12",children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-3",children:"Struct types"}),(0,n.jsxs)("p",{className:"text-zinc-400 mb-4 leading-relaxed",children:["The SDK provides typed structs for all event envelopes and payloads. The ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"Payload"})," field is a ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"json.RawMessage"})," so you can unmarshal it into the appropriate typed struct based on ",n.jsx("code",{className:"font-mono text-zinc-300 bg-zinc-800 px-1 rounded",children:"EventType"}),"."]}),n.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto",children:n.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`// Event envelope — same structure for all event types
type Event struct {
    EventID     string          \`json:"event_id"\`
    EventType   string          \`json:"event_type"\`
    LedgerIndex int64           \`json:"ledger_index"\`
    Timestamp   time.Time       \`json:"timestamp"\`
    Network     string          \`json:"network"\`
    WebhookID   string          \`json:"webhook_id"\`
    Payload     json.RawMessage \`json:"payload"\`
}

// Typed payload structs
type PaymentXrpPayload struct {
    Sender         string  \`json:"sender"\`
    Receiver       string  \`json:"receiver"\`
    Amount         string  \`json:"amount"\`
    AmountXRP      string  \`json:"amount_xrp"\`
    Fee            string  \`json:"fee"\`
    DeliveredAmount string \`json:"delivered_amount"\`
    DestinationTag *int64  \`json:"destination_tag"\`
    SourceTag      *int64  \`json:"source_tag"\`
    TxHash         string  \`json:"tx_hash"\`
    LedgerIndex    int64   \`json:"ledger_index"\`
    Sequence       int64   \`json:"sequence"\`
}`})})]}),(0,n.jsxs)("section",{children:[n.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Related"}),(0,n.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4",children:[(0,n.jsxs)(r.default,{href:"/docs/sdks/nodejs",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[n.jsx("p",{className:"text-white font-medium mb-1",children:"Node.js SDK"}),n.jsx("p",{className:"text-zinc-500 text-sm",children:"npm install @xrnotify/sdk"})]}),(0,n.jsxs)(r.default,{href:"/docs/sdks/python",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[n.jsx("p",{className:"text-white font-medium mb-1",children:"Python SDK"}),n.jsx("p",{className:"text-zinc-500 text-sm",children:"pip install xrnotify"})]}),(0,n.jsxs)(r.default,{href:"/docs/sdks/signature-helpers",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[n.jsx("p",{className:"text-white font-medium mb-1",children:"Signature Helpers"}),n.jsx("p",{className:"text-zinc-500 text-sm",children:"Copy-paste verification for any language"})]})]})]})]})]})}},98176:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>r});var n=s(19820);let r=e=>[{type:"image/svg+xml",sizes:"any",url:(0,n.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>o}),s(81299);var n=s(19820);let r={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function o(e){let{__metadata_id__:t,...s}=e.params,o=(0,n.fillMetadataSegment)(".",s,"opengraph-image"),{generateImageMetadata:a}=r;function i(e,t){let s={alt:e.alt,type:e.contentType||"image/png",url:o+(t?"/"+t:"")+"?47293fb50e72780a"},{size:n}=e;return n&&(s.width=n.width,s.height=n.height),s}return a?(await a({params:s})).map((e,t)=>{let s=(e.id||t)+"";return i(e,s)}):[i(r,"")]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),n=t.X(0,[5584,6876,9820,2676],()=>s(14265));module.exports=n})();