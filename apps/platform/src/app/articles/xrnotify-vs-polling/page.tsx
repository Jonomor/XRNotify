import type { Metadata } from 'next';
import { ArticleLayout } from '@/components/ArticleLayout';
import { CONTENT_CLUSTER } from '@/lib/schema';

const article = CONTENT_CLUSTER[3]!;

export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: { canonical: `https://www.xrnotify.io/articles/${article.slug}` },
};

export default function XrnotifyVsPollingPage() {
  return (
    <ArticleLayout article={article}>
      <p>
        If you are building on the XRP Ledger, you need to know when things happen on-chain.
        A payment lands in a customer wallet. An escrow finishes. An NFT changes hands. A
        trustline gets authorized. The question is not <em>whether</em> you need this
        information, but <em>how</em> you get it reliably, quickly, and without burning
        engineering hours on infrastructure that has nothing to do with your core product.
      </p>

      <p>
        There are three dominant approaches to monitoring XRPL activity: polling the ledger
        through API calls, running your own XRPL node and subscribing to its event stream, or
        using a managed webhook service like XRNotify. Each approach makes different trade-offs
        across latency, cost, reliability, and engineering complexity. This article breaks down
        all three so you can make an informed decision about which one fits your architecture.
      </p>

      <h2>Approach 1: Polling the XRPL</h2>

      <p>
        Polling is the most common starting point for XRPL integrations. The idea is
        straightforward: your application makes periodic HTTP requests to a public XRPL node
        (or a cluster like the ones provided by Ripple or XRPL Foundation), calls methods such
        as <code>account_tx</code>, <code>ledger</code>, or <code>account_info</code>, and
        compares the latest results against previously seen state to detect new activity.
      </p>

      <h3>How It Works</h3>

      <p>
        A typical polling setup involves a cron job or scheduled task that fires every N
        seconds. Each cycle, you query the ledger for transactions newer than your last known
        marker or ledger index. You parse the response, check for transactions you care about,
        and then update your internal state. If you are monitoring multiple accounts, you repeat
        this for every address, which multiplies the number of API calls linearly.
      </p>

      <h3>Latency</h3>

      <p>
        Polling latency is bounded by your poll interval. If you poll every 30 seconds, your
        worst-case detection latency is 30 seconds, plus the time it takes to execute the API
        call and process the response. In practice, many teams poll every 10 to 60 seconds, so
        event detection latency ranges from seconds to over a minute. XRPL ledgers close
        roughly every 3 to 5 seconds, which means a 30-second polling interval misses 6 to 10
        ledger closings between checks.
      </p>

      <h3>Cost</h3>

      <p>
        Public XRPL nodes enforce rate limits, typically in the range of 5 to 10 requests per
        second for unauthenticated connections. If you are monitoring 100 accounts at a
        10-second interval, that is 10 API calls per second, which already pushes up against or
        exceeds rate limits. Exceeding these limits results in HTTP 429 responses, dropped
        connections, or temporary bans. To work around this, teams often spin up dedicated
        infrastructure or use paid API providers, which shifts the cost from API limits to
        compute and hosting bills.
      </p>

      <h3>Reliability</h3>

      <p>
        Polling introduces several reliability gaps. The most fundamental issue is that events
        can occur between poll cycles and be missed entirely if your state tracking has bugs.
        Race conditions arise when multiple ledgers close between polls and your pagination
        logic does not account for all of them. Network errors during a poll cycle can cause
        gaps in your event history. Deduplication is another concern: if a poll partially
        succeeds and is retried, you may process the same transaction twice unless you maintain
        an idempotency layer.
      </p>

      <h3>Complexity</h3>

      <p>
        A robust polling system requires more engineering than it first appears. You need
        persistent state tracking (last seen ledger index or transaction marker per account),
        deduplication logic, retry handling for failed API calls, rate limit backoff, and
        alerting for when your poller falls behind. For a single account this is manageable, but
        at scale it becomes a distributed systems problem. Teams routinely underestimate the
        effort: what starts as a 50-line script ends up as a 2,000-line service with its own
        database and monitoring.
      </p>

      <h2>Approach 2: Running Your Own XRPL Node</h2>

      <p>
        The second approach is to run a full XRPL node (commonly called <code>rippled</code>)
        and subscribe to its transaction stream via WebSocket. This gives you direct access to
        every validated ledger and every transaction as the node processes them, without relying
        on third-party API endpoints.
      </p>

      <h3>Infrastructure Cost</h3>

      <p>
        Running a <code>rippled</code> node with full history is not trivial. The XRPL full
        history ledger is over 19 TB and growing. A production-grade node requires NVMe SSD
        storage, 32 GB or more of RAM, and high-bandwidth networking. Depending on your hosting
        provider and whether you need redundancy, monthly infrastructure costs range from $500
        to $2,000 or more. Even a non-full-history node (which stores only recent ledgers)
        requires significant resources: 8+ CPU cores, 16 GB RAM, and fast SSD storage that
        grows over time.
      </p>

      <h3>DevOps Burden</h3>

      <p>
        A <code>rippled</code> node is a long-running process that needs ongoing maintenance.
        You are responsible for OS-level security patches, disk monitoring and expansion as the
        ledger grows, network configuration to ensure your node stays synced with the peer
        network, and version upgrades when the XRPL validators adopt new amendments. If your
        node falls out of sync, it can take hours or even days to catch up, during which time
        you have no event stream at all.
      </p>

      <h3>Building the Event Pipeline</h3>

      <p>
        Running a node gives you raw ledger data, but it does not give you a webhook delivery
        system. You still need to build the layer that subscribes to the node WebSocket stream,
        filters transactions by accounts and event types you care about, normalizes the raw
        transaction metadata into a usable schema, queues events for delivery, delivers them to
        your endpoints over HTTPS, handles retries for failed deliveries, and provides
        monitoring and alerting for the entire pipeline. This is a substantial engineering
        project. Teams that go this route typically spend 3 to 6 months building a reliable
        pipeline before it is production-ready, and then they carry the ongoing maintenance
        burden indefinitely.
      </p>

      <h3>When It Makes Sense</h3>

      <p>
        Running your own node is justified when you need maximum control over the data pipeline,
        when regulatory requirements dictate that transaction data cannot pass through
        third-party infrastructure, or when you are building a product that itself is
        infrastructure-level (such as a block explorer or analytics platform). For most
        application developers, the trade-off does not pay off.
      </p>

      <h2>Approach 3: XRNotify Webhooks</h2>

      <p>
        XRNotify is a managed webhook notification platform purpose-built for the XRP Ledger.
        Instead of polling or running your own infrastructure, you register your endpoint URL
        with XRNotify, specify which accounts and event types you want to monitor, and XRNotify
        delivers structured, HMAC-signed webhook payloads to your endpoint in real time as
        transactions confirm on the ledger.
      </p>

      <h3>Sub-Second Delivery</h3>

      <p>
        XRNotify monitors every validated XRPL ledger as it closes. When a transaction matches
        one of your configured filters, XRNotify normalizes the event, signs the payload, and
        delivers it to your endpoint. Typical delivery latency is under one second from ledger
        validation. Compared to polling intervals of 10 to 60 seconds, XRNotify reduces event
        detection latency by one to two orders of magnitude.
      </p>

      <h3>Managed Infrastructure</h3>

      <p>
        With XRNotify, you do not provision servers, manage disk growth, patch operating
        systems, or worry about node synchronization. XRNotify runs its own XRPL
        infrastructure, maintains redundancy, and handles all of the operational complexity
        behind the scenes. Your team focuses on what to do when an event arrives, not on how to
        detect it.
      </p>

      <h3>Normalized Events</h3>

      <p>
        Raw XRPL transaction metadata is deeply nested and varies significantly across
        transaction types. XRNotify normalizes every event into a clean, consistent JSON schema.
        Each payload includes the transaction type, affected accounts, amounts (with currency
        and issuer), ledger index, timestamp, and a unique event ID. This means your webhook
        handler does not need to parse raw <code>meta</code> nodes or handle the dozens of edge
        cases in XRPL transaction serialization.
      </p>

      <h3>Automatic Retries and Delivery Guarantees</h3>

      <p>
        XRNotify retries failed webhook deliveries with exponential backoff. If your endpoint
        returns a non-2xx status code or times out, XRNotify will retry the delivery multiple
        times over a configurable window. Events that exhaust all retries are routed to a
        dead-letter queue where you can inspect and replay them. Every delivery includes an
        HMAC-SHA256 signature so your endpoint can verify that the payload came from XRNotify
        and was not tampered with in transit.
      </p>

      <h3>Cost</h3>

      <p>
        XRNotify offers a free tier for developers getting started and paid plans starting at
        $19 per month for production workloads, scaling to $99 per month for high-volume use
        cases. Compare this to the $500 to $2,000 per month for running your own node, or the
        hidden engineering cost of maintaining a polling system. For most teams, XRNotify is the
        most cost-effective option by a wide margin.
      </p>

      <h3>Setup Time</h3>

      <p>
        Going from zero to receiving your first XRNotify webhook takes minutes, not weeks or
        months. Create an account, add a webhook endpoint, specify the XRPL accounts you want
        to monitor, and you are live. There is no infrastructure to provision, no node to sync,
        and no state management to build.
      </p>

      <h2>Comparison Table</h2>

      <table>
        <thead>
          <tr>
            <th>Criteria</th>
            <th>Polling</th>
            <th>Own XRPL Node</th>
            <th>XRNotify Webhooks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Latency</strong></td>
            <td>10 - 60 seconds</td>
            <td>1 - 3 seconds</td>
            <td>Under 1 second</td>
          </tr>
          <tr>
            <td><strong>Monthly Cost</strong></td>
            <td>$50 - 300 (API / compute)</td>
            <td>$500 - 2,000+</td>
            <td>$0 - 99</td>
          </tr>
          <tr>
            <td><strong>Setup Time</strong></td>
            <td>Days to weeks</td>
            <td>3 - 6 months</td>
            <td>Minutes</td>
          </tr>
          <tr>
            <td><strong>Event Coverage</strong></td>
            <td>Limited by query scope</td>
            <td>Full ledger stream</td>
            <td>23+ event types</td>
          </tr>
          <tr>
            <td><strong>Reliability</strong></td>
            <td>Gaps between polls</td>
            <td>High if maintained</td>
            <td>Retries + dead-letter queue</td>
          </tr>
          <tr>
            <td><strong>Maintenance</strong></td>
            <td>Moderate (state, dedup)</td>
            <td>High (OS, disk, upgrades)</td>
            <td>None</td>
          </tr>
          <tr>
            <td><strong>Delivery Guarantees</strong></td>
            <td>None (pull-based)</td>
            <td>Build your own</td>
            <td>At-least-once with HMAC</td>
          </tr>
        </tbody>
      </table>

      <h2>When Each Approach Makes Sense</h2>

      <p>
        There is no universally correct answer. Each approach has a legitimate place depending
        on your constraints, team size, and product requirements.
      </p>

      <h3>Choose Polling When...</h3>

      <p>
        Polling is reasonable when you are monitoring a small number of accounts (fewer than
        five), your latency requirements are relaxed (minutes are acceptable), and you want to
        avoid adding any external dependencies. A simple polling script running on a cron
        schedule can be adequate for internal tools, personal bots, or low-stakes monitoring
        where missed events are not critical. The key is to keep expectations realistic: polling
        is inherently best-effort, and the engineering cost grows non-linearly as you add more
        accounts or require faster detection.
      </p>

      <h3>Choose Your Own Node When...</h3>

      <p>
        Running your own <code>rippled</code> instance is the right call when you have strict
        data sovereignty requirements, when you need access to the full ledger history for
        analytics or compliance purposes, or when you are building infrastructure that other
        systems depend on (such as a block explorer, indexer, or compliance engine). You should
        have a DevOps team capable of managing the node long-term, and you should budget for
        the multi-month timeline it takes to build and harden the event pipeline that sits on
        top of the raw node stream.
      </p>

      <h3>Choose XRNotify When...</h3>

      <p>
        XRNotify is the best fit for the vast majority of XRPL applications. If you are
        building a wallet, payment processor, NFT marketplace, DeFi protocol, accounting
        integration, or any application that needs to react to on-chain events, XRNotify gives
        you sub-second delivery without the infrastructure overhead. XRNotify handles the hard
        parts of XRPL monitoring: staying synced with the network, parsing transaction metadata,
        normalizing event schemas, managing delivery reliability, and providing cryptographic
        verification. Your team writes a webhook handler; XRNotify does everything else.
      </p>

      <p>
        For teams that started with polling and hit scaling walls, XRNotify is a natural
        migration path. You replace hundreds or thousands of lines of polling, state management,
        and deduplication code with a single webhook endpoint. For teams evaluating whether to
        run their own node, XRNotify eliminates months of infrastructure work and ongoing
        DevOps cost. The $19 to $99 per month XRNotify pricing is a fraction of what it costs
        to run and maintain a reliable XRPL monitoring pipeline in-house.
      </p>

      <h2>Conclusion</h2>

      <p>
        XRPL monitoring is a solved problem, but the solution you choose has long-term
        consequences for your engineering velocity, operational cost, and reliability posture.
        Polling works for simple, low-frequency use cases but breaks down at scale. Running
        your own node gives maximum control but demands significant infrastructure investment
        and ongoing maintenance. XRNotify sits in the middle: production-grade reliability,
        sub-second latency, and zero infrastructure management, at a price point that makes
        sense for startups and enterprises alike.
      </p>

      <p>
        If you are currently polling the XRPL and dealing with missed events, rate limit
        errors, or growing infrastructure complexity, XRNotify is worth evaluating. If you are
        starting a new XRPL integration from scratch, XRNotify lets you skip the months of
        plumbing work and go straight to building your product. The XRP Ledger moves fast. Your
        monitoring infrastructure should too.
      </p>
    </ArticleLayout>
  );
}
