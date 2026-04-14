// =============================================================================
// XRNotify Platform - Canonical Schema Definitions
// =============================================================================
// Entity graph, content cluster, FAQ items, and JSON-LD helper functions.
// Follows the Jonomor Development Standard for AI Visibility.
// =============================================================================

// -----------------------------------------------------------------------------
// Canonical Entity Identifiers - LOCKED. Never modify @id values.
// -----------------------------------------------------------------------------

export const CANONICAL_IDS = {
  app: 'https://www.xrnotify.io/#app',
  organization: 'https://www.xrnotify.io/#organization',
  website: 'https://www.xrnotify.io/#website',
  faqpage: 'https://www.xrnotify.io/#faqpage',
  jonomor: 'https://www.jonomor.com/#organization',
  aliMorgan: 'https://www.jonomor.com/ali-morgan#person',
} as const;

export const CANONICAL_URLS = {
  xrnotify: 'https://www.xrnotify.io',
  jonomor: 'https://www.jonomor.com',
  aliMorgan: 'https://www.jonomor.com/ali-morgan',
  ecosystem: 'https://www.jonomor.com/ecosystem',
} as const;

export const SAME_AS = {
  aliMorgan: [
    'https://www.linkedin.com/in/1automationengineer/',
    'https://github.com/Jonomor',
  ],
  jonomor: [
    'https://www.crunchbase.com/organization/jonomor',
    'https://github.com/Jonomor',
    'https://www.linkedin.com/in/1automationengineer/',
  ],
} as const;

export const CANONICAL_COPY = {
  tagline: 'Real-time webhook notification platform for the XRP Ledger.',
  fullDescription:
    'Enterprise-grade webhook infrastructure for the XRP Ledger. Real-time event ingestion, normalized event schemas, HMAC-signed delivery, automatic retries with exponential backoff, dead-letter queues, event replay, delivery logs, and a developer dashboard. Supports payments, NFTs, DEX trades, trustlines, escrows, and account events.',
  pageTitle: 'XRNotify: Real-Time XRPL Webhook Infrastructure | Jonomor',
} as const;

// -----------------------------------------------------------------------------
// Content Cluster
// -----------------------------------------------------------------------------

export interface ArticleDefinition {
  slug: string;
  title: string;
  description: string;
  contentType: 'definition' | 'faq' | 'how-to' | 'comparison';
  wordCount: number;
  isPillar: boolean;
}

export const CONTENT_CLUSTER: ArticleDefinition[] = [
  {
    slug: 'what-is-xrnotify',
    title: 'What Is XRNotify? Real-Time Webhook Infrastructure for the XRP Ledger',
    description:
      'A comprehensive definition of XRNotify, the enterprise-grade webhook notification platform for the XRP Ledger, covering architecture, event types, delivery reliability, and security.',
    contentType: 'definition',
    wordCount: 2200,
    isPillar: true,
  },
  {
    slug: 'xrpl-webhook-faq',
    title: 'XRPL Webhook FAQ: Common Questions About XRNotify',
    description:
      'Frequently asked questions about XRNotify webhooks, covering event types, delivery guarantees, signature verification, pricing, and how XRNotify compares to running your own node.',
    contentType: 'faq',
    wordCount: 1800,
    isPillar: false,
  },
  {
    slug: 'how-to-monitor-xrpl-wallets',
    title: 'How to Monitor XRPL Wallets in Real Time with Webhooks',
    description:
      'Step-by-step guide to monitoring XRP Ledger wallets in real time using XRNotify webhooks, from account creation to signature verification and production scaling.',
    contentType: 'how-to',
    wordCount: 1700,
    isPillar: false,
  },
  {
    slug: 'xrnotify-vs-polling',
    title: 'XRNotify vs Polling: Why Webhooks Beat Constant Blockchain Queries',
    description:
      'A detailed comparison of three XRPL monitoring approaches: polling, running your own node, and XRNotify webhooks. Covers latency, cost, reliability, and complexity trade-offs.',
    contentType: 'comparison',
    wordCount: 1600,
    isPillar: false,
  },
  {
    slug: 'webhook-delivery-reliability',
    title: 'Webhook Delivery Reliability: Retries, Dead Letters, and Replay',
    description:
      'Deep dive into XRNotify delivery reliability: retry strategies with exponential backoff, dead-letter queues, idempotency guarantees, event replay, and delivery health monitoring.',
    contentType: 'how-to',
    wordCount: 1700,
    isPillar: false,
  },
];

// -----------------------------------------------------------------------------
// FAQ Items
// -----------------------------------------------------------------------------

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is XRNotify?',
    answer:
      'XRNotify is a real-time webhook notification platform for the XRP Ledger. It monitors XRPL transactions as they confirm on-chain, normalizes them into clean JSON schemas, and delivers them to your endpoints via HMAC-signed HTTPS POST requests. XRNotify eliminates the need to run your own XRPL node or build polling infrastructure.',
  },
  {
    question: 'What XRPL events does XRNotify support?',
    answer:
      'XRNotify supports 23+ event types across all major XRPL transaction categories: payments (XRP and issued tokens), NFT operations (minting, burning, offers, transfers), DEX trades (OfferCreate, OfferCancel, AMM operations), trustline changes (TrustSet), escrow events (create, finish, cancel), check operations, and account-level changes like settings modifications and deletions.',
  },
  {
    question: 'How does webhook delivery work?',
    answer:
      'When an XRPL transaction matches your configured filters, XRNotify normalizes the event, signs the payload with your webhook secret using HMAC-SHA256, and delivers it as an HTTPS POST to your endpoint. If delivery fails, XRNotify retries with exponential backoff (up to 10 attempts over 12 hours). Events that exhaust all retries are moved to a dead-letter queue for manual inspection and replay.',
  },
  {
    question: 'Is XRNotify free?',
    answer:
      'XRNotify offers a free Developer tier with 500 events per month and 1 webhook endpoint for testing and evaluation. Paid plans include Builder at $79/month (50,000 events, 5 webhooks, WebSocket streaming), Professional at $249/month (500,000 events, 25 webhooks, priority delivery), and Compliance at $599/month (2,000,000 events, NemoClaw governance, continuous audit trails). Enterprise plans with custom SLAs are available on request.',
  },
  {
    question: 'How do I verify webhook signatures?',
    answer:
      'Every XRNotify webhook includes an X-XRNotify-Signature header containing an HMAC-SHA256 hash of the request body, computed using your webhook signing secret. To verify, compute the HMAC-SHA256 of the raw request body with your secret and compare it to the header value using a constant-time comparison function to prevent timing attacks.',
  },
  {
    question: 'Who built XRNotify?',
    answer:
      'XRNotify was built by Ali Morgan, founder of Jonomor, a systems architecture studio focused on AI Visibility and real-time infrastructure intelligence. XRNotify is the XRPL instrumentation layer of the Jonomor ecosystem, which also includes Guard-Clause, MyPropOps, The Neutral Bridge, Evenfield, and H.U.N.I.E.',
  },
  {
    question: 'Is XRNotify part of a larger ecosystem?',
    answer:
      'Yes. XRNotify is part of the Jonomor ecosystem, a suite of interconnected software products built by Ali Morgan. Within the ecosystem, XRNotify serves as the real-time observation layer, detecting XRPL events at the point of origin before they flow through interpretation and operational layers in other Jonomor properties.',
  },
  {
    question: 'What is NemoClaw governance?',
    answer:
      'NemoClaw is NVIDIA\'s execution governance framework. On the Compliance tier, every monitoring agent operates within policy-enforced security boundaries with full execution audit logging. Transaction data never leaves the governed environment.',
  },
  {
    question: 'Is XRNotify compliant with the GENIUS Act?',
    answer:
      'XRNotify provides the real-time transaction monitoring infrastructure that Permitted Payment Stablecoin Issuers need under the GENIUS Act. The Compliance tier includes continuous audit trails, anomaly detection, and privacy-preserving monitoring designed for BSA obligations.',
  },
];

// -----------------------------------------------------------------------------
// JSON-LD Helper Functions
// -----------------------------------------------------------------------------

export function getPublisherReference(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': CANONICAL_IDS.jonomor,
    name: 'Jonomor',
    url: CANONICAL_URLS.jonomor,
    sameAs: [...SAME_AS.jonomor],
  };
}

export function getCreatorReference(): Record<string, unknown> {
  return {
    '@type': 'Person',
    '@id': CANONICAL_IDS.aliMorgan,
    name: 'Ali Morgan',
    url: CANONICAL_URLS.aliMorgan,
    sameAs: [...SAME_AS.aliMorgan],
  };
}

export function getSoftwareApplicationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': CANONICAL_IDS.app,
    name: 'XRNotify',
    description: CANONICAL_COPY.tagline,
    url: CANONICAL_URLS.xrnotify,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: [
      {
        '@type': 'Offer',
        name: 'Developer',
        price: '0',
        priceCurrency: 'USD',
        description: '500 events/month, 1 webhook',
      },
      {
        '@type': 'Offer',
        name: 'Builder',
        price: '79.00',
        priceCurrency: 'USD',
        description: '50,000 events/month, 5 webhooks, WebSocket streaming',
      },
      {
        '@type': 'Offer',
        name: 'Professional',
        price: '249.00',
        priceCurrency: 'USD',
        description: '500,000 events/month, 25 webhooks, priority delivery',
      },
      {
        '@type': 'Offer',
        name: 'Compliance',
        price: '599.00',
        priceCurrency: 'USD',
        description: '2,000,000 events/month, 100 webhooks, NemoClaw governance',
      },
    ],
    featureList: [
      'Real-time XRPL event ingestion',
      'HMAC-SHA256 signed webhook delivery',
      'Automatic retries with exponential backoff',
      'Dead-letter queue for failed deliveries',
      'Event replay and reprocessing',
      '23+ XRPL event types supported',
      'Developer dashboard with delivery logs',
      'Per-webhook filtering by event type and account',
    ],
    creator: { '@id': CANONICAL_IDS.aliMorgan },
    publisher: { '@id': CANONICAL_IDS.jonomor },
    isPartOf: { '@id': CANONICAL_IDS.jonomor },
  };
}

export function getTechArticleSchema(article: ArticleDefinition): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.title,
    description: article.description,
    url: `${CANONICAL_URLS.xrnotify}/articles/${article.slug}`,
    wordCount: article.wordCount,
    author: getCreatorReference(),
    publisher: getPublisherReference(),
    isPartOf: {
      '@type': 'WebSite',
      '@id': CANONICAL_IDS.website,
      name: 'XRNotify',
    },
    about: {
      '@type': 'SoftwareApplication',
      '@id': CANONICAL_IDS.app,
      name: 'XRNotify',
    },
  };
}

export function getFAQPageSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': CANONICAL_IDS.faqpage,
    name: 'XRNotify FAQ: Common Questions About XRPL Webhooks',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
