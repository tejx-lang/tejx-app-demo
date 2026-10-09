# TejX Enterprise Multi-Vendor Marketplace & Real-Time Financial Analytics Backend

High-performance native REST backend compiled directly from TejX into native machine code, featuring direct MongoDB wire-protocol integration (`mongo-sdk`), cryptographic JWT authentication, strict role-based access control (RBAC), multi-tenant isolation, and zero-overdraft atomic inventory transactions.

---

## 🏛 The 5 Production Pillars

### 🔑 1. Identity, Security & Access Control (IAM)
- **Cryptographic JWT Authentication**: Verifies request tokens statelessly via `Authorization: Bearer <token>`, extracting authenticated claims (`sub`, `role`, `vendorId`, `email`) without repetitive database roundtrips.
- **Strict 4-Tier Role-Based Access Control (RBAC)**:
  - `admin`: Platform Super-Admin. Full control over user management, financial commission ledgers, top-k analytics, and database operations.
  - `vendor`: Storefront operator. Managing warehouse inventory, SKU stock replenishment, and viewing fulfillment orders containing their items.
  - `customer`: Marketplace shopper. Browsing public catalog, atomic checkout, and viewing personal purchase order history.
  - `guest`: Read-only anonymous access to catalog, categories, and faceted search.
- **Admin-Gated User Management**: All IAM routes (`GET /api/auth/users`, `POST /api/auth/users`, `PUT /api/auth/users/:id`, `DELETE /api/auth/users/:id`, `POST /api/auth/users/:id/password`) strictly verify `isAdmin(claims)` and reject unauthorized requests with `403 Forbidden`.
- **Tenant & Identity Isolation**:
  - Marketplace "My Orders" scopes strictly to the signed-in user (`customerId == claims.sub || customerEmail == claims.email`), preventing vendors or customers from seeing each other's purchases.
  - Storefront fulfillment orders (`?vendorId=...`) are partitioned so vendors can only inspect orders containing items from their assigned storefront.
- **Token Blacklist Cache**: Supports immediate session revocation and logout with in-memory and persistent blacklist verification.
- **Zero Hardcoded Bypasses**: All credentials and permissions are validated against live accounts without mock backdoor fallbacks.

### 🛍 2. Polymorphic Product Catalog Engine
- **Polymorphic Variant Architecture**: Variant combinations (SKU, title, options, price, stock, multi-warehouse distribution) embedded directly in product models.
- **Dynamic Category Specifications**: Extensible JSON specifications tailored to specific categories (e.g., power ratings, materials, dimensions).
- **Faceted Aggregation Pipeline**: Dynamic real-time calculation of remaining items across categories, brands, and price tiers ($0-$100, $100-$300, $300-$600, $600+).
- **Automated Stock Threshold Warnings**: Background alerts trigger whenever SKU quantities fall below the safety threshold (< 10 units).

### 🛒 3. High-Concurrency Transaction Engine
- **Multi-Vendor Cart Processing**: Carts containing items from distinct independent vendors are checked out in a single atomic operation.
- **Zero-Overdraft Concurrency Protection**: Pre-flight atomic stock checks verify every SKU across all vendors before stock is committed. If any variant's available inventory is insufficient, the checkout halts immediately with `409 Conflict` and logs an `ORDER_REJECTED_OVERDRAFT` event. Stock never dips below zero.
- **API Idempotency Guarantee**: Requests sending `X-Idempotency-Key` or `Idempotency-Key` return the existing order snapshot on duplicates, preventing accidental double-charging and duplicate stock deductions.
- **Point-in-Time Invoice Isolation**: Orders freeze snapshot prices, tax calculations, commission splits, and vendor payouts at checkout time, shielding historical accounting from future catalog changes.

### 📈 4. Real-Time Analytics Matrix
- **Multi-Dimensional Sales Aggregations**: Real-time calculations of Gross Merchandise Value (GMV), 12% platform revenue cut, 8% sales tax escrow, and net vendor payout across customizable tracking periods (last hour, 24h, 7d, 30d, all-time).
- **Tenant-Scoped Analytics**: Vendors calling `/api/analytics/realtime` receive calculations strictly scoped to their own storefront sales, while platform administrators view global numbers.
- **Top-K Revenue Leaders**: Ranks top products and categories by unit volume and gross revenue.
- **Automated Data Lifecycle Tiering**: Transfers historical orders older than 365 days into compressed cold BSON storage while preserving tax audit accessibility.

### 🛡 5. Distributed Event Handling & Reliability
- **Transactional Outbox Pipeline**: Mutation events are committed into an in-memory and MongoDB-backed `outbox_events` stream, decoupling synchronous request paths from downstream webhooks.
- **Adaptive Token-Bucket Rate Limiter**: Guards sensitive endpoints against brute-force attacks and denial-of-service attempts.
- **Correlation ID Tracing**: Attaches `X-Correlation-ID` across requests, outbox records, and logs for end-to-end auditability.
- **Resilient Dual-Mode Persistence**: Automatically communicates with MongoDB via `mongo-sdk`; gracefully falls back to `memory://local-runtime` without service disruption if MongoDB is unavailable.

---

## 🛠️ Build & Execution

### Prerequisites
- Native TejX Compiler (`tx` / `bash backend/build.sh`)
- Operating System: macOS / Linux

### Build Native Binary
```bash
bash backend/build.sh
```
This compiles `backend/src/main.tx` and all modules into the native executable: `backend/build/server`.

### Run Standalone
```bash
./backend/build/server
```

---

## ⚙️ Environment Variables (`backend/.env`)

```env
PORT=8080
HOST=127.0.0.1
MONGO_URI=mongodb://127.0.0.1:27017/tejx_marketplace_db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
JWT_SECRET=super-secret-jwt-key-for-tejx-marketplace-production
```

---

## 🔌 API Route Reference

### Authentication & IAM (`/api/auth/*`)
| Method | Path | Auth Required | Scope | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | No | Public | Authenticate credentials and receive JWT |
| `GET` | `/api/auth/me` | Yes | Any Authenticated | Retrieve current user profile from token |
| `PUT` | `/api/auth/me` | Yes | Any Authenticated | Update current user profile (name, email) |
| `POST` | `/api/auth/logout` | Yes | Any Authenticated | Blacklist token and terminate session |
| `GET` | `/api/auth/users` | Yes | `admin` Only | List registered user directory |
| `POST` | `/api/auth/users` | Yes | `admin` Only | Create new user account with role archetype |
| `PUT` | `/api/auth/users/:id` | Yes | `admin` Only | Update user profile, role, or storefront |
| `DELETE` | `/api/auth/users/:id` | Yes | `admin` Only | Delete user account |
| `POST` | `/api/auth/users/:id/password` | Yes | `admin` Only | Reset user account password |

### Marketplace & Inventory (`/api/marketplace/*`)
| Method | Path | Auth Required | Scope | Description |
|---|---|---|---|---|
| `GET` | `/api/marketplace/catalog` | No | Public | List products with search & faceted filtering |
| `GET` | `/api/marketplace/filters` | No | Public | Calculate category, brand, and price bracket facets |
| `POST` | `/api/marketplace/checkout` | Yes | `customer`, `vendor`, `admin` | Atomic zero-overdraft checkout |
| `GET` | `/api/marketplace/orders` | Yes | Any Authenticated | List scoped orders (buyer history or storefront) |
| `GET` | `/api/marketplace/orders/:orderId` | Yes | Order Buyer / Vendor / Admin | View point-in-time order invoice |
| `GET` | `/api/marketplace/vendor/inventory` | Yes | Storefront Vendor / Admin | View warehouse SKU allocations |
| `POST` | `/api/marketplace/vendor/inventory/stock` | Yes | Storefront Vendor / Admin | Replenish warehouse stock for SKU |
| `POST` | `/api/marketplace/products` | Yes | Storefront Vendor / Admin | Create or edit product listing |
| `DELETE` | `/api/marketplace/products/:id` | Yes | Storefront Vendor / Admin | Remove product listing |

### Analytics & Database (`/api/analytics/*`, `/api/db/*`)
| Method | Path | Auth Required | Scope | Description |
|---|---|---|---|---|
| `GET` | `/api/analytics/realtime` | Yes | Any Authenticated | Compute GMV, tax, commission, and payouts |
| `GET` | `/api/analytics/top-products` | Yes | Any Authenticated | Rank Top-K revenue-generating products |
| `POST` | `/api/analytics/tiering/run` | Yes | `admin` Only | Trigger cold data lifecycle archival run |
| `GET` | `/api/analytics/outbox` | Yes | `admin` Only | Inspect transactional outbox event stream |
| `GET` | `/api/db/health` | No | Public | Database connection status and telemetry |
| `POST` | `/api/db/reconnect` | Yes | `admin` Only | Force database reconnection attempt |
