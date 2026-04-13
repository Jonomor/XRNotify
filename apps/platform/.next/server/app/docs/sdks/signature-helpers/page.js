(()=>{var e={};e.id=6377,e.ids=[6377],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},30619:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>i.a,__next_app__:()=>x,originalPathname:()=>m,pages:()=>c,routeModule:()=>p,tree:()=>l}),s(5558),s(30290),s(93056);var r=s(93443),a=s(98498),n=s(23516),i=s.n(n),o=s(68902),d={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>o[e]);s.d(t,d);let l=["",{children:["docs",{children:["sdks",{children:["signature-helpers",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,5558)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/signature-helpers/page.tsx"]}]},{}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(s.bind(s,60530))).default(e)],twitter:[],manifest:void 0}}],c=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/docs/sdks/signature-helpers/page.tsx"],m="/docs/sdks/signature-helpers/page",x={require:s,loadChunk:()=>Promise.resolve()},p=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/docs/sdks/signature-helpers/page",pathname:"/docs/sdks/signature-helpers",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},82505:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,47726,23))},5558:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>i,metadata:()=>n});var r=s(81299),a=s(13492);let n={title:"Webhook Signature Helpers - XRNotify Docs",description:"Copy-paste webhook signature verification functions for Node.js, Python, Go, Ruby, PHP, and Java. No SDK required."};function i(){return(0,r.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white antialiased",children:[r.jsx("nav",{className:"border-b border-zinc-800/50",children:(0,r.jsxs)("div",{className:"max-w-4xl mx-auto px-6 py-4 flex items-center justify-between",children:[(0,r.jsxs)("div",{className:"flex items-center gap-2 text-sm",children:[r.jsx(a.default,{href:"/docs",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"Docs"}),r.jsx("span",{className:"text-zinc-600",children:"/"}),r.jsx(a.default,{href:"/docs#sdks",className:"text-zinc-500 hover:text-zinc-300 no-underline",children:"SDKs"}),r.jsx("span",{className:"text-zinc-600",children:"/"}),r.jsx("span",{className:"text-zinc-300",children:"Signature Helpers"})]}),r.jsx(a.default,{href:"/dashboard",className:"text-zinc-400 hover:text-white transition-colors text-sm no-underline",children:"Dashboard →"})]})}),(0,r.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,r.jsxs)("div",{className:"mb-10",children:[r.jsx("span",{className:"inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4",children:"SDKs & Libraries"}),r.jsx("h1",{className:"text-4xl font-bold text-white mb-4",children:"Webhook Signature Helpers"}),r.jsx("p",{className:"text-zinc-400 text-lg leading-relaxed",children:"Copy-paste ready signature verification functions for any language. No SDK required — these are standalone functions you can drop directly into your application."})]}),(0,r.jsxs)("section",{className:"mb-10",children:[(0,r.jsxs)("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-5",children:[r.jsx("h3",{className:"text-white font-semibold mb-3",children:"How XRNotify signatures work"}),(0,r.jsxs)("ol",{className:"list-decimal list-inside space-y-2 text-zinc-300 text-sm",children:[(0,r.jsxs)("li",{children:["XRNotify computes ",r.jsx("code",{className:"font-mono text-zinc-200 bg-zinc-800 px-1 rounded",children:"HMAC-SHA256(raw_body, webhook_secret)"})]}),(0,r.jsxs)("li",{children:["The result is formatted as ",r.jsx("code",{className:"font-mono text-zinc-200 bg-zinc-800 px-1 rounded",children:"sha256=<hex_digest>"})]}),(0,r.jsxs)("li",{children:["This value is sent in the ",r.jsx("code",{className:"font-mono text-zinc-200 bg-zinc-800 px-1 rounded",children:"X-XRNotify-Signature"})," request header"]}),r.jsx("li",{children:"You recompute the same HMAC on your side and compare using a constant-time function"})]})]}),r.jsx("div",{className:"bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4",children:(0,r.jsxs)("p",{className:"text-amber-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Always use raw bytes:"})," Compute the HMAC over the raw request body bytes ",r.jsx("span",{className:"font-semibold",children:"before"})," any JSON parsing. Modifying the body (whitespace changes, key reordering) will invalidate the signature."]})})]}),(0,r.jsxs)("section",{className:"mb-12",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white",children:"Node.js"}),r.jsx("span",{className:"text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5",children:"CommonJS"})]}),r.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3",children:r.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`const crypto = require('crypto');

/**
 * Verify an XRNotify webhook signature.
 * @param {Buffer|string} payload - Raw request body (before JSON.parse)
 * @param {string} signature - X-XRNotify-Signature header value
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
function verifyXRNotifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    // Lengths differ — timingSafeEqual throws on mismatched lengths
    return false;
  }
}`})}),r.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,r.jsxs)("p",{className:"text-emerald-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Key point:"})," ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"crypto.timingSafeEqual"})," throws if the two buffers have different lengths, so the try/catch is required. Pass the raw ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"req.body"})," Buffer — not a parsed object."]})})]}),(0,r.jsxs)("section",{className:"mb-12",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white",children:"Python"}),r.jsx("span",{className:"text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5",children:"stdlib only"})]}),r.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3",children:r.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import hmac
import hashlib


def verify_xrnotify_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify an XRNotify webhook signature.

    payload:   raw request body bytes (before json.loads)
    signature: value of X-XRNotify-Signature header
    secret:    webhook secret string
    """
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)`})}),r.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,r.jsxs)("p",{className:"text-emerald-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Key point:"})," ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"hmac.compare_digest"})," performs a constant-time comparison, preventing timing-based attacks. Pass ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"request.data"})," (bytes) in Flask, or ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"await request.body()"})," in FastAPI."]})})]}),(0,r.jsxs)("section",{className:"mb-12",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white",children:"Go"}),r.jsx("span",{className:"text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5",children:"stdlib only"})]}),r.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3",children:r.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
)

// VerifyXRNotifySignature verifies an XRNotify webhook signature.
// payload:   raw request body bytes (from io.ReadAll(r.Body))
// signature: X-XRNotify-Signature header value
// secret:    webhook secret
func VerifyXRNotifySignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))
    return hmac.Equal([]byte(signature), []byte(expected))
}`})}),r.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,r.jsxs)("p",{className:"text-emerald-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Key point:"})," ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"hmac.Equal"})," from the standard library performs a constant-time byte comparison. Read the body with ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"io.ReadAll(r.Body)"})," and pass the bytes directly to this function."]})})]}),(0,r.jsxs)("section",{className:"mb-12",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white",children:"Ruby"}),r.jsx("span",{className:"text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5",children:"stdlib + rack"})]}),r.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3",children:r.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`require 'openssl'
require 'rack'

# Verify an XRNotify webhook signature.
# payload:   raw request body string
# signature: X-XRNotify-Signature header value
# secret:    webhook secret
def verify_xrnotify_signature(payload, signature, secret)
  expected = 'sha256=' + OpenSSL::HMAC.hexdigest('sha256', secret, payload)
  Rack::Utils.secure_compare(signature, expected)
end

# Sinatra / Rails example:
# post '/webhooks/xrpl' do
#   raw = request.body.read
#   sig = request.env['HTTP_X_XRNOTIFY_SIGNATURE']
#   halt 401, 'Unauthorized' unless verify_xrnotify_signature(raw, sig, ENV['WEBHOOK_SECRET'])
#   event = JSON.parse(raw)
#   # handle event...
#   status 200
# end`})}),r.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,r.jsxs)("p",{className:"text-emerald-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Key point:"})," ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"Rack::Utils.secure_compare"})," provides constant-time string comparison. Read the raw body with ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"request.body.read"})," before passing to ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"JSON.parse"}),"."]})})]}),(0,r.jsxs)("section",{className:"mb-12",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white",children:"PHP"}),r.jsx("span",{className:"text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5",children:"stdlib only"})]}),r.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3",children:r.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`<?php

/**
 * Verify an XRNotify webhook signature.
 *
 * @param string $payload   Raw request body
 * @param string $signature X-XRNotify-Signature header value
 * @param string $secret    Webhook secret
 * @return bool
 */
function verifyXRNotifySignature(string $payload, string $signature, string $secret): bool {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}

// Usage example:
// $payload   = file_get_contents('php://input');
// $signature = $_SERVER['HTTP_X_XRNOTIFY_SIGNATURE'] ?? '';
// $secret    = getenv('WEBHOOK_SECRET');
//
// if (!verifyXRNotifySignature($payload, $signature, $secret)) {
//     http_response_code(401);
//     exit('Unauthorized');
// }
//
// $event = json_decode($payload, true);
// // handle $event...`})}),r.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,r.jsxs)("p",{className:"text-emerald-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Key point:"})," ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"hash_equals"})," performs a constant-time string comparison (available since PHP 5.6). Read the raw body with ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"file_get_contents('php://input')"})," before decoding JSON."]})})]}),(0,r.jsxs)("section",{className:"mb-12",children:[(0,r.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[r.jsx("h2",{className:"text-2xl font-semibold text-white",children:"Java"}),r.jsx("span",{className:"text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5",children:"JDK only"})]}),r.jsx("div",{className:"bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-3",children:r.jsx("pre",{className:"text-sm text-zinc-300 font-mono whitespace-pre",children:`import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

/**
 * Verify an XRNotify webhook signature.
 *
 * @param payload   raw request body bytes
 * @param signature X-XRNotify-Signature header value
 * @param secret    webhook secret string
 * @return true if the signature is valid
 */
public static boolean verifyXRNotifySignature(
    byte[] payload, String signature, String secret
) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes("UTF-8"), "HmacSHA256"));
    String expected = "sha256=" + bytesToHex(mac.doFinal(payload));

    // Use MessageDigest.isEqual for constant-time comparison
    return MessageDigest.isEqual(
        expected.getBytes("UTF-8"),
        signature.getBytes("UTF-8")
    );
}

private static String bytesToHex(byte[] bytes) {
    StringBuilder sb = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
        sb.append(String.format("%02x", b));
    }
    return sb.toString();
}`})}),r.jsx("div",{className:"bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3",children:(0,r.jsxs)("p",{className:"text-emerald-300 text-sm",children:[r.jsx("span",{className:"font-semibold",children:"Key point:"})," ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"MessageDigest.isEqual"})," performs a constant-time byte array comparison (available since Java 6). Read the raw request body bytes with ",r.jsx("code",{className:"font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded",children:"request.getInputStream().readAllBytes()"})," in a servlet before parsing JSON."]})})]}),(0,r.jsxs)("section",{children:[r.jsx("h2",{className:"text-2xl font-semibold text-white mb-4",children:"SDK documentation"}),(0,r.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4",children:[(0,r.jsxs)(a.default,{href:"/docs/sdks/nodejs",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[r.jsx("p",{className:"text-white font-medium mb-1",children:"Node.js SDK"}),r.jsx("p",{className:"text-zinc-500 text-sm",children:"Full SDK with TypeScript types"})]}),(0,r.jsxs)(a.default,{href:"/docs/sdks/python",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[r.jsx("p",{className:"text-white font-medium mb-1",children:"Python SDK"}),r.jsx("p",{className:"text-zinc-500 text-sm",children:"Full SDK with Pydantic models"})]}),(0,r.jsxs)(a.default,{href:"/docs/sdks/go",className:"block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors",children:[r.jsx("p",{className:"text-white font-medium mb-1",children:"Go SDK"}),r.jsx("p",{className:"text-zinc-500 text-sm",children:"Full SDK with idiomatic Go structs"})]})]})]})]})]})}},98176:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>a});var r=s(19820);let a=e=>[{type:"image/svg+xml",sizes:"any",url:(0,r.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>n}),s(81299);var r=s(19820);let a={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function n(e){let{__metadata_id__:t,...s}=e.params,n=(0,r.fillMetadataSegment)(".",s,"opengraph-image"),{generateImageMetadata:i}=a;function o(e,t){let s={alt:e.alt,type:e.contentType||"image/png",url:n+(t?"/"+t:"")+"?47293fb50e72780a"},{size:r}=e;return r&&(s.width=r.width,s.height=r.height),s}return i?(await i({params:s})).map((e,t)=>{let s=(e.id||t)+"";return o(e,s)}):[o(a,"")]}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[5584,6876,9820,2676],()=>s(30619));module.exports=r})();