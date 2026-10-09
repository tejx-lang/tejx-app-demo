import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Zap,
  CheckCircle,
  AlertTriangle,
  SlidersHorizontal,
  X,
  Sparkles,
  Package,
  RotateCcw,
  Edit,
  Clock,
  FileText,
  User,
  ShoppingBag,
  Plus,
  Trash2,
  Truck,
  Star,
  Eye,
  Check,
  Tag,
  Store,
  Shield,
} from "lucide-react";
import {
  fetchMarketplaceCatalog,
  fetchCatalogFacets,
  executeAtomicCheckout,
  saveProduct,
  deleteProduct,
  fetchSnapshotOrders,
  fetchStorefronts,
} from "../services/api";
import {
  MarketplaceProduct,
  SnapshotInvoice,
  CatalogFacets,
  AuthProfile,
  VendorStorefront,
} from "../services/types";
import { CustomDropdown } from "./CustomDropdown";
import { ProductModal } from "./ProductModal";

const getCategoryTheme = (category: string) => {
  switch (category?.toLowerCase()) {
    case "connectivity":
      return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
    case "audio":
      return { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" };
    case "power":
      return { bg: "#fffbeb", text: "#d97706", border: "#fde68a" };
    case "workstation":
      return { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" };
    case "displays":
      return { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe" };
    case "computing":
      return { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" };
    case "electronics":
      return { bg: "#f0f9ff", text: "#0284c7", border: "#bae6fd" };
    case "accessories":
      return { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" };
    default:
      return { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
  }
};

interface MarketplaceViewProps {
  currentProfile?: AuthProfile | null;
  onSwitchRole?: (role: "guest" | "customer" | "vendor" | "admin") => void;
  onNavigateTab?: (
    tab: "marketplace" | "vendor" | "financial" | "security",
  ) => void;
  onSignIn?: () => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  currentProfile,
  onSwitchRole,
  onNavigateTab,
  onSignIn,
}) => {
  const getInitialSubTab = (): "catalog" | "orders" => {
    if (typeof window === "undefined") return "catalog";
    const params = new URLSearchParams(window.location.search);
    const sub = (
      params.get("view") ||
      params.get("subtab") ||
      params.get("section") ||
      ""
    ).toLowerCase();
    if (sub === "orders" || sub === "invoices" || sub === "history")
      return "orders";
    return "catalog";
  };

  const [activeSubTab, setActiveSubTabState] = useState<"catalog" | "orders">(
    getInitialSubTab,
  );

  const handleSubTabChange = (newTab: "catalog" | "orders") => {
    setActiveSubTabState(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", newTab);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  };

  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search);
      const sub = (
        params.get("view") ||
        params.get("subtab") ||
        params.get("section") ||
        ""
      ).toLowerCase();
      if (sub === "orders" || sub === "invoices" || sub === "history") {
        setActiveSubTabState("orders");
      } else if (sub === "catalog") {
        setActiveSubTabState("catalog");
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("view")) {
        url.searchParams.set("view", activeSubTab);
        window.history.replaceState(
          {},
          "",
          url.pathname + url.search + url.hash,
        );
      }
    }
  }, [activeSubTab]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [orders, setOrders] = useState<SnapshotInvoice[]>([]);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [flashOnly, setFlashOnly] = useState(false);

  // Selected variant map per product: { [productId]: sku }
  const [selectedVariants, setSelectedVariants] = useState<{
    [productId: string]: string;
  }>({});

  // Cart: Array of { product, variant, quantity }
  const [cart, setCart] = useState<
    Array<{ product: MarketplaceProduct; sku: string; quantity: number }>
  >([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{
    success: boolean;
    invoice?: SnapshotInvoice;
    error?: string;
  } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(
    `idemp-${Date.now().toString(36)}`,
  );
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Edit & Add Product Modal State
  const [editingProduct, setEditingProduct] =
    useState<MarketplaceProduct | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [storefronts, setStorefronts] = useState<VendorStorefront[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  // Check if a storefront exists for the active role:
  // Admin requires at least one storefront registered on the platform.
  // Vendor requires an assigned and registered storefront.
  const hasStore =
    currentProfile?.role === "admin"
      ? storefronts.length > 0
      : storefronts.length > 0 &&
        !!currentProfile?.vendorId &&
        storefronts.some((s) => s.id === currentProfile.vendorId);

  // Product Quick View Modal State
  const [viewingProduct, setViewingProduct] =
    useState<MarketplaceProduct | null>(null);

  // Cart Coupon & Discount State
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catData, facetData, ordersData, storefrontsData] =
        await Promise.all([
          fetchMarketplaceCatalog({
            search,
            category: selectedCategory === "all" ? undefined : selectedCategory,
            brand: selectedBrand === "all" ? undefined : selectedBrand,
            flashOnly,
          }),
          fetchCatalogFacets({
            search,
            category: selectedCategory === "all" ? undefined : selectedCategory,
            brand: selectedBrand === "all" ? undefined : selectedBrand,
          }),
          currentProfile?.role === "guest" || !currentProfile
            ? Promise.resolve({ orders: [], totalCount: 0 })
            : fetchSnapshotOrders(),
          fetchStorefronts(),
        ]);
      setProducts(catData.products || []);
      setFacets(facetData);
      const allFetchedOrders = ordersData.orders || [];
      const userOrders = allFetchedOrders.filter((o) => {
        if (!currentProfile || currentProfile.role === "guest") return false;
        const sub = currentProfile.sub?.trim();
        const email = currentProfile.email?.trim().toLowerCase();
        if (sub && o.customerId && o.customerId.trim() === sub) return true;
        if (currentProfile.role === "admin" && (o.customerId === "admin" || o.customerId === "usr-admin-1")) return true;
        if (email && o.customerEmail && o.customerEmail.trim().toLowerCase() === email) return true;
        return false;
      });
      setOrders(userOrders);
      setStorefronts(storefrontsData);
      if (storefrontsData.length > 0) {
        const initialVnd =
          storefrontsData.find((s) => s.id === currentProfile?.vendorId) ||
          storefrontsData[0];
        setSelectedVendorId((prev) => prev || initialVnd.id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    search,
    selectedCategory,
    selectedBrand,
    flashOnly,
    currentProfile?.role,
    currentProfile?.sub,
  ]);

  const handleSelectVariant = (productId: string, sku: string) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: sku }));
  };

  const handleAddToCart = (
    product: MarketplaceProduct,
    skuOverride?: string,
  ) => {
    const chosenSku =
      skuOverride || selectedVariants[product.id] || product.variants[0]?.sku;
    if (!chosenSku) return;

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.sku === chosenSku,
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.sku === chosenSku
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, sku: chosenSku, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (
    productId: string,
    sku: string,
    delta: number,
  ) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId && item.sku === sku) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{
        product: MarketplaceProduct;
        sku: string;
        quantity: number;
      }>;
    });
  };

  const handleRemoveFromCart = (productId: string, sku: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.sku === sku),
      ),
    );
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === "AURA10") {
      setAppliedDiscount(10);
      setCouponMsg({
        text: "10% Marketplace Discount Applied!",
        success: true,
      });
    } else if (code === "FLASH20") {
      setAppliedDiscount(20);
      setCouponMsg({ text: "20% Flash Deal Discount Applied!", success: true });
    } else {
      setCouponMsg({
        text: "Invalid promo code. Try AURA10 or FLASH20",
        success: false,
      });
    }
  };

  const handleOpenEdit = (p: MarketplaceProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(p);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this listing from the marketplace?",
      )
    ) {
      return;
    }
    const res = await deleteProduct(productId);
    if (res.success) {
      if (editingProduct?.id === productId) setEditingProduct(null);
      if (viewingProduct?.id === productId) setViewingProduct(null);
      loadData();
    } else {
      alert(res.error || "Failed to delete product");
    }
  };

  const handleCheckout = async (replay: boolean = false) => {
    if (currentProfile?.role === "guest") {
      if (onSwitchRole) onSwitchRole("customer");
      return;
    }

    if (cart.length === 0 && !replay) return;
    setIsCheckingOut(true);
    setCheckoutResult(null);

    const items = cart.map((c) => ({
      productId: c.product.id,
      sku: c.sku,
      quantity: c.quantity,
    }));

    const keyToUse = replay
      ? idempotencyKey
      : `idemp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    if (!replay) setIdempotencyKey(keyToUse);

    const res = await executeAtomicCheckout({
      items,
      idempotencyKey: keyToUse,
      correlationId: `corr-${Date.now()}`,
      customerId: currentProfile?.sub || "usr-cust-01",
      customerEmail: currentProfile?.email || "customer@aura.com",
    });

    setCheckoutResult(res);
    setIsCheckingOut(false);

    if (res.success && res.invoice) {
      setShowInvoiceModal(true);
      if (!replay) setCart([]);
      loadData();
    }
  };

  const cartTotal = cart.reduce((acc, item) => {
    const variant = item.product.variants?.find((v) => v.sku === item.sku);
    const rawPrice = variant
      ? Number(variant.price)
      : Number(item.product.basePrice || 0);
    const price =
      item.product.isFlashSale && item.product.flashDiscountPercent > 0
        ? Number(
            (rawPrice * (1 - item.product.flashDiscountPercent / 100)).toFixed(
              2,
            ),
          )
        : rawPrice;
    return acc + price * item.quantity;
  }, 0);

  const canEditProduct = (p: MarketplaceProduct) => {
    if (!currentProfile) return false;
    if (currentProfile.role === "admin") return true;
    if (
      currentProfile.role === "vendor" &&
      currentProfile.vendorId === p.vendorId
    )
      return true;
    return false;
  };

  const displayProducts = products.filter((product) => {
    if (selectedStore !== "all" && product.vendorId !== selectedStore) {
      return false;
    }
    return true;
  });

  return (
    <div
      className="section-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        paddingBottom: 0,
      }}
    >
      {/* Top Controls Header */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "0.85rem 1.5rem",
          marginBottom: "1rem",
          background: "#ffffff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <h2
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {activeSubTab === "catalog"
                  ? "Marketplace Catalog"
                  : "Order History & Invoices"}
              </h2>
              <span className="badge badge-blue">
                {activeSubTab === "catalog"
                  ? `${products.length} Products Available`
                  : `${orders.length} Settled Orders`}
              </span>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                margin: 0,
              }}
            >
              {activeSubTab === "catalog"
                ? "Multi-vendor items with zero-overdraft atomic reservation and snapshot pricing."
                : "Immutable point-in-time invoices protecting historical records from future catalog changes."}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {/* Sub tab switcher: Catalog vs My Orders */}
          <div className="segmented-nav">
            <button
              onClick={() => handleSubTabChange("catalog")}
              className={`segmented-nav-btn ${activeSubTab === "catalog" ? "active" : ""}`}
            >
              <ShoppingBag size={14} />
              Catalog
            </button>
            <button
              onClick={() => handleSubTabChange("orders")}
              className={`segmented-nav-btn ${activeSubTab === "orders" ? "active" : ""}`}
            >
              <FileText size={14} />
              My Orders ({orders.length})
            </button>
          </div>

          {activeSubTab === "catalog" && (
            <button
              onClick={() => setFlashOnly(!flashOnly)}
              className={`btn ${flashOnly ? "btn-primary" : "btn-secondary"}`}
              style={{ fontWeight: 600 }}
            >
              <Sparkles size={14} color={flashOnly ? "#38bdf8" : "#d97706"} />
              {flashOnly ? "Flash Deals Only" : "Filter Flash Deals"}
            </button>
          )}

          {activeSubTab === "catalog" &&
            (currentProfile?.role === "vendor" ||
              currentProfile?.role === "admin") && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
                disabled={!hasStore}
                style={{
                  fontWeight: 600,
                  opacity: !hasStore ? 0.5 : 1,
                  cursor: !hasStore ? "not-allowed" : "pointer",
                }}
                title={
                  !hasStore
                    ? "No storefront registered or available. Register a storefront in Users & Security first."
                    : "Add Product"
                }
              >
                <Plus size={14} />
                Add Product
              </button>
            )}
        </div>
      </div>

      {activeSubTab === "orders" ? (
        /* Order History View */
        <div
          className="card no-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              Historical Order Invoices & Snapshots
            </h3>
            <span className="badge badge-emerald">
              Audit Compliant ({orders.length})
            </span>
          </div>

          {currentProfile?.role === "guest" ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                Sign in to view your Order History
              </div>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  maxWidth: 420,
                  margin: "0 auto 16px auto",
                }}
              >
                You are currently browsing as a Guest. Sign in with your account
                to track your purchases and inspect snapshot invoices.
              </p>
              <button
                onClick={() => (onSignIn ? onSignIn() : onSwitchRole && onSwitchRole("customer"))}
                className="btn btn-primary"
              >
                Sign In to View Orders
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--text-tertiary)",
              }}
            >
              No orders placed yet. Return to the Catalog tab and complete an
              atomic checkout!
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Customer</th>
                    <th>Snapshotted Items</th>
                    <th style={{ textAlign: "right" }}>Total GMV</th>
                    <th style={{ textAlign: "right" }}>Net Vendor Payout</th>
                    <th style={{ textAlign: "center" }}>Fulfillment Status</th>
                    <th style={{ textAlign: "right" }}>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.orderId}>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: "#2563eb",
                        }}
                      >
                        {order.orderId}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {order.customerEmail}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {order.items?.map((it) => (
                            <span key={it.sku} style={{ fontSize: "0.75rem" }}>
                              {it.title} (x{it.quantity}) - $
                              {it.unitPrice.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: 700,
                        }}
                      >
                        ${order.grossMerchandiseValue.toFixed(2)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "monospace",
                          color: "#2563eb",
                        }}
                      >
                        ${order.netVendorPayout.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`badge ${order.status.includes("DELIVERED") ? "badge-emerald" : order.status.includes("DISPATCHED") ? "badge-blue" : "badge-green"}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => {
                            setCheckoutResult({
                              success: true,
                              invoice: order,
                            });
                            setShowInvoiceModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: "3px 8px", fontSize: "0.725rem" }}
                        >
                          <FileText size={12} /> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Main Catalog & Shopping Grid with 3 Separate Scroll Panes */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr 340px",
            gap: "1.25rem",
            alignItems: "stretch",
            flex: 1,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Left Column: Faceted Filter Navigation - Separate Scroll */}
          <div
            className="card no-scrollbar"
            style={{
              padding: "1.25rem",
              height: "100%",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: "1rem",
              }}
            >
              <SlidersHorizontal size={15} />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                Filters
              </h3>
            </div>

            {/* Search box */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search products & brands..."
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ fontSize: "0.825rem", paddingLeft: 30 }}
                />
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 11,
                    color: "var(--text-tertiary)",
                  }}
                />
              </div>
            </div>

            {/* Categories facet */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Categories
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`filter-item ${selectedCategory === "all" ? "active" : ""}`}
                >
                  <span>All Categories</span>
                  <span
                    className="badge badge-neutral"
                    style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                  >
                    {products.length}
                  </span>
                </button>
                {facets?.categories?.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`filter-item ${selectedCategory === cat.name ? "active" : ""}`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className="badge badge-neutral"
                      style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Storefronts facet */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Storefronts
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <button
                  onClick={() => setSelectedStore("all")}
                  className={`filter-item ${selectedStore === "all" ? "active" : ""}`}
                >
                  <span>All Storefronts</span>
                  <span
                    className="badge badge-neutral"
                    style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                  >
                    {products.length}
                  </span>
                </button>
                {storefronts.map((st) => {
                  const storeCount = products.filter(
                    (p) => p.vendorId === st.id,
                  ).length;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStore(st.id)}
                      className={`filter-item ${selectedStore === st.id ? "active" : ""}`}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Store size={12} />
                        {st.name}
                      </span>
                      <span
                        className="badge badge-neutral"
                        style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                      >
                        {storeCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brands facet */}
            <div style={{ marginBottom: "1.25rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Brands
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <button
                  onClick={() => setSelectedBrand("all")}
                  className={`filter-item ${selectedBrand === "all" ? "active" : ""}`}
                >
                  <span>All Brands</span>
                </button>
                {facets?.brands?.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setSelectedBrand(b.name)}
                    className={`filter-item ${selectedBrand === b.name ? "active" : ""}`}
                  >
                    <span>{b.name}</span>
                    <span
                      className="badge badge-neutral"
                      style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                    >
                      {b.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Low Stock Watcher Card */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "#fffbeb",
                border: "1px solid #fef3c7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#d97706",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={14} />
                <span>Stock Watcher</span>
              </div>
              <div
                style={{ fontSize: "0.75rem", color: "#92400e", marginTop: 4 }}
              >
                {facets?.lowStockAlertsCount ?? 0} variants below threshold
                (&lt;10 items)
              </div>
            </div>
          </div>

          {/* Center Column: Product Catalog Grid - Separate Scroll */}
          <div
            className="no-scrollbar"
            style={{
              height: "100%",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              paddingRight: 6,
              paddingBottom: "2.5rem",
            }}
          >
            {loading ? (
              <div
                className="card"
                style={{
                  padding: 48,
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                Loading products...
              </div>
            ) : displayProducts.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: 48,
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📦</div>
                <div
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 6,
                  }}
                >
                  {search ||
                  selectedCategory !== "all" ||
                  selectedBrand !== "all" ||
                  selectedStore !== "all"
                    ? "No products match your filters"
                    : "Marketplace Catalog is Empty"}
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    maxWidth: 460,
                    margin: "0 auto 20px",
                    lineHeight: 1.5,
                  }}
                >
                  {search ||
                  selectedCategory !== "all" ||
                  selectedBrand !== "all" ||
                  selectedStore !== "all"
                    ? "Try resetting the filters or selecting another storefront."
                    : "No products are currently listed in MongoDB. Platform Administrators can register storefronts under Users & Security and list products to start selling."}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {(search ||
                    selectedCategory !== "all" ||
                    selectedBrand !== "all" ||
                    selectedStore !== "all") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setSelectedCategory("all");
                        setSelectedBrand("all");
                        setSelectedStore("all");
                      }}
                      className="btn btn-secondary"
                    >
                      Reset All Filters
                    </button>
                  )}
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("vendor")}
                      className="btn btn-secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <ShoppingBag size={14} /> Open Vendor Portal
                    </button>
                  )}
                  {(currentProfile?.role === "admin" ||
                    currentProfile?.role === "vendor") && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn btn-primary"
                      disabled={!hasStore}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: !hasStore ? 0.5 : 1,
                        cursor: !hasStore ? "not-allowed" : "pointer",
                      }}
                      title={
                        !hasStore
                          ? "No storefront registered or available. Register a storefront in Users & Security first."
                          : "Add Product Listing"
                      }
                    >
                      <Plus size={14} /> Add Product Listing
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {displayProducts.map((product) => {
                  const activeSku =
                    selectedVariants[product.id] || product.variants[0]?.sku;
                  const activeVariant =
                    product.variants?.find((v) => v.sku === activeSku) ||
                    product.variants?.[0];
                  const rawVariantPrice = activeVariant
                    ? Number(activeVariant.price)
                    : Number(product.basePrice || 0);
                  const displayPrice =
                    product.isFlashSale && product.flashDiscountPercent > 0
                      ? Number(
                          (
                            rawVariantPrice *
                            (1 - product.flashDiscountPercent / 100)
                          ).toFixed(2),
                        )
                      : rawVariantPrice;
                  const isLowStock =
                    activeVariant &&
                    activeVariant.stock > 0 &&
                    activeVariant.stock < 10;
                  const isOutOfStock =
                    !activeVariant || activeVariant.stock === 0;
                  const editable = canEditProduct(product);
                  const catTheme = getCategoryTheme(product.category); // Parse specifications into feature chips - filter out empty, redundant, or junk values
                  const featureChips = product.specifications
                    ? product.specifications
                        .split(/[,;]/)
                        .map((s) => s.trim())
                        .filter(
                          (s) =>
                            s.length > 2 &&
                            s.toLowerCase() !== "test" &&
                            s.toLowerCase() !== product.title.toLowerCase(),
                        )
                        .slice(0, 3)
                    : [];

                  return (
                    <div
                      key={product.id}
                      className="product-card-modern"
                      style={{
                        padding: "1.1rem",
                        position: "relative",
                      }}
                    >
                      <div>
                        {/* Top Header: Category Pill, Storefront & Flash Badge / Actions */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 9,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.675rem",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 5,
                                background: catTheme.bg,
                                color: catTheme.text,
                                border: `1px solid ${catTheme.border}`,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {product.category || "Product"}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.71rem",
                                color: "#64748b",
                                fontWeight: 600,
                                background: "#f8fafc",
                                padding: "2px 6px",
                                borderRadius: 5,
                                border: "1px solid #f1f5f9",
                              }}
                            >
                              <Store size={11} color="#64748b" />
                              <span>{product.vendorName}</span>
                              <Check
                                size={10}
                                color="#10b981"
                                strokeWidth={2.5}
                              />
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            {product.isFlashSale && (
                              <span
                                className="badge badge-pink"
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2.5,
                                  padding: "2px 6px",
                                  borderRadius: 5,
                                  boxShadow: "0 1px 3px rgba(244, 63, 94, 0.2)",
                                }}
                              >
                                <Zap size={10} fill="#f43f5e" /> -
                                {product.flashDiscountPercent}%
                              </span>
                            )}
                            {editable && (
                              <button
                                onClick={(e) => handleOpenEdit(product, e)}
                                className="btn btn-secondary"
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "0.68rem",
                                  height: 22,
                                  borderRadius: 5,
                                }}
                                title="Edit product details, pricing, and variants"
                              >
                                <Edit size={10} /> Edit
                              </button>
                            )}
                            {currentProfile?.role === "admin" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product.id);
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: "2px 5px",
                                  fontSize: "0.68rem",
                                  height: 22,
                                  borderRadius: 5,
                                  color: "#e11d48",
                                }}
                                title="Delete listing from marketplace"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Product Title (Clickable for Quick View) */}
                        <h4
                          onClick={() => setViewingProduct(product)}
                          style={{
                            fontSize: "0.98rem",
                            fontWeight: 700,
                            margin: "0 0 5px 0",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            lineHeight: 1.35,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            minHeight: "2.7em",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#2563eb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "var(--text-primary)")
                          }
                          title={product.title}
                        >
                          {product.title}
                        </h4>

                        {/* Rating & Brand Line (Clean & Uncluttered) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: featureChips.length > 0 ? 8 : 10,
                            fontSize: "0.74rem",
                          }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              color: "#d97706",
                              fontWeight: 700,
                            }}
                          >
                            <Star size={11} fill="#f59e0b" color="#f59e0b" />
                            <span>{product.vendorRating || "4.9"}</span>
                          </div>
                          {product.brand &&
                            product.brand.toLowerCase() !==
                              product.vendorName?.toLowerCase() && (
                              <>
                                <span style={{ color: "#cbd5e1" }}>•</span>
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontWeight: 500,
                                    fontSize: "0.72rem",
                                  }}
                                >
                                  {product.brand}
                                </span>
                              </>
                            )}
                        </div>

                        {/* Feature Specification Chips (Compact) */}
                        {featureChips.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                              marginBottom: 10,
                            }}
                          >
                            {featureChips.map((chip, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "0.675rem",
                                  color: "#475569",
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  padding: "2px 6px",
                                  borderRadius: 5,
                                  fontWeight: 500,
                                }}
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Variant Selector - Only rendered when MULTIPLE variants exist */}
                        {product.variants && product.variants.length > 1 && (
                          <div
                            style={{
                              marginBottom: 10,
                              padding: "6px 8px",
                              background: "#f8fafc",
                              border: "1px solid #f1f5f9",
                              borderRadius: 7,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.675rem",
                                  fontWeight: 700,
                                  color: "#64748b",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.03em",
                                }}
                              >
                                Options ({product.variants.length})
                              </span>
                              {activeVariant?.sku && (
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    fontFamily: "monospace",
                                    color: "#94a3b8",
                                  }}
                                >
                                  {activeVariant.sku}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 5,
                              }}
                            >
                              {product.variants.map((v) => {
                                const isSelected = v.sku === activeSku;
                                const vPrice =
                                  product.isFlashSale &&
                                  product.flashDiscountPercent > 0
                                    ? Number(
                                        (
                                          v.price *
                                          (1 -
                                            product.flashDiscountPercent / 100)
                                        ).toFixed(2),
                                      )
                                    : Number(v.price);
                                return (
                                  <button
                                    key={v.sku}
                                    type="button"
                                    onClick={() =>
                                      handleSelectVariant(product.id, v.sku)
                                    }
                                    className={`variant-pill ${isSelected ? "active" : ""}`}
                                    title={`${v.name} (SKU: ${v.sku}) - $${vPrice.toFixed(2)} - ${v.stock} in stock`}
                                  >
                                    {isSelected && (
                                      <Check size={10} strokeWidth={2.5} />
                                    )}
                                    <span>{v.name}</span>
                                    <span
                                      style={{
                                        fontSize: "0.67rem",
                                        fontFamily: "monospace",
                                        opacity: 0.9,
                                        fontWeight: 700,
                                      }}
                                    >
                                      $
                                      {vPrice % 1 === 0
                                        ? vPrice.toFixed(0)
                                        : vPrice.toFixed(2)}
                                    </span>
                                    {v.stock < 10 && v.stock > 0 ? (
                                      <span
                                        style={{
                                          width: 5,
                                          height: 5,
                                          borderRadius: "50%",
                                          background: "#f59e0b",
                                          display: "inline-block",
                                        }}
                                        title={`Only ${v.stock} left in stock`}
                                      />
                                    ) : v.stock === 0 ? (
                                      <span
                                        style={{
                                          width: 5,
                                          height: 5,
                                          borderRadius: "50%",
                                          background: "#ef4444",
                                          display: "inline-block",
                                        }}
                                        title="Out of stock"
                                      />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Price, Stock Status & Action Buttons */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginBottom: 10,
                            paddingTop: 8,
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "1.35rem",
                                fontWeight: 800,
                                color: "var(--text-primary)",
                                fontFamily: "monospace",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              ${displayPrice.toFixed(2)}
                            </span>
                            {product.isFlashSale &&
                              product.flashDiscountPercent > 0 && (
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    textDecoration: "line-through",
                                    color: "#94a3b8",
                                  }}
                                >
                                  ${rawVariantPrice.toFixed(2)}
                                </span>
                              )}
                          </div>

                          <div>
                            {isOutOfStock ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2.5px 7px",
                                  borderRadius: 9999,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                }}
                              >
                                ● Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2.5px 7px",
                                  borderRadius: 9999,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  background: "#fffbeb",
                                  color: "#d97706",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                ⚡ Only {activeVariant?.stock} left
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "2.5px 7px",
                                  borderRadius: 9999,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  border: "1px solid #a7f3d0",
                                }}
                              >
                                ● {activeVariant?.stock} in stock
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isOutOfStock}
                            className="btn btn-primary"
                            style={{
                              flex: 1,
                              fontSize: "0.825rem",
                              fontWeight: 600,
                              padding: "0.5rem 0.85rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              borderRadius: 8,
                            }}
                          >
                            <ShoppingCart size={14} />
                            <span>Add to Cart</span>
                          </button>
                          <button
                            onClick={() => setViewingProduct(product)}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.5rem 0.75rem",
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Quick View specifications & details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Checkout & Shopping Cart - Separate Scroll */}
          <div
            className="card no-scrollbar"
            style={{
              padding: "1.25rem",
              height: "100%",
              overflowY: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ShoppingCart size={16} />
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  Shopping Cart
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="badge badge-neutral">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Items
                </span>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      fontSize: "0.725rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Cart items list */}
            {cart.length === 0 ? (
              <div
                style={{
                  padding: "32px 8px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: "0.85rem",
                }}
              >
                Your cart is currently empty.
              </div>
            ) : (
              <div
                className="no-scrollbar"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: "1.25rem",
                  maxHeight: 280,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {cart.map((item) => {
                  const variant = item.product.variants?.find(
                    (v) => v.sku === item.sku,
                  );
                  const rawPrice = variant
                    ? Number(variant.price)
                    : Number(item.product.basePrice || 0);
                  const price =
                    item.product.isFlashSale &&
                    item.product.flashDiscountPercent > 0
                      ? Number(
                          (
                            rawPrice *
                            (1 - item.product.flashDiscountPercent / 100)
                          ).toFixed(2),
                        )
                      : rawPrice;

                  return (
                    <div
                      key={`${item.product.id}-${item.sku}`}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: "#f8fafc",
                        border: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "0.825rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {item.product.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.725rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Variant: <strong>{variant?.name || item.sku}</strong>{" "}
                          ({item.sku})
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          ${price.toFixed(2)} / ea • Vendor:{" "}
                          {item.product.vendorName}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <button
                            onClick={() =>
                              handleUpdateQuantity(
                                item.product.id,
                                item.sku,
                                -1,
                              )
                            }
                            className="btn btn-secondary"
                            style={{ padding: "1px 6px", fontSize: "0.7rem" }}
                          >
                            -
                          </button>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              minWidth: 16,
                              textAlign: "center",
                            }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdateQuantity(item.product.id, item.sku, 1)
                            }
                            className="btn btn-secondary"
                            style={{ padding: "1px 6px", fontSize: "0.7rem" }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            fontFamily: "monospace",
                          }}
                        >
                          ${(price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveFromCart(item.product.id, item.sku)
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#e11d48",
                            fontSize: "0.725rem",
                            cursor: "pointer",
                            padding: 0,
                            marginTop: 4,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Promo Code Input */}
            <form
              onSubmit={handleApplyCoupon}
              style={{ display: "flex", gap: 6, marginBottom: 12 }}
            >
              <input
                type="text"
                placeholder="Promo Code (AURA10)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="input"
                style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem" }}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
              >
                Apply
              </button>
            </form>
            {couponMsg && (
              <div
                style={{
                  fontSize: "0.725rem",
                  color: couponMsg.success ? "#059669" : "#e11d48",
                  marginBottom: 10,
                }}
              >
                {couponMsg.text}
              </div>
            )}

            {/* Pricing breakdown */}
            {(() => {
              const subtotal = cart.reduce((acc, item) => {
                const variant = item.product.variants.find(
                  (v) => v.sku === item.sku,
                );
                const price = item.product.isFlashSale
                  ? item.product.salePrice
                  : variant?.price || item.product.basePrice;
                return acc + price * item.quantity;
              }, 0);
              const discountAmt = (subtotal * appliedDiscount) / 100;
              const shipping = subtotal > 100 || subtotal === 0 ? 0 : 15;
              const tax = (subtotal - discountAmt) * 0.08;
              const totalDue = Math.max(
                0,
                subtotal - discountAmt + shipping + tax,
              );

              return (
                <>
                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "0.75rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.825rem",
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      <span>Subtotal:</span>
                      <span style={{ fontFamily: "monospace" }}>
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.825rem",
                          color: "#059669",
                          marginBottom: 4,
                        }}
                      >
                        <span>Discount ({appliedDiscount}%):</span>
                        <span style={{ fontFamily: "monospace" }}>
                          -${discountAmt.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.825rem",
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      <span>Shipping:</span>
                      <span style={{ fontFamily: "monospace" }}>
                        {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.825rem",
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      <span>Estimated Tax (8%):</span>
                      <span style={{ fontFamily: "monospace" }}>
                        ${tax.toFixed(2)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "1.05rem",
                        fontWeight: 800,
                        marginTop: 8,
                        color: "var(--text-primary)",
                      }}
                    >
                      <span>Total Due:</span>
                      <span
                        style={{ fontFamily: "monospace", color: "#059669" }}
                      >
                        ${totalDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Guest mode warning */}
                  {currentProfile?.role === "guest" && (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#1e40af",
                        fontSize: "0.775rem",
                        marginBottom: 12,
                      }}
                    >
                      You are browsing as an Anonymous Guest. Sign in as
                      Customer to checkout.
                    </div>
                  )}

                  {checkoutResult?.error && (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: "#fff1f2",
                        color: "#e11d48",
                        fontSize: "0.75rem",
                        marginBottom: 12,
                      }}
                    >
                      {checkoutResult.error}
                    </div>
                  )}

                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <button
                      onClick={() => handleCheckout(false)}
                      disabled={
                        isCheckingOut ||
                        (cart.length === 0 && currentProfile?.role !== "guest")
                      }
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        fontSize: "0.9rem",
                        padding: "0.7rem 1rem",
                      }}
                    >
                      <Zap size={15} />
                      {currentProfile?.role === "guest"
                        ? "Sign in as Customer to Checkout"
                        : isCheckingOut
                          ? "Processing Checkout..."
                          : `Place Order Now ($${totalDue.toFixed(2)})`}
                    </button>
                  </div>
                </>
              );
            })()}
            {checkoutResult?.invoice && (
              <button
                onClick={() => handleCheckout(true)}
                disabled={isCheckingOut}
                className="btn btn-secondary"
                style={{ width: "100%", fontSize: "0.775rem", marginTop: 8 }}
                title="Tests idempotency: Replays the same purchase without duplicate charges"
              >
                <RotateCcw size={13} />
                Replay Idempotent Checkout
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unified Edit Product Details & Variants Modal */}
      {editingProduct && (
        <ProductModal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => loadData()}
          currentProfile={currentProfile || null}
          storefronts={storefronts}
          initialProduct={editingProduct}
          defaultVendorId={editingProduct.vendorId}
        />
      )}

      {/* Unified Add Product Listing Modal */}
      <ProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => loadData()}
        currentProfile={currentProfile || null}
        storefronts={storefronts}
        defaultVendorId={selectedVendorId}
      />

      {/* Product Quick View / Details Modal */}
      {viewingProduct && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 620,
              width: "100%",
              background: "#ffffff",
              borderRadius: 16,
              padding: "1.75rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <span
                  className="badge badge-purple"
                  style={{ marginBottom: 6 }}
                >
                  {viewingProduct.brand} • {viewingProduct.category}
                </span>
                <h3
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 800,
                    margin: "4px 0 0 0",
                    color: "var(--text-primary)",
                  }}
                >
                  {viewingProduct.title}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 4,
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>
                    Sold by: <strong>{viewingProduct.vendorName}</strong>
                  </span>
                  <span>•</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      color: "#f59e0b",
                      fontWeight: 600,
                    }}
                  >
                    <Star size={13} fill="#f59e0b" />{" "}
                    {viewingProduct.vendorRating || "4.9"} (Audited Seller)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Specifications Card */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Technical Specifications & Architecture
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                }}
              >
                {viewingProduct.specifications ||
                  "Constructed with premium components. Engineered for high-throughput nomad performance."}
              </div>
            </div>

            {/* Variant selector in modal */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Available SKUs & Warehouses:
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {viewingProduct.variants.map((v) => {
                  const isSelected =
                    (selectedVariants[viewingProduct.id] ||
                      viewingProduct.variants[0]?.sku) === v.sku;
                  return (
                    <button
                      key={v.sku}
                      onClick={() =>
                        handleSelectVariant(viewingProduct.id, v.sku)
                      }
                      className={`variant-btn ${isSelected ? "selected" : ""}`}
                      style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                    >
                      {v.name} (${v.price.toFixed(2)}) - {v.stock} in stock
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trust and Delivery Badges */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: 8,
                  background: "#ecfdf5",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  color: "#065f46",
                  textAlign: "center",
                }}
              >
                ✓ Zero-Overdraft Guarantee
              </div>
              <div
                style={{
                  padding: 8,
                  background: "#eff6ff",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  color: "#1e40af",
                  textAlign: "center",
                }}
              >
                ✓ Free Shipping on $100+
              </div>
              <div
                style={{
                  padding: 8,
                  background: "#f5f3ff",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  color: "#5b21b6",
                  textAlign: "center",
                }}
              >
                ✓ Snapshot Invoice Audit
              </div>
            </div>

            {(() => {
              const activeSku =
                selectedVariants[viewingProduct.id] ||
                viewingProduct.variants[0]?.sku;
              const activeVariant =
                viewingProduct.variants.find((v) => v.sku === activeSku) ||
                viewingProduct.variants[0];
              const displayPrice = viewingProduct.isFlashSale
                ? viewingProduct.salePrice
                : activeVariant?.price || viewingProduct.basePrice;
              const isOutOfStock = !activeVariant || activeVariant.stock === 0;

              return (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  <div style={{ marginRight: "auto" }}>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: "var(--text-primary)",
                      }}
                    >
                      ${displayPrice.toFixed(2)}
                    </div>
                    {viewingProduct.isFlashSale && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          textDecoration: "line-through",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        ${viewingProduct.basePrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingProduct(null)}
                    className="btn btn-secondary"
                  >
                    Back to Catalog
                  </button>
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      handleAddToCart(viewingProduct, activeSku);
                      setViewingProduct(null);
                    }}
                    className="btn btn-primary"
                  >
                    <ShoppingCart size={15} />{" "}
                    {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Point-in-Time Snapshot Receipt Modal */}
      {showInvoiceModal && checkoutResult?.invoice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 580,
              width: "100%",
              background: "#ffffff",
              borderRadius: 16,
              padding: "1.75rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={22} color="#059669" />
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "var(--text-primary)",
                  }}
                >
                  Order Confirmed
                </h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: 16,
              }}
            >
              Order Reference:{" "}
              <strong
                style={{
                  fontFamily: "monospace",
                  color: "var(--text-primary)",
                }}
              >
                {checkoutResult.invoice.orderId}
              </strong>
            </p>

            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Item & SKU</th>
                    <th>Seller</th>
                    <th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {checkoutResult.invoice.items?.map((it) => (
                    <tr key={it.sku}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.title}</div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-tertiary)",
                            fontFamily: "monospace",
                          }}
                        >
                          {it.sku} (x{it.quantity})
                        </div>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {it.vendorName}
                      </td>
                      <td
                        style={{ textAlign: "right", fontFamily: "monospace" }}
                      >
                        ${it.unitPrice.toFixed(2)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: 600,
                        }}
                      >
                        ${it.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: "0.85rem",
                }}
              >
                <div>Gross Merchandise Value:</div>
                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    fontFamily: "monospace",
                  }}
                >
                  ${checkoutResult.invoice.grossMerchandiseValue.toFixed(2)}
                </div>

                <div>Platform Cut (12%):</div>
                <div
                  style={{
                    textAlign: "right",
                    color: "#059669",
                    fontFamily: "monospace",
                  }}
                >
                  +${checkoutResult.invoice.totalPlatformCommission.toFixed(2)}
                </div>

                <div>Sales Tax (8%):</div>
                <div
                  style={{
                    textAlign: "right",
                    color: "#d97706",
                    fontFamily: "monospace",
                  }}
                >
                  +${checkoutResult.invoice.totalTax.toFixed(2)}
                </div>

                <div style={{ fontWeight: 700 }}>Net Vendor Payout:</div>
                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: "#2563eb",
                  }}
                >
                  ${checkoutResult.invoice.netVendorPayout.toFixed(2)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInvoiceModal(false)}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.7rem" }}
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;
