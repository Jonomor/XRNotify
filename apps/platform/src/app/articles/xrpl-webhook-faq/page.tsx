import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/ArticleLayout';
import { CONTENT_CLUSTER } from '@/lib/schema';

const article = CONTENT_CLUSTER[1]!;

export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: { canonical: `https://www.xrnotify.io/articles/${article.slug}` },
};

export default function XrplWebhookFaqPage() {
  return (
    <ArticleLayout article={article}>
      <h2>Frequently Asked Questions About XRPL Webhooks and XRNotify</h2>
      <p>
        Whether you are building a wallet tracker, an NFT marketplace, a payment
        processor, or a DeFi dashboard on the XRP Ledger, you need a reliable way
        to know when on-chain events happen. XRNotify provides managed webhook
        infrastructure purpose-built for the XRPL, so you can focus on your
        application logic instead of blockchain plumbing. Below are the twelve
        questions we hear most often from developers evaluating and integrating
        XRNotify.
      </p>

      <h3>1. What is a webhook and how does it work?</h3>
      <p>
        A webhook is a server-to-server HTTP callback. Instead of your application
        repeatedly polling an API to check for new data, the data source pushes an
        HTTP POST request to a URL you control the moment something noteworthy
        occurs. In the context of the XRP Ledger, XRNotify watches validated
        ledger transactions in real time and, when a transaction matches your
        configured filters, immediately delivers a JSON payload to your endpoint.
        Your server receives the request, verifies the signature header to confirm
        it came from XRNotify, processes the payload, and returns a 2xx status
        code to acknowledge receipt. If your server does not acknowledge the
        delivery, XRNotify automatically retries with exponential backoff. This
        push-based model eliminates wasted API calls, reduces latency to
        sub-second levels, and lets you react to on-chain events the instant they
        are confirmed by the XRPL consensus protocol.
      </p>

      <h3>2. What XRPL transaction types does XRNotify support?</h3>
      <p>
        XRNotify supports every transaction type defined by the XRP Ledger
        protocol. This includes the most common types such as{' '}
        <code>Payment</code>, <code>OfferCreate</code>,{' '}
        <code>OfferCancel</code>, <code>TrustSet</code>, and{' '}
        <code>AccountSet</code>, as well as newer and more specialized types like{' '}
        <code>NFTokenMint</code>, <code>NFTokenAcceptOffer</code>,{' '}
        <code>NFTokenCreateOffer</code>, <code>URITokenMint</code>,{' '}
        <code>AMMDeposit</code>, <code>AMMWithdraw</code>,{' '}
        <code>Clawback</code>, and <code>DIDSet</code>. When the XRPL protocol
        adds new transaction types through amendments, XRNotify adds support
        shortly after the amendment activates on mainnet. You can subscribe to all
        transaction types at once or select only the specific types relevant to
        your use case through the XRNotify dashboard or API. Filtering at the
        source means your endpoint only receives the events it cares about,
        reducing noise and processing overhead on your backend.
      </p>

      <h3>3. How fast are XRNotify webhook deliveries?</h3>
      <p>
        XRNotify delivers webhook notifications with a typical end-to-end latency
        of under one second from the moment a transaction is validated on the XRP
        Ledger. The platform maintains persistent connections to multiple XRPL
        nodes and processes each validated ledger as soon as it closes, which
        happens roughly every three to five seconds. Once XRNotify detects a
        matching transaction, it serializes the event payload and dispatches the
        HTTP POST to your endpoint immediately. The actual network transit time
        depends on the geographic distance between the XRNotify delivery
        infrastructure and your server. For endpoints hosted in major cloud
        regions, you can expect delivery latencies in the range of 200 to 800
        milliseconds after ledger validation. XRNotify publishes delivery latency
        metrics on the status page so you can monitor performance. This
        sub-second delivery makes XRNotify suitable for latency-sensitive
        applications like trading bots, real-time portfolio trackers, and instant
        payment confirmations.
      </p>

      <h3>4. What happens if my endpoint is down?</h3>
      <p>
        XRNotify implements an automatic retry mechanism with exponential backoff
        to handle endpoint failures gracefully. When your server returns a non-2xx
        status code, times out, or is unreachable, XRNotify marks the delivery as
        failed and schedules a retry. The retry schedule follows exponential
        backoff intervals: the first retry occurs after approximately 30 seconds,
        then 1 minute, 5 minutes, 30 minutes, and so on, up to a maximum of 24
        hours. XRNotify attempts up to 15 retries per event before marking it as
        permanently failed. All failed deliveries are logged in your XRNotify
        dashboard with the HTTP status code, response body, and timestamp, giving
        you full visibility into what went wrong. If you need to recover events
        beyond the retry window, XRNotify offers an event replay feature that lets
        you re-deliver any event from the past seven days on demand. This
        combination of automatic retries and manual replay ensures you never
        permanently lose an event.
      </p>

      <h3>5. How do I verify that a webhook came from XRNotify?</h3>
      <p>
        Every webhook request sent by XRNotify includes an{' '}
        <code>X-XRNotify-Signature</code> header containing an HMAC-SHA256
        signature computed over the raw request body using your endpoint-specific
        signing secret. To verify authenticity, your server should compute the
        same HMAC-SHA256 hash using the raw body bytes and your signing secret,
        then compare the result to the value in the signature header using a
        timing-safe comparison function. If the values match, you can trust that
        the payload originated from XRNotify and has not been tampered with in
        transit. Your signing secret is generated when you create an endpoint in
        the XRNotify dashboard and can be rotated at any time. XRNotify provides
        verification helper libraries for Node.js, Python, Go, and Ruby, as well
        as code examples for other languages. <strong>Never skip signature
        verification in production</strong>. Without it, an attacker could forge
        webhook payloads and trick your application into processing fabricated
        transactions.
      </p>

      <h3>6. Can I filter events by account address?</h3>
      <p>
        Yes, account-based filtering is one of the core capabilities of XRNotify.
        When you create or update a webhook endpoint, you can specify one or more
        XRPL account addresses to watch. XRNotify will then deliver only
        transactions where at least one of your watched addresses appears as the
        sender, destination, or is otherwise affected by the transaction. You can
        combine account filters with transaction type filters for precise
        targeting. For example, you could watch a specific issuer address for
        only <code>TrustSet</code> transactions, or monitor a hot wallet for{' '}
        <code>Payment</code> events exclusively. Each XRNotify plan supports a
        different number of watched addresses, ranging from 5 on the free tier to
        unlimited on the Enterprise plan. Account filters are evaluated
        server-side inside the XRNotify pipeline, so filtered-out events never
        consume your delivery quota or generate network traffic to your endpoint.
        You can update your account filter list at any time through the dashboard
        or the XRNotify REST API without any downtime.
      </p>

      <h3>7. What is the XRNotify event schema format?</h3>
      <p>
        XRNotify delivers events as JSON objects with a consistent, well-documented
        schema. Every event payload includes the following top-level fields:{' '}
        <code>id</code> (a unique UUID for the event), <code>type</code> (the
        XRPL transaction type such as <code>Payment</code> or{' '}
        <code>NFTokenMint</code>), <code>timestamp</code> (ISO 8601 datetime of
        when XRNotify processed the event), <code>ledger_index</code> (the
        validated ledger sequence number), <code>ledger_hash</code>,{' '}
        <code>tx_hash</code> (the transaction hash on the XRPL), and{' '}
        <code>data</code> (an object containing the full transaction metadata and
        affected nodes). The <code>data</code> field mirrors the structure
        returned by the XRPL <code>tx</code> method, so if you are already
        familiar with the XRPL API, the XRNotify payload will feel natural. The
        schema is versioned via a <code>schema_version</code> field, and XRNotify
        commits to backward-compatible changes within a major version. Full
        JSON Schema definitions and example payloads for every transaction type
        are available in the XRNotify documentation.
      </p>

      <h3>8. How does event replay work in XRNotify?</h3>
      <p>
        Event replay allows you to re-deliver previously sent webhook events to
        your endpoint on demand. XRNotify stores every event for a rolling
        retention window: thirty days on the Professional plan, one year on the
        Compliance plan, and custom retention on Enterprise. You can trigger a replay from the XRNotify dashboard by
        selecting individual events or by specifying a time range and optional
        filters. Replayed events are sent to your current endpoint URL with an
        additional <code>X-XRNotify-Replay: true</code> header so your
        application can distinguish replays from original deliveries if needed.
        This feature is invaluable during disaster recovery, when migrating to a
        new server, or when debugging integration issues. You can also trigger
        replays programmatically through the XRNotify REST API by posting to the{' '}
        <code>/v1/endpoints/&#123;id&#125;/replay</code> route with a time range
        and optional event type filter. Replayed events count toward your monthly
        delivery quota but are not subject to rate limiting, so large batch
        replays complete quickly. XRNotify processes replay requests
        asynchronously and delivers events in chronological order.
      </p>

      <h3>9. What are the rate limits?</h3>
      <p>
        XRNotify enforces rate limits to protect both the platform and your
        endpoint from overload. On the delivery side, XRNotify sends a maximum of
        50 concurrent requests per endpoint. If your server processes webhooks
        slowly, XRNotify queues additional events and delivers them as in-flight
        requests complete, maintaining ordering within each account address. On the
        API side, the XRNotify REST API allows 100 requests per minute for
        endpoint management operations (create, update, delete, list) and 20
        requests per minute for replay operations. These limits apply per API key.
        If you exceed a rate limit, the API returns a <code>429 Too Many
        Requests</code> response with a <code>Retry-After</code> header
        indicating how many seconds to wait. For most integrations, these limits
        are more than sufficient. If your application requires higher throughput,
        for example monitoring thousands of accounts with high transaction
        volume, the XRNotify Enterprise plan offers configurable rate limits and
        dedicated delivery infrastructure tailored to your workload.
      </p>

      <h3>10. How much does XRNotify cost?</h3>
      <p>
        XRNotify offers five tiers designed to scale with your project. The{' '}
        <strong>Developer</strong> tier is free and includes 500 events per
        month, 1 webhook endpoint, and community support, ideal for testing and
        evaluation. <strong>Builder</strong> ($79/month) is for developers
        building on XRPL with 50,000 events, 5 webhooks, WebSocket streaming,
        and event replay. <strong>Professional</strong> ($249/month) is designed
        for production applications with 500,000 events, 25 webhooks, priority
        delivery, and 90-day log retention.{' '}
        <strong>Compliance</strong> ($599/month) adds NemoClaw governance,
        continuous audit trails, anomaly detection, and privacy-preserving
        monitoring for regulated institutions with 2,000,000 events and 100
        webhooks. The <strong>Enterprise</strong> tier includes unlimited
        events, unlimited webhooks, dedicated infrastructure, 99.99% SLA
        guarantees, and a dedicated support engineer. All plans include HMAC
        signature verification, automatic retries with exponential backoff, and
        access to the full range of XRPL transaction types. Pricing details and
        a plan comparison table are available at{' '}
        <strong>xrnotify.io/pricing</strong>. You can upgrade, downgrade, or
        cancel your plan at any time without long-term contracts.
      </p>

      <h3>11. Is XRNotify open source?</h3>
      <p>
        The XRNotify platform itself is source-available. The core webhook
        delivery engine, worker infrastructure, and dashboard are maintained in a
        public GitHub repository under a Business Source License (BSL). This means
        you can read, audit, and learn from the full XRNotify codebase, submit bug
        reports, and contribute fixes. However, hosting a competing managed
        service using the XRNotify code requires a commercial license. In
        addition to the main platform, XRNotify publishes several fully
        open-source libraries under the MIT license: the webhook signature
        verification SDKs for Node.js, Python, Go, and Ruby; a CLI tool for
        testing webhook endpoints locally; and example integration projects
        demonstrating common patterns like payment monitoring and NFT tracking.
        The open-source approach means you are never locked into the XRNotify
        hosted service. You can inspect exactly how signature verification works,
        understand the event schema at the code level, and even self-host the
        platform if your requirements demand it. XRNotify welcomes community
        contributions through GitHub issues and pull requests.
      </p>

      <h3>12. How is XRNotify different from running my own XRPL node?</h3>
      <p>
        Running your own XRPL node gives you direct access to the ledger, but it
        comes with significant operational overhead. A full-history XRPL node
        requires several terabytes of storage, ongoing disk growth management,
        regular <code>rippled</code> upgrades, network peering configuration, and
        monitoring to ensure the node stays synced with the network. You also need
        to build your own transaction filtering logic, delivery queue, retry
        mechanism, and observability layer on top of the raw node subscription
        stream. XRNotify handles all of this for you. The platform maintains
        redundant connections to multiple geographically distributed XRPL nodes,
        processes validated ledgers in real time, applies your configured filters,
        and delivers matching events to your endpoint with automatic retries and
        signature verification. With XRNotify, there is no infrastructure to
        provision, no node software to maintain, and no risk of missed events due
        to node desynchronization. For teams that do run their own node for other
        reasons, XRNotify can still add value as a secondary notification channel
        with independent delivery guarantees and built-in replay capabilities
        that would be complex to replicate from scratch.
      </p>
    </ArticleLayout>
  );
}
