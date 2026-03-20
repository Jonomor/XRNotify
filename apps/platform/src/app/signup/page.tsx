// =============================================================================
// XRNotify Platform - Signup Page
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  acceptTerms: boolean;
}

interface SignupResponse {
  success: boolean;
  error?: string;
  errors?: Record<string, string>;
}

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  return errors;
}

function PasswordStrength({ password }: { password: string }) {
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const strength = metCount === 0 ? 0 : metCount === 4 ? 100 : metCount * 25;
  const strengthColor =
    strength === 0 ? 'bg-zinc-700' :
    strength <= 25 ? 'bg-red-500' :
    strength <= 50 ? 'bg-orange-500' :
    strength <= 75 ? 'bg-yellow-500' :
    'bg-emerald-500';

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: `${strength}%` }} />
        </div>
        <span className="text-xs text-zinc-500 w-14 text-right">
          {strength === 100 ? 'Strong' : strength >= 50 ? 'Medium' : 'Weak'}
        </span>
      </div>
      <ul className="text-xs space-y-1">
        {requirements.map((req) => (
          <li key={req.label} className={`flex items-center gap-1.5 ${req.met ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {req.met ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const inputBase = 'appearance-none block w-full px-3 py-2 rounded-lg border bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition-colors';
const inputNormal = `${inputBase} border-zinc-700`;
const inputError = `${inputBase} border-red-500/70`;

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<SignupFormData>({
    name: '', email: '', password: '', confirmPassword: '', company: '', acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors['name'] = 'Name is required';
    if (!formData.email.trim()) {
      errors['email'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors['email'] = 'Please enter a valid email address';
    }
    if (validatePassword(formData.password).length > 0) errors['password'] = 'Password does not meet requirements';
    if (formData.password !== formData.confirmPassword) errors['confirmPassword'] = 'Passwords do not match';
    if (!formData.acceptTerms) errors['acceptTerms'] = 'You must accept the terms and conditions';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            company: formData.company.trim() || undefined,
          }),
        });

        const data: SignupResponse = await response.json();

        if (!response.ok || !data.success) {
          if (data.errors) setFieldErrors(data.errors);
          else setError(data.error ?? 'Registration failed. Please try again.');
          return;
        }

        router.push('/login?registered=true');
      } catch {
        setError('An error occurred. Please try again.');
      }
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
        <h2 className="mt-6 text-center text-3xl font-bold text-white">Create your account</h2>
        <p className="mt-2 text-center text-sm text-zinc-400">Start receiving XRPL events in minutes</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl py-8 px-6 sm:px-10">
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">Full name</label>
              <input
                id="name" name="name" type="text" autoComplete="name" required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={fieldErrors['name'] ? inputError : inputNormal}
                placeholder="John Doe"
              />
              {fieldErrors['name'] && <p className="mt-1 text-xs text-red-400">{fieldErrors['name']}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={fieldErrors['email'] ? inputError : inputNormal}
                placeholder="you@example.com"
              />
              {fieldErrors['email'] && <p className="mt-1 text-xs text-red-400">{fieldErrors['email']}</p>}
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Company <span className="text-zinc-600 font-normal">(optional)</span>
              </label>
              <input
                id="company" name="company" type="text" autoComplete="organization"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className={inputNormal}
                placeholder="Acme Corp"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password" required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`${fieldErrors['password'] ? inputError : inputNormal} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <PasswordStrength password={formData.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-1.5">Confirm password</label>
              <input
                id="confirmPassword" name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={fieldErrors['confirmPassword'] ? inputError : inputNormal}
                placeholder="••••••••"
              />
              {fieldErrors['confirmPassword'] && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors['confirmPassword']}</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Passwords match
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                id="acceptTerms" name="acceptTerms" type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/40"
              />
              <div className="text-sm">
                <label htmlFor="acceptTerms" className="text-zinc-400">
                  I agree to the{' '}
                  <Link href="/terms" className="text-emerald-400 hover:text-emerald-300 no-underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300 no-underline">Privacy Policy</Link>
                </label>
                {fieldErrors['acceptTerms'] && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors['acceptTerms']}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-sm text-zinc-500">Already have an account?</p>
            <Link
              href="/login"
              className="mt-3 w-full flex justify-center py-2.5 px-4 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 no-underline hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Sign in instead
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-600">
            Start free with 500 events/month.{' '}
            <Link href="/pricing" className="text-emerald-500 hover:text-emerald-400 no-underline">View pricing →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
