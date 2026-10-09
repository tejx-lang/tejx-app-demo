// Enterprise Multi-Vendor Marketplace & Real-Time Financial Analytics Engine
// Strict Architecture: Frontend ONLY calls the TejX Backend (/api/...)
// All operations are processed server-side with MongoDB persistence and atomic isolation.

import {
  MarketplaceProduct,
  SnapshotInvoice,
  FinancialMatrix,
  OutboxEvent,
  StressTestResult,
  BackendHealth,
  DatabaseStatus,
  CatalogFacets,
  AuthProfile,
  CommissionLedgerEntry,
  TopKAnalytics,
  DataTieringStatus,
  RateLimiterTelemetry,
  StaffAccount,
  UserAccount,
  VendorStorefront
} from './types';

// Resolve backend base URL from environment
const BACKEND_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL)
  ? (import.meta.env.VITE_BACKEND_URL as string).replace(/\/+$/, '')
  : '';

export const backendUrl = (path: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return path;
  }
  return BACKEND_BASE ? `${BACKEND_BASE}${path}` : path;
};

// ==========================================
// Token & Session Storage (Asymmetric JWT)
// ==========================================

const TOKEN_KEY = 'tejx_marketplace_auth_token';
const ORIGINAL_TOKEN_KEY = 'tejx_marketplace_original_token';
const AUTH_ROLES = ['guest', 'customer', 'vendor', 'admin'] as const;
type AuthRole = typeof AUTH_ROLES[number];
type AuthResponse = Record<string, unknown>;

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  const normalizedToken = token.trim();
  if (!normalizedToken) return;
  try {
    localStorage.setItem(TOKEN_KEY, normalizedToken);
  } catch (err) {
    console.error('Failed to save token to localStorage', err);
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Failed to clear token', err);
  }
}

export function getOriginalToken(): string | null {
  try {
    return localStorage.getItem(ORIGINAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveOriginalToken(token: string): void {
  try {
    localStorage.setItem(ORIGINAL_TOKEN_KEY, token);
  } catch { /* ignore */ }
}

export function clearOriginalToken(): void {
  try {
    localStorage.removeItem(ORIGINAL_TOKEN_KEY);
  } catch { /* ignore */ }
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && AUTH_ROLES.includes(value as AuthRole);
}

async function readAuthResponse(res: Response): Promise<AuthResponse> {
  const body = await res.text();
  if (!body) return {};
  try {
    return JSON.parse(body) as AuthResponse;
  } catch {
    return { error: `Authentication service returned an invalid response (${res.status})` };
  }
}

function responseError(payload: AuthResponse, fallback: string): string {
  return typeof payload.error === 'string' && payload.error ? payload.error : fallback;
}

function buildAuthProfile(payload: AuthResponse, token: string): AuthProfile | null {
  const role = payload.role;
  const permissions = payload.permissions;
  if (!token || !isAuthRole(role) || !Array.isArray(permissions)) return null;

  return {
    token,
    tokenType: typeof payload.tokenType === 'string' ? payload.tokenType : 'Bearer',
    sub: typeof payload.sub === 'string' ? payload.sub : '',
    username: typeof payload.username === 'string' ? payload.username : '',
    name: typeof payload.name === 'string' ? payload.name : role,
    email: typeof payload.email === 'string' ? payload.email : '',
    role,
    originalRole: (typeof payload.originalRole === 'string' && isAuthRole(payload.originalRole)) ? (payload.originalRole as AuthRole) : role,
    originalSub: typeof payload.originalSub === 'string' ? payload.originalSub : '',
    originalName: typeof payload.originalName === 'string' ? payload.originalName : '',
    vendorId: typeof payload.vendorId === 'string' ? payload.vendorId : '',
    permissions: permissions.filter((permission): permission is string => typeof permission === 'string'),
    keyType: typeof payload.keyType === 'string' ? payload.keyType : 'EdDSA'
  };
}

// ==========================================
// 1. Identity, Security & Access Control (IAM)
// ==========================================

export async function startGuestSession(): Promise<{ success: boolean; data?: AuthProfile; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'guest' })
    });
    const json = await readAuthResponse(res);
    const token = typeof json.token === 'string' ? json.token : '';
    if (!res.ok || !token) {
      return { success: false, error: responseError(json, 'Failed to initialize guest session') };
    }
    const profile = buildAuthProfile(json, token);
    if (!profile) return { success: false, error: 'Authentication service returned an invalid session' };
    setStoredToken(token);
    return { success: true, data: profile };
  } catch (err: any) {
    return { success: false, error: err.message || 'Guest session network error' };
  }
}

export async function loginAs(role: AuthRole, vendorId?: string): Promise<{ success: boolean; data?: AuthProfile; error?: string }> {
  try {
    const currentToken = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    const res = await fetch(backendUrl('/api/auth/login'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ role, vendorId: vendorId || '' })
    });
    const json = await readAuthResponse(res);
    const token = typeof json.token === 'string' ? json.token : '';
    if (!res.ok || !token) {
      return { success: false, error: responseError(json, 'Authentication failed') };
    }
    const profile = buildAuthProfile(json, token);
    if (!profile) return { success: false, error: 'Authentication service returned an invalid session' };
    setStoredToken(token);
    return { success: true, data: profile };
  } catch (err: any) {
    return { success: false, error: err.message || 'Login network error' };
  }
}

export async function loginWithCredentials(username: string, password: string): Promise<{ success: boolean; data?: AuthProfile; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/auth/login'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, password })
    });
    const json = await readAuthResponse(res);
    const token = typeof json.token === 'string' ? json.token : '';
    if (!res.ok || !token) {
      return { success: false, error: responseError(json, 'Invalid credentials') };
    }
    const profile = buildAuthProfile(json, token);
    if (!profile) return { success: false, error: 'Authentication service returned an invalid session' };
    setStoredToken(token);
    return { success: true, data: profile };
  } catch (err: any) {
    return { success: false, error: err.message || 'Login network error' };
  }
}

export async function fetchUserAccounts(): Promise<UserAccount[]> {
  try {
    const res = await fetch(backendUrl('/api/auth/users'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.users || json.data?.users || [];
  } catch {
    return [];
  }
}

export async function createUserAccount(user: {
  username: string;
  password: string;
  name: string;
  email: string;
  role: string;
  vendorId?: string;
  permissions?: string[];
}): Promise<{ success: boolean; data?: UserAccount; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/auth/users'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(user)
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create user' };
    return { success: true, data: json.data || json };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserAccount(
  userId: string,
  user: {
    username?: string;
    name: string;
    email: string;
    role: string;
    vendorId?: string;
    permissions?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(backendUrl(`/api/auth/users/${userId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(user)
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update user' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMyProfile(
  profile: {
    username?: string;
    name?: string;
    email?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/auth/me'), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profile)
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update profile' };
    return { success: true, data: json.data || json };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(backendUrl(`/api/auth/users/${userId}/password`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password: newPassword })
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update password' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteUserAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(backendUrl(`/api/auth/users/${userId}`), {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete user' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAuthMe(): Promise<{ success: boolean; data?: AuthProfile; error?: string }> {
  const token = getStoredToken();
  if (!token) return { success: false, error: 'No stored session token' };
  try {
    const res = await fetch(backendUrl('/api/auth/me'), {
      headers: getAuthHeaders()
    });
    const json = await readAuthResponse(res);
    const profile = res.ok ? buildAuthProfile(json, token) : null;
    if (!profile) return { success: false, error: responseError(json, 'Authentication check failed') };
    return { success: true, data: profile };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function revokeToken(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/auth/logout'), {
      method: 'POST',
      headers: getAuthHeaders()
    });
    clearStoredToken();
    clearOriginalToken();
    const json = await readAuthResponse(res);
    return { success: res.ok, message: typeof json.message === 'string' ? json.message : 'Token revoked', error: responseError(json, 'Unable to revoke token') };
  } catch (err: any) {
    clearStoredToken();
    clearOriginalToken();
    return { success: false, error: err.message };
  }
}

export async function restoreOriginalSession(): Promise<{ success: boolean; data?: AuthProfile; error?: string }> {
  const originalToken = getOriginalToken();
  if (!originalToken) return { success: false, error: 'No original session saved' };
  // Validate the original token still works
  const savedCurrent = getStoredToken();
  try {
    setStoredToken(originalToken);
    const res = await fetch(backendUrl('/api/auth/me'), {
      headers: getAuthHeaders()
    });
    const json = await readAuthResponse(res);
    const profile = res.ok ? buildAuthProfile(json, originalToken) : null;
    if (profile) {
      clearOriginalToken();
      return { success: true, data: profile };
    }
    // Original token is stale — restore what we had
    if (savedCurrent) setStoredToken(savedCurrent);
    clearOriginalToken();
    return { success: false, error: 'Original session has expired. Please sign in again.' };
  } catch (err: any) {
    if (savedCurrent) setStoredToken(savedCurrent);
    return { success: false, error: err.message };
  }
}

export async function fetchStaffAccounts(vendorId: string = ''): Promise<StaffAccount[]> {
  try {
    const res = await fetch(backendUrl(`/api/vendor/staff?vendorId=${vendorId}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.staff || [];
  } catch {
    return [];
  }
}


export async function createStaffAccount(account: {
  vendorId: string;
  name: string;
  email: string;
  permissions: string[];
}): Promise<{ success: boolean; staff?: StaffAccount; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/vendor/staff'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(account)
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error };
    return { success: true, staff: json.data?.staff };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// 2. Polymorphic Product Catalog Engine
// ==========================================

export async function fetchMarketplaceCatalog(params: {
  category?: string;
  search?: string;
  brand?: string;
  flashOnly?: boolean;
} = {}): Promise<{ products: MarketplaceProduct[]; totalCount: number }> {
  try {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.search) q.set('search', params.search);
    if (params.brand) q.set('brand', params.brand);
    if (params.flashOnly) q.set('flashOnly', 'true');

    const res = await fetch(backendUrl(`/api/marketplace/catalog?${q.toString()}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Catalog fetch failed');
    const json = await res.json();
    return json.data || { products: [], totalCount: 0 };
  } catch (err) {
    console.warn('[api] Failed to fetch catalog:', err);
    return { products: [], totalCount: 0 };
  }
}

export async function fetchCatalogFacets(params: {
  category?: string;
  brand?: string;
  search?: string;
} = {}): Promise<CatalogFacets | null> {
  try {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.brand) q.set('brand', params.brand);
    if (params.search) q.set('search', params.search);

    const res = await fetch(backendUrl(`/api/marketplace/facets?${q.toString()}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as CatalogFacets;
  } catch {
    return null;
  }
}

// ==========================================
// 3. High-Concurrency Transaction Engine
// ==========================================

export async function executeAtomicCheckout(payload: {
  items: Array<{ productId: string; sku: string; quantity: number }>;
  idempotencyKey?: string;
  correlationId?: string;
  customerId?: string;
  customerEmail?: string;
}): Promise<{ success: boolean; invoice?: SnapshotInvoice; error?: string }> {
  try {
    const idempKey = payload.idempotencyKey || `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const corrId = payload.correlationId || `corr-${Date.now()}`;

    const headers = getAuthHeaders();
    headers['X-Idempotency-Key'] = idempKey;
    headers['X-Correlation-ID'] = corrId;

    const res = await fetch(backendUrl('/api/marketplace/checkout'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        idempotencyKey: idempKey,
        correlationId: corrId
      })
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Checkout failed' };
    }
    return { success: true, invoice: json.data as SnapshotInvoice };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during checkout' };
  }
}

export async function fetchSnapshotOrders(params?: { vendorId?: string; customerId?: string }): Promise<{ orders: SnapshotInvoice[]; totalCount: number }> {
  try {
    const query = new URLSearchParams();
    if (params?.vendorId) query.set('vendorId', params.vendorId);
    if (params?.customerId) query.set('customerId', params.customerId);
    const qs = query.toString();
    const url = qs ? `/api/marketplace/orders?${qs}` : '/api/marketplace/orders';

    const res = await fetch(backendUrl(url), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return { orders: [], totalCount: 0 };
    const json = await res.json();
    return json.data || { orders: [], totalCount: 0 };
  } catch {
    return { orders: [], totalCount: 0 };
  }
}

export async function saveProduct(product: Partial<MarketplaceProduct>): Promise<{ success: boolean; data?: MarketplaceProduct; error?: string }> {
  try {
    const isEdit = Boolean(product.id);
    const path = isEdit ? `/api/marketplace/products/${product.id}` : '/api/marketplace/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(backendUrl(path), {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(product)
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to save product' };
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(backendUrl(`/api/marketplace/products/${productId}`), {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete product' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateOrderFulfillment(orderId: string, status: string): Promise<{ success: boolean; data?: SnapshotInvoice; error?: string }> {
  try {
    const res = await fetch(backendUrl(`/api/marketplace/orders/${orderId}/fulfillment`), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update order fulfillment' };
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function runConcurrencyStressTest(sku: string = 'SKU-SLM-200W'): Promise<StressTestResult | null> {
  try {
    const res = await fetch(backendUrl(`/api/analytics/stress-test?sku=${sku}`), {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as StressTestResult;
  } catch {
    return null;
  }
}

// ==========================================
// 4. Vendor Inventory & Operational Health
// ==========================================

export async function fetchStorefronts(): Promise<VendorStorefront[]> {
  try {
    const res = await fetch(backendUrl('/api/vendor/storefronts'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.vendors || [];
  } catch {
    return [];
  }
}

export async function createStorefront(storefront: {
  id?: string;
  name: string;
  tier?: string;
}): Promise<{ success: boolean; data?: VendorStorefront; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/vendor/storefronts'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(storefront)
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to create storefront' };
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateStorefront(
  vendorId: string,
  storefront: { name?: string; tier?: string; status?: string; commissionRate?: number; rating?: number }
): Promise<{ success: boolean; data?: VendorStorefront; error?: string }> {
  try {
    const res = await fetch(backendUrl(`/api/vendor/storefronts/${vendorId}`), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(storefront)
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to update storefront' };
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStorefront(vendorId: string, force = false): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(backendUrl(`/api/vendor/storefronts/${vendorId}${force ? '?force=true' : ''}`), {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ force })
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Failed to delete storefront' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchVendorInventory(vendorId?: string): Promise<{
  inventory: any[];
  totalVariants: number;
  lowStockAlertCount: number;
}> {
  try {
    const query = vendorId ? `?vendorId=${vendorId}` : '';
    const res = await fetch(backendUrl(`/api/vendor/inventory${query}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Inventory fetch failed');
    const json = await res.json();
    return json.data || { inventory: [], totalVariants: 0, lowStockAlertCount: 0 };
  } catch {
    return { inventory: [], totalVariants: 0, lowStockAlertCount: 0 };
  }
}

export async function replenishVendorStock(sku: string, addStock: number = 50): Promise<{ success: boolean; stock?: number; error?: string }> {
  try {
    const res = await fetch(backendUrl('/api/vendor/stock'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sku, addStock })
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error };
    return { success: true, stock: json.data?.stock };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchVendorPromotions(): Promise<any[]> {
  try {
    const res = await fetch(backendUrl('/api/vendor/promotions'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.promotions || [];
  } catch {
    return [];
  }
}

export async function fetchVendorMetrics(vendorId?: string): Promise<any> {
  try {
    const query = vendorId ? `?vendorId=${vendorId}` : '';
    const res = await fetch(backendUrl(`/api/vendor/metrics${query}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

// ==========================================
// 5. Real-Time Financial Analytics Matrix
// ==========================================

export async function fetchPlatformFinancialMatrix(period: string = 'daily', vendorId?: string): Promise<FinancialMatrix | null> {
  try {
    const params = new URLSearchParams({ period });
    if (vendorId && vendorId !== 'all') {
      params.set('vendorId', vendorId);
    }
    const res = await fetch(backendUrl(`/api/analytics/financial-matrix?${params.toString()}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as FinancialMatrix;
  } catch {
    return null;
  }
}

export async function fetchCommissionLedger(vendorId?: string, period?: string): Promise<CommissionLedgerEntry[]> {
  try {
    const params = new URLSearchParams();
    if (vendorId && vendorId !== 'all') {
      params.set('vendorId', vendorId);
    }
    if (period) {
      params.set('period', period);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(backendUrl(`/api/analytics/commission-ledger${qs}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const json = await res.json();
    // Backend returns { ledgerEntries: [...] } in data
    return json.data?.ledgerEntries || json.data?.ledger || [];
  } catch {
    return [];
  }
}

export async function fetchTopKAnalytics(k: number = 5, vendorId?: string, period?: string): Promise<TopKAnalytics | null> {
  try {
    const params = new URLSearchParams({ k: String(k) });
    if (vendorId && vendorId !== 'all') {
      params.set('vendorId', vendorId);
    }
    if (period) {
      params.set('period', period);
    }
    const res = await fetch(backendUrl(`/api/analytics/top-k?${params.toString()}`), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as TopKAnalytics;
  } catch {
    return null;
  }
}

export async function fetchDataTiering(): Promise<DataTieringStatus | null> {
  try {
    const res = await fetch(backendUrl('/api/analytics/data-tiering'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as DataTieringStatus;
  } catch {
    return null;
  }
}

export async function archiveColdData(): Promise<{ success: boolean; movedOrdersCount: number; message?: string }> {
  try {
    const res = await fetch(backendUrl('/api/analytics/data-tiering'), {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return {
      success: res.ok,
      movedOrdersCount: json.data?.movedOrdersCount || 0,
      message: json.data?.message
    };
  } catch (err: any) {
    return { success: false, movedOrdersCount: 0, message: err.message };
  }
}

export async function fetchRateLimitTelemetry(): Promise<RateLimiterTelemetry | null> {
  try {
    const res = await fetch(backendUrl('/api/analytics/rate-limits'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as RateLimiterTelemetry;
  } catch {
    return null;
  }
}

// ==========================================
// 6. Distributed Outbox & DevOps Telemetry
// ==========================================

export async function fetchOutboxEvents(): Promise<{ events: OutboxEvent[]; totalCommittedEvents: number; relayerStatus: string }> {
  try {
    const res = await fetch(backendUrl('/api/analytics/outbox'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) return { events: [], totalCommittedEvents: 0, relayerStatus: 'OFFLINE' };
    const json = await res.json();
    return json.data || { events: [], totalCommittedEvents: 0, relayerStatus: 'RUNNING' };
  } catch {
    return { events: [], totalCommittedEvents: 0, relayerStatus: 'OFFLINE' };
  }
}

export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch(backendUrl('/health'));
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch {
    return { success: false, status: 'offline', storageMode: 'in-memory', timestamp: Date.now() };
  }
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const res = await fetch(backendUrl('/api/database/status'), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Status fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return {
      connected: false,
      storageMode: 'mongodb',
      statusMessage: 'Backend database diagnostics unreachable',
      troubleshootingGuide: 'Ensure TejX backend server is running and accessible on 127.0.0.1:8080.',
      collections: []
    };
  }
}

export async function reconnectDatabase(): Promise<any> {
  try {
    const res = await fetch(backendUrl('/api/database/reconnect'), {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: 'Reconnect request failed: ' + String(err) };
  }
}

export async function executeDatabaseOperation(operation: string, collection: string, payload: any): Promise<any> {
  try {
    const res = await fetch(backendUrl('/api/database/operations'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ operation, collection, payload })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
}
