# Mongo-only marketplace and IAM refactor plan

## Current findings

The application has two unrelated data paths. The legacy `AppState` seeds
`users`, `products`, and `orders`, while the marketplace creates a second
in-memory store with hard-coded vendors, products, promotions, invoices, and
analytics examples on every backend process start. Most request handlers do
not authorize the caller, several updates only change memory, product deletion
does not delete MongoDB data, and the analytics endpoints return hard-coded
rankings/payouts. This causes the storefront, vendor portal, marketplace,
orders, user directory, and analytics screens to disagree.

## Target behavior

MongoDB will be the required system of record. If it is unavailable, the API
will return a clear `503` for data operations rather than silently creating
transient data. The database will start empty apart from the configured root
administrator account; all storefronts, users, products, orders, and analytics
will be derived from persisted records.

## Implementation

1. **Persistence and startup**
   - Remove in-memory seed/default storefront, product, promotion, invoice,
     and legacy dashboard data. Hydrate only from MongoDB collections on
     startup.
   - Establish one domain schema: `user_accounts`, `storefronts`,
     `marketplace_products`, `marketplace_orders`, `outbox_events`, and
     `token_blacklist`. Remove the duplicate legacy `users`, `products`, and
     `orders` runtime path from user-facing routes.
   - Add explicit repository operations for insert, update, delete, lookup,
     and collection hydration. A write failure returns an error and must not
     leave a misleading successful in-memory result.

2. **Authentication and access control**
   - Centralize bearer-token extraction and permission checks in reusable
     helpers. Apply them to every mutating endpoint and every sensitive list.
   - Enforce ownership: admins manage all records; vendors manage only their
     storefront, products, inventory, and fulfilment; customers see/create
     only their orders; guests read listed catalog items only.
   - Persist user CRUD, including password changes and deletion. Protect the
     configured root admin from modification/deletion and never expose a
     password field in responses.

3. **Storefront and product CRUD**
   - Complete storefront create/read/update/delete routes and UI controls.
     Storefront deletion will be refused while products or orders reference it,
     preventing orphaned commercial data.
   - Complete product create/read/update/delete against MongoDB. Validate
     required fields, positive prices and stock, ownership, variant SKU
     uniqueness, vendor existence, and no deletion of a product referenced by
     historical orders (use unlisting instead).
   - Remove all UI assumptions such as `vnd-aurora`, hard-coded vendor names,
     default warehouse stock, default imagery, and client-assigned ownership.

4. **Marketplace, orders, and vendor portal**
   - Read catalog, facets, inventory, promotions, and vendor metrics from
     MongoDB-backed documents only.
   - Require a customer session for checkout; create an immutable order
     snapshot and reduce inventory only after complete validation. Preserve
     idempotency and store the resulting outbox event with the order.
   - Filter orders by caller scope and validate vendor-owned fulfilment status
     updates. The portal will load the current user's storefront(s), inventory,
     and real order metrics instead of a fixed vendor.

5. **Real analytics**
   - Replace hard-coded financial matrix, ledger, top-K, payout, and archive
     values with calculations over persisted orders and snapshots. Return empty
     arrays/zero totals for an empty database, not demo figures.
   - Use a vendor scope when the caller is a vendor and platform scope only for
     authorized administrative analytics access.

6. **Frontend consistency and tests**
   - Make API response types and loading/empty/error states match the real
     Mongo-backed endpoints. Remove client-side demo fallbacks.
   - Add endpoint-level integration coverage for authorization boundaries and
     CRUD lifecycle, then run backend/frontend builds and the test suite.

## Data removal decision required

“Remove default ones” can mean either:

- **Recommended:** stop creating default demo data and leave existing MongoDB
  records untouched; users can remove old storefronts through the protected
  UI/API once dependencies are handled.
- **Destructive migration:** also delete existing demo records (known seeded
  storefront/product/order IDs) from MongoDB.

The second option permanently removes persisted data. I will use the
recommended non-destructive interpretation unless you explicitly request the
destructive migration.
