// =============================================================================
// XRNotify Platform - Webhook Form Component
// =============================================================================
// Form for creating and editing webhooks with URL validation and event selection
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EVENT_TYPES } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface WebhookFormData {
  url: string;
  description: string;
  event_types: string[];
  account_filters: string[];
  is_active: boolean;
}

interface WebhookFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<WebhookFormData>;
  webhookId?: string;
}

interface FormResponse {
  success: boolean;
  error?: string;
  errors?: Record<string, string>;
  webhook?: { id: string };
}

// -----------------------------------------------------------------------------
// Event Type Categories
// -----------------------------------------------------------------------------

const EVENT_CATEGORIES = [
  {
    name: 'Payments',
    description: 'XRP and token transfers',
    events: ['payment.xrp', 'payment.issued'],
  },
  {
    name: 'NFTs',
    description: 'Non-fungible token operations',
    events: ['nft.minted', 'nft.burned', 'nft.offer_created', 'nft.offer_accepted', 'nft.offer_cancelled', 'nft.transfer'],
  },
  {
    name: 'DEX',
    description: 'Decentralized exchange activity',
    events: ['dex.offer_created', 'dex.offer_filled', 'dex.offer_partial', 'dex.offer_cancelled'],
  },
  {
    name: 'Trust Lines',
    description: 'Token opt-ins and limits',
    events: ['trustline.created', 'trustline.modified', 'trustline.deleted'],
  },
  {
    name: 'Escrow',
    description: 'Time-locked payments',
    events: ['escrow.created', 'escrow.finished', 'escrow.cancelled'],
  },
  {
    name: 'Checks',
    description: 'Deferred payments',
    events: ['check.created', 'check.cashed', 'check.cancelled'],
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidXrplAddress(address: string): boolean {
  // Basic XRPL address validation (r-address format)
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function WebhookForm({ mode, initialData, webhookId }: WebhookFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<WebhookFormData>({
    url: initialData?.url ?? '',
    description: initialData?.description ?? '',
    event_types: initialData?.event_types ?? [],
    account_filters: initialData?.account_filters ?? [],
    is_active: initialData?.is_active ?? true,
  });

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [newAccount, setNewAccount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(
    (initialData?.account_filters?.length ?? 0) > 0
  );

  // Toggle event type selection
  const toggleEventType = (eventType: string) => {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventType)
        ? prev.event_types.filter(e => e !== eventType)
        : [...prev.event_types, eventType],
    }));
  };

  // Toggle entire category
  const toggleCategory = (events: string[]) => {
    const allSelected = events.every(e => formData.event_types.includes(e));
    
    setFormData(prev => ({
      ...prev,
      event_types: allSelected
        ? prev.event_types.filter(e => !events.includes(e))
        : [...new Set([...prev.event_types, ...events])],
    }));
  };

  // Select all events
  const selectAllEvents = () => {
    const allEvents = EVENT_CATEGORIES.flatMap(c => c.events);
    setFormData(prev => ({
      ...prev,
      event_types: allEvents,
    }));
  };

  // Clear all events
  const clearAllEvents = () => {
    setFormData(prev => ({
      ...prev,
      event_types: [],
    }));
  };

  // Add account filter
  const addAccountFilter = () => {
    const trimmed = newAccount.trim();
    if (!trimmed) return;

    if (!isValidXrplAddress(trimmed)) {
      setFieldErrors(prev => ({ ...prev, account_filters: 'Invalid XRPL address format' }));
      return;
    }

    if (formData.account_filters.includes(trimmed)) {
      setFieldErrors(prev => ({ ...prev, account_filters: 'Address already added' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      account_filters: [...prev.account_filters, trimmed],
    }));
    setNewAccount('');
    setFieldErrors(prev => ({ ...prev, account_filters: '' }));
  };

  // Remove account filter
  const removeAccountFilter = (address: string) => {
    setFormData(prev => ({
      ...prev,
      account_filters: prev.account_filters.filter(a => a !== address),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!formData.url) {
      errors['url'] = 'URL is required';
    } else if (!isValidUrl(formData.url)) {
      errors['url'] = 'Invalid URL format';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const url = mode === 'create'
          ? '/api/v1/webhooks'
          : `/api/v1/webhooks/${webhookId}`;

        const method = mode === 'create' ? 'POST' : 'PATCH';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: formData.url,
            description: formData.description || undefined,
            event_types: formData.event_types.length > 0 ? formData.event_types : undefined,
            account_filters: formData.account_filters.length > 0 ? formData.account_filters : undefined,
            is_active: formData.is_active,
          }),
        });

        const data: FormResponse = await response.json();

        if (!response.ok || !data.success) {
          if (data.errors) {
            setFieldErrors(data.errors);
          } else {
            setError(data.error ?? 'Failed to save webhook');
          }
          return;
        }

        // Redirect to webhook detail or list
        const targetId = data.webhook?.id ?? webhookId;
        router.push(targetId ? `/dashboard/webhooks/${targetId}` : '/dashboard/webhooks');
        router.refresh();
      } catch (err) {
        setError('An error occurred. Please try again.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Endpoint Configuration
        </h3>

        {/* URL */}
        <div className="mb-4">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Webhook URL <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://api.yourapp.com/webhooks/xrnotify"
              className={`block w-full rounded-md shadow-sm sm:text-sm dark:bg-gray-700 dark:text-white ${
                fieldErrors['url']
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
            />
            {fieldErrors['url'] && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors['url']}</p>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            HTTPS required in production. Must be publicly accessible.
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Production payment notifications"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Active toggle */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Enable webhook (receive events immediately)
          </label>
        </div>
      </div>

      {/* Event Types Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Event Types
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select which events trigger this webhook. Leave empty for all events.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={selectAllEvents}
              className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Select all
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearAllEvents}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {EVENT_CATEGORIES.map((category) => {
            const categorySelected = category.events.filter(e => formData.event_types.includes(e)).length;
            const allSelected = categorySelected === category.events.length;

            return (
              <div key={category.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`category-${category.name}`}
                      checked={allSelected}
                      onChange={() => toggleCategory(category.events)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`category-${category.name}`} className="ml-2">
                      <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({categorySelected}/{category.events.length})
                      </span>
                    </label>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{category.description}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                  {category.events.map((event) => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.event_types.includes(event)}
                        onChange={() => toggleEventType(event)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {formData.event_types.length === 0 && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-3">
            ℹ️ No events selected — this webhook will receive <strong>all</strong> event types.
          </p>
        )}
      </div>

      {/* Advanced Options */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Advanced Filters
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Filter events by specific XRPL accounts
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account Filters
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Only receive events involving these XRPL accounts. Leave empty to receive all.
            </p>

            {/* Account input */}
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAccountFilter())}
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white font-mono"
              />
              <button
                type="button"
                onClick={addAccountFilter}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
              >
                Add
              </button>
            </div>
            {fieldErrors['account_filters'] && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">{fieldErrors['account_filters']}</p>
            )}

            {/* Account list */}
            {formData.account_filters.length > 0 ? (
              <div className="space-y-2">
                {formData.account_filters.map((address) => (
                  <div
                    key={address}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded"
                  >
                    <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{address}</code>
                    <button
                      type="button"
                      onClick={() => removeAccountFilter(address)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No account filters — events from all accounts will be delivered.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : mode === 'create' ? (
            'Create Webhook'
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export { WebhookForm };
