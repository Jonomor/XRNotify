'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="relative z-50 border-b border-white/5">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 no-underline">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 opacity-30 blur-sm transition-all group-hover:opacity-60" />
            <Image src="/logo.svg" alt="XRNotify" width={40} height={40} className="relative" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">XRNotify</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-10 md:flex">
          <Link href="#features" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Features</Link>
          <Link href="#events" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Events</Link>
          <Link href="/pricing" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Pricing</Link>
          <Link href="/licensing" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Licensing</Link>
          <Link href="/about" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">About</Link>
          <Link href="/docs" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Docs</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white sm:block">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="group relative hidden overflow-hidden rounded-full bg-blue-600 border border-blue-500 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-md transition-all hover:bg-blue-700 hover:shadow-lg sm:block"
          >
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-[#0a0a0f] px-6 pb-6 md:hidden">
          <div className="flex flex-col gap-4 pt-4">
            <Link href="#features" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Features</Link>
            <Link href="#events" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Events</Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Pricing</Link>
            <Link href="/licensing" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Licensing</Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">About</Link>
            <Link href="/docs" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Docs</Link>
            <div className="mt-2 flex flex-col gap-3 border-t border-white/5 pt-4">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Sign In</Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-blue-600 border border-blue-500 px-5 py-2.5 text-center text-sm font-bold text-white no-underline shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
