'use client';

// =============================================================================
// XRNotify - Forgot Password Page
// =============================================================================

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const inputClass =
  'appearance-none block w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition-colors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    startTransition(async () => {
      try {
        await fetch('/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
      } catch {
        // Ignore errors - always show success to prevent enumeration
      }
      setSubmitted(true);
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <Image src="/logo.svg" alt="XRNotify" width={40} height={40} />
            <span className="text-2xl font-bold text-white">XRNotify</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-white">Reset your password</h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl py-8 px-6 sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
              <p className="text-white font-medium">Check your inbox</p>
              <p className="text-sm text-zinc-400">
                If an account exists with <span className="text-zinc-300">{email}</span>, you&apos;ll receive a password reset link shortly.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-sm text-emerald-400 hover:text-emerald-300 transition-colors no-underline"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !email.trim()}
                className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? 'Sending…' : 'Send reset link'}
              </button>

              <p className="text-center text-sm text-zinc-500">
                Remember your password?{' '}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors no-underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
