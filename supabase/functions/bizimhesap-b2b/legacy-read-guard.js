// Permanent fail-closed boundary for the legacy B2B adapter.
// All ERP writes must use a separate per-command approved, idempotent path.
// Never revive process_queue or debug_raw through a public API switch.
const ALLOWED_READ_ACTIONS = new Set([
  'products', 'warehouses', 'inventory', 'customers',
  'suppliers', 'abstract', 'supplierabstract'
]);

export function legacyB2BRequestGuard(method, action) {
  if (method !== 'GET') {
    return { allowed: false, status: 405, error: 'READ_ONLY_METHOD_REQUIRED' };
  }
  if (action === 'process_queue' || action === 'debug_raw') {
    return { allowed: false, status: 403, error: 'LEGACY_UNSAFE_ACTION_DISABLED' };
  }
  if (!ALLOWED_READ_ACTIONS.has(action)) {
    return { allowed: false, status: 400, error: 'UNSUPPORTED_READ_ACTION' };
  }
  return { allowed: true };
}

// Vendor IDs are opaque simple identifiers, never arbitrary URL paths/queries.
export function safeVendorId(id) {
  const value = String(id || '');
  return /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : null;
}
