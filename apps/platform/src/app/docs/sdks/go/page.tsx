import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Go SDK - XRNotify Docs',
  description: 'XRNotify Go SDK reference. Installation, webhook management, signature verification, and struct types.',
};

export default function GoSdkPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/docs" className="text-zinc-500 hover:text-zinc-300 no-underline">Docs</Link>
            <span className="text-zinc-600">/</span>
            <Link href="/docs#sdks" className="text-zinc-500 hover:text-zinc-300 no-underline">SDKs</Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Go</span>
          </div>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm no-underline">Dashboard →</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-4">
            SDKs &amp; Libraries
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Go SDK</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            The official XRNotify Go SDK provides an idiomatic, context-aware client for managing webhooks, querying deliveries, and verifying signatures. Requires Go 1.21 or later. All methods accept a <code className="font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-base">context.Context</code> for cancellation and deadline propagation.
          </p>
        </div>

        {/* Installation */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Installation</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`go get github.com/xrnotify/xrnotify-go`}</pre>
          </div>
        </section>

        {/* Client setup */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Client setup</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Create a client with your API key. The client is safe for concurrent use across goroutines.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`package main

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
}`}</pre>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-emerald-300 text-sm">
              <span className="font-semibold">Thread safety:</span> A single <code className="font-mono text-emerald-200 bg-emerald-500/10 px-1 rounded">*xrnotify.Client</code> can be shared across goroutines. Create one at startup and reuse it throughout the lifetime of your application.
            </p>
          </div>
        </section>

        {/* Creating a webhook */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Creating a webhook</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Register a webhook endpoint. The returned struct includes <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">Secret</code> — this field is only populated on the creation response.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`webhook, err := client.Webhooks.Create(ctx, &xrnotify.CreateWebhookParams{
    URL:            "https://yourapp.com/webhooks/xrpl",
    EventTypes:     []string{"payment.xrp", "nft.minted"},
    AccountFilters: []string{"rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"},
    Description:    "Payment processor",
})
if err != nil {
    log.Fatalf("create webhook: %v", err)
}

fmt.Println("ID:", webhook.ID)
fmt.Println("Secret:", webhook.Secret) // Store immediately — only available once`}</pre>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Important:</span> <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">webhook.Secret</code> is only set in the creation response. Subsequent fetches of the same webhook will return an empty string for this field.
            </p>
          </div>
        </section>

        {/* Listing and managing */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Listing and managing webhooks</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            List, update, and delete webhooks. The list method returns a paginated result; use <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">result.HasMore</code> and <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">StartingAfter</code> to page through results.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`// List webhooks
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
err = client.Webhooks.Delete(ctx, "wh_abc123")`}</pre>
          </div>
        </section>

        {/* Listing deliveries */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Listing deliveries</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`import "time"

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
}`}</pre>
          </div>
        </section>

        {/* Signature verification */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Verifying signatures</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            Use the <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">verify</code> sub-package to validate incoming webhook requests. The function uses <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">hmac.Equal</code> for constant-time comparison.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto mb-4">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`package main

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
}`}</pre>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">Raw body required:</span> Read the body with <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">io.ReadAll</code> before calling <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">verify.Signature</code>. Do not use a JSON decoder directly on <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">r.Body</code> before verification.
            </p>
          </div>
        </section>

        {/* Struct types */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-3">Struct types</h2>
          <p className="text-zinc-400 mb-4 leading-relaxed">
            The SDK provides typed structs for all event envelopes and payloads. The <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">Payload</code> field is a <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">json.RawMessage</code> so you can unmarshal it into the appropriate typed struct based on <code className="font-mono text-zinc-300 bg-zinc-800 px-1 rounded">EventType</code>.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">{`// Event envelope — same structure for all event types
type Event struct {
    EventID     string          `+"`"+`json:"event_id"`+"`"+`
    EventType   string          `+"`"+`json:"event_type"`+"`"+`
    LedgerIndex int64           `+"`"+`json:"ledger_index"`+"`"+`
    Timestamp   time.Time       `+"`"+`json:"timestamp"`+"`"+`
    Network     string          `+"`"+`json:"network"`+"`"+`
    WebhookID   string          `+"`"+`json:"webhook_id"`+"`"+`
    Payload     json.RawMessage `+"`"+`json:"payload"`+"`"+`
}

// Typed payload structs
type PaymentXrpPayload struct {
    Sender         string  `+"`"+`json:"sender"`+"`"+`
    Receiver       string  `+"`"+`json:"receiver"`+"`"+`
    Amount         string  `+"`"+`json:"amount"`+"`"+`
    AmountXRP      string  `+"`"+`json:"amount_xrp"`+"`"+`
    Fee            string  `+"`"+`json:"fee"`+"`"+`
    DeliveredAmount string `+"`"+`json:"delivered_amount"`+"`"+`
    DestinationTag *int64  `+"`"+`json:"destination_tag"`+"`"+`
    SourceTag      *int64  `+"`"+`json:"source_tag"`+"`"+`
    TxHash         string  `+"`"+`json:"tx_hash"`+"`"+`
    LedgerIndex    int64   `+"`"+`json:"ledger_index"`+"`"+`
    Sequence       int64   `+"`"+`json:"sequence"`+"`"+`
}`}</pre>
          </div>
        </section>

        {/* Next steps */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/docs/sdks/nodejs" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Node.js SDK</p>
              <p className="text-zinc-500 text-sm">npm install @xrnotify/sdk</p>
            </Link>
            <Link href="/docs/sdks/python" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Python SDK</p>
              <p className="text-zinc-500 text-sm">pip install xrnotify</p>
            </Link>
            <Link href="/docs/sdks/signature-helpers" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-4 no-underline transition-colors">
              <p className="text-white font-medium mb-1">Signature Helpers</p>
              <p className="text-zinc-500 text-sm">Copy-paste verification for any language</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
