'use client';

// =============================================================================
// XRNotify - Checkout Button
// =============================================================================
// Client component that calls the billing checkout API and redirects to Stripe
// =============================================================================

import { useState } from 'react';

interface CheckoutButtonProps {
  plan: 'starter' | 'pro' | 'enterprise';
  label: string;
  className: string;
}

export function CheckoutButton({ plan, label, className }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        // Not logged in — redirect to signup with plan param
        window.location.href = `/signup?plan=${plan}`;
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await res.json() as { url: string };
      window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading ? 'Redirecting...' : label}
    </button>
  );
}
