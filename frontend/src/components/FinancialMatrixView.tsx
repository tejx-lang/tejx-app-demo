import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  RefreshCw,
  Archive,
  ArrowUpRight,
  Database,
  Store,
  Clock,
  Filter,
  CheckCircle2,
  Building2,
  Lock,
} from "lucide-react";
import {
  fetchPlatformFinancialMatrix,
  fetchCommissionLedger,
  fetchTopKAnalytics,
  fetchDataTiering,
  archiveColdData,
  fetchStorefronts,
} from "../services/api";
import {
  FinancialMatrix,
  CommissionLedgerEntry,
  TopKAnalytics,
  DataTieringStatus,
  AuthProfile,
  VendorStorefront,
} from "../services/types";
import { CustomDropdown } from "./CustomDropdown";

interface FinancialMatrixViewProps {
  currentProfile?: AuthProfile | null;
  onSwitchRole?: (role: "guest" | "customer" | "vendor" | "admin") => void;
}

const PERIOD_OPTIONS = [
  { id: "hourly", label: "Last Hour", desc: "Past 60 minutes" },
  { id: "daily", label: "Last 24h", desc: "Past 24 hours" },
  { id: "weekly", label: "Last 7 Days", desc: "Past 7 days" },
  { id: "monthly", label: "Last 30 Days", desc: "Past 30 days" },
  { id: "all", label: "All Time", desc: "All historical transactions" },
];

export const FinancialMatrixView: React.FC<FinancialMatrixViewProps> = ({
  currentProfile,
  onSwitchRole,
}) => {
  const getInitialPeriod = (): string => {
    if (typeof window === "undefined") return "daily";
    const params = new URLSearchParams(window.location.search);
    const p = (params.get("period") || "").toLowerCase();
    if (["hourly", "daily", "weekly", "monthly", "all"].includes(p)) return p;
    return "daily";
  };

  const getInitialStore = (): string => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    return params.get("store") || "all";
  };

  const [period, setPeriodState] = useState<string>(getInitialPeriod);
  const [selectedStore, setSelectedStoreState] =
    useState<string>(getInitialStore);
  const [storefronts, setStorefronts] = useState<VendorStorefront[]>([]);

  const isAdmin = currentProfile?.role === "admin";
  const isVendor = currentProfile?.role === "vendor";
  const vendorId = currentProfile?.vendorId || "";

  // For vendor, store is strictly locked to their vendorId
  const effectiveStore = isVendor ? vendorId : selectedStore;

  const setPeriod = (p: string) => {
    setPeriodState(p);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("period", p);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  };

  const setSelectedStore = (s: string) => {
    setSelectedStoreState(s);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (s === "all") {
        url.searchParams.delete("store");
      } else {
        url.searchParams.set("store", s);
      }
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  };

  useEffect(() => {
    fetchStorefronts()
      .then(setStorefronts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("period")) {
        url.searchParams.set("period", period);
        window.history.replaceState(
          {},
          "",
          url.pathname + url.search + url.hash,
        );
      }
    }
  }, [period]);

  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search);
      const p = (params.get("period") || "").toLowerCase();
      if (["hourly", "daily", "weekly", "monthly", "all"].includes(p)) {
        setPeriodState(p);
      }
      const s = params.get("store") || "all";
      setSelectedStoreState(s);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const [matrix, setMatrix] = useState<FinancialMatrix | null>(null);
  const [ledger, setLedger] = useState<CommissionLedgerEntry[]>([]);
  const [topK, setTopK] = useState<TopKAnalytics | null>(null);
  const [tiering, setTiering] = useState<DataTieringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState<string | null>(null);

  const loadAllFinancialData = async () => {
    setLoading(true);
    try {
      const [mat, led, top, tier] = await Promise.all([
        fetchPlatformFinancialMatrix(period, effectiveStore),
        fetchCommissionLedger(effectiveStore, period),
        fetchTopKAnalytics(5, effectiveStore, period),
        fetchDataTiering(),
      ]);
      setMatrix(mat);
      setLedger(led || []);
      setTopK(top);
      setTiering(tier);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFinancialData();
  }, [period, effectiveStore]);

  const handleArchive = async () => {
    setArchiving(true);
    setArchiveMsg(null);
    try {
      const res = await archiveColdData();
      if (res.success) {
        setArchiveMsg(
          `Transferred ${res.movedOrdersCount} order records to cold archive tier.`,
        );
        loadAllFinancialData();
      } else {
        setArchiveMsg(res.message || "Archival completed.");
      }
    } finally {
      setArchiving(false);
    }
  };

  const activePeriodObj =
    PERIOD_OPTIONS.find((p) => p.id === period) || PERIOD_OPTIONS[1];
  const currentVendorStorefront = storefronts.find((s) => s.id === vendorId);
  const currentSelectedStorefront = storefronts.find(
    (s) => s.id === selectedStore,
  );

  const storeOptions = [
    {
      value: "all",
      label: "All Stores (Global Platform)",
      sublabel: "Consolidated analytics",
      badge: "Platform Wide",
      badgeColor: "#2563eb",
    },
    ...storefronts.map((sf) => ({
      value: sf.id,
      label: sf.name,
      sublabel: sf.category || `Storefront ID: ${sf.id}`,
      badge: sf.id,
      badgeColor: "#7c3aed",
    })),
  ];

  return (
    <div className="section-container">
      {/* Header Banner */}
      <div
        className="section-header"
        style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              flexWrap: "wrap",
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
              Financial Analytics
            </h2>

            {isAdmin && selectedStore !== "all" && (
              <span
                className="badge badge-purple"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Filtered: {currentSelectedStorefront?.name || selectedStore}
              </span>
            )}
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            {isVendor
              ? `Real-time earnings, gross sales, and settlement ledger`
              : "Real-time (GMV), commission and  breakdowns."}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Admin Store Selector Dropdown */}
            {isAdmin && (
              <div style={{ minWidth: 260 }}>
                <CustomDropdown
                  value={selectedStore}
                  onChange={setSelectedStore}
                  options={storeOptions}
                  placeholder="Filter by Store..."
                  icon={<Store size={15} color="#2563eb" />}
                />
              </div>
            )}

            {/* Vendor Fixed Store Badge */}
            {isVendor && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 14px",
                  borderRadius: 10,
                  background: "rgba(124, 58, 237, 0.08)",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  color: "#6d28d9",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                }}
                title="Your view is strictly locked to your registered storefront"
              >
                <Store size={15} />
                <span>
                  Store:{" "}
                  <strong>{currentVendorStorefront?.name || vendorId}</strong>
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    background: "#7c3aed",
                    color: "#fff",
                    padding: "1px 6px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  Locked
                </span>
              </div>
            )}

            {/* Period selector */}
            <div className="segmented-nav">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`segmented-nav-btn ${period === p.id ? "active" : ""}`}
                  title={p.desc}
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "0.825rem",
                    padding: "6px 12px",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadAllFinancialData}
              className="btn btn-secondary"
              title="Refresh metrics"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Role Context & Permissions Notice */}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
            {isVendor
              ? "Store Gross Sales"
              : selectedStore !== "all"
                ? "Store Gross Sales"
                : "Gross Merchandise Value (GMV)"}
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "monospace",
            }}
          >
            $
            {matrix?.grossMerchandiseValue
              ? matrix.grossMerchandiseValue.toFixed(2)
              : "0.00"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#059669",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ArrowUpRight size={13} />{" "}
            {isVendor
              ? "Processed store volume"
              : "Processed transaction volume"}
          </div>
        </div>

        <div className="card">
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: 4,
            }}
          >
            {isVendor
              ? "Platform Fee (12% Cut)"
              : selectedStore !== "all"
                ? "Platform Cut from Store"
                : "Platform Revenue (12% Cut)"}
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#059669",
              fontFamily: "monospace",
            }}
          >
            $
            {matrix?.platformCommissionRevenue
              ? matrix.platformCommissionRevenue.toFixed(2)
              : "0.00"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {isVendor ? "Retained by marketplace" : "Net marketplace cut"}
          </div>
        </div>

        <div className="card">
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: 4,
            }}
          >
            {isVendor
              ? "Your Net Earnings (Payout)"
              : selectedStore !== "all"
                ? "Payable to This Store"
                : "Vendor Payout Reserve"}
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#2563eb",
              fontFamily: "monospace",
            }}
          >
            $
            {matrix?.netVendorPayoutReserve
              ? matrix.netVendorPayoutReserve.toFixed(2)
              : "0.00"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {isVendor ? "Disbursable to your account" : "Payable to sellers"}
          </div>
        </div>

        <div className="card">
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: 4,
            }}
          >
            Sales Tax (8%)
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#d97706",
              fontFamily: "monospace",
            }}
          >
            $
            {matrix?.totalTaxCollected
              ? matrix.totalTaxCollected.toFixed(2)
              : "0.00"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Statutory tax escrow
          </div>
        </div>

        <div className="card">
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
              marginBottom: 4,
            }}
          >
            Average Order Value
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "monospace",
            }}
          >
            $
            {matrix?.averageOrderValue
              ? matrix.averageOrderValue.toFixed(2)
              : "0.00"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {matrix?.settledTransactionsCount || 0} orders •{" "}
            {matrix?.totalUnitsSold || 0} units
          </div>
        </div>
      </div>

      {/* Top-K Analytical Grouping & Data Tiering */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Top-K Grouping */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
              Top-K Products by Revenue
            </h3>
            <span className="badge badge-purple">Top 5 Leaders</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Units Sold</th>
                  <th style={{ textAlign: "right" }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topK?.topProducts && topK.topProducts.length > 0 ? (
                  topK.topProducts.map((tp) => (
                    <tr key={tp.productId}>
                      <td
                        style={{
                          fontWeight: 700,
                          color: "var(--text-secondary)",
                        }}
                      >
                        #{tp.rank}
                      </td>
                      <td style={{ fontWeight: 600 }}>{tp.title}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {tp.category}
                      </td>
                      <td
                        style={{ textAlign: "right", fontFamily: "monospace" }}
                      >
                        {tp.unitsSold}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: "#059669",
                        }}
                      >
                        ${tp.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--text-secondary)",
                      }}
                    >
                      No analytical data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Lifecycle Tiering */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
              Automated Data Lifecycle Tiering
            </h3>
            <span className="badge badge-amber">Cost Optimization</span>
          </div>

          <p
            style={{
              fontSize: "0.825rem",
              color: "var(--text-secondary)",
              marginBottom: 16,
            }}
          >
            Transfers older historical transactions to compressed cold archive
            storage while keeping them accessible for annual tax audits.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
              >
                Hot Query Cluster
              </div>
              <div
                style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: 4 }}
              >
                {tiering?.hotClusterCount ?? 0} Orders
              </div>
              <div
                style={{ fontSize: "0.7rem", color: "#059669", marginTop: 4 }}
              >
                Retention: Active 365 Days
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
              >
                Cold Archive Tier
              </div>
              <div
                style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: 4 }}
              >
                {tiering?.coldArchiveCount ?? 0} Orders
              </div>
              <div
                style={{ fontSize: "0.7rem", color: "#2563eb", marginTop: 4 }}
              >
                Compressed BSON Storage
              </div>
            </div>
          </div>

          {archiveMsg && (
            <div
              style={{
                padding: 8,
                borderRadius: 6,
                background: "#ecfdf5",
                color: "#059669",
                fontSize: "0.75rem",
                marginBottom: 12,
              }}
            >
              {archiveMsg}
            </div>
          )}

          <button
            onClick={handleArchive}
            className="btn btn-secondary"
            disabled={archiving}
            style={{ width: "100%", fontSize: "0.85rem" }}
          >
            <Archive size={14} />
            {archiving
              ? "Archiving Records..."
              : "Execute Lifecycle Cold Archival Run"}
          </button>
        </div>
      </div>

      {/* Platform Commission Ledger Table */}
      <div className="card">
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
              Platform Commission Ledger & Settlement Audit
            </h3>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: "4px 0 0 0",
              }}
            >
              Itemized ledger tracking marketplace commission cuts, statutory
              taxes, and seller disbursements.
            </p>
          </div>
          <span className="badge badge-emerald">
            Audited Entries ({ledger.length})
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Entry Ref</th>
                <th>Order & SKU</th>
                <th>Seller</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
                <th style={{ textAlign: "right" }}>Commission (12%)</th>
                <th style={{ textAlign: "right" }}>Tax (8%)</th>
                <th style={{ textAlign: "right" }}>Vendor Payout</th>
                <th style={{ textAlign: "center" }}>Settlement</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length > 0 ? (
                ledger.map((entry) => (
                  <tr key={entry.entryRef}>
                    <td
                      style={{
                        fontFamily: "monospace",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {entry.entryRef}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{entry.itemTitle}</div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-secondary)",
                          fontFamily: "monospace",
                        }}
                      >
                        {entry.orderId} • {entry.sku}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-primary)" }}>
                      {entry.vendorName}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      ${entry.grossSubtotal.toFixed(2)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "monospace",
                        color: "#059669",
                        fontWeight: 600,
                      }}
                    >
                      +${entry.platformCommissionCut.toFixed(2)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "monospace",
                        color: "#d97706",
                      }}
                    >
                      ${entry.taxAmount.toFixed(2)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontWeight: 700,
                      }}
                    >
                      ${entry.netVendorCredit.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-green">
                        {entry.settlementStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No settled commission entries found yet. Complete a checkout
                    in the Marketplace to trigger ledger generation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialMatrixView;
