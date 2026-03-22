'use client';

import { useState, useTransition } from 'react';

interface TestResult {
  success: boolean;
  status_code: number | null;
  duration_ms: number;
  response_body: string | null;
  error: string | null;
}

export function TestWebhookButton({ webhookId }: { webhookId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TestResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleTest = () => {
    setResult(null);
    setShowResult(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/webhooks/${webhookId}/test`, {
          method: 'POST',
        });
        const json = await res.json() as { data?: TestResult };
        if (json.data) {
          setResult(json.data);
        }
      } catch {
        setResult({ success: false, status_code: null, duration_ms: 0, response_body: null, error: 'Failed to send test' });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTest}
        disabled={isPending}
        className="px-4 py-2 text-sm font-medium rounded-lg border border-emerald-700 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Sending...' : 'Test'}
      </button>

      {showResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60" onClick={() => setShowResult(false)} />
            <div className="relative bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Test Result</h3>
                <button onClick={() => setShowResult(false)} className="text-zinc-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isPending ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : result ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">Success</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">Failed</span>
                    )}
                    {result.status_code && (
                      <span className="text-sm text-zinc-400">HTTP {result.status_code}</span>
                    )}
                    <span className="text-sm text-zinc-500">{result.duration_ms}ms</span>
                  </div>

                  {result.error && (
                    <div className="bg-red-900/20 border border-red-800/40 rounded p-3">
                      <p className="text-sm text-red-300">{result.error}</p>
                    </div>
                  )}

                  {result.response_body && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Response body</p>
                      <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-zinc-400 font-mono overflow-x-auto max-h-40">
                        {result.response_body}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
