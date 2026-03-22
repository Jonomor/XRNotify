'use client';

// =============================================================================
// XRNotify Dashboard - Settings Page
// =============================================================================

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { CheckoutButton } from '@/components/CheckoutButton';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface MeData {
  user: { id: string; name: string | null; email: string };
  tenant: { id: string; name: string; plan: string; is_active: boolean };
  limits: { events_per_month: number; webhook_limit: number };
  usage?: { events_this_month: number; webhooks_active: number };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition-colors';

const cardClass = 'bg-zinc-900/50 border border-zinc-800 rounded-lg p-6';

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-zinc-800 text-zinc-300',
    starter: 'bg-blue-900/50 text-blue-300',
    pro: 'bg-emerald-500/10 text-emerald-400',
    enterprise: 'bg-purple-900/50 text-purple-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${colors[plan] ?? 'bg-zinc-800 text-zinc-300'}`}>
      {plan}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function SettingsPage() {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profilePending, startProfileTransition] = useTransition();

  // Password form
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwPending, startPwTransition] = useTransition();

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    fetch('/api/v1/me?include_usage=true')
      .then((r) => r.json())
      .then((json) => {
        const d = json.data as MeData;
        setData(d);
        setName(d.user.name ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    startProfileTransition(async () => {
      const res = await fetch('/api/v1/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setProfileMsg('Profile updated.');
      } else {
        const json = await res.json() as { error?: { message?: string } };
        setProfileError(json.error?.message ?? 'Failed to update profile.');
      }
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (pwNew !== pwConfirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwNew.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    startPwTransition(async () => {
      const res = await fetch('/api/v1/me?action=change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      if (res.ok) {
        setPwMsg('Password updated successfully.');
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
      } else {
        const json = await res.json() as { error?: { message?: string } };
        setPwError(json.error?.message ?? 'Failed to update password.');
      }
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirm !== 'DELETE') return;
    startDeleteTransition(async () => {
      const res = await fetch('/api/v1/me', { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/login';
      }
    });
  };

  const handleBillingPortal = async () => {
    const res = await fetch('/api/v1/billing/portal', { method: 'POST' });
    if (res.ok) {
      const json = await res.json() as { url: string };
      window.location.href = json.url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const plan = data?.tenant.plan ?? 'free';
  const eventsUsed = data?.usage?.events_this_month ?? 0;
  const eventsLimit = data?.limits.events_per_month ?? 500;
  const webhooksUsed = data?.usage?.webhooks_active ?? 0;
  const webhooksLimit = data?.limits.webhook_limit ?? 1;
  const eventsPercent = Math.min(100, Math.round((eventsUsed / eventsLimit) * 100));

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
            <span>/</span>
            <span className="text-white">Settings</span>
          </nav>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Plan & Usage */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-white mb-4">Plan &amp; Usage</h2>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-zinc-400 text-sm">Current plan:</span>
            <PlanBadge plan={plan} />
          </div>

          {/* Events usage */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-400">Events this month</span>
              <span className="text-zinc-300">{eventsUsed.toLocaleString()} / {eventsLimit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${eventsPercent >= 90 ? 'bg-red-500' : eventsPercent >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                style={{ width: `${eventsPercent}%` }}
              />
            </div>
          </div>

          {/* Webhooks usage */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-400">Active webhooks</span>
              <span className="text-zinc-300">{webhooksUsed} / {webhooksLimit}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, Math.round((webhooksUsed / webhooksLimit) * 100))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {plan === 'free' && (
              <>
                <CheckoutButton plan="starter" label="Upgrade to Starter" className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 transition-all" />
                <CheckoutButton plan="pro" label="Upgrade to Pro" className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 transition-colors" />
              </>
            )}
            {plan !== 'free' && (
              <button
                onClick={handleBillingPortal}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 transition-colors"
              >
                Manage Billing
              </button>
            )}
          </div>
        </section>

        {/* Profile */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
              <input
                type="email"
                value={data?.user.email ?? ''}
                disabled
                className={`${inputClass} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-1 text-xs text-zinc-500">Email cannot be changed. Contact support if needed.</p>
            </div>
            {profileMsg && <p className="text-sm text-emerald-400">{profileMsg}</p>}
            {profileError && <p className="text-sm text-red-400">{profileError}</p>}
            <button
              type="submit"
              disabled={profilePending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
            >
              {profilePending ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Password */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-white mb-4">Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Current password</label>
              <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className={inputClass} autoComplete="current-password" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">New password</label>
              <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className={inputClass} autoComplete="new-password" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Confirm new password</label>
              <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className={inputClass} autoComplete="new-password" required />
            </div>
            {pwMsg && <p className="text-sm text-emerald-400">{pwMsg}</p>}
            {pwError && <p className="text-sm text-red-400">{pwError}</p>}
            <button
              type="submit"
              disabled={pwPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 transition-colors disabled:opacity-60"
            >
              {pwPending ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-950/20 border border-red-900/40 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className={inputClass}
                placeholder="DELETE"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deletePending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-900/40 border border-red-700 text-red-300 hover:bg-red-900/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deletePending ? 'Deleting…' : 'Delete Account'}
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
