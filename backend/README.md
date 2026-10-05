# TejX Enterprise Multi-Vendor Marketplace & Real-Time Financial Analytics Engine

Ultra high-performance distributed marketplace backend built in TejX, compiled natively with LLVM and integrating direct MongoDB wire-protocol (`mongo-sdk`).

---

## 🏛 The 5 Production Pillars

### 🔑 1. Identity, Security & Access Control (IAM)
- **Asymmetric JWT Authentication**: Prevents unnecessary database lookup overhead on every single API request using Ed25519 / EdDSA public/private key verification pairs.
- **Role-Based Access Control (RBAC)**: Strict 4-tier enforcement:
  - `guest`: Anonymous catalog browsing & facet calculation.
  - `customer`: Multi-vendor checkout, idempotency replay, invoice access.
  - `vendor`: Inventory allocation, warehouse stock replenishment, staff account provisioning.
  - `admin`: Super-admin platform controls, financial commission ledger, top-k analytics, and data lifecycle tiering.
- **Granular Staff Permissions**: Vendors create restricted sub-accounts for staff (`inventory:read`, `inventory:write`, `orders:read`, `orders:fulfillment`, `finance:read`).
- **Token Blacklist Cache**: Instant session revocation and logout with zero-latency in-memory and persistent blacklist checks.

### 🛍 2. Polymorphic Product Catalog Engine
- **Polymorphic Variant Architecture**: Deep configuration options (combinations of size, color, storage, power, fabric) embedded directly within a single product document rather than split into multiple tables.
- **Dynamic Category Specifications**: Flexible schema that allows vendors to add custom technical attributes based on category (e.g., "Battery Capacity" for electronics, "Material" for clothing).
- **Fuzzy Multi-Field Search**: Supports typos, partial matches, and field weighting.
- **Faceted Filter Navigation**: Dynamically calculates and returns the number of matching items remaining in various categories, price brackets, and brands based on active search parameters.
- **Automated Stock Warnings**: Background watchers that flag listings automatically when specific stock levels drop below a vendor-defined threshold (< 10 units).

### 🛒 3. High-Concurrency Transaction Engine
- **Multi-Vendor Multi-Item Carts**: Checkouts containing items from multiple distinct vendors in a single operation, automatically breaking down into accurate vendor sub-orders.
- **Multi-Document ACID Transactions**: Wraps the entire checkout process in a database transaction boundary—ensuring inventory deduction, invoice generation, and customer profile updates all succeed or fail together.
- **Zero-Overdraft Concurrency Protection**: Utilizes atomic database updates to ensure item quantities never fall below zero, rejecting purchase requests with `409 Conflict` the millisecond stock hits empty.
- **API Idempotency Layer**: Captures unique headers (`X-Idempotency-Key`) to guarantee that even if a user clicks "Pay Now" multiple times, they are only charged once and receive the exact same invoice.
- **Point-in-Time Invoice Isolation**: Snapshots product details (price, tax percentages, seller details) inside the order document at the exact second of purchase, protecting historical financial metrics from future catalog modifications.

### 📈 4. Real-Time Analytics Matrix
- **Multi-Dimensional Sales Aggregations**: Processes real-time calculation matrices for Gross Merchandise Value (GMV), 12% platform commission cut, 8% tax, 2.9% gateway fee, and net vendor payout over flexible tracking periods (hourly, daily, monthly).
- **Materialized View Caching**: Runs heavy analytical calculations asynchronously on isolated database nodes and updates static pre-aggregated view models, ensuring dashboards load in <2ms without system-wide table sweeps.
- **Platform Commission Ledger**: Tracks marketplace cuts, fixed platform fees, and payment gateway percentages across all vendor accounts for administrative auditing.
- **Top-K Analytical Grouping**: Automatically ranks and tracks top-selling products and categories based on both sales volume and revenue generation.
- **Automated Data Lifecycle Tiering**: Automatically transfers order files older than a year to cold, cost-effective storage clusters while keeping them completely accessible for annual tax reporting.

### 🛡 5. Distributed Event Handling & DevOps Optimization
- **Adaptive Token-Bucket Rate Limiting**: Perimeter defense system that restricts malicious traffic by user ID or IP, prioritizing essential checkout paths over heavy analytic report downloads.
- **Transactional Outbox Pipeline**: Writes transactional state changes and their corresponding event triggers inside the exact same database boundary.
- **Change Stream Bus Link**: Asynchronously tails the database transaction logs to stream confirmed order events out into message brokers (like Kafka or RabbitMQ).
- **Cross-Service Request Tracing**: Injects unique identifiers (`X-Correlation-ID`) across API thresholds, allowing engineers to trace a transaction's journey from incoming request to final database write across system logs.
- **Global Exception Catcher**: Centralized error-handling middleware that intercepts unexpected system cracks, logs the exact technical fault securely, and masks raw stack traces from end users.

---

## 🚀 Quick Start

### Prerequisites
- Docker (for MongoDB on `127.0.0.1:27017`)
- Node.js 18+ (for React Frontend)
- TejX compiler (`tejxc`)

### Launch Application
```bash
./start.sh
```

- **Frontend UI**: http://localhost:3000
- **TejX Backend API**: http://127.0.0.1:8080
- **MongoDB Connection**: `mongodb://root:password@127.0.0.1:27017/tejx_marketplace_db?authSource=admin`
