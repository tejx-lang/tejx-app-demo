import React, { useState, useEffect, useMemo } from "react";
import {
  Store,
  Boxes,
  PlusCircle,
  TrendingUp,
  Percent,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit,
  Truck,
  Package,
  X,
  Shield,
  Trash2,
  AlertCircle,
  Settings,
} from "lucide-react";
import {
  fetchVendorInventory,
  replenishVendorStock,
  fetchVendorPromotions,
  fetchVendorMetrics,
  saveProduct,
  deleteProduct,
  fetchSnapshotOrders,
  updateOrderFulfillment,
  fetchStorefronts,
  fetchMarketplaceCatalog,
} from "../services/api";
import {
  AuthProfile,
  SnapshotInvoice,
  VendorStorefront,
  MarketplaceProduct,
} from "../services/types";
import CustomDropdown from "./CustomDropdown";
import { ProductModal } from "./ProductModal";

interface VendorPortalViewProps {
  currentProfile?: AuthProfile | null;
  onSwitchRole?: (role: "guest" | "customer" | "vendor" | "admin") => void;
}

export const VendorPortalView: React.FC<VendorPortalViewProps> = ({
  currentProfile,
  onSwitchRole,
}) => {
  const getInitialStore = (): string => {
    if (typeof window === "undefined") return currentProfile?.vendorId || "";
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("store") ||
      params.get("vendor") ||
      currentProfile?.vendorId ||
      ""
    );
  };

  const [selectedVendor, setSelectedVendorState] = useState(getInitialStore);
  const [vendors, setVendors] = useState<VendorStorefront[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<SnapshotInvoice[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replenishingSku, setReplenishingSku] = useState<string | null>(null);
  const [replenishSuccessMsg, setReplenishSuccessMsg] = useState<string | null>(
    null,
  );

  const setSelectedVendor = (val: string, pushHistory = true) => {
    setSelectedVendorState(val);
    if (pushHistory && typeof window !== "undefined" && val) {
      const url = new URL(window.location.href);
      url.searchParams.set("store", val);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  };

  // Product Add / Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<MarketplaceProduct | null>(null);
  const [vendorProducts, setVendorProducts] = useState<MarketplaceProduct[]>(
    [],
  );

  // Inspect Order Modal State
  const [inspectingOrder, setInspectingOrder] =
    useState<SnapshotInvoice | null>(null);

  // Check if a storefront exists for the active role:
  const hasStore =
    vendors.length > 0 &&
    !!selectedVendor &&
    vendors.some((v) => v.id === selectedVendor);

  const loadStorefronts = async () => {
    try {
      const list = await fetchStorefronts();
      setVendors(list || []);
      if (list && list.length > 0) {
        const urlParams =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const urlStore = urlParams
          ? urlParams.get("store") || urlParams.get("vendor")
          : null;

        if (urlStore && list.some((v) => v.id === urlStore)) {
          setSelectedVendorState(urlStore);
        } else {
          const isCurrentValid = list.some((v) => v.id === selectedVendor);
          if (!isCurrentValid) {
            const matched =
              currentProfile?.role === "vendor" &&
              currentProfile?.vendorId &&
              list.some((v) => v.id === currentProfile.vendorId)
                ? currentProfile.vendorId
                : list[0].id;
            setSelectedVendorState(matched);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              if (!url.searchParams.has("store")) {
                url.searchParams.set("store", matched);
                window.history.replaceState(
                  {},
                  "",
                  url.pathname + url.search + url.hash,
                );
              }
            }
          }
        }
      } else {
        setSelectedVendorState("");
      }
    } catch (err) {
      console.warn("Failed to load storefronts", err);
      setVendors([]);
      setSelectedVendorState("");
    }
  };

  useEffect(() => {
    loadStorefronts();
  }, []);

  // Sync selectedVendor whenever currentProfile or vendors changes
  useEffect(() => {
    const urlParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const urlStore = urlParams
      ? urlParams.get("store") || urlParams.get("vendor")
      : null;

    if (urlStore && vendors.some((v) => v.id === urlStore)) {
      setSelectedVendorState(urlStore);
    } else if (currentProfile?.role === "vendor" && currentProfile.vendorId) {
      setSelectedVendor(currentProfile.vendorId, false);
    } else if (currentProfile?.role === "admin" && vendors.length > 0) {
      if (!selectedVendor || !vendors.some((v) => v.id === selectedVendor)) {
        setSelectedVendor(vendors[0].id, false);
      }
    }
  }, [currentProfile, vendors]);

  // Handle popstate for store query param
  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search);
      const storeParam = params.get("store") || params.get("vendor");
      if (storeParam && vendors.some((v) => v.id === storeParam)) {
        setSelectedVendorState(storeParam);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [vendors]);

  const loadVendorData = async () => {
    if (!selectedVendor) {
      setInventory([]);
      setVendorProducts([]);
      setLowStockCount(0);
      setMetrics(null);
      setPromotions([]);
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [invData, metData, promoData, ordersData, catalogData] =
        await Promise.all([
          fetchVendorInventory(selectedVendor),
          fetchVendorMetrics(selectedVendor),
          fetchVendorPromotions(),
          fetchSnapshotOrders({ vendorId: selectedVendor }),
          fetchMarketplaceCatalog(),
        ]);

      setInventory(invData.inventory || []);
      setLowStockCount(invData.lowStockAlertCount || 0);
      setMetrics(metData);
      setPromotions(promoData || []);

      const allProds = catalogData.products || [];
      const prodsForVendor =
        selectedVendor === "all"
          ? allProds
          : allProds.filter((p) => p.vendorId === selectedVendor);
      setVendorProducts(prodsForVendor);

      // Filter orders relevant to this vendor
      const allOrders = ordersData.orders || [];
      const vendorOrders = allOrders.filter((o) =>
        o.items?.some(
          (it) => it.vendorId === selectedVendor || selectedVendor === "all",
        ),
      );
      setOrders(vendorOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorData();
  }, [selectedVendor]);

  const handleReplenish = async (sku: string) => {
    setReplenishingSku(sku);
    setReplenishSuccessMsg(null);
    try {
      const res = await replenishVendorStock(sku, 50);
      if (res.success) {
        setReplenishSuccessMsg(
          `Added +50 units to SKU ${sku} (Current Balance: ${res.stock})`,
        );
        loadVendorData();
        setTimeout(() => setReplenishSuccessMsg(null), 4000);
      }
    } finally {
      setReplenishingSku(null);
    }
  };

  const handleOpenEditProduct = (prod?: MarketplaceProduct, items?: any[]) => {
    if (prod) {
      setEditingProduct(prod);
      return;
    }
    if (items && items.length > 0) {
      const found = vendorProducts.find((p) => p.id === items[0].productId);
      if (found) {
        setEditingProduct(found);
      } else {
        const fallback: MarketplaceProduct = {
          id: items[0].productId,
          title: items[0].productTitle || "Product",
          category: items[0].category || "Connectivity",
          brand: "Acme Labs",
          vendorId: selectedVendor,
          vendorName:
            vendors.find((v) => v.id === selectedVendor)?.name || "Store",
          vendorRating: 5.0,
          basePrice: items[0].price || 199,
          salePrice: items[0].price || 199,
          isFlashSale: false,
          flashDiscountPercent: 0,
          variants: items.map((it: any, idx: number) => ({
            sku: it.sku,
            name: it.variantName || `Variant ${idx + 1}`,
            optionValues: it.optionValues || "Standard",
            price: it.price || 199,
            stock: it.stock || 0,
            warehouses: it.warehouses || [],
          })),
          totalStock: items.reduce(
            (acc: number, it: any) => acc + (it.stock || 0),
            0,
          ),
          isActive: true,
          fulfillmentScore: 5.0,
          ordersCount: 0,
          imageUrl: "",
          createdAt: Date.now(),
        };
        setEditingProduct(fallback);
      }
    }
  };

  // Group inventory items by productId to present products and their variants clearly
  const groupedProducts = React.useMemo(() => {
    const map = new Map<
      string,
      { product?: MarketplaceProduct; items: any[] }
    >();

    vendorProducts.forEach((prod) => {
      map.set(prod.id, { product: prod, items: [] });
    });

    inventory.forEach((item) => {
      const existing = map.get(item.productId);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(item.productId, {
          product: vendorProducts.find((p) => p.id === item.productId),
          items: [item],
        });
      }
    });

    return Array.from(map.entries())
      .map(([productId, val]) => {
        if (val.items.length === 0 && val.product?.variants) {
          val.items = val.product.variants.map((v) => ({
            productId: val.product!.id,
            productTitle: val.product!.title,
            category: val.product!.category,
            sku: v.sku,
            variantName: v.name,
            stock: v.stock,
            price: v.price,
            isLowStock: v.stock < 10,
            warehouses: v.warehouses || [
              { code: "WH-PRIMARY", stock: v.stock },
            ],
          }));
        }
        return {
          productId,
          product: val.product,
          items: val.items,
        };
      })
      .filter((g) => g.items.length > 0 || Boolean(g.product));
  }, [vendorProducts, inventory]);

  const effectiveLowStockCount = useMemo(() => {
    if (inventory && inventory.length > 0) {
      return inventory.filter((it) => (Number(it.stock) || 0) < 10).length;
    }
    return lowStockCount;
  }, [inventory, lowStockCount]);

  const handleDeleteItem = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      const res = await deleteProduct(productId);
      if (res.success) {
        setReplenishSuccessMsg("Product removed successfully.");
        loadVendorData();
        setTimeout(() => setReplenishSuccessMsg(null), 4000);
      } else {
        alert(res.error || "Failed to remove product");
      }
    } catch (err: any) {
      alert("Error removing product: " + err.message);
    }
  };

  const handleUpdateFulfillment = async (orderId: string, status: string) => {
    try {
      const res = await updateOrderFulfillment(orderId, status);
      if (res.success) {
        setReplenishSuccessMsg(`Order ${orderId} updated to ${status}.`);
        if (inspectingOrder && inspectingOrder.orderId === orderId) {
          setInspectingOrder({ ...inspectingOrder, status });
        }
        loadVendorData();
        setTimeout(() => setReplenishSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert("Failed to update fulfillment: " + err.message);
    }
  };

  const isGuestOrCustomer =
    currentProfile?.role === "guest" || currentProfile?.role === "customer";

  return (
    <div className="section-container">
      {/* Role Notice Banner if not Vendor/Admin */}
      {isGuestOrCustomer && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            color: "#6d28d9",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <strong>Preview Mode:</strong> You are currently signed in as{" "}
            {currentProfile?.name || "Customer"}. Switch to Verified Vendor mode
            to unlock full store inventory management and fulfillment controls.
          </div>
          <button
            onClick={() => onSwitchRole?.("vendor")}
            className="btn btn-primary"
            style={{
              fontSize: "0.8rem",
              padding: "4px 12px",
              background: "#7c3aed",
              borderColor: "#7c3aed",
            }}
          >
            Switch to Vendor Mode
          </button>
        </div>
      )}

      {/* Header & Seller Selector */}
      <div className="section-header">
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
              Vendor Operations Portal
            </h2>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            Manage warehouse inventory, pricing, products, and orders
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {currentProfile?.role === "vendor" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0.45rem 0.85rem",
                background: "#f5f3ff",
                border: "1.5px solid #ddd6fe",
                borderRadius: 8,
                color: "#6d28d9",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              <Store size={15} />
              <span>
                {vendors.find((v) => v.id === selectedVendor)?.name ||
                  (vendors.length === 0
                    ? "No Store Registered"
                    : currentProfile.name || "Store Owner")}{" "}
                ({selectedVendor || "None"})
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: "0.785rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  Store:
                </span>
                {vendors.length > 0 ? (
                  <CustomDropdown
                    value={selectedVendor}
                    onChange={(val) => setSelectedVendor(val)}
                    options={vendors.map((v) => ({
                      value: v.id,
                      label: v.name,
                      sublabel: `(${v.id})`,
                      badge: v.tier || "Verified",
                      icon: <Store size={14} color="#059669" />,
                    }))}
                    placeholder="Select Store..."
                    searchable={vendors.length > 4}
                    style={{ width: "auto", minWidth: 230 }}
                    buttonStyle={{
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.8rem",
                      background: "#ffffff",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-tertiary)",
                      fontStyle: "italic",
                    }}
                  >
                    No Stores Registered
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            disabled={!hasStore}
            style={{
              fontSize: "0.85rem",
              opacity: !hasStore ? 0.5 : 1,
              cursor: !hasStore ? "not-allowed" : "pointer",
            }}
            title={
              !hasStore
                ? "No storefront registered or selected. Register a storefront in Users & Security first."
                : "Add Product"
            }
          >
            <Plus size={14} /> Add Product
          </button>

          <button
            onClick={loadVendorData}
            className="btn btn-secondary"
            disabled={loading}
            title="Refresh inventory"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Empty Storefront Notice if no stores in DB */}
      {vendors.length === 0 && !loading && (
        <div
          className="card"
          style={{ padding: "2.5rem", textAlign: "center", marginBottom: 20 }}
        >
          <Store size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            No Storefronts Registered
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              maxWidth: 450,
              margin: "0 auto",
            }}
          >
            There are currently no active vendor storefronts in MongoDB.
            Platform Administrators can register and configure new storefronts
            under <strong>Users & Security</strong>.
          </p>
        </div>
      )}

      {replenishSuccessMsg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#059669",
            fontSize: "0.825rem",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{replenishSuccessMsg}</span>
        </div>
      )}

      {/* Seller KPI Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card">
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: 4,
            }}
          >
            Fulfillment Status
          </div>
          <div
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}
          >
            {metrics?.status || "Active & Verified"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Tier: {metrics?.tier || "Platinum Partner"}
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
            >
              Platform Commission
            </span>
            <Percent size={14} color="#64748b" />
          </div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            {metrics?.commissionRate ? `${metrics.commissionRate}%` : "12%"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Tier-based marketplace cut
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
            >
              Active SKUs
            </span>
            <Boxes size={14} color="#64748b" />
          </div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            {inventory.length}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Across independent warehouses
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
            >
              Low Stock Watch
            </span>
            <AlertTriangle size={14} color="#d97706" />
          </div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: effectiveLowStockCount > 0 ? "#d97706" : "#059669",
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            {effectiveLowStockCount}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Variants below 10 items
          </div>
        </div>
      </div>

      {/* Live Inventory Management: Grouped by Product & SKU Variants */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
              Live Warehouse Stock & Variant Allocation
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: "4px 0 0 0",
              }}
            >
              Real-time multi-location inventory. Edit whole products
              (specifications, pricing & SKU variants) or quickly replenish
              stock.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-neutral">
              {groupedProducts.length} Products
            </span>
            <span className="badge badge-blue">
              {inventory.length} Tracked SKUs
            </span>
          </div>
        </div>

        {groupedProducts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "36px 16px",
              color: "var(--text-tertiary)",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px dashed #cbd5e1",
            }}
          >
            {!hasStore
              ? "No storefront registered or available. Platform Administrators can register storefronts under Users & Security before adding products."
              : 'No products in inventory for this store yet. Click "Add Product" above to publish your first item.'}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {groupedProducts.map(({ product, items }) => {
              const isSingle = items.length === 1;
              const totalProdStock = items.reduce(
                (s, it) => s + (Number(it.stock) || 0),
                0,
              );
              const prices = items.map((it) => Number(it.price) || 0);
              const minP =
                prices.length > 0
                  ? Math.min(...prices)
                  : product?.basePrice || 0;
              const maxP =
                prices.length > 0
                  ? Math.max(...prices)
                  : product?.basePrice || 0;
              const priceLabel =
                minP === maxP
                  ? `$${minP.toFixed(2)}`
                  : `$${minP.toFixed(2)} - $${maxP.toFixed(2)}`;
              const effectiveProduct =
                product ||
                ({
                  id: items[0].productId,
                  title: items[0].productTitle || "Product",
                  category: items[0].category || "Connectivity",
                  brand: "Acme Labs",
                  vendorId: selectedVendor,
                  vendorName:
                    vendors.find((v) => v.id === selectedVendor)?.name ||
                    "Store",
                  vendorRating: 5.0,
                  basePrice: minP,
                  salePrice: minP,
                  isFlashSale: false,
                  flashDiscountPercent: 0,
                  variants: items.map((it) => ({
                    sku: it.sku,
                    name: it.variantName || "Standard Edition",
                    optionValues: "Standard",
                    price: it.price,
                    stock: it.stock,
                    warehouses: it.warehouses || [],
                  })),
                  totalStock: totalProdStock,
                  isActive: true,
                  fulfillmentScore: 5.0,
                  ordersCount: 0,
                  imageUrl: "",
                  createdAt: Date.now(),
                } as MarketplaceProduct);

              return (
                <div
                  key={effectiveProduct.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "1rem 1.25rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  {/* Product Header with Clear Single vs Multi-Variant distinction */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      paddingBottom: 12,
                      marginBottom: 10,
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: isSingle ? "#f5f3ff" : "#eff6ff",
                          color: isSingle ? "#7c3aed" : "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Package size={18} />
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "1rem",
                              fontWeight: 750,
                              margin: 0,
                              color: "var(--text-primary)",
                            }}
                          >
                            {effectiveProduct.title}
                          </h4>
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: "0.675rem" }}
                          >
                            {effectiveProduct.category || "General"}
                          </span>
                          {isSingle ? (
                            <span
                              className="badge badge-purple"
                              style={{ fontSize: "0.675rem", fontWeight: 700 }}
                            >
                              Single SKU Product
                            </span>
                          ) : (
                            <span
                              className="badge badge-blue"
                              style={{ fontSize: "0.675rem", fontWeight: 700 }}
                            >
                              {items.length} SKU Variants
                            </span>
                          )}
                          {effectiveProduct.isFlashSale && (
                            <span
                              className="badge badge-pink"
                              style={{ fontSize: "0.675rem", fontWeight: 700 }}
                            >
                              Flash Deal -
                              {effectiveProduct.flashDiscountPercent}%
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            marginTop: 4,
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>
                            Pricing:{" "}
                            <strong
                              style={{
                                color: "#0f172a",
                                fontFamily: "monospace",
                              }}
                            >
                              {priceLabel}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Total Stock:{" "}
                            <strong
                              style={{
                                color:
                                  totalProdStock < 10 ? "#d97706" : "#059669",
                              }}
                            >
                              {totalProdStock} units
                            </strong>
                          </span>
                          {effectiveProduct.brand && (
                            <>
                              <span>•</span>
                              <span>Brand: {effectiveProduct.brand}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <button
                        onClick={() =>
                          handleOpenEditProduct(effectiveProduct, items)
                        }
                        className="btn btn-primary"
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.35rem 0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        title="Edit entire product listing, specifications, and SKU variant matrix"
                      >
                        <Edit size={13} /> Edit Whole Product
                      </button>
                      <button
                        onClick={() => handleDeleteItem(effectiveProduct.id)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.35rem 0.65rem",
                          color: "#e11d48",
                        }}
                        title="Delete product listing"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* SKU Variants Table */}
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ margin: 0, fontSize: "0.8rem", width: "100%" }}
                    >
                      <thead>
                        <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}>
                            Variation SKU Name
                          </th>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}>
                            SKU Code
                          </th>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}>
                            Warehouses
                          </th>
                          <th
                            style={{
                              padding: "6px 10px",
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          >
                            Variant Price
                          </th>
                          <th
                            style={{
                              padding: "6px 10px",
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            Stock Status
                          </th>
                          <th
                            style={{
                              padding: "6px 10px",
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          >
                            Quick Restock
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((vItem) => {
                          const isLow = vItem.stock < 10;
                          return (
                            <tr
                              key={vItem.sku}
                              style={{ borderBottom: "1px solid #f1f5f9" }}
                            >
                              <td
                                style={{
                                  padding: "7px 10px",
                                  fontWeight: 600,
                                  color: "#1e293b",
                                }}
                              >
                                {vItem.variantName || "Standard Edition"}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  fontFamily: "monospace",
                                  color: "#64748b",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {vItem.sku}
                              </td>
                              <td style={{ padding: "7px 10px" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 4,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {vItem.warehouses?.map((wh: any) => (
                                    <span
                                      key={wh.code}
                                      className="badge badge-neutral"
                                      style={{ fontSize: "0.675rem" }}
                                    >
                                      {wh.code}: {wh.stock}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  color: "#0f172a",
                                }}
                              >
                                ${Number(vItem.price || 0).toFixed(2)}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "center",
                                }}
                              >
                                {isLow ? (
                                  <span
                                    className="badge badge-amber"
                                    style={{ fontSize: "0.7rem" }}
                                  >
                                    LOW: {vItem.stock}
                                  </span>
                                ) : (
                                  <span
                                    className="badge badge-green"
                                    style={{ fontSize: "0.7rem" }}
                                  >
                                    {vItem.stock} in stock
                                  </span>
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "7px 10px",
                                  textAlign: "right",
                                }}
                              >
                                <button
                                  onClick={() => handleReplenish(vItem.sku)}
                                  disabled={replenishingSku === vItem.sku}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: "0.25rem 0.65rem",
                                    fontSize: "0.725rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                  title={`Replenish +50 units to SKU ${vItem.sku}`}
                                >
                                  <PlusCircle size={12} color="#2563eb" />
                                  {replenishingSku === vItem.sku
                                    ? "Saving..."
                                    : "+50"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Orders & Fulfillment Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
              Customer Orders & Sub-Order Fulfillment
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: "4px 0 0 0",
              }}
            >
              Orders containing items from this vendor. Mark orders dispatched
              to release escrow payouts.
            </p>
          </div>
          <span className="badge badge-blue">{orders.length} Sub-Orders</span>
        </div>

        {orders.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "0.85rem",
            }}
          >
            No incoming customer orders yet for this vendor.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Customer Email</th>
                  <th>Purchased SKUs</th>
                  <th style={{ textAlign: "right" }}>Subtotal</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isConfirmed = order.status === "CONFIRMED_ATOMIC";
                  return (
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
                        {order.items
                          ?.map((it) => `${it.title} (x${it.quantity})`)
                          .join(", ")}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: 700,
                        }}
                      >
                        ${order.netVendorPayout.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`badge ${order.status === "DELIVERED" ? "badge-emerald" : order.status.includes("DISPATCHED") ? "badge-blue" : "badge-green"}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                            alignItems: "center",
                          }}
                        >
                          <button
                            onClick={() => setInspectingOrder(order)}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.65rem",
                              fontSize: "0.725rem",
                            }}
                          >
                            Details
                          </button>
                          {isConfirmed && (
                            <button
                              onClick={() =>
                                handleUpdateFulfillment(
                                  order.orderId,
                                  "DISPATCHED_IN_TRANSIT",
                                )
                              }
                              className="btn btn-primary"
                              style={{
                                padding: "0.35rem 0.75rem",
                                fontSize: "0.725rem",
                              }}
                            >
                              <Truck size={12} /> Dispatch
                            </button>
                          )}
                          {order.status === "DISPATCHED_IN_TRANSIT" && (
                            <button
                              onClick={() =>
                                handleUpdateFulfillment(
                                  order.orderId,
                                  "DELIVERED",
                                )
                              }
                              className="btn btn-primary"
                              style={{
                                padding: "0.35rem 0.75rem",
                                fontSize: "0.725rem",
                                background: "#059669",
                                borderColor: "#059669",
                              }}
                            >
                              <CheckCircle2 size={12} /> Deliver
                            </button>
                          )}
                          {order.status === "DELIVERED" && (
                            <span
                              style={{
                                fontSize: "0.725rem",
                                color: "#059669",
                                fontWeight: 700,
                              }}
                            >
                              Settled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promotion Rules Engine */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
              Active Promotion Rules & Flash Deals
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: "4px 0 0 0",
              }}
            >
              Scheduled discounts, volume tiers, and sitewide flash deals.
            </p>
          </div>
          <span className="badge badge-blue">
            {promotions.length} Active Rules
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {promotions.map((promo) => (
            <div
              key={promo.id}
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  {promo.title}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  Type: {promo.discountType} • Scope: {promo.scope}
                </div>
              </div>
              <span className="badge badge-pink" style={{ fontWeight: 700 }}>
                {promo.discountValue}% OFF
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Add & Edit Product Modal */}
      <ProductModal
        isOpen={showAddModal || Boolean(editingProduct)}
        onClose={() => {
          setShowAddModal(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {
          setEditingProduct(null);
          loadVendorData();
        }}
        currentProfile={currentProfile || null}
        storefronts={vendors}
        defaultVendorId={selectedVendor}
        initialProduct={editingProduct}
      />

      {/* Add Storefront Modal */}

      {/* Order Details Modal */}
      {inspectingOrder && (
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
              maxWidth: 640,
              width: "100%",
              background: "#ffffff",
              borderRadius: 16,
              padding: "1.75rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Package size={20} color="#2563eb" />
                <h3
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "var(--text-primary)",
                  }}
                >
                  Order Details & Payout Breakdown
                </h3>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
                marginBottom: 16,
                background: "#f8fafc",
                padding: 12,
                borderRadius: 8,
                fontSize: "0.825rem",
              }}
            >
              <div>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    display: "block",
                    fontSize: "0.75rem",
                  }}
                >
                  Order Reference:
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#2563eb",
                  }}
                >
                  {inspectingOrder.orderId}
                </span>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    display: "block",
                    fontSize: "0.75rem",
                  }}
                >
                  Order Status:
                </span>
                <span
                  className={`badge ${inspectingOrder.status === "DELIVERED" ? "badge-emerald" : inspectingOrder.status.includes("DISPATCHED") ? "badge-blue" : "badge-green"}`}
                >
                  {inspectingOrder.status}
                </span>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    display: "block",
                    fontSize: "0.75rem",
                  }}
                >
                  Customer Email:
                </span>
                <span style={{ fontWeight: 600 }}>
                  {inspectingOrder.customerEmail}
                </span>
              </div>
              <div>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    display: "block",
                    fontSize: "0.75rem",
                  }}
                >
                  Timestamp:
                </span>
                <span>
                  {new Date(inspectingOrder.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <h4
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                marginBottom: 8,
                color: "var(--text-primary)",
              }}
            >
              Purchased Line Items
            </h4>
            <div
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <table style={{ margin: 0, fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th>Product</th>
                    <th>Storefront</th>
                    <th style={{ textAlign: "right" }}>Unit Price</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Vendor Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectingOrder.items?.map((item, idx) => {
                    const isMyStore = item.vendorId === selectedVendor;
                    return (
                      <tr
                        key={idx}
                        style={{
                          background: isMyStore ? "#eff6ff" : "transparent",
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-secondary)",
                              fontFamily: "monospace",
                            }}
                          >
                            SKU: {item.sku}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge badge-purple"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {item.vendorId}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "monospace",
                          }}
                        >
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                          {item.quantity}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: isMyStore ? "#059669" : "inherit",
                          }}
                        >
                          $
                          {(item.vendorPayout || item.subtotal * 0.9).toFixed(
                            2,
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                background: "#f8fafc",
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.825rem",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Gross Merchandise Value (GMV):
                </span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                  ${inspectingOrder.grossMerchandiseValue.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.825rem",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Tax Collected:
                </span>
                <span style={{ fontFamily: "monospace" }}>
                  ${inspectingOrder.totalTax.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.825rem",
                  marginBottom: 6,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Platform Processing & Commission:
                </span>
                <span style={{ fontFamily: "monospace", color: "#dc2626" }}>
                  -$
                  {(
                    inspectingOrder.totalPlatformCommission +
                    inspectingOrder.paymentProcessingFee
                  ).toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: 6,
                }}
              >
                <span style={{ color: "var(--text-primary)" }}>
                  Total Net Vendor Settlement:
                </span>
                <span style={{ fontFamily: "monospace", color: "#059669" }}>
                  ${inspectingOrder.netVendorPayout.toFixed(2)}
                </span>
              </div>
            </div>

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              {inspectingOrder.status === "CONFIRMED_ATOMIC" && (
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateFulfillment(
                      inspectingOrder.orderId,
                      "DISPATCHED_IN_TRANSIT",
                    )
                  }
                  className="btn btn-primary"
                >
                  <Truck size={14} /> Dispatch Order
                </button>
              )}
              {inspectingOrder.status === "DISPATCHED_IN_TRANSIT" && (
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateFulfillment(
                      inspectingOrder.orderId,
                      "DELIVERED",
                    )
                  }
                  className="btn btn-primary"
                  style={{ background: "#059669", borderColor: "#059669" }}
                >
                  <CheckCircle2 size={14} /> Mark Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPortalView;
