# Aura Marketplace Frontend Application (`frontend`)

The frontend application for **Aura Marketplace | Multi-Vendor E-Commerce & Real-Time Financial Analytics Platform**, built with modern React, TypeScript, and Vite.

---

## 🌟 Key Application Views

### 1. Aura Marketplace (`/marketplace`)
- **Public Catalog Browsing**: Open for all users, including anonymous guests.
- **Faceted Search & Filtering**: Dynamic sidebar filtering across categories, storefronts, price brackets, and flash sales.
- **Interactive Product Modal**: Detailed variant inspection with specifications, pricing, rating, and stock badges.
- **Real-Time Shopping Cart**: Cart calculation with 8% estimated sales tax, promo code engine (`AURA10` for 10% discount), and atomic checkout.
- **Personal Order History ("My Orders")**: Displays orders placed strictly by the signed-in user, partitioned away from storefront sales. Unauthenticated guests receive a clean sign-in prompt.

### 2. Multi-Tenant Vendor Operations Portal (`/vendor`)
- **Storefront Switcher**: View metrics and inventory for assigned storefront tenants.
- **Warehouse SKU Allocation Matrix**: Real-time multi-location warehouse breakdown (Primary, Regional, Reserve).
- **Automated Low-Stock Indicators**: Visual badges flagging SKUs below safety thresholds (< 10 units).
- **Quick Restock & Full Product Editor**: In-place SKU restock increments (+50 units) and rich product creation/editing modal.

### 3. Real-Time Financial Analytics (`/analytics`)
- **Executive Metric Cards**: Real-time Gross Merchandise Value (GMV), 12% platform revenue cut, 8% statutory tax escrow, and net vendor payout reserves.
- **Flexible Time Horizons**: Switch tracking intervals between Last Hour, Last 24 Hours, Last 7 Days, Last 30 Days, and All Time.
- **Top-K Revenue Leaders**: Ranked leaderboards of top-selling products by volume and total revenue.
- **Data Lifecycle Tiering**: Hot query cluster vs cold BSON archive counter with manual archival execution button.

### 4. Identity, Access & Security Management (IAM) (`/security`)
- **Administrator-Only Workspace**: Accessible exclusively to users with the `admin` role archetype.
- **User Directory Management**: Full CRUD interface for registered platform accounts.
- **Role Archetype Provisioning**: Create and edit accounts assigned to `admin`, `vendor`, or `customer` with role-scoped capabilities.
- **Security Controls**: In-modal password resets, user deletions, and real-time backend RBAC synchronization.

---

## 🔐 Authentication & Session Management

- **Cryptographic JWT Handling**: Bearer tokens are stored in browser storage and attached automatically to authenticated requests via [src/services/api.ts](file:///Users/praveenyadav/Desktop/My%20Projects/tejx/tejx-demo/frontend/src/services/api.ts).
- **Role-Based Navigation**: Navigation tabs (`Marketplace`, `Vendor Portal`, `Analytics`, `Users & Security`) adapt dynamically based on the active user's role:
  - `admin`: Has access to all 4 tabs.
  - `vendor`: Has access to Marketplace, Vendor Portal, and Analytics.
  - `customer`: Has access to Marketplace.
  - `guest`: Browses Marketplace catalog; restricted tabs are hidden.
- **Clean User Dropdown**: Displays active identity, role badge, profile modal trigger, and one-click secure sign-out.

---

## 🛠️ Development & Build

### Install Dependencies
```bash
cd frontend
npm install
```

### Run Locally (Development Server)
```bash
npm run dev
```
Starts the Vite development server on `http://localhost:3000`.

### Production Build
```bash
npm run build
```
Type-checks TypeScript and bundles optimized static assets to `frontend/dist`.

---

## ⚙️ Environment Configuration (`frontend/.env`)

```env
VITE_PORT=3000
VITE_BACKEND_URL=http://127.0.0.1:8080
VITE_APP_TITLE=Aura Marketplace | Multi-Vendor E-Commerce & Financial Platform
```
