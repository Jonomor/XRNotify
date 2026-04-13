import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/ArticleLayout';
import { CONTENT_CLUSTER } from '@/lib/schema';

const article = CONTENT_CLUSTER[0]!;

export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: { canonical: `https://www.xrnotify.io/articles/${article.slug}` },
};

export default function WhatIsXRNotifyPage() {
  return (
    <ArticleLayout article={article}>
      <h2>What Is XRNotify</h2>

      <p>
        XRNotify is a real-time webhook notification platform purpose-built for
        the XRP Ledger. It monitors on-ledger activity, including payments, NFT
        operations, DEX trades, trust line changes, escrow events, and account
        mutations, and delivers structured webhook payloads to your HTTP
        endpoints within seconds of ledger validation. Instead of writing and
        maintaining your own XRPL monitoring infrastructure, you register the
        accounts and event types you care about, point XRNotify at your server,
        and start receiving push notifications immediately.
      </p>

      <p>
        At its core, XRNotify acts as a translation layer between the raw XRP
        Ledger transaction stream and the event-driven architectures that modern
        applications depend on. The XRP Ledger closes ledgers roughly every 3 to
        5 seconds, each containing anywhere from zero to thousands of
        transactions. XRNotify subscribes to this firehose, filters it against
        your configured account watches and event type filters, normalizes the
        relevant transactions into a consistent JSON schema, and pushes them to
        your endpoints with cryptographic signatures that let you verify
        authenticity on arrival.
      </p>

      <p>
        Whether you are building a custodial wallet that needs to credit user
        deposits the moment they confirm, an NFT marketplace that must update
        ownership records in real time, or a compliance dashboard that logs every
        outbound payment from a regulated account, XRNotify gives you the same
        foundational primitive: a reliable, authenticated, low-latency event
        stream from the XRP Ledger to your application.
      </p>

      <h2>The Problem XRNotify Solves</h2>

      <p>
        Before a platform like XRNotify exists, developers who need real-time
        awareness of XRPL activity face three options, none of them ideal.
      </p>

      <h3>Polling the Ledger</h3>

      <p>
        The simplest approach is to poll a public rippled node on a timer,
        calling <code>account_tx</code> or <code>ledger</code> every few seconds
        and diffing the results against your local state. Polling works for
        prototypes, but it scales poorly. Public nodes enforce rate limits,
        typically between 5 and 20 requests per second per IP. As your monitored
        account list grows, you either hit those limits or introduce latency gaps
        where transactions go undetected for tens of seconds or longer. Polling
        also wastes bandwidth: the vast majority of responses contain no new
        data, yet you still pay the network and CPU cost of every request.
      </p>

      <h3>Running Your Own Node</h3>

      <p>
        The more robust option is to run a dedicated rippled node, subscribe to
        its WebSocket stream, and process transactions in-process. This
        eliminates rate limits and gives you sub-second awareness, but it
        introduces significant operational burden. A rippled full-history node
        requires hundreds of gigabytes of NuDB or RocksDB storage, regular
        software upgrades coordinated with XRPL amendments, and monitoring to
        detect desynchronization. You also need to build your own retry logic,
        handle process crashes gracefully, and implement filtering and
        normalization yourself. For most teams, running a production rippled node
        is a distraction from their core product.
      </p>

      <h3>What XRNotify Provides</h3>

      <p>
        XRNotify eliminates both trade-offs. You get the latency of a direct
        WebSocket subscription, typically under two seconds from ledger close to
        webhook delivery, without operating any XRPL infrastructure yourself.
        XRNotify handles node connectivity, transaction filtering, payload
        normalization, delivery retries, and cryptographic signing. You implement
        a single HTTP endpoint, verify the HMAC signature, and process the
        event. The operational surface you own shrinks from &quot;a distributed
        systems problem&quot; to &quot;a single webhook handler.&quot;
      </p>

      <h2>How XRNotify Works</h2>

      <p>
        Under the hood, XRNotify follows a four-stage pipeline from ledger
        observation to webhook delivery. Understanding this pipeline is useful
        for reasoning about latency, ordering guarantees, and failure modes.
      </p>

      <h3>Stage 1: Listener</h3>

      <p>
        XRNotify maintains persistent WebSocket connections to multiple rippled
        nodes, including both public cluster nodes and dedicated infrastructure
        nodes. These connections subscribe to the <code>transactions</code>{' '}
        stream, which emits every validated transaction as it is included in a
        closed ledger. Running multiple listeners in parallel provides
        redundancy: if one node falls behind or disconnects, others continue to
        emit events. A deduplication layer keyed on transaction hash ensures that
        each transaction is processed exactly once, even when multiple listeners
        report it.
      </p>

      <h3>Stage 2: Normalize</h3>

      <p>
        Raw XRPL transactions are complex objects. A single <code>Payment</code>{' '}
        transaction can include delivered amounts in drops or issued currencies,
        partial payments via the <code>tfPartialPayment</code> flag, path-found
        cross-currency settlements, and metadata describing balance changes
        across multiple trust lines. XRNotify&apos;s normalization layer parses
        the transaction, extracts the fields relevant to each event type, and
        produces a flat, predictable JSON payload. For example, a payment event
        always includes <code>source</code>, <code>destination</code>,{' '}
        <code>delivered_amount</code> (resolved from metadata, not the{' '}
        <code>Amount</code> field, to correctly handle partial payments),{' '}
        <code>currency</code>, <code>issuer</code> (if applicable), and{' '}
        <code>ledger_index</code>. This normalization means your webhook handler
        does not need to reimplement XRPL transaction parsing.
      </p>

      <h3>Stage 3: Queue</h3>

      <p>
        Normalized events enter a durable message queue partitioned by
        destination endpoint. Queuing decouples the ingestion rate from the
        delivery rate, which is critical during ledger close bursts when dozens
        of relevant transactions may arrive within a single second. Each
        message in the queue includes the serialized payload, the target
        endpoint URL, the webhook secret for HMAC computation, and retry
        metadata. Messages are persisted to disk before acknowledgment, so
        events survive process restarts and deployments without loss.
      </p>

      <h3>Stage 4: Deliver</h3>

      <p>
        Delivery workers consume from the queue and issue HTTPS POST requests to
        your configured endpoints. Each request includes an{' '}
        <code>X-XRNotify-Signature</code> header containing an HMAC-SHA256
        digest computed over the raw request body using your webhook secret. The{' '}
        <code>Content-Type</code> is always <code>application/json</code>. The
        worker expects a <code>2xx</code> response within 10 seconds. If your
        endpoint returns a non-2xx status, times out, or is unreachable, the
        event enters the retry cycle described in the next section. XRNotify
        delivers events in the order they were validated on-ledger within a
        single account, but does not guarantee global ordering across accounts.
      </p>

      <h2>Supported Event Types</h2>

      <p>
        XRNotify supports filtering by event type so you only receive the
        transactions relevant to your application. When you create a webhook,
        you specify which event types to subscribe to. If you omit the filter,
        XRNotify delivers all event types for the monitored accounts.
      </p>

      <h3>Payments</h3>

      <p>
        Covers all <code>Payment</code> transactions, including XRP-to-XRP
        transfers, cross-currency payments settled through the DEX or via
        pathfinding, and partial payments. XRNotify resolves the actual delivered
        amount from transaction metadata rather than the <code>Amount</code>{' '}
        field, which is essential for correctly handling partial payments where
        the delivered amount may be less than the stated amount. The normalized
        payload includes the source address, destination address, delivered
        amount, currency code, issuer (for issued currencies), destination tag,
        and the transaction hash for ledger verification.
      </p>

      <h3>NFT Events</h3>

      <p>
        Includes <code>NFTokenMint</code>, <code>NFTokenBurn</code>,{' '}
        <code>NFTokenCreateOffer</code>, <code>NFTokenCancelOffer</code>, and{' '}
        <code>NFTokenAcceptOffer</code> transactions. XRNotify extracts the
        NFToken ID, the relevant offer details (amount, owner, expiration), and
        the final ownership state from metadata. This is particularly useful for
        NFT marketplace backends that need to update listing status and
        ownership records in real time without re-scanning the ledger.
      </p>

      <h3>DEX Events</h3>

      <p>
        Covers <code>OfferCreate</code> and <code>OfferCancel</code>{' '}
        transactions on the XRPL native decentralized exchange. XRNotify
        normalizes the order details, including the taker pays and taker gets
        amounts, the sequence number, and any fills or partial fills that
        occurred at execution time. DEX aggregators and trading bots use these
        events to maintain real-time order book snapshots without polling.
      </p>

      <h3>Trust Line Changes</h3>

      <p>
        Triggers on <code>TrustSet</code> transactions, which establish, modify,
        or remove trust lines between accounts. The payload includes the account
        setting the trust line, the limit amount, the currency code and issuer,
        and quality settings if specified. Issuers of tokens on the XRPL use
        trust line events to track the number and configuration of holders in
        real time.
      </p>

      <h3>Escrow Events</h3>

      <p>
        Covers <code>EscrowCreate</code>, <code>EscrowFinish</code>, and{' '}
        <code>EscrowCancel</code>. XRNotify normalizes the escrow amount, the
        condition and fulfillment (if crypto-conditional), the finish-after and
        cancel-after timestamps, and the source and destination accounts. Payment
        processors that use time-locked or condition-locked escrows rely on these
        events to trigger downstream settlement workflows.
      </p>

      <h3>Account Changes</h3>

      <p>
        Includes <code>AccountSet</code>, <code>AccountDelete</code>,{' '}
        <code>SetRegularKey</code>, and <code>SignerListSet</code> transactions.
        These events notify you when an account modifies its flags (such as
        enabling or disabling rippling, requiring destination tags, or setting
        the default ripple flag), changes its regular key pair, or updates its
        multi-signing configuration. Compliance and audit systems use account
        change events to detect unauthorized configuration modifications.
      </p>

      <h2>Delivery Reliability</h2>

      <p>
        Webhook delivery is inherently unreliable: your server may be
        temporarily down, a deploy may restart your process, or a network
        partition may sever connectivity. XRNotify implements multiple layers of
        delivery assurance to handle these realities.
      </p>

      <h3>Retries with Exponential Backoff</h3>

      <p>
        When a delivery attempt fails, meaning your endpoint returns a
        non-<code>2xx</code> status code, the TCP connection is refused, or the
        request times out after 10 seconds, XRNotify schedules a retry. The
        retry schedule uses exponential backoff with jitter: the first retry
        fires after approximately 30 seconds, the second after roughly 2
        minutes, then 8 minutes, 30 minutes, and so on up to a maximum of 6
        hours between attempts. Each webhook is retried up to 15 times over a
        span of roughly 48 hours before it is considered permanently failed.
        Jitter prevents retry storms when many webhooks fail simultaneously
        during a widespread outage.
      </p>

      <h3>Dead-Letter Queue</h3>

      <p>
        Events that exhaust all retry attempts are moved to a dead-letter queue
        rather than being discarded. The dead-letter queue is accessible through
        the XRNotify dashboard and API. You can inspect failed events, diagnose
        delivery issues, and manually replay individual events or entire batches
        once your endpoint is healthy again. Dead-letter events are retained for
        30 days.
      </p>

      <h3>Event Replay</h3>

      <p>
        XRNotify retains a log of all delivered events for each webhook. If your
        application loses state (for example, due to a database failure), you
        can replay events from a specific ledger index or timestamp forward.
        Replay redelivers the original payloads with the original signatures,
        so your handler can process them identically to the first delivery. To
        support idempotent processing, every XRNotify event includes a unique{' '}
        <code>event_id</code> that remains stable across retries and replays.
      </p>

      <h2>Security</h2>

      <p>
        XRNotify is designed with defense-in-depth security, recognizing that
        webhook endpoints are externally reachable HTTP surfaces that must be
        protected against spoofing, replay, and abuse.
      </p>

      <h3>HMAC-SHA256 Signatures</h3>

      <p>
        Every webhook delivery from XRNotify includes an{' '}
        <code>X-XRNotify-Signature</code> header. This header contains the hex-
        encoded HMAC-SHA256 digest of the raw request body, computed using your
        webhook secret as the key. To verify a delivery, your handler computes
        the same HMAC over the raw body bytes using the shared secret and
        compares the result to the header value using a constant-time comparison
        function. This prevents both payload tampering and request forgery. The{' '}
        <code>X-XRNotify-Timestamp</code> header provides a Unix epoch
        timestamp that you should validate is within a reasonable window (e.g.,
        five minutes) to prevent replay attacks.
      </p>

      <h3>API Key Security</h3>

      <p>
        XRNotify API keys are displayed exactly once at creation time. The
        platform stores only a SHA-256 hash of each key, meaning that even a
        full database compromise does not expose usable credentials. API keys
        support scoped permissions. You can create read-only keys for dashboard
        integrations and write keys for webhook management, and keys can be revoked
        instantly from the dashboard or API.
      </p>

      <h3>SSRF Protection</h3>

      <p>
        When you register a webhook endpoint URL, XRNotify validates that the
        resolved IP address is not in a private or reserved range (RFC 1918,
        RFC 6598, link-local, loopback). This prevents server-side request
        forgery attacks where an attacker could use XRNotify as a proxy to
        probe internal services. DNS resolution is performed at registration time
        and again at delivery time, guarding against DNS rebinding attacks where
        a domain initially resolves to a public IP but is later changed to point
        to an internal address.
      </p>

      <h3>Rate Limiting</h3>

      <p>
        The XRNotify API enforces per-key rate limits to prevent abuse and ensure
        fair resource allocation. Rate limits are expressed as requests per
        minute and vary by plan tier. When you exceed your rate limit, the API
        returns a <code>429 Too Many Requests</code> response with a{' '}
        <code>Retry-After</code> header indicating when you can resume. Webhook
        deliveries are not subject to API rate limits. They are governed by
        your plan&apos;s event volume quota instead.
      </p>

      <h2>Who Uses XRNotify</h2>

      <p>
        XRNotify serves a range of use cases across the XRPL ecosystem. The
        common thread is the need for real-time, reliable awareness of on-ledger
        events without the overhead of operating XRPL infrastructure directly.
      </p>

      <ul>
        <li>
          <strong>Wallet builders</strong> use XRNotify to detect incoming
          deposits and update user balances in real time. Instead of polling for
          new transactions, the wallet backend receives a webhook the moment a
          payment confirms, credits the user&apos;s account, and sends a push
          notification to the mobile app.
        </li>
        <li>
          <strong>NFT platforms</strong> subscribe to NFT event types to track
          mints, burns, offer creation, and sales. When an NFTokenAcceptOffer
          transaction closes on-ledger, XRNotify delivers the event, and the
          platform updates ownership records, triggers royalty distributions, and
          refreshes the marketplace listing, all within seconds.
        </li>
        <li>
          <strong>DEX aggregators</strong> consume OfferCreate and OfferCancel
          events to maintain real-time order book state across the XRPL native
          DEX. XRNotify provides the event stream; the aggregator merges it with
          order book snapshots to present accurate pricing and liquidity data.
        </li>
        <li>
          <strong>Exchanges and custodians</strong> rely on XRNotify for deposit
          detection and withdrawal confirmation. The platform&apos;s delivery
          guarantees (retries, dead-letter queues, and replay) align with the
          reliability requirements of financial infrastructure where missed
          events can result in incorrect balances.
        </li>
        <li>
          <strong>Payment processors</strong> use XRNotify webhooks as the
          trigger for order fulfillment workflows. When a customer sends an XRP
          payment to a merchant address, the processor receives the webhook,
          verifies the HMAC signature, confirms the amount and destination tag,
          and marks the invoice as paid.
        </li>
      </ul>

      <h2>Pricing</h2>

      <p>
        XRNotify offers five plan tiers designed to scale from evaluation to
        institutional workloads.
      </p>

      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>Webhooks</th>
            <th>Events / Month</th>
            <th>Retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Developer</td>
            <td>$0</td>
            <td>1</td>
            <td>500</td>
            <td>3 days</td>
          </tr>
          <tr>
            <td>Builder</td>
            <td>$79/mo</td>
            <td>5</td>
            <td>50,000</td>
            <td>30 days</td>
          </tr>
          <tr>
            <td>Professional</td>
            <td>$249/mo</td>
            <td>25</td>
            <td>500,000</td>
            <td>90 days</td>
          </tr>
          <tr>
            <td>Compliance</td>
            <td>$599/mo</td>
            <td>100</td>
            <td>2,000,000</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Custom</td>
            <td>Unlimited</td>
            <td>Unlimited</td>
            <td>Custom</td>
          </tr>
        </tbody>
      </table>

      <p>
        The Developer tier is intended for testing and evaluation. It includes
        full access to all event types and HMAC signing but limits the number of
        active webhooks and monthly event deliveries. The Builder tier suits
        developers building on XRPL with moderate transaction volumes.
        Professional is designed for production workloads with higher throughput
        requirements and longer event retention for replay and debugging. The
        Compliance tier adds NemoClaw governance, continuous audit trails, and
        anomaly detection for regulated institutions. Enterprise plans include
        dedicated support, custom SLAs, higher rate limits, and volume-based
        pricing negotiated directly with the XRNotify team.
      </p>

      <p>
        All paid plans include priority delivery queues, which means webhook
        deliveries for paid accounts are processed ahead of free-tier traffic
        during load spikes. This is not a throttle on free-tier delivery speed
        under normal conditions. It is a prioritization mechanism that activates
        only when the delivery pipeline is near capacity.
      </p>

      <h2>Who Built XRNotify</h2>

      <p>
        XRNotify was created by{' '}
        <a
          href="https://www.jonomor.com/ali-morgan"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ali Morgan
        </a>
        , a software engineer focused on developer tooling and infrastructure for
        emerging blockchain ecosystems. XRNotify is part of the{' '}
        <a
          href="https://www.jonomor.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Jonomor
        </a>{' '}
        ecosystem, a portfolio of products and services designed to reduce the
        operational complexity of building on decentralized networks.
      </p>

      <p>
        The motivation behind XRNotify came from firsthand experience building
        applications on the XRP Ledger. Monitoring wallets for incoming payments
        required either unreliable polling against public nodes or the
        significant overhead of running and maintaining a dedicated rippled
        instance. Neither option let developers focus on their actual product.
        XRNotify was built to fill that gap: a managed, production-grade webhook
        layer that abstracts away the infrastructure concerns and exposes the
        XRPL transaction stream as a simple, secure, HTTP-based event API.
      </p>

      <p>
        Jonomor&apos;s engineering philosophy emphasizes reliability, clear
        documentation, and developer ergonomics. XRNotify reflects those values
        in its design: deterministic payload schemas that minimize parsing
        surprises, HMAC signatures that follow established webhook security
        conventions, and a retry system that handles transient failures without
        requiring developer intervention. The platform is actively maintained,
        with support for new XRPL transaction types added as amendments are
        enabled on the network.
      </p>
    </ArticleLayout>
  );
}
