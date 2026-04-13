(()=>{var e={};e.id=1354,e.ids=[1354],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},80351:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>n.a,__next_app__:()=>h,originalPathname:()=>m,pages:()=>c,routeModule:()=>p,tree:()=>l}),s(29357),s(30290),s(93056);var r=s(93443),a=s(98498),i=s(23516),n=s.n(i),o=s(68902),d={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>o[e]);s.d(t,d);let l=["",{children:["docs",{children:["verify-signatures",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,29357)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/verify-signatures/page.tsx"]}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}],c=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/verify-signatures/page.tsx"],m="/docs/verify-signatures/page",h={require:s,loadChunk:()=>Promise.resolve()},p=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/docs/verify-signatures/page",pathname:"/docs/verify-signatures",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},59955:(e,t,s)=>{Promise.resolve().then(s.bind(s,60573))},60573:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>d});var r=s(23852),a=s(25276),i=s(56711);let n=["Node.js","Python","Go","Ruby"],o={"Node.js":`const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = \`sha256=\${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}\`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express middleware
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.post('/webhooks/xrpl', (req, res) => {
  const valid = verifySignature(
    req.body,
    req.headers['x-xrnotify-signature'],
    process.env.WEBHOOK_SECRET
  );

  if (!valid) return res.status(401).json({ error: 'Invalid signature' });

  const event = JSON.parse(req.body);
  console.log('Verified event:', event.event_type);

  // process event...
  res.sendStatus(200);
});`,Python:`import hmac
import hashlib
import os
from flask import Flask, request

app = Flask(__name__)

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/webhooks/xrpl', methods=['POST'])
def handle_webhook():
    if not verify_signature(
        request.data,
        request.headers.get('X-XRNotify-Signature', ''),
        os.environ['WEBHOOK_SECRET']
    ):
        return 'Invalid signature', 401

    event = request.get_json()
    print(f"Verified event: {event['event_type']}")
    return 'OK', 200`,Go:`package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "net/http"
    "os"
)

func verifySignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))
    return hmac.Equal([]byte(signature), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Bad request", http.StatusBadRequest)
        return
    }

    sig := r.Header.Get("X-XRNotify-Signature")
    if !verifySignature(body, sig, os.Getenv("WEBHOOK_SECRET")) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // process body...
    w.WriteHeader(http.StatusOK)
}`,Ruby:`require 'openssl'
require 'rack'
require 'json'

def verify_signature(payload, signature, secret)
  expected = 'sha256=' + OpenSSL::HMAC.hexdigest('sha256', secret, payload)
  Rack::Utils.secure_compare(signature, expected)
end

# Sinatra example
post '/webhooks/xrpl' do
  payload = request.body.read
  signature = request.env['HTTP_X_XRNOTIFY_SIGNATURE'] || ''

  unless verify_signature(payload, signature, ENV['WEBHOOK_SECRET'])
    halt 401, 'Invalid signature'
  end

  event = JSON.parse(payload)
  puts "Verified event: #{event['event_type']}"
  status 200
end`};function d(){let[e,t]=(0,a.useState)("Node.js");return(0,r.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[r.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,r.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,r.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[r.jsx(i.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),r.jsx("span",{className:"text-zinc-600",children:"/"}),r.jsx("span",{className:"text-zinc-500",children:"Getting Started"}),r.jsx("span",{className:"text-zinc-600",children:"/"}),r.jsx("span",{className:"text-zinc-300",children:"Verify Signatures"})]}),r.jsx(i.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,r.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,r.jsxs)("div",{className:"mb-10",children:[r.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4",children:"Getting Started"}),r.jsx("h1",{className:"text-4xl font-bold text-white mb-4",children:"Verify Webhook Signatures"}),r.jsx("p",{className:"text-zinc-400 text-lg leading-relaxed",children:"Every request from XRNotify is signed with your webhook secret. Verifying this signature protects your endpoint from spoofed or tampered requests."})]}),(0,r.jsxs)("section",{className:"mb-10",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"How signatures work"}),(0,r.jsxs)("p",{className:"text-zinc-300 mb-4 leading-relaxed",children:["When XRNotify delivers an event, it computes an HMAC-SHA256 digest of the raw request body using your webhook's signing secret. The result is included in the"," ",r.jsx("code",{className:"font-mono text-zinc-200 bg-zinc-800 px-1 rounded",children:"X-XRNotify-Signature"})," request header, prefixed with"," ",r.jsx("code",{className:"font-mono text-zinc-200 bg-zinc-800 px-1 rounded",children:"sha256="}),"."]}),r.jsx("p",{className:"text-zinc-300 leading-relaxed",children:"To verify, you recompute the HMAC using the same secret and compare your result to the header value using a constant-time comparison function to prevent timing attacks."})]}),(0,r.jsxs)("section",{className:"mb-10",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Webhook request headers"}),r.jsx("div",{className:"overflow-x-auto mb-4",children:(0,r.jsxs)("table",{className:"w-full text-sm border-collapse",children:[r.jsx("thead",{children:(0,r.jsxs)("tr",{className:"border-b border-zinc-800",children:[r.jsx("th",{className:"text-left py-2 pr-6 text-zinc-400 font-medium",children:"Header"}),r.jsx("th",{className:"text-left py-2 text-zinc-400 font-medium",children:"Description"})]})}),r.jsx("tbody",{className:"divide-y divide-zinc-800/60",children:[{header:"X-XRNotify-Signature",desc:"HMAC-SHA256 of the raw body, formatted as sha256=<hex_digest>"},{header:"X-XRNotify-Timestamp",desc:"Unix timestamp (seconds) of when the delivery was initiated"},{header:"X-XRNotify-Delivery-Id",desc:"Unique delivery ID — use for idempotency checks in your database"},{header:"X-XRNotify-Webhook-Id",desc:"ID of the webhook this event was delivered to"}].map(({header:e,desc:t})=>(0,r.jsxs)("tr",{children:[r.jsx("td",{className:"py-2.5 pr-6",children:r.jsx("code",{className:"font-mono text-emerald-400 text-xs",children:e})}),r.jsx("td",{className:"py-2.5 text-zinc-300",children:t})]},e))})]})}),r.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3",children:(0,r.jsxs)("p",{className:"text-amber-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Security warning:"})," Always verify the signature before processing any event data. Never trust the payload contents without first confirming the request originated from XRNotify."]})})]}),(0,r.jsxs)("section",{className:"mb-10",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Verification examples"}),(0,r.jsxs)("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden",children:[r.jsx("div",{className:"flex border-b border-zinc-800",children:n.map(s=>r.jsx("button",{onClick:()=>t(s),className:`px-4 py-2.5 text-sm font-medium transition-colors ${e===s?"text-white border-b-2 border-emerald-500 bg-zinc-800/50":"text-zinc-500 hover:text-zinc-300"}`,children:s},s))}),r.jsx("div",{className:"p-4 overflow-x-auto",children:r.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:o[e]})})]})]}),(0,r.jsxs)("section",{className:"mb-10",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Common mistakes"}),r.jsx("div",{className:"space-y-4",children:[{mistake:"Parsing JSON before verifying",detail:"The signature covers the raw bytes of the request body. If you parse the JSON first and re-serialize, even a single whitespace difference will cause verification to fail. Always use the raw body buffer."},{mistake:"Using == for string comparison",detail:"Standard equality checks are vulnerable to timing attacks where an attacker can infer the correct signature byte-by-byte by measuring response times. Always use a constant-time comparison function like crypto.timingSafeEqual (Node.js), hmac.compare_digest (Python), or hmac.Equal (Go)."},{mistake:"Forgetting the sha256= prefix",detail:"The header value is sha256=<hex_digest>, not just the hex digest. Your expected value must include the prefix, otherwise the comparison will always fail."}].map(({mistake:e,detail:t})=>(0,r.jsxs)("div",{className:"flex gap-3",children:[r.jsx("span",{className:"text-red-400 text-sm shrink-0 mt-0.5",children:"✗"}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-white font-medium text-sm mb-1",children:e}),r.jsx("p",{className:"text-zinc-400 text-sm leading-relaxed",children:t})]})]},e))})]}),(0,r.jsxs)("section",{className:"mb-10",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Security best practices"}),r.jsx("ul",{className:"space-y-3",children:[{title:"Rotate secrets if compromised",desc:"Use the rotate-secret endpoint (POST /v1/webhooks/:id/rotate-secret) to immediately invalidate the old secret and generate a new one."},{title:"Reject stale events",desc:"Check the X-XRNotify-Timestamp header and reject events older than 5 minutes. This prevents replay attacks where an attacker re-sends a valid old request."},{title:"Deduplicate with delivery IDs",desc:"Store X-XRNotify-Delivery-Id values in your database to ensure idempotent processing. XRNotify may retry failed deliveries, so your handler should be safe to call multiple times."},{title:"Store secrets in environment variables",desc:"Never hardcode webhook secrets in your source code. Use environment variables or a secrets manager like AWS Secrets Manager or HashiCorp Vault."}].map(({title:e,desc:t})=>(0,r.jsxs)("li",{className:"flex gap-3",children:[r.jsx("span",{className:"text-emerald-400 text-sm shrink-0 mt-0.5",children:"✓"}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"text-white font-medium text-sm mb-0.5",children:e}),r.jsx("p",{className:"text-zinc-400 text-sm leading-relaxed",children:t})]})]},e))})]}),(0,r.jsxs)("section",{children:[r.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"Next steps"}),(0,r.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-4",children:[(0,r.jsxs)(i.default,{href:"/docs/api/webhooks",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[r.jsx("p",{className:"text-white font-medium mb-1",children:"Webhooks API Reference"}),r.jsx("p",{className:"text-zinc-500 text-sm",children:"Rotate secrets, update settings, and more"})]}),(0,r.jsxs)(i.default,{href:"/docs/api/deliveries",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[r.jsx("p",{className:"text-white font-medium mb-1",children:"Deliveries API"}),r.jsx("p",{className:"text-zinc-500 text-sm",children:"Monitor delivery status and retry failed events"})]})]})]})]})]})}},56711:(e,t,s)=>{"use strict";s.d(t,{default:()=>a.a});var r=s(47726),a=s.n(r)},29357:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>r});let r=(0,s(20685).createProxy)(String.raw`/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/verify-signatures/page.tsx#default`)},98176:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>a});var r=s(19820);let a=e=>[{type:"image/svg+xml",sizes:"any",url:(0,r.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>i}),s(81299);var r=s(19820);let a={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function i(e){let{__metadata_id__:t,...s}=e.params,i=(0,r.fillMetadataSegment)(".",s,"opengraph-image"),{generateImageMetadata:n}=a;function o(e,t){let s={alt:e.alt,type:e.contentType||"image/png",url:i+(t?"/"+t:"")+"?47293fb50e72780a"},{size:r}=e;return r&&(s.width=r.width,s.height=r.height),s}return n?(await n({params:s})).map((e,t)=>{let s=(e.id||t)+"";return o(e,s)}):[o(a,"")]}}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[5584,6876,9820,2676],()=>s(80351));module.exports=r})();