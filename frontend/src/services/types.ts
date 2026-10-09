// TypeScript Type Definitions for Multi-Vendor Marketplace & Real-Time Financial Analytics

export interface MarketplaceVariant {
  sku: string;
  name: string;
  optionValues: string;
  price: number;
  stock: number;
  warehouses: Array<{ code: string; stock: number }>;
}

export interface MarketplaceProduct {
  id: string;
  vendorId: string;
  vendorName: string; // Extended Reference Schema
  vendorRating: number;
  title: string;
  category: string;
  brand: string;
  basePrice: number;
  salePrice: number;
  isFlashSale: boolean;
  flashDiscountPercent: number;
  variants: MarketplaceVariant[];
  totalStock: number;
  isListed: boolean;
  rating: number;
  reviewCount: number;
  image: string;
  createdAt: number;
  specifications?: string;
  tags?: string[];
}

export interface CatalogFacets {
  categories: Array<{ name: string; count: number }>;
  brands: Array<{ name: string; count: number }>;
  priceBrackets: Array<{ label: string; count: number }>;
  flashDealsCount: number;
  lowStockAlertsCount: number;
  engine: string;
}

export interface SnapshotInvoiceItem {
  sku: string;
  productId: string;
  title: string;
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  taxAmount: number;
  commissionAmount: number;
  vendorPayout: number;
}

export interface SnapshotInvoice {
  orderId: string;
  idempotencyKey: string;
  correlationId: string;
  customerId: string;
  customerEmail: string;
  items: SnapshotInvoiceItem[];
  grossMerchandiseValue: number;
  taxRate: number;
  totalTax: number;
  platformCommissionRate: number;
  totalPlatformCommission: number;
  paymentProcessingFee: number;
  netVendorPayout: number;
  status: string;
  createdAt: number;
  isIdempotentReplay?: boolean;
  notice?: string;
}

export interface VendorMetric {
  id: string;
  name: string;
  tier: string;
  rating: number;
  commissionRate: number;
  cancellationRate: number;
  activeSkus: number;
  status: string;
}

export interface VendorStorefront {
  id: string;
  name: string;
  tier: string;
  rating?: number;
  commissionRate?: number;
  cancellationRate?: number;
  activeSkus?: number;
  status?: string;
}


export interface StaffAccount {
  id: string;
  vendorId: string;
  name: string;
  email: string;
  permissions: string[];
  createdAt: number;
}

export interface AuthProfile {
  token: string;
  tokenType: string;
  sub: string;
  username?: string;
  name: string;
  email: string;
  role: 'guest' | 'customer' | 'vendor' | 'admin';
  originalRole?: 'guest' | 'customer' | 'vendor' | 'admin';
  originalSub?: string;
  originalName?: string;
  vendorId: string;
  permissions: string[];
  keyType: string;
}

export interface FinancialMatrix {
  trackingPeriod?: string;
  selectedStore?: string;
  grossMerchandiseValue: number;
  platformCommissionRevenue: number;
  paymentGatewayFees: number;
  totalTaxCollected: number;
  netVendorPayoutReserve: number;
  settledTransactionsCount: number;
  totalUnitsSold?: number;
  averageOrderValue: number;
  materializedViewCacheHit?: boolean;
  payoutSchedules: Array<{
    batchId: string;
    vendor: string;
    amount: number;
    status: string;
    escrowPeriodDays: number;
  }>;
  recentInvoices: SnapshotInvoice[];
  compliance: string;
}

export interface CommissionLedgerEntry {
  entryRef: string;
  orderId: string;
  correlationId: string;
  vendorId: string;
  vendorName: string;
  sku: string;
  itemTitle: string;
  grossSubtotal: number;
  platformCommissionCut: number;
  commissionRate: number;
  taxAmount: number;
  netVendorCredit: number;
  settlementStatus: string;
  createdAt: number;
}

export interface TopKAnalytics {
  topProducts: Array<{
    rank: number;
    productId: string;
    title: string;
    category: string;
    unitsSold: number;
    revenue: number;
  }>;
  topCategories: Array<{
    rank: number;
    category: string;
    gmv: number;
    marketSharePercent: number;
  }>;
  k: number;
  aggregationEngine: string;
}

export interface DataTieringStatus {
  hotClusterCount: number;
  coldArchiveCount: number;
  hotClusterRetention: string;
  coldArchiveTier: string;
  storageCostReductionPercent: number;
  complianceRequirement: string;
}

export interface RateLimiterTelemetry {
  algorithm: string;
  bucketCapacity: number;
  refillRatePerSecond: number;
  currentAvailableTokens: number;
  checkoutCost: string;
  analyticsDownloadCost: string;
  totalThrottledRequests: number;
  status: string;
}

export interface OutboxEvent {
  id: string;
  correlationId: string;
  eventType: string;
  payload: string;
  status: string;
  timestamp: number;
}

export interface StressTestResult {
  sku: string;
  totalSimulatedRequests: number;
  initialStock: number;
  finalStock: number;
  committedOrdersCount: number;
  rejectedOverdraftCount: number;
  zeroOverdraftGuaranteed: boolean;
  concurrencyMechanism: string;
}

export interface BackendHealth {
  success: boolean;
  status: string;
  storageMode: string;
  timestamp: number;
}

export interface DatabaseStatus {
  connected: boolean;
  storageMode: string;
  statusMessage: string;
  troubleshootingGuide: string;
  collections: any[];
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'vendor' | 'customer' | 'guest';
  vendorId?: string;
  permissions: string[];
  createdAt: number;
}
