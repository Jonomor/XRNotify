(()=>{var e={};e.id=2411,e.ids=[2411],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},16169:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>a.a,__next_app__:()=>p,originalPathname:()=>h,pages:()=>d,routeModule:()=>u,tree:()=>c}),r(81370),r(30290),r(93056);var s=r(93443),i=r(98498),n=r(23516),a=r.n(n),o=r(68902),l={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>o[e]);r.d(t,l);let c=["",{children:["articles",{children:["how-to-monitor-xrpl-wallets",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,81370)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/articles/how-to-monitor-xrpl-wallets/page.tsx"]}]},{}]},{metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(r.bind(r,60530))).default(e)],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(r.bind(r,30290)),"/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,93056,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,98176))).default(e)],apple:[],openGraph:[async e=>(await Promise.resolve().then(r.bind(r,60530))).default(e)],twitter:[],manifest:void 0}}],d=["/Users/alimorgan/Desktop/xrnotify/apps/platform/src/app/articles/how-to-monitor-xrpl-wallets/page.tsx"],h="/articles/how-to-monitor-xrpl-wallets/page",p={require:r,loadChunk:()=>Promise.resolve()},u=new s.AppPageRouteModule({definition:{kind:i.x.APP_PAGE,page:"/articles/how-to-monitor-xrpl-wallets/page",pathname:"/articles/how-to-monitor-xrpl-wallets",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},82505:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,47726,23))},81370:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o,metadata:()=>a});var s=r(81299),i=r(49249);let n=r(89259).Sg[2],a={title:n.title,description:n.description,alternates:{canonical:`https://www.xrnotify.io/articles/${n.slug}`}};function o(){return(0,s.jsxs)(i.B,{article:n,children:[s.jsx("p",{children:"Monitoring XRP Ledger wallets in real time is essential for exchanges, payment processors, NFT marketplaces, and any application that needs to react instantly to on-chain activity. Rather than polling the XRPL every few seconds and burning through rate limits, you can use XRNotify to push normalized webhook events directly to your server the moment a transaction is validated. This guide walks you through the entire process, from creating your XRNotify account to scaling a production-grade monitoring pipeline across hundreds of wallets."}),s.jsx("p",{children:"By the end of this tutorial you will have a fully working webhook integration that receives real-time notifications for payments, trust-line changes, escrow activity, and more, all verified with HMAC signatures and hardened against delivery failures. Let us get started."}),s.jsx("h2",{children:"Step 1: Create an XRNotify Account and Get Your API Key"}),(0,s.jsxs)("p",{children:["Before you can create webhook subscriptions, you need an XRNotify account and an API key. Head to"," ",s.jsx("a",{href:"https://www.xrnotify.io/signup",target:"_blank",rel:"noopener noreferrer",children:"xrnotify.io/signup"})," ","and create a free account. XRNotify offers a generous free tier that includes up to 10 webhook subscriptions and 10,000 deliveries per month, more than enough to get started."]}),(0,s.jsxs)("p",{children:["Once you have signed in, navigate to ",s.jsx("strong",{children:"Settings → API Keys"})," in the XRNotify dashboard. Click ",s.jsx("strong",{children:"Generate New Key"}),". You will see your API key exactly once, so copy it to a secure location such as a password manager or an environment variable in your deployment pipeline. The key is a long, random string that looks like this:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-bash",children:"xrn_live_k1_9f84a2c...your-secret-key"})}),(0,s.jsxs)("p",{children:["XRNotify also generates a ",s.jsx("strong",{children:"webhook signing secret"})," for each subscription you create. You will use this secret later to verify that incoming payloads genuinely originated from XRNotify and have not been tampered with in transit. Keep both the API key and the signing secret confidential; never commit them to version control."]}),s.jsx("h2",{children:"Step 2: Create a Webhook Subscription with Account Filters"}),(0,s.jsxs)("p",{children:["A webhook subscription tells XRNotify which events you care about and where to deliver them. Each subscription includes a ",s.jsx("strong",{children:"destination URL"})," (your server endpoint), one or more ",s.jsx("strong",{children:"event types"}),", and optional ",s.jsx("strong",{children:"account filters"})," that narrow delivery to specific XRPL addresses."]}),(0,s.jsxs)("p",{children:["Use the XRNotify REST API to create a subscription. The following ",s.jsx("code",{children:"curl"})," command creates a webhook that fires whenever a ",s.jsx("code",{children:"payment"})," or"," ",s.jsx("code",{children:"trustline_change"})," event touches either of the two specified XRPL wallets:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-bash",children:`curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "Authorization: Bearer xrn_live_k1_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.example.com/webhooks/xrpl",
    "event_types": ["payment", "trustline_change"],
    "account_filters": [
      "rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3",
      "rLdinLq5CJood9wdjY9ZCdgycK8KGEvkUj"
    ],
    "description": "Production wallet monitor"
  }'`})}),(0,s.jsxs)("p",{children:["XRNotify responds with a JSON object that contains the subscription ID and your unique signing secret. Store the ",s.jsx("code",{children:"signing_secret"})," securely; you will need it in Step 4 to verify the HMAC signature on every incoming webhook delivery:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-javascript",children:`{
  "id": "wh_3kTm8vQpZr1x",
  "url": "https://your-app.example.com/webhooks/xrpl",
  "event_types": ["payment", "trustline_change"],
  "account_filters": [
    "rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3",
    "rLdinLq5CJood9wdjY9ZCdgycK8KGEvkUj"
  ],
  "signing_secret": "whsec_a8b3f...your-signing-secret",
  "status": "active",
  "created_at": "2026-04-04T12:00:00Z"
}`})}),(0,s.jsxs)("p",{children:["You can also create subscriptions through the XRNotify dashboard if you prefer a graphical interface. Navigate to ",s.jsx("strong",{children:"Webhooks → New Subscription"}),", fill in the same fields, and click ",s.jsx("strong",{children:"Create"}),". The dashboard displays the signing secret in a one-time modal immediately after creation."]}),s.jsx("h2",{children:"Step 3: Set Up Your Endpoint to Receive POST Requests"}),(0,s.jsxs)("p",{children:["XRNotify delivers each event as an HTTP ",s.jsx("code",{children:"POST"})," request to the URL you specified. Your endpoint needs to accept JSON bodies and respond with a ",s.jsx("code",{children:"2xx"})," status code within 15 seconds. Any response outside the ",s.jsx("code",{children:"200-299"})," range, or a timeout, is treated as a delivery failure and triggers XRNotify's automatic retry logic."]}),s.jsx("p",{children:"Here is a minimal Express.js handler that receives XRNotify webhook payloads and acknowledges them:"}),s.jsx("pre",{children:s.jsx("code",{className:"language-javascript",children:`const express = require('express');
const app = express();

// XRNotify sends JSON payloads, so parse the raw body for
// signature verification and the JSON body for processing.
app.post(
  '/webhooks/xrpl',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body; // Buffer for HMAC verification
    const event = JSON.parse(rawBody.toString());

    console.log('Received XRNotify event:', event.event_type);

    // TODO: Verify signature (Step 4)
    // TODO: Process event (Step 5)

    // Return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  }
);

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});`})}),(0,s.jsxs)("p",{children:["A few important considerations for your endpoint. First, always parse the body as raw bytes before verifying the signature, then parse it as JSON. If you let a middleware parse the JSON first, the re-serialized bytes may differ from the original payload, causing the HMAC check to fail. Second, keep your handler fast. Offload heavy processing to a background job queue (e.g., BullMQ, SQS, or a database row) and return ",s.jsx("code",{children:"200"})," immediately. XRNotify expects a response within 15 seconds, and spending too long processing in the request cycle risks a timeout and unnecessary retries."]}),s.jsx("h2",{children:"Step 4: Verify the HMAC Signature"}),(0,s.jsxs)("p",{children:["Every webhook delivery from XRNotify includes an"," ",s.jsx("code",{children:"X-XRNotify-Signature"})," header containing an HMAC-SHA256 digest of the raw request body, signed with your subscription's signing secret. Verifying this signature is critical for security; it proves the payload was sent by XRNotify and has not been altered by a man-in-the-middle or replayed by an attacker."]}),(0,s.jsxs)("p",{children:["The following Node.js function performs constant-time signature verification using the built-in ",s.jsx("code",{children:"crypto"})," module:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-javascript",children:`const crypto = require('crypto');

/**
 * Verify that an incoming XRNotify webhook payload is authentic.
 *
 * @param {Buffer} rawBody       - The raw request body bytes
 * @param {string} signatureHeader - Value of X-XRNotify-Signature header
 * @param {string} secret         - Your webhook signing secret (whsec_...)
 * @returns {boolean} true if the signature is valid
 */
function verifyXRNotifySignature(rawBody, signatureHeader, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf-8');
  const receivedBuffer = Buffer.from(signatureHeader, 'utf-8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}`})}),(0,s.jsxs)("p",{children:["Integrate this check into your Express handler from Step 3. If the signature does not match, reject the request with a ",s.jsx("code",{children:"401 Unauthorized"})," response and log the attempt for monitoring:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-javascript",children:`app.post(
  '/webhooks/xrpl',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const rawBody = req.body;
    const signature = req.headers['x-xrnotify-signature'];
    const secret = process.env.XRNOTIFY_SIGNING_SECRET;

    if (!signature || !verifyXRNotifySignature(rawBody, signature, secret)) {
      console.warn('Invalid XRNotify signature — rejecting payload');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody.toString());
    console.log('Verified XRNotify event:', event.event_type, event.id);

    // Hand off to your processing pipeline
    processEventAsync(event);

    res.status(200).json({ received: true });
  }
);`})}),(0,s.jsxs)("p",{children:["Using ",s.jsx("code",{children:"crypto.timingSafeEqual"})," is important because a naive string comparison (",s.jsx("code",{children:"==="}),") is vulnerable to timing attacks, where an attacker can deduce your secret byte by byte based on how long the comparison takes. XRNotify strongly recommends constant-time comparison for all signature checks."]}),s.jsx("h2",{children:"Step 5: Parse the Normalized Event Payload"}),(0,s.jsxs)("p",{children:["One of XRNotify's most valuable features is its ",s.jsx("strong",{children:"normalized event format"}),". Raw XRPL transaction data from ",s.jsx("code",{children:"rippled"})," is deeply nested and varies significantly between transaction types. XRNotify flattens this into a consistent, predictable JSON structure so you do not have to write brittle parsing code for every transaction variant."]}),(0,s.jsxs)("p",{children:["Here is an example of a normalized ",s.jsx("code",{children:"payment"})," event delivered by XRNotify:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-javascript",children:`{
  "id": "evt_9xKm3pQr7vZw",
  "event_type": "payment",
  "created_at": "2026-04-04T14:32:10.483Z",
  "ledger_index": 92481537,
  "tx_hash": "A1B2C3D4E5F6...",
  "account": "rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3",
  "data": {
    "source": "rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3",
    "destination": "rLdinLq5CJood9wdjY9ZCdgycK8KGEvkUj",
    "amount": {
      "currency": "XRP",
      "value": "125.500000"
    },
    "destination_tag": 12345,
    "fee": "0.000012",
    "result": "tesSUCCESS"
  },
  "webhook_id": "wh_3kTm8vQpZr1x"
}`})}),(0,s.jsxs)("p",{children:["Every XRNotify event follows this top-level schema: a unique ",s.jsx("code",{children:"id"}),", the"," ",s.jsx("code",{children:"event_type"})," string, the originating ",s.jsx("code",{children:"account"}),", the"," ",s.jsx("code",{children:"ledger_index"})," and ",s.jsx("code",{children:"tx_hash"})," for on-chain reference, and a"," ",s.jsx("code",{children:"data"})," object whose shape varies by event type. For payments the data includes"," ",s.jsx("code",{children:"source"}),", ",s.jsx("code",{children:"destination"}),", ",s.jsx("code",{children:"amount"}),", and"," ",s.jsx("code",{children:"destination_tag"}),". For trust-line changes it includes ",s.jsx("code",{children:"currency"}),","," ",s.jsx("code",{children:"issuer"}),", and ",s.jsx("code",{children:"limit"}),". XRNotify documents every event type in the"," ",s.jsx("a",{href:"https://www.xrnotify.io/docs",children:"API reference"}),"."]}),(0,s.jsxs)("p",{children:["In your processing code, switch on the ",s.jsx("code",{children:"event_type"})," field to handle each category appropriately:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-javascript",children:`async function processEventAsync(event) {
  switch (event.event_type) {
    case 'payment':
      await handlePayment(event.data);
      break;
    case 'trustline_change':
      await handleTrustlineChange(event.data);
      break;
    case 'escrow_create':
    case 'escrow_finish':
    case 'escrow_cancel':
      await handleEscrow(event.event_type, event.data);
      break;
    case 'offer_create':
    case 'offer_cancel':
      await handleDexOffer(event.event_type, event.data);
      break;
    default:
      console.log('Unhandled XRNotify event type:', event.event_type);
  }
}`})}),(0,s.jsxs)("p",{children:["Because XRNotify normalizes every payload, adding support for a new event type is as simple as adding a new ",s.jsx("code",{children:"case"})," branch. There is no need to dig through raw"," ",s.jsx("code",{children:"rippled"})," metadata or handle edge cases like partial payments or amended transactions; XRNotify does that for you."]}),s.jsx("h2",{children:"Step 6: Handle Delivery Failures and Retries"}),s.jsx("p",{children:"Network blips happen. Your server might be deploying, a load balancer might timeout, or a downstream database might be momentarily unavailable. XRNotify is built for reliability and automatically retries failed deliveries using an exponential backoff schedule."}),(0,s.jsxs)("p",{children:["A delivery is considered ",s.jsx("strong",{children:"successful"})," when your endpoint returns any HTTP status code in the ",s.jsx("code",{children:"200-299"})," range. Anything else, including ",s.jsx("code",{children:"3xx"})," ","redirects, ",s.jsx("code",{children:"4xx"})," client errors, ",s.jsx("code",{children:"5xx"})," server errors, connection timeouts, and DNS failures, triggers the retry sequence. XRNotify retries up to"," ",s.jsx("strong",{children:"8 times"})," with the following approximate schedule:"]}),(0,s.jsxs)("table",{children:[s.jsx("thead",{children:(0,s.jsxs)("tr",{children:[s.jsx("th",{children:"Attempt"}),s.jsx("th",{children:"Delay after failure"}),s.jsx("th",{children:"Cumulative wait"})]})}),(0,s.jsxs)("tbody",{children:[(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"1st retry"}),s.jsx("td",{children:"10 seconds"}),s.jsx("td",{children:"10 seconds"})]}),(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"2nd retry"}),s.jsx("td",{children:"30 seconds"}),s.jsx("td",{children:"40 seconds"})]}),(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"3rd retry"}),s.jsx("td",{children:"2 minutes"}),s.jsx("td",{children:"~2.5 minutes"})]}),(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"4th retry"}),s.jsx("td",{children:"10 minutes"}),s.jsx("td",{children:"~12.5 minutes"})]}),(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"5th retry"}),s.jsx("td",{children:"30 minutes"}),s.jsx("td",{children:"~42.5 minutes"})]}),(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"6th retry"}),s.jsx("td",{children:"1 hour"}),s.jsx("td",{children:"~1 hour 42 min"})]}),(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"7th retry"}),s.jsx("td",{children:"3 hours"}),s.jsx("td",{children:"~4 hours 42 min"})]}),(0,s.jsxs)("tr",{children:[s.jsx("td",{children:"8th retry"}),s.jsx("td",{children:"6 hours"}),s.jsx("td",{children:"~10 hours 42 min"})]})]})]}),(0,s.jsxs)("p",{children:["After all retry attempts are exhausted, XRNotify marks the delivery as"," ",s.jsx("strong",{children:"failed"})," and records it in your delivery log. You can manually replay any failed delivery from the XRNotify dashboard, or use the API to trigger a replay programmatically."]}),(0,s.jsxs)("p",{children:["To minimize unnecessary retries, make sure your endpoint is ",s.jsx("strong",{children:"idempotent"}),". Use the ",s.jsx("code",{children:"event.id"})," field as a deduplication key. Before processing an event, check whether you have already seen that ID. This way, if XRNotify retries a delivery that your server actually processed but failed to acknowledge, you will not double-count the transaction:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-javascript",children:`async function handlePayment(event) {
  // Idempotency check using the XRNotify event ID
  const existing = await db.events.findOne({ xrnotify_id: event.id });
  if (existing) {
    console.log('Duplicate XRNotify event, skipping:', event.id);
    return;
  }

  await db.events.insertOne({
    xrnotify_id: event.id,
    event_type: event.event_type,
    tx_hash: event.tx_hash,
    data: event.data,
    processed_at: new Date(),
  });

  // Continue with business logic...
}`})}),s.jsx("h2",{children:"Step 7: Use the Dashboard to Monitor Delivery Health"}),s.jsx("p",{children:"XRNotify provides a comprehensive dashboard that gives you full visibility into your webhook pipeline. After your integration is live, check the dashboard regularly to ensure everything is running smoothly."}),(0,s.jsxs)("p",{children:["The ",s.jsx("strong",{children:"Delivery Logs"})," section shows every delivery attempt for each subscription. You can filter by status (success, failed, pending retry), event type, and time range. Each log entry includes the HTTP status code your endpoint returned, the response time in milliseconds, the full request payload, and the response body. This is invaluable for debugging integration issues."]}),s.jsx("p",{children:"Key metrics available on the XRNotify dashboard include:"}),(0,s.jsxs)("ul",{children:[(0,s.jsxs)("li",{children:[s.jsx("strong",{children:"Delivery success rate"})," — the percentage of deliveries that received a 2xx response on the first attempt. A healthy integration should maintain a success rate above 99%. If you see this number dropping, check your server logs for errors or timeouts."]}),(0,s.jsxs)("li",{children:[s.jsx("strong",{children:"Average latency"})," — the time between when XRNotify sends the POST request and when your server responds. Keep this under 1 second for best results. If latency creeps up, consider offloading processing to a background queue."]}),(0,s.jsxs)("li",{children:[s.jsx("strong",{children:"Retry rate"})," — the percentage of deliveries that required at least one retry. A rising retry rate is an early warning sign that your endpoint is struggling under load or experiencing intermittent failures."]}),(0,s.jsxs)("li",{children:[s.jsx("strong",{children:"Event volume"})," — a time-series chart showing the number of events delivered per hour. Use this to understand traffic patterns and plan capacity accordingly."]})]}),(0,s.jsxs)("p",{children:["XRNotify also supports ",s.jsx("strong",{children:"email and Slack alerts"})," for delivery anomalies. You can configure alerts to fire when your success rate drops below a threshold or when a subscription accumulates too many consecutive failures. Navigate to"," ",s.jsx("strong",{children:"Settings → Alerts"})," in the XRNotify dashboard to set these up."]}),s.jsx("h2",{children:"Step 8: Scale with Multiple Webhooks"}),s.jsx("p",{children:"As your application grows, you will likely need to monitor more wallets and react to more event types. XRNotify is designed to scale with you. Here are several patterns for structuring your webhook subscriptions at scale."}),s.jsx("h3",{children:"Separate Webhooks by Event Type"}),s.jsx("p",{children:"Instead of funneling all event types into a single endpoint, create dedicated subscriptions for each category. For example, route payment events to a payments microservice and trust-line events to a compliance service:"}),s.jsx("pre",{children:s.jsx("code",{className:"language-bash",children:`# Payment events -> payments service
curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "Authorization: Bearer xrn_live_k1_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://payments.internal.example.com/webhooks/xrpl",
    "event_types": ["payment"],
    "account_filters": ["rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3"]
  }'

# Trust-line events -> compliance service
curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "Authorization: Bearer xrn_live_k1_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://compliance.internal.example.com/webhooks/xrpl",
    "event_types": ["trustline_change"],
    "account_filters": ["rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3"]
  }'`})}),s.jsx("p",{children:"This pattern keeps each service focused and prevents a surge in one event type from creating backpressure on unrelated handlers. Each XRNotify subscription has its own retry queue and delivery metrics, so a struggling endpoint only affects its own events."}),s.jsx("h3",{children:"Partition by Account Set"}),s.jsx("p",{children:"If you manage hundreds of XRPL wallets, split them across multiple XRNotify subscriptions grouped by business function or risk level. For instance, keep hot-wallet monitoring on a high-priority subscription with a fast, dedicated endpoint, while cold-storage wallets go to a lower-priority subscription that writes to a batch processing queue."}),s.jsx("h3",{children:"Use the XRNotify API to Manage Subscriptions Programmatically"}),(0,s.jsxs)("p",{children:["For dynamic wallet monitoring (for example, when a new user deposits to a unique XRPL address), use the XRNotify API to add account filters to an existing subscription or create new subscriptions on the fly. The ",s.jsx("code",{children:"PATCH"})," endpoint lets you update a subscription's account filters without recreating it:"]}),s.jsx("pre",{children:s.jsx("code",{className:"language-bash",children:`curl -X PATCH https://api.xrnotify.io/v1/webhooks/wh_3kTm8vQpZr1x \\
  -H "Authorization: Bearer xrn_live_k1_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "account_filters": [
      "rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3",
      "rLdinLq5CJood9wdjY9ZCdgycK8KGEvkUj",
      "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
    ]
  }'`})}),s.jsx("p",{children:"This is particularly useful for exchanges and custodial platforms where new deposit addresses are generated frequently. Automate account-filter updates in your onboarding flow so that every new wallet is covered by XRNotify within seconds of creation."}),s.jsx("h3",{children:"Plan Limits and Upgrades"}),(0,s.jsxs)("p",{children:["The XRNotify free tier supports up to 10 webhook subscriptions and 10,000 deliveries per month. If your volume exceeds this, upgrade to the Pro or Enterprise tier for higher limits, priority support, and dedicated infrastructure. Visit the"," ",s.jsx("a",{href:"https://www.xrnotify.io/pricing",target:"_blank",rel:"noopener noreferrer",children:"XRNotify pricing page"})," ","for current plan details."]}),s.jsx("h2",{children:"Summary"}),s.jsx("p",{children:"You now have a complete, production-ready pipeline for monitoring XRPL wallets in real time with XRNotify. To recap the eight steps:"}),(0,s.jsxs)("ol",{children:[s.jsx("li",{children:"Create an XRNotify account and generate your API key."}),s.jsx("li",{children:"Create a webhook subscription with event types and account filters via the XRNotify API."}),s.jsx("li",{children:"Build an endpoint that accepts POST requests and responds with a 2xx status code quickly."}),(0,s.jsxs)("li",{children:["Verify every delivery using the HMAC-SHA256 signature in the ",s.jsx("code",{children:"X-XRNotify-Signature"})," header."]}),s.jsx("li",{children:"Parse XRNotify's normalized event payload and route by event type."}),s.jsx("li",{children:"Handle retries gracefully with idempotent processing keyed on the event ID."}),s.jsx("li",{children:"Monitor delivery health, latency, and success rates in the XRNotify dashboard."}),s.jsx("li",{children:"Scale by splitting webhooks across event types, account sets, and microservices."})]}),s.jsx("p",{children:"XRNotify handles the complex infrastructure of subscribing to XRPL nodes, normalizing transaction data, and ensuring reliable delivery so that you can focus on building your application logic. Whether you are tracking a single wallet or thousands, XRNotify gives you the real-time visibility you need to build responsive, reliable XRPL applications."})]})}},49249:(e,t,r)=>{"use strict";r.d(t,{B:()=>o});var s=r(81299),i=r(13492),n=r(89259);let a={definition:"Guide",faq:"FAQ","how-to":"How-To",comparison:"Comparison"};function o({article:e,children:t}){let r=Math.ceil(e.wordCount/200),o=n.Sg.find(e=>e.isPillar),l=n.Sg.filter(t=>t.slug!==e.slug),c=(0,n.Dw)(e);return(0,s.jsxs)("div",{className:"min-h-screen bg-[#0a0a0f] text-white",children:[s.jsx("script",{type:"application/ld+json",dangerouslySetInnerHTML:{__html:JSON.stringify(c)}}),s.jsx("nav",{className:"border-b border-white/5",children:(0,s.jsxs)("div",{className:"mx-auto flex h-16 max-w-4xl items-center justify-between px-6",children:[s.jsx(i.default,{href:"/",className:"text-lg font-semibold text-white no-underline",children:"XRNotify"}),(0,s.jsxs)("div",{className:"flex items-center gap-6",children:[s.jsx(i.default,{href:"/articles",className:"text-sm text-zinc-400 no-underline transition-colors hover:text-white",children:"Articles"}),s.jsx(i.default,{href:"/docs",className:"text-sm text-zinc-400 no-underline transition-colors hover:text-white",children:"Docs"})]})]})}),(0,s.jsxs)("article",{className:"mx-auto max-w-4xl px-6 py-16",children:[s.jsx("nav",{"aria-label":"Breadcrumb",className:"mb-8 text-sm text-zinc-500",children:(0,s.jsxs)("ol",{className:"flex items-center gap-2",children:[s.jsx("li",{children:s.jsx(i.default,{href:"/",className:"text-zinc-500 no-underline transition-colors hover:text-white",children:"XRNotify"})}),s.jsx("li",{"aria-hidden":"true",children:"/"}),s.jsx("li",{children:s.jsx(i.default,{href:"/articles",className:"text-zinc-500 no-underline transition-colors hover:text-white",children:"Articles"})}),s.jsx("li",{"aria-hidden":"true",children:"/"}),s.jsx("li",{className:"text-zinc-400",children:e.title})]})}),(0,s.jsxs)("header",{className:"mb-12",children:[(0,s.jsxs)("div",{className:"mb-4 flex items-center gap-3",children:[s.jsx("span",{className:"rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400",children:a[e.contentType]??e.contentType}),(0,s.jsxs)("span",{className:"text-sm text-zinc-500",children:[r," min read"]})]}),s.jsx("h1",{className:"text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl",children:e.title}),s.jsx("p",{className:"mt-4 text-lg text-zinc-400",children:e.description}),(0,s.jsxs)("div",{className:"mt-6 flex items-center gap-2 text-sm text-zinc-500",children:[s.jsx("span",{children:"By"}),s.jsx("a",{href:n.j6.aliMorgan,className:"text-emerald-400 no-underline transition-colors hover:text-emerald-300",target:"_blank",rel:"noopener noreferrer",children:"Ali Morgan"}),s.jsx("span",{className:"mx-1",children:"\xb7"}),s.jsx("time",{dateTime:e.datePublished,children:new Date(e.datePublished).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})})]})]}),!e.isPillar&&o&&s.jsx("div",{className:"mb-10 rounded-lg border border-white/5 bg-zinc-900/50 p-4",children:(0,s.jsxs)("p",{className:"text-sm text-zinc-400",children:["Part of the XRNotify knowledge base."," ",(0,s.jsxs)(i.default,{href:`/articles/${o.slug}`,className:"text-emerald-400 no-underline transition-colors hover:text-emerald-300",children:["Start with: ",o.title]})]})}),s.jsx("div",{className:"prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-p:leading-relaxed prose-p:text-zinc-300 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-strong:text-white prose-code:rounded prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-emerald-300 prose-pre:border prose-pre:border-white/5 prose-pre:bg-zinc-950 prose-li:text-zinc-300 prose-table:border-collapse prose-th:border prose-th:border-white/10 prose-th:bg-zinc-900/50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-white prose-td:border prose-td:border-white/10 prose-td:px-4 prose-td:py-2 prose-td:text-zinc-300",children:t}),(0,s.jsxs)("section",{className:"mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center",children:[s.jsx("h2",{className:"text-2xl font-bold text-white",children:"Start monitoring XRPL events"}),s.jsx("p",{className:"mt-3 text-zinc-400",children:"Create your free XRNotify account and receive real-time webhook notifications in minutes."}),s.jsx(i.default,{href:"/signup",className:"mt-6 inline-block rounded-full bg-blue-600 border border-blue-500 px-8 py-3 text-sm font-bold text-white no-underline shadow-md transition-all hover:bg-blue-700 hover:shadow-lg",children:"Get Started Free"})]}),(0,s.jsxs)("section",{className:"mt-16",children:[s.jsx("h2",{className:"mb-6 text-xl font-semibold text-white",children:"Related Articles"}),s.jsx("div",{className:"grid gap-4 sm:grid-cols-2",children:l.map(e=>(0,s.jsxs)(i.default,{href:`/articles/${e.slug}`,className:"group rounded-xl border border-white/5 bg-zinc-900/50 p-5 no-underline transition-all hover:border-emerald-500/30 hover:bg-zinc-900",children:[(0,s.jsxs)("div",{className:"mb-2 flex items-center gap-2",children:[s.jsx("span",{className:"rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400",children:a[e.contentType]??e.contentType}),(0,s.jsxs)("span",{className:"text-xs text-zinc-600",children:[Math.ceil(e.wordCount/200)," min"]})]}),s.jsx("h3",{className:"text-base font-medium text-white transition-colors group-hover:text-emerald-400",children:e.title})]},e.slug))})]})]})]})}},98176:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>i});var s=r(19820);let i=e=>[{type:"image/svg+xml",sizes:"any",url:(0,s.fillMetadataSegment)(".",e.params,"icon.svg")+"?08f2da8e42ada0ba"}]},60530:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n}),r(81299);var s=r(19820);let i={runtime:"edge",alt:"XRNotify — Real-time XRPL Webhook Notifications",size:{width:1200,height:630},contentType:"image/png"};async function n(e){let{__metadata_id__:t,...r}=e.params,n=(0,s.fillMetadataSegment)(".",r,"opengraph-image"),{generateImageMetadata:a}=i;function o(e,t){let r={alt:e.alt,type:e.contentType||"image/png",url:n+(t?"/"+t:"")+"?47293fb50e72780a"},{size:s}=e;return s&&(r.width=s.width,r.height=s.height),r}return a?(await a({params:r})).map((e,t)=>{let r=(e.id||t)+"";return o(e,r)}):[o(i,"")]}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[5584,6876,9820,2676],()=>r(16169));module.exports=s})();