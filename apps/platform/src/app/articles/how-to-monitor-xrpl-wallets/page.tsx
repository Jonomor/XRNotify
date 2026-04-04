import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/ArticleLayout';
import { CONTENT_CLUSTER } from '@/lib/schema';

const article = CONTENT_CLUSTER[2]!;

export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: { canonical: `https://www.xrnotify.io/articles/${article.slug}` },
};

export default function HowToMonitorXrplWalletsPage() {
  return (
    <ArticleLayout article={article}>
      <p>
        Monitoring XRP Ledger wallets in real time is essential for exchanges, payment processors,
        NFT marketplaces, and any application that needs to react instantly to on-chain activity.
        Rather than polling the XRPL every few seconds and burning through rate limits, you can use
        XRNotify to push normalized webhook events directly to your server the moment a transaction
        is validated. This guide walks you through the entire process, from creating your XRNotify
        account to scaling a production-grade monitoring pipeline across hundreds of wallets.
      </p>

      <p>
        By the end of this tutorial you will have a fully working webhook integration that receives
        real-time notifications for payments, trust-line changes, escrow activity, and more, all
        verified with HMAC signatures and hardened against delivery failures. Let us get started.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 1: Create an XRNotify Account and Get Your API Key</h2>

      <p>
        Before you can create webhook subscriptions, you need an XRNotify account and an API key.
        Head to{' '}
        <a href="https://www.xrnotify.io/signup" target="_blank" rel="noopener noreferrer">
          xrnotify.io/signup
        </a>{' '}
        and create a free account. XRNotify offers a generous free tier that includes up to 10
        webhook subscriptions and 10,000 deliveries per month, more than enough to get started.
      </p>

      <p>
        Once you have signed in, navigate to <strong>Settings &rarr; API Keys</strong> in the
        XRNotify dashboard. Click <strong>Generate New Key</strong>. You will see your API key
        exactly once, so copy it to a secure location such as a password manager or an environment
        variable in your deployment pipeline. The key is a long, random string that looks like this:
      </p>

      <pre><code className="language-bash">{`xrn_live_k1_9f84a2c...your-secret-key`}</code></pre>

      <p>
        XRNotify also generates a <strong>webhook signing secret</strong> for each subscription you
        create. You will use this secret later to verify that incoming payloads genuinely originated
        from XRNotify and have not been tampered with in transit. Keep both the API key and the
        signing secret confidential; never commit them to version control.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 2: Create a Webhook Subscription with Account Filters</h2>

      <p>
        A webhook subscription tells XRNotify which events you care about and where to deliver them.
        Each subscription includes a <strong>destination URL</strong> (your server endpoint), one or
        more <strong>event types</strong>, and optional <strong>account filters</strong> that narrow
        delivery to specific XRPL addresses.
      </p>

      <p>
        Use the XRNotify REST API to create a subscription. The following <code>curl</code> command
        creates a webhook that fires whenever a <code>payment</code> or{' '}
        <code>trustline_change</code> event touches either of the two specified XRPL wallets:
      </p>

      <pre><code className="language-bash">{`curl -X POST https://api.xrnotify.io/v1/webhooks \\
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
  }'`}</code></pre>

      <p>
        XRNotify responds with a JSON object that contains the subscription ID and your unique
        signing secret. Store the <code>signing_secret</code> securely; you will need it in Step 4
        to verify the HMAC signature on every incoming webhook delivery:
      </p>

      <pre><code className="language-javascript">{`{
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
}`}</code></pre>

      <p>
        You can also create subscriptions through the XRNotify dashboard if you prefer a graphical
        interface. Navigate to <strong>Webhooks &rarr; New Subscription</strong>, fill in the same
        fields, and click <strong>Create</strong>. The dashboard displays the signing secret in a
        one-time modal immediately after creation.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 3: Set Up Your Endpoint to Receive POST Requests</h2>

      <p>
        XRNotify delivers each event as an HTTP <code>POST</code> request to the URL you specified.
        Your endpoint needs to accept JSON bodies and respond with a <code>2xx</code> status code
        within 15 seconds. Any response outside the <code>200-299</code> range, or a timeout, is
        treated as a delivery failure and triggers XRNotify&apos;s automatic retry logic.
      </p>

      <p>
        Here is a minimal Express.js handler that receives XRNotify webhook payloads and
        acknowledges them:
      </p>

      <pre><code className="language-javascript">{`const express = require('express');
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
});`}</code></pre>

      <p>
        A few important considerations for your endpoint. First, always parse the body as raw bytes
        before verifying the signature, then parse it as JSON. If you let a middleware parse the JSON
        first, the re-serialized bytes may differ from the original payload, causing the HMAC check
        to fail. Second, keep your handler fast. Offload heavy processing to a background job queue
        (e.g., BullMQ, SQS, or a database row) and return <code>200</code> immediately. XRNotify
        expects a response within 15 seconds, and spending too long processing in the request cycle
        risks a timeout and unnecessary retries.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 4: Verify the HMAC Signature</h2>

      <p>
        Every webhook delivery from XRNotify includes an{' '}
        <code>X-XRNotify-Signature</code> header containing an HMAC-SHA256 digest of the
        raw request body, signed with your subscription&apos;s signing secret. Verifying this
        signature is critical for security; it proves the payload was sent by XRNotify and has not
        been altered by a man-in-the-middle or replayed by an attacker.
      </p>

      <p>
        The following Node.js function performs constant-time signature verification using the
        built-in <code>crypto</code> module:
      </p>

      <pre><code className="language-javascript">{`const crypto = require('crypto');

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
}`}</code></pre>

      <p>
        Integrate this check into your Express handler from Step 3. If the signature does not match,
        reject the request with a <code>401 Unauthorized</code> response and log the attempt for
        monitoring:
      </p>

      <pre><code className="language-javascript">{`app.post(
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
);`}</code></pre>

      <p>
        Using <code>crypto.timingSafeEqual</code> is important because a naive string comparison
        (<code>===</code>) is vulnerable to timing attacks, where an attacker can deduce your secret
        byte by byte based on how long the comparison takes. XRNotify strongly recommends
        constant-time comparison for all signature checks.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 5: Parse the Normalized Event Payload</h2>

      <p>
        One of XRNotify&apos;s most valuable features is its <strong>normalized event format</strong>.
        Raw XRPL transaction data from <code>rippled</code> is deeply nested and varies significantly
        between transaction types. XRNotify flattens this into a consistent, predictable JSON
        structure so you do not have to write brittle parsing code for every transaction variant.
      </p>

      <p>
        Here is an example of a normalized <code>payment</code> event delivered by XRNotify:
      </p>

      <pre><code className="language-javascript">{`{
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
}`}</code></pre>

      <p>
        Every XRNotify event follows this top-level schema: a unique <code>id</code>, the{' '}
        <code>event_type</code> string, the originating <code>account</code>, the{' '}
        <code>ledger_index</code> and <code>tx_hash</code> for on-chain reference, and a{' '}
        <code>data</code> object whose shape varies by event type. For payments the data includes{' '}
        <code>source</code>, <code>destination</code>, <code>amount</code>, and{' '}
        <code>destination_tag</code>. For trust-line changes it includes <code>currency</code>,{' '}
        <code>issuer</code>, and <code>limit</code>. XRNotify documents every event type in the{' '}
        <a href="https://www.xrnotify.io/docs">API reference</a>.
      </p>

      <p>
        In your processing code, switch on the <code>event_type</code> field to handle each category
        appropriately:
      </p>

      <pre><code className="language-javascript">{`async function processEventAsync(event) {
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
}`}</code></pre>

      <p>
        Because XRNotify normalizes every payload, adding support for a new event type is as simple
        as adding a new <code>case</code> branch. There is no need to dig through raw{' '}
        <code>rippled</code> metadata or handle edge cases like partial payments or amended
        transactions; XRNotify does that for you.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 6: Handle Delivery Failures and Retries</h2>

      <p>
        Network blips happen. Your server might be deploying, a load balancer might timeout, or a
        downstream database might be momentarily unavailable. XRNotify is built for reliability and
        automatically retries failed deliveries using an exponential backoff schedule.
      </p>

      <p>
        A delivery is considered <strong>successful</strong> when your endpoint returns any HTTP
        status code in the <code>200-299</code> range. Anything else, including <code>3xx</code>{' '}
        redirects, <code>4xx</code> client errors, <code>5xx</code> server errors, connection
        timeouts, and DNS failures, triggers the retry sequence. XRNotify retries up to{' '}
        <strong>8 times</strong> with the following approximate schedule:
      </p>

      <table>
        <thead>
          <tr>
            <th>Attempt</th>
            <th>Delay after failure</th>
            <th>Cumulative wait</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1st retry</td>
            <td>10 seconds</td>
            <td>10 seconds</td>
          </tr>
          <tr>
            <td>2nd retry</td>
            <td>30 seconds</td>
            <td>40 seconds</td>
          </tr>
          <tr>
            <td>3rd retry</td>
            <td>2 minutes</td>
            <td>~2.5 minutes</td>
          </tr>
          <tr>
            <td>4th retry</td>
            <td>10 minutes</td>
            <td>~12.5 minutes</td>
          </tr>
          <tr>
            <td>5th retry</td>
            <td>30 minutes</td>
            <td>~42.5 minutes</td>
          </tr>
          <tr>
            <td>6th retry</td>
            <td>1 hour</td>
            <td>~1 hour 42 min</td>
          </tr>
          <tr>
            <td>7th retry</td>
            <td>3 hours</td>
            <td>~4 hours 42 min</td>
          </tr>
          <tr>
            <td>8th retry</td>
            <td>6 hours</td>
            <td>~10 hours 42 min</td>
          </tr>
        </tbody>
      </table>

      <p>
        After all retry attempts are exhausted, XRNotify marks the delivery as{' '}
        <strong>failed</strong> and records it in your delivery log. You can manually replay any
        failed delivery from the XRNotify dashboard, or use the API to trigger a replay
        programmatically.
      </p>

      <p>
        To minimize unnecessary retries, make sure your endpoint is <strong>idempotent</strong>. Use
        the <code>event.id</code> field as a deduplication key. Before processing an event, check
        whether you have already seen that ID. This way, if XRNotify retries a delivery that your
        server actually processed but failed to acknowledge, you will not double-count the
        transaction:
      </p>

      <pre><code className="language-javascript">{`async function handlePayment(event) {
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
}`}</code></pre>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 7: Use the Dashboard to Monitor Delivery Health</h2>

      <p>
        XRNotify provides a comprehensive dashboard that gives you full visibility into your webhook
        pipeline. After your integration is live, check the dashboard regularly to ensure everything
        is running smoothly.
      </p>

      <p>
        The <strong>Delivery Logs</strong> section shows every delivery attempt for each
        subscription. You can filter by status (success, failed, pending retry), event type, and
        time range. Each log entry includes the HTTP status code your endpoint returned, the response
        time in milliseconds, the full request payload, and the response body. This is invaluable
        for debugging integration issues.
      </p>

      <p>
        Key metrics available on the XRNotify dashboard include:
      </p>

      <ul>
        <li>
          <strong>Delivery success rate</strong> — the percentage of deliveries that received a 2xx
          response on the first attempt. A healthy integration should maintain a success rate above
          99%. If you see this number dropping, check your server logs for errors or timeouts.
        </li>
        <li>
          <strong>Average latency</strong> — the time between when XRNotify sends the POST request
          and when your server responds. Keep this under 1 second for best results. If latency
          creeps up, consider offloading processing to a background queue.
        </li>
        <li>
          <strong>Retry rate</strong> — the percentage of deliveries that required at least one
          retry. A rising retry rate is an early warning sign that your endpoint is struggling under
          load or experiencing intermittent failures.
        </li>
        <li>
          <strong>Event volume</strong> — a time-series chart showing the number of events delivered
          per hour. Use this to understand traffic patterns and plan capacity accordingly.
        </li>
      </ul>

      <p>
        XRNotify also supports <strong>email and Slack alerts</strong> for delivery anomalies. You
        can configure alerts to fire when your success rate drops below a threshold or when a
        subscription accumulates too many consecutive failures. Navigate to{' '}
        <strong>Settings &rarr; Alerts</strong> in the XRNotify dashboard to set these up.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Step 8: Scale with Multiple Webhooks</h2>

      <p>
        As your application grows, you will likely need to monitor more wallets and react to more
        event types. XRNotify is designed to scale with you. Here are several patterns for
        structuring your webhook subscriptions at scale.
      </p>

      <h3>Separate Webhooks by Event Type</h3>

      <p>
        Instead of funneling all event types into a single endpoint, create dedicated subscriptions
        for each category. For example, route payment events to a payments microservice and
        trust-line events to a compliance service:
      </p>

      <pre><code className="language-bash">{`# Payment events -> payments service
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
  }'`}</code></pre>

      <p>
        This pattern keeps each service focused and prevents a surge in one event type from creating
        backpressure on unrelated handlers. Each XRNotify subscription has its own retry queue and
        delivery metrics, so a struggling endpoint only affects its own events.
      </p>

      <h3>Partition by Account Set</h3>

      <p>
        If you manage hundreds of XRPL wallets, split them across multiple XRNotify subscriptions
        grouped by business function or risk level. For instance, keep hot-wallet monitoring on a
        high-priority subscription with a fast, dedicated endpoint, while cold-storage wallets go to
        a lower-priority subscription that writes to a batch processing queue.
      </p>

      <h3>Use the XRNotify API to Manage Subscriptions Programmatically</h3>

      <p>
        For dynamic wallet monitoring (for example, when a new user deposits to a unique XRPL
        address), use the XRNotify API to add account filters to an existing subscription or create
        new subscriptions on the fly. The <code>PATCH</code> endpoint lets you update a
        subscription&apos;s account filters without recreating it:
      </p>

      <pre><code className="language-bash">{`curl -X PATCH https://api.xrnotify.io/v1/webhooks/wh_3kTm8vQpZr1x \\
  -H "Authorization: Bearer xrn_live_k1_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "account_filters": [
      "rN7n3473SaZBCG4dFL83w7p1W9cgZw6im3",
      "rLdinLq5CJood9wdjY9ZCdgycK8KGEvkUj",
      "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
    ]
  }'`}</code></pre>

      <p>
        This is particularly useful for exchanges and custodial platforms where new deposit addresses
        are generated frequently. Automate account-filter updates in your onboarding flow so that
        every new wallet is covered by XRNotify within seconds of creation.
      </p>

      <h3>Plan Limits and Upgrades</h3>

      <p>
        The XRNotify free tier supports up to 10 webhook subscriptions and 10,000 deliveries per
        month. If your volume exceeds this, upgrade to the Pro or Enterprise tier for higher limits,
        priority support, and dedicated infrastructure. Visit the{' '}
        <a href="https://www.xrnotify.io/pricing" target="_blank" rel="noopener noreferrer">
          XRNotify pricing page
        </a>{' '}
        for current plan details.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Summary</h2>

      <p>
        You now have a complete, production-ready pipeline for monitoring XRPL wallets in real time
        with XRNotify. To recap the eight steps:
      </p>

      <ol>
        <li>Create an XRNotify account and generate your API key.</li>
        <li>Create a webhook subscription with event types and account filters via the XRNotify API.</li>
        <li>Build an endpoint that accepts POST requests and responds with a 2xx status code quickly.</li>
        <li>Verify every delivery using the HMAC-SHA256 signature in the <code>X-XRNotify-Signature</code> header.</li>
        <li>Parse XRNotify&apos;s normalized event payload and route by event type.</li>
        <li>Handle retries gracefully with idempotent processing keyed on the event ID.</li>
        <li>Monitor delivery health, latency, and success rates in the XRNotify dashboard.</li>
        <li>Scale by splitting webhooks across event types, account sets, and microservices.</li>
      </ol>

      <p>
        XRNotify handles the complex infrastructure of subscribing to XRPL nodes, normalizing
        transaction data, and ensuring reliable delivery so that you can focus on building your
        application logic. Whether you are tracking a single wallet or thousands, XRNotify gives you
        the real-time visibility you need to build responsive, reliable XRPL applications.
      </p>
    </ArticleLayout>
  );
}
