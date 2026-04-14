import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/ArticleLayout';
import { CONTENT_CLUSTER } from '@/lib/schema';

const article = CONTENT_CLUSTER[4]!;

export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: { canonical: `https://www.xrnotify.io/articles/${article.slug}` },
};

export default function WebhookDeliveryReliabilityPage() {
  return (
    <ArticleLayout article={article}>
      <p>
        When your application depends on real-time XRPL events to trigger payments,
        update balances, or execute business logic, a single missed webhook can cascade
        into reconciliation nightmares. XRNotify treats delivery reliability as a
        first-class concern, not an afterthought. Every webhook passes through a
        multi-stage pipeline engineered for durability, observability, and
        correctness. This guide walks through each layer of the XRNotify delivery
        reliability stack so you can build with confidence.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>The Delivery Pipeline</h2>

      <p>
        Understanding the full lifecycle of a webhook delivery helps you reason about
        failure modes and design resilient consumers. Inside XRNotify, every event
        travels through a well-defined pipeline before it reaches your endpoint.
      </p>

      <h3>Event Detection</h3>
      <p>
        XRNotify maintains persistent connections to the XRP Ledger through a pool of
        geographically distributed validator nodes. When a ledger closes or a
        transaction is validated, the platform captures the raw event and normalizes it
        into a canonical payload. This normalized event is stamped with a globally
        unique <code>event_id</code>, a <code>webhook_id</code> linking it to your
        subscription, and a millisecond-precision timestamp.
      </p>

      <h3>Event Processing</h3>
      <p>
        The normalized event is written to a durable event queue. Events are queued per subscription to preserve ordering and ensure reliable delivery.
        Events are persisted before delivery, ensuring zero data loss.
      </p>

      <h3>Delivery Attempt</h3>
      <p>
        The delivery system picks up the event and sends an HTTPS POST to the endpoint URL
        you configured. XRNotify considers a delivery successful when your server
        responds with any <code>2xx</code> status code within the configured timeout
        window (default 15 seconds, configurable up to 30 seconds on paid plans). The
        request includes the JSON payload, an HMAC signature header, and metadata
        headers such as <code>X-XRNotify-Event-Id</code> and{' '}
        <code>X-XRNotify-Attempt</code>.
      </p>

      <h3>Success, Retry, or Dead-Letter</h3>
      <p>
        If the endpoint responds with a <code>2xx</code>, the delivery is marked as
        successful and the event is removed from the active queue. If the request times
        out, the connection is refused, or the server returns a <code>4xx</code> or{' '}
        <code>5xx</code> status, XRNotify schedules a retry according to its exponential
        backoff policy. After all retry attempts are exhausted, the event is moved to a
        dead-letter queue (DLQ) for manual inspection and replay. At no point is an
        event silently dropped.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Retry Strategy</h2>

      <p>
        Transient failures are the norm in distributed systems. DNS hiccups, deployment
        windows, rate-limit responses, and load-balancer drains all cause temporary
        unavailability. XRNotify uses an exponential backoff strategy with jitter to
        maximize the chance of eventual delivery without overwhelming recovering
        endpoints.
      </p>

      <h3>The Retry Schedule</h3>
      <p>
        XRNotify attempts delivery up to <strong>10 times</strong> following the initial
        failed attempt. The base intervals between retries are:
      </p>
      <ol>
        <li><strong>Attempt 2</strong> -- 1 second after the first failure</li>
        <li><strong>Attempt 3</strong> -- 5 seconds</li>
        <li><strong>Attempt 4</strong> -- 30 seconds</li>
        <li><strong>Attempt 5</strong> -- 2 minutes</li>
        <li><strong>Attempt 6</strong> -- 10 minutes</li>
        <li><strong>Attempt 7</strong> -- 30 minutes</li>
        <li><strong>Attempt 8</strong> -- 1 hour</li>
        <li><strong>Attempt 9</strong> -- 3 hours</li>
        <li><strong>Attempt 10</strong> -- 6 hours</li>
        <li><strong>Attempt 11</strong> -- 12 hours</li>
      </ol>
      <p>
        This schedule gives your endpoint approximately <strong>23 hours</strong> of
        total retry runway. Short intervals at the start recover from brief blips
        quickly, while the longer tail accommodates extended outages such as failed
        deployments or cloud-provider incidents.
      </p>

      <h3>Why Jitter Matters</h3>
      <p>
        If XRNotify retried thousands of failed deliveries at exactly the same wall-clock
        second, the resulting traffic spike could re-trigger the very failure it was
        trying to recover from -- a phenomenon called the{' '}
        <strong>thundering herd problem</strong>. To prevent this, XRNotify adds
        randomized jitter to every retry delay. Each retry fires within a window of
        plus or minus 20% of the base interval, spreading the load across time and
        giving downstream services room to recover gracefully. This is a standard
        practice recommended by AWS, Google Cloud, and Stripe for any system that
        performs automated retries.
      </p>

      <h3>Automatic Pausing</h3>
      <p>
        If your endpoint fails consistently across multiple events, XRNotify
        automatically pauses the webhook subscription and notifies you via email. This
        circuit-breaker behavior protects both your infrastructure and XRNotify&apos;s
        the delivery system from wasting resources on an endpoint that is clearly down.
        Once you resolve the underlying issue, you can resume the subscription from the
        dashboard or API, and any events that accumulated during the pause will be
        replayed.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Dead-Letter Queues</h2>

      <p>
        Even with 10 retry attempts spanning nearly a day, some deliveries will
        ultimately fail. Rather than discarding these events, XRNotify routes them to a
        dedicated dead-letter queue (DLQ) tied to your webhook subscription.
      </p>

      <h3>What Lands in the DLQ</h3>
      <p>
        An event enters the DLQ after the final retry attempt (attempt 11) returns a
        non-<code>2xx</code> response or times out. The DLQ entry stores the full
        original payload, the complete retry history (timestamps, status codes, and
        truncated response bodies), and the reason for the final failure. This gives
        you all the context you need to diagnose the root cause without guessing.
      </p>

      <h3>DLQ Retention</h3>
      <p>
        XRNotify retains DLQ events for <strong>30 days</strong> on paid plans and{' '}
        <strong>3 days</strong> on the Developer tier. After the retention window closes,
        events are permanently deleted. If you need longer retention, you can export DLQ
        events via the API or configure a webhook that forwards DLQ notifications to
        your own archival storage.
      </p>

      <h3>Replaying from the DLQ</h3>
      <p>
        You can replay individual events or bulk-replay the entire DLQ contents from
        the XRNotify dashboard or via the REST API. A replay re-enters the event into
        the delivery pipeline as a fresh attempt, giving it a new set of retries. This
        is the recommended workflow after you fix a bug in your consumer or restore a
        downed endpoint.
      </p>
      <pre><code>{`# Replay a single DLQ event
curl -X POST https://api.xrnotify.io/v1/webhooks/{webhook_id}/dlq/{dlq_event_id}/replay \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Bulk replay all DLQ events for a webhook
curl -X POST https://api.xrnotify.io/v1/webhooks/{webhook_id}/dlq/replay-all \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code></pre>

      {/* ------------------------------------------------------------------ */}
      <h2>Idempotency</h2>

      <p>
        In any at-least-once delivery system, your consumer may receive the same event
        more than once. Network timeouts can cause XRNotify to retry a delivery that
        actually succeeded on the server side but whose acknowledgment was lost in
        transit. Designing for idempotency ensures that processing the same event twice
        produces the same result as processing it once.
      </p>

      <h3>Uniqueness Guarantees from XRNotify</h3>
      <p>
        Every delivery carries two identifiers that together form a unique key:{' '}
        <code>webhook_id</code> and <code>event_id</code>. The{' '}
        <code>webhook_id</code> identifies your subscription, and the{' '}
        <code>event_id</code> identifies the specific ledger event. XRNotify guarantees
        that the pair <code>(webhook_id, event_id)</code> is globally unique across all
        deliveries. If you store this composite key in your database before processing,
        you can detect and skip duplicates trivially.
      </p>

      <h3>Source-Level Deduplication</h3>
      <p>
        XRNotify also deduplicates at the source. If a ledger event is observed
        multiple times due to node failover or stream reconnection, the platform
        recognizes the duplicate based on the transaction hash and ledger index and
        suppresses it before it enters the delivery queue. This means your consumer sees
        far fewer duplicates than it would with a naive pub/sub relay, but you should
        still implement idempotent handlers as a defense-in-depth measure.
      </p>

      <h3>Implementing Idempotent Handlers</h3>
      <p>
        The simplest approach is an idempotency table keyed on <code>event_id</code>.
        Before performing any side effects (crediting a balance, sending a notification,
        updating a record), check whether the <code>event_id</code> already exists in
        the table. If it does, return <code>200 OK</code> immediately. If it does not,
        insert the <code>event_id</code>, perform your logic, and commit the
        transaction atomically. This pattern works with any relational database and
        prevents double-processing even under concurrent delivery.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Event Replay</h2>

      <p>
        Beyond DLQ replay, XRNotify supports on-demand event replay for any
        successfully delivered event within the retention window. This feature is
        invaluable for backfilling data, debugging production issues, and recovering
        from application-level failures that have nothing to do with delivery itself.
      </p>

      <h3>Replay via Dashboard and API</h3>
      <p>
        In the XRNotify dashboard, navigate to the delivery log for any webhook and
        select one or more events to replay. Alternatively, use the REST API to trigger
        replay programmatically. You can replay by event ID, by time range, or by
        filtering on event type. Replayed events are delivered with the header{' '}
        <code>X-XRNotify-Replay: true</code> so your consumer can distinguish replays
        from live deliveries if needed.
      </p>

      <h3>Replay Time Window</h3>
      <p>
        XRNotify retains event payloads for <strong>30 days</strong> on paid plans and{' '}
        <strong>3 days</strong> on the free tier. Within this window, any event can be
        replayed regardless of its original delivery status. Events older than the
        retention window are purged and cannot be replayed.
      </p>

      <h3>Common Use Cases</h3>
      <ul>
        <li>
          <strong>Backfilling:</strong> You deploy a new feature that needs historical
          data. Replay the last 7 days of payment events to populate your new tables
          without writing a custom scraper.
        </li>
        <li>
          <strong>Debugging:</strong> A customer reports a missing transaction. Replay
          the specific event against a staging endpoint with verbose logging to trace
          exactly what your handler did.
        </li>
        <li>
          <strong>Disaster recovery:</strong> Your database crashed and the last backup
          is 6 hours old. Replay all events from the last 6 hours to bring your state
          back to current.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>Delivery Logs</h2>

      <p>
        Observability is the foundation of reliability. XRNotify records comprehensive
        delivery logs for every webhook attempt, giving you the data you need to
        diagnose issues without guesswork.
      </p>

      <h3>What Gets Logged</h3>
      <p>
        Each delivery attempt produces a log entry containing the following fields:
      </p>
      <ul>
        <li>
          <strong>Request payload:</strong> The full JSON body sent to your endpoint,
          including all headers.
        </li>
        <li>
          <strong>Response status code:</strong> The HTTP status code returned by your
          server (or a timeout/connection-error indicator if no response was received).
        </li>
        <li>
          <strong>Response body:</strong> The first 1 KB of the response body, which is
          often enough to capture error messages from your application.
        </li>
        <li>
          <strong>Latency:</strong> The time in milliseconds from the start of the TCP
          connection to the receipt of the last response byte. This helps you identify
          slow endpoints before they start timing out.
        </li>
        <li>
          <strong>Attempt number:</strong> Which attempt this was (1 through 11),
          making it easy to see how far through the retry schedule an event progressed.
        </li>
        <li>
          <strong>Retry history:</strong> For events that required multiple attempts,
          the full timeline of all prior attempts with individual timestamps, status
          codes, and latencies.
        </li>
      </ul>

      <h3>Accessing Delivery Logs</h3>
      <p>
        Delivery logs are available in the XRNotify dashboard under each webhook
        subscription. You can filter by status (success, failed, retrying, dead-lettered),
        date range, event type, and response code. For programmatic access, the{' '}
        <code>GET /v1/webhooks/&#123;webhook_id&#125;/deliveries</code> endpoint returns
        paginated delivery log entries with the same fields visible in the dashboard.
        Logs are retained for 30 days on all plans.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>HMAC Signature Verification</h2>

      <p>
        Reliability is not just about getting events to your endpoint -- it is also
        about ensuring that the events are authentic. XRNotify signs every webhook
        payload with HMAC-SHA256, allowing your consumer to verify that the request
        genuinely originated from XRNotify and was not tampered with in transit.
      </p>

      <h3>How Signing Works</h3>
      <p>
        When you create a webhook subscription, XRNotify generates a unique signing
        secret for that subscription. On every delivery, XRNotify computes an
        HMAC-SHA256 hash of the raw request body using this signing secret and includes
        the result in the <code>X-XRNotify-Signature</code> header as a hex-encoded
        string.
      </p>

      <h3>Verification Steps</h3>
      <ol>
        <li>
          Read the raw request body as bytes. Do not parse the JSON first, because
          serialization differences can change the byte representation and invalidate
          the signature.
        </li>
        <li>
          Retrieve your signing secret from a secure location (environment variable,
          secrets manager, etc.).
        </li>
        <li>
          Compute the HMAC-SHA256 hash of the raw body using the signing secret.
        </li>
        <li>
          Compare your computed hash with the value in the{' '}
          <code>X-XRNotify-Signature</code> header using a constant-time comparison
          function to prevent timing attacks.
        </li>
        <li>
          If the hashes match, the payload is authentic. If they do not match, reject
          the request with a <code>401</code> status code.
        </li>
      </ol>

      <h3>Example: Node.js Verification</h3>
      <pre><code>{`import crypto from 'node:crypto';

function verifyXRNotifySignature(
  rawBody: Buffer,
  signatureHeader: string,
  signingSecret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', signingSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signatureHeader, 'hex')
  );
}

// In your Express handler:
// app.post('/webhooks/xrnotify', express.raw({ type: '*/*' }), (req, res) => {
//   const signature = req.headers['x-xrnotify-signature'] as string;
//   if (!verifyXRNotifySignature(req.body, signature, process.env.XRNOTIFY_SECRET!)) {
//     return res.status(401).send('Invalid signature');
//   }
//   // Process the event...
//   res.status(200).send('OK');
// });`}</code></pre>

      <p>
        Always verify signatures in production. Skipping verification exposes your
        endpoint to spoofed events, which could trigger unauthorized balance changes,
        fake transaction alerts, or other dangerous side effects.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>Monitoring Webhook Health</h2>

      <p>
        XRNotify provides a real-time health dashboard for every webhook subscription,
        giving you at-a-glance visibility into delivery performance and early warning
        when things start to degrade.
      </p>

      <h3>Dashboard Metrics</h3>
      <p>
        The webhook health dashboard displays the following key metrics, updated in
        real time:
      </p>
      <ul>
        <li>
          <strong>Success rate:</strong> The percentage of deliveries that succeeded on
          the first attempt over the selected time window (1 hour, 24 hours, 7 days,
          or 30 days). A healthy webhook should maintain a first-attempt success rate
          above 99%.
        </li>
        <li>
          <strong>Latency percentiles:</strong> p50, p95, and p99 response times from
          your endpoint. If your p99 is approaching the timeout window, you should
          optimize your handler or increase the timeout setting before failures begin.
        </li>
        <li>
          <strong>Failure reasons:</strong> A breakdown of failure causes -- connection
          refused, DNS resolution failure, TLS handshake error, timeout, and HTTP error
          codes. This helps you pinpoint whether the problem is on your side, your
          cloud provider, or in between.
        </li>
        <li>
          <strong>Active vs. paused webhooks:</strong> Quick status indicators showing
          which of your webhook subscriptions are actively delivering, which are paused
          due to consecutive failures, and which you have manually paused.
        </li>
        <li>
          <strong>Event throughput:</strong> The number of events processed per minute,
          broken down by event type. Useful for spotting unexpected spikes or drops in
          XRPL activity that might indicate ledger congestion or a change in your
          account filters.
        </li>
      </ul>

      <h3>Alerting on Degraded Delivery</h3>
      <p>
        XRNotify supports configurable alerting thresholds for webhook health. You can
        set alerts that trigger when the first-attempt success rate drops below a
        percentage you define (for example, 95%), when p95 latency exceeds a threshold,
        or when the DLQ depth grows beyond a specified count. Alerts are delivered via
        email by default, with Slack and PagerDuty integrations available on the
        Business plan.
      </p>

      <h3>Proactive Health Checks</h3>
      <p>
        On paid plans, XRNotify can send periodic health-check pings to your endpoint
        even when no real events are pending. These synthetic requests carry a{' '}
        <code>X-XRNotify-Ping: true</code> header and an empty payload. If your
        endpoint fails to respond to three consecutive pings, XRNotify marks the
        subscription as unhealthy and sends you an alert before real events start
        failing. This early warning system lets you fix issues during quiet periods
        rather than discovering them during a surge of ledger activity.
      </p>

      <p>
        XRNotify is built from the ground up to ensure that every XRPL event reaches
        your application. The combination of durable queues, exponential backoff with
        jitter, dead-letter queues, idempotency guarantees, event replay, detailed
        delivery logs, cryptographic signature verification, and real-time health
        monitoring gives you a delivery pipeline you can trust in production. Whether
        you are processing a handful of wallet notifications or millions of ledger
        events per day, XRNotify scales its reliability guarantees to match your
        workload.
      </p>
    </ArticleLayout>
  );
}
