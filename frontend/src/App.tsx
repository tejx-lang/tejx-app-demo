import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Store,
  BarChart3,
  ShieldCheck,
  Database,
  Lock,
  LogIn,
  AlertTriangle,
} from "lucide-react";
import Logo from "./components/Logo";
import { MarketplaceView } from "./components/MarketplaceView";
import { VendorPortalView } from "./components/VendorPortalView";
import { FinancialMatrixView } from "./components/FinancialMatrixView";
import { SecurityCenterView } from "./components/SecurityCenterView";
import { LoginModal } from "./components/LoginModal";
import { UserMenuDropdown } from "./components/UserMenuDropdown";
import {
  getBackendHealth,
  getDatabaseStatus,
  fetchAuthMe,
  loginAs,
  revokeToken,
  clearStoredToken,
  clearOriginalToken,
  getStoredToken,
} from "./services/api";
import { BackendHealth, DatabaseStatus, AuthProfile } from "./services/types";

// ==========================================
// Permission Helpers
// ==========================================

function userHasPermission(profile: AuthProfile | null, perm: string): boolean {
  if (!profile || !profile.permissions) return false;
  if (profile.permissions.includes("*")) return true;
  return profile.permissions.includes(perm);
}

function canAccessTab(profile: AuthProfile | null, tab: string): boolean {
  if (!profile) return tab === "marketplace"; // Guests can browse marketplace
  const role = profile.role;
  switch (tab) {
    case "marketplace":
      return true; // Everyone can browse
    case "vendor":
      return (
        role === "admin" ||
        role === "vendor" ||
        userHasPermission(profile, "inventory:manage")
      );
    case "financial":
      return role === "admin" || userHasPermission(profile, "analytics:read");
    case "security":
      return role === "admin" || userHasPermission(profile, "users:manage");
    default:
      return false;
  }
}

type TabType = "marketplace" | "vendor" | "financial" | "security";

function getTabFromUrl(): TabType {
  if (typeof window === "undefined") return "marketplace";
  const path = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, "");
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "");
  const target = path || hash;
  if (target === "vendor" || target === "vendor-portal") return "vendor";
  if (target === "financial" || target === "analytics") return "financial";
  if (target === "security" || target === "users" || target === "iam")
    return "security";
  return "marketplace";
}

function getUrlForTab(tab: TabType): string {
  switch (tab) {
    case "vendor":
      return "/vendor";
    case "financial":
      return "/financial";
    case "security":
      return "/security";
    default:
      return "/marketplace";
  }
}

export const App: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<TabType>(() =>
    getTabFromUrl(),
  );
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [currentProfile, setCurrentProfile] = useState<AuthProfile | null>(
    null,
  );
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Modal States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Auth gate: show login on first load if no token
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const handleTabClick = useCallback((tab: TabType, updateHistory = true) => {
    setActiveTabState(tab);
    if (updateHistory && typeof window !== "undefined") {
      const url = getUrlForTab(tab);
      if (window.location.pathname !== url) {
        window.history.pushState({ tab }, "", url);
      }
    }
  }, []);

  // Sync tab with browser URL on popstate and initial load
  useEffect(() => {
    const initialTab = getTabFromUrl();
    setActiveTabState(initialTab);
    const targetUrl = getUrlForTab(initialTab);

    // If on root, auto redirect to /marketplace
    if (window.location.pathname === "/" || window.location.pathname === "") {
      const search = window.location.search || "";
      const hash = window.location.hash || "";
      window.history.replaceState({ tab: "marketplace" }, "", `/marketplace${search}${hash}`);
    } else if (window.location.pathname !== targetUrl) {
      window.history.replaceState({ tab: initialTab }, "", targetUrl);
    }

    const handlePopState = (e: PopStateEvent) => {
      if (window.location.pathname === "/" || window.location.pathname === "") {
        setActiveTabState("marketplace");
        window.history.replaceState({ tab: "marketplace" }, "", "/marketplace");
        return;
      }
      if (e.state?.tab) {
        setActiveTabState(e.state.tab);
      } else {
        setActiveTabState(getTabFromUrl());
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const [h, db] = await Promise.all([
        getBackendHealth(),
        getDatabaseStatus(),
      ]);
      setHealth(h);
      setDbStatus(db);
    } catch (e) {
      console.warn("[App] Health poll error:", e);
    }
  }, []);

  // Initial auth check — show LoginModal if not authenticated
  useEffect(() => {
    const init = async () => {
      const token = getStoredToken();
      if (token) {
        // Validate existing token
        const auth = await fetchAuthMe();
        if (auth.success && auth.data) {
          setCurrentProfile(auth.data);
          setIsAuthenticated(true);
          setAuthChecked(true);
          checkStatus();
          return;
        }
        clearStoredToken();
      }
      // No valid token — show login
      setAuthChecked(true);
      setIsLoginModalOpen(true);
    };
    init();
  }, [checkStatus]);

  // Poll health every 30s once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkStatus]);

  const hasPermission = useCallback(
    (perm: string) => userHasPermission(currentProfile, perm),
    [currentProfile],
  );

  const handleLoginSuccess = (profile: AuthProfile) => {
    setCurrentProfile(profile);
    setIsAuthenticated(true);
    setSessionError(null);
    setIsLoginModalOpen(false);
    checkStatus();
  };

  const handleSignOut = async () => {
    try {
      await revokeToken();
    } catch {
      clearStoredToken();
      clearOriginalToken();
    }
    clearStoredToken();
    clearOriginalToken();
    setCurrentProfile(null);
    setIsAuthenticated(false);
    handleTabClick("marketplace");
    setIsLoginModalOpen(true);
  };

  const handleQuickRoleChange = async (
    role: "guest" | "customer" | "vendor" | "admin",
    vendorId?: string,
  ) => {
    if (role === "guest") {
      await handleSignOut();
      return;
    }

    const res = await loginAs(role, vendorId || "");
    if (!res.success || !res.data) {
      setSessionError(
        res.error ||
          "Unable to change session. Your current session is unchanged.",
      );
      return;
    }

    setCurrentProfile(res.data);
    setIsAuthenticated(true);
    setSessionError(null);
    if (!canAccessTab(res.data, activeTab)) {
      handleTabClick("marketplace");
    }
  };

  // Permission-gated content wrapper
  const renderGatedContent = () => {
    // Marketplace is always accessible
    if (activeTab === "marketplace") {
      return (
        <MarketplaceView
          currentProfile={currentProfile}
          onSwitchRole={handleQuickRoleChange}
          onNavigateTab={handleTabClick}
        />
      );
    }

    if (activeTab === "vendor") {
      if (!canAccessTab(currentProfile, "vendor")) {
        return renderAccessDenied(
          "Vendor Portal",
          "You need inventory management or vendor-level access to use this portal.",
        );
      }
      return (
        <VendorPortalView
          currentProfile={currentProfile}
          onSwitchRole={handleQuickRoleChange}
        />
      );
    }

    if (activeTab === "financial") {
      if (!canAccessTab(currentProfile, "financial")) {
        return renderAccessDenied(
          "Financial Analytics",
          "You need analytics:read permission or admin access to view financial data.",
        );
      }
      return (
        <FinancialMatrixView
          currentProfile={currentProfile}
          onSwitchRole={handleQuickRoleChange}
        />
      );
    }

    if (activeTab === "security") {
      if (!canAccessTab(currentProfile, "security")) {
        return renderAccessDenied(
          "Security & User Management",
          "You need users:manage permission or admin access for this section.",
        );
      }
      return (
        <SecurityCenterView
          currentProfile={currentProfile}
          onProfileChange={setCurrentProfile}
        />
      );
    }

    return null;
  };

  const renderAccessDenied = (title: string, message: string) => (
    <div
      style={{
        maxWidth: 520,
        margin: "4rem auto",
        textAlign: "center",
        padding: "3rem 2rem",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#fff7ed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.25rem",
        }}
      >
        <Lock size={28} color="#ea580c" />
      </div>
      <h2
        style={{
          fontSize: "1.35rem",
          fontWeight: 800,
          color: "#0f172a",
          margin: "0 0 0.5rem",
        }}
      >
        {title} is restricted
      </h2>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#64748b",
          margin: "0 0 1.5rem",
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btn-primary"
          onClick={() => setIsLoginModalOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <LogIn size={15} />
          Sign In with Credentials
        </button>
      </div>
    </div>
  );

  // Show loading state while checking auth
  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafbfc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Logo size={40} showText={false} />
          <p
            style={{
              color: "#64748b",
              fontSize: "0.875rem",
              marginTop: "1rem",
            }}
          >
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-canvas)",
        overflow: "hidden",
      }}
    >
      {/* Top Navigation Bar - Fixed at top without scroll */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0.65rem 1.5rem",
          flexShrink: 0,
          overflow: "visible",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1720px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "nowrap",
          }}
        >
          {/* Brand Logo & Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Logo size={32} showText={true} />

            {/* Main Primary Navigation */}
            <nav className="segmented-nav" style={{ flexShrink: 0 }}>
              <button
                onClick={() => handleTabClick("marketplace")}
                className={`segmented-nav-btn ${activeTab === "marketplace" ? "active" : ""}`}
              >
                <ShoppingCart size={15} />
                Marketplace
              </button>

              <button
                onClick={() => handleTabClick("vendor")}
                className={`segmented-nav-btn ${activeTab === "vendor" ? "active" : ""}`}
                style={{
                  opacity: canAccessTab(currentProfile, "vendor") ? 1 : 0.45,
                  cursor: canAccessTab(currentProfile, "vendor")
                    ? "pointer"
                    : "not-allowed",
                }}
                title={
                  canAccessTab(currentProfile, "vendor")
                    ? "Vendor Operations Portal"
                    : "Requires Vendor or Admin privileges"
                }
              >
                <Store size={15} />
                Vendor Portal
              </button>

              <button
                onClick={() => handleTabClick("financial")}
                className={`segmented-nav-btn ${activeTab === "financial" ? "active" : ""}`}
                style={{
                  opacity: canAccessTab(currentProfile, "financial") ? 1 : 0.45,
                  cursor: canAccessTab(currentProfile, "financial")
                    ? "pointer"
                    : "not-allowed",
                }}
                title={
                  canAccessTab(currentProfile, "financial")
                    ? "Financial Analytics & Revenue Matrix"
                    : "Requires Analytics or Admin privileges"
                }
              >
                <BarChart3 size={15} />
                Analytics
              </button>

              <button
                onClick={() => handleTabClick("security")}
                className={`segmented-nav-btn ${activeTab === "security" ? "active" : ""}`}
                style={{
                  opacity: canAccessTab(currentProfile, "security") ? 1 : 0.45,
                  cursor: canAccessTab(currentProfile, "security")
                    ? "pointer"
                    : "not-allowed",
                }}
                title={
                  canAccessTab(currentProfile, "security")
                    ? "Identity, Access & Security Management"
                    : "Requires Administrator privileges"
                }
              >
                <ShieldCheck size={15} />
                Users & Security
              </button>
            </nav>
          </div>

          {/* Right Controls: Database Status & User Menu */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {/* Database indicator (Admin only) */}
            {currentProfile?.role === "admin" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  padding: "0.35rem 0.65rem",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Database
                  size={13}
                  color={dbStatus?.connected ? "#059669" : "#d97706"}
                />
                <span>MongoDB</span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: dbStatus?.connected ? "#059669" : "#d97706",
                  }}
                />
              </div>
            )}

            {/* User Menu Dropdown (replaces old select) */}
            <UserMenuDropdown
              currentProfile={currentProfile}
              isAuthenticated={isAuthenticated}
              onSignIn={() => setIsLoginModalOpen(true)}
              onSignOut={handleSignOut}
              onOpenUserManagement={() => setActiveTab("security")}
              onQuickSwitch={handleQuickRoleChange}
              hasPermission={hasPermission}
              onProfileUpdated={setCurrentProfile}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area (Full Fluid Width) */}
      <main
        className="app-container no-scrollbar"
        style={{
          paddingTop: "1rem",
          paddingBottom: "1rem",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflowY: activeTab === "marketplace" ? "hidden" : "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {sessionError && (
          <div
            role="alert"
            style={{
              maxWidth: "1720px",
              margin: "0 auto 1.25rem",
              padding: "0.75rem 1.25rem",
              borderRadius: 8,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              fontSize: "0.825rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {sessionError}
          </div>
        )}
        {renderGatedContent()}
      </main>

      {/* Clean Minimalist Footer (on non-marketplace tabs) */}
      {activeTab !== "marketplace" && (
        <footer
          style={{
            borderTop: "1px solid #e2e8f0",
            padding: "1rem 2rem",
            background: "#ffffff",
            fontSize: "0.825rem",
            color: "var(--text-secondary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            width: "100%",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              Aura Marketplace
            </span>
            <span>•</span>
            <span>Enterprise Multi-Vendor Commerce Engine</span>
          </div>
          <div>
            <span>
              © {new Date().getFullYear()} Aura Marketplace Inc. All rights
              reserved.
            </span>
          </div>
        </footer>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          // If user is authenticated, allow close. If not, keep it open.
          if (isAuthenticated) {
            setIsLoginModalOpen(false);
          } else {
            // Allow guest browse by closing
            setIsLoginModalOpen(false);
            if (!currentProfile) {
              handleQuickRoleChange("guest");
            }
          }
        }}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default App;
