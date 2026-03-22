// =============================================================================
// XRNotify Platform - Database Utilities
// =============================================================================
// Shared helpers for working with database query results
// =============================================================================

/**
 * Parse a DB column that may come back as a JSON string or already-parsed array.
 * Common with JSON/JSONB columns in PostgreSQL when using certain drivers.
 */
export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as string[]; } catch { return []; }
  }
  return [];
}
