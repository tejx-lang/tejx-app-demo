import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Store,
  BarChart3,
  ShieldCheck,
  Database,
  Lock,
  LogIn,
  AlertTriangle
} from 'lucide-react';
import Logo from './components/Logo';
import { MarketplaceView } from './components/MarketplaceView';
import { VendorPortalView } from './components/VendorPortalView';
import { FinancialMatrixView } from './components/FinancialMatrixView';
import { SecurityCenterView } from './components/SecurityCenterView';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { UserMenuDropdown } from './components/UserMenuDropdown';
import {
  getBackendHealth,
  getDatabaseStatus,
  fetchAuthMe,
  loginAs,
  loginWithCredentials,
  revokeToken,
  clearStoredToken,
  getStoredToken
} from './services/api';
import { BackendHealth, DatabaseStatus, AuthProfile } from './services/types';

// ==========================================
// Permission Helpers
// ==========================================

function userHasPermission(profile: AuthProfile | null, perm: string): boolean {
  if (!profile || !profile.permissions) return false;
  if (profile.permissions.includes('*')) return true;
  return profile.permissions.includes(perm);
}

function canAccessTab(profile: AuthProfile | null, tab: string): boolean {
  if (!profile) return tab === 'marketplace'; // Guests can browse marketplace
  const role = profile.role;
  switch (tab) {
    case 'marketplace':
      return true; // Everyone can browse
    case 'vendor':
      return role === 'admin' || role === 'vendor' || userHasPermission(profile, 'inventory:manage');
    case 'financial':
      return role === 'admin' || userHasPermission(profile, 'analytics:read');
    case 'security':
      return role === 'admin' || userHasPermission(profile, 'users:manage');
    default:
      return false;
  }
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'vendor' | 'financial' | 'security'>('marketplace');
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [currentProfile, setCurrentProfile] = useState<AuthProfile | null>(null);

  // Modal States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserMgmtModalOpen, setIsUserMgmtModalOpen] = useState(false);

  // Auth gate: show login on first load if no token
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const [h, db] = await Promise.all([
        getBackendHealth(),
        getDatabaseStatus()
      ]);
      setHealth(h);
      setDbStatus(db);
    } catch (e) {
      console.warn('[App] Health poll error:', e);
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
    [currentProfile]
  );

  const handleLoginSuccess = (profile: AuthProfile) => {
    setCurrentProfile(profile);
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    checkStatus();
  };

  const handleSignOut = async () => {
    try {
      await revokeToken();
    } catch {
      clearStoredToken();
    }
    setCurrentProfile(null);
    setIsAuthenticated(false);
    setActiveTab('marketplace');
    setIsLoginModalOpen(true);
  };

  const handleQuickRoleChange = async (role: 'guest' | 'customer' | 'vendor' | 'admin') => {
    // Optimistic update for instant feedback
    const roleProfiles: Record<string, AuthProfile> = {
      guest: {
        role: 'guest',
        sub: 'usr-guest',
        name: 'Anonymous Guest',
        email: 'guest@marketplace.io',
        permissions: ['catalog:read'],
        token: getStoredToken() || '',
        tokenType: 'Bearer',
        vendorId: '',
        keyType: 'EdDSA'
      },
      customer: {
        role: 'customer',
        sub: 'usr-cust-1',
        name: 'Elena Vance',
        email: 'elena@digitalnomad.io',
        permissions: ['catalog:read', 'cart:write', 'checkout:execute', 'invoices:read'],
        token: getStoredToken() || '',
        tokenType: 'Bearer',
        vendorId: '',
        keyType: 'EdDSA'
      },
      vendor: {
        role: 'vendor',
        sub: 'usr-vnd-aurora',
        name: 'Aurora Labs Admin',
        email: 'ops@auroralabs.io',
        vendorId: 'vnd-aurora',
        permissions: ['catalog:read', 'inventory:manage', 'products:write', 'orders:fulfill', 'promotions:write', 'analytics:read'],
        token: getStoredToken() || '',
        tokenType: 'Bearer',
        keyType: 'EdDSA'
      },
      admin: {
        role: 'admin',
        sub: 'usr-admin-1',
        name: 'Platform Super-Admin',
        email: 'admin@marketplace.io',
        permissions: ['*'],
        token: getStoredToken() || '',
        tokenType: 'Bearer',
        vendorId: '',
        keyType: 'EdDSA'
      }
    };

    if (roleProfiles[role]) {
      setCurrentProfile(roleProfiles[role]);
    }

    // If switching to a tab that needs different access, jump to marketplace
    if (!canAccessTab(roleProfiles[role], activeTab)) {
      setActiveTab('marketplace');
    }

    try {
      const res = await loginAs(role, role === 'vendor' ? 'vnd-aurora' : '');
      if (res.success && res.data) {
        setCurrentProfile(res.data);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.warn('Backend loginAs call failed, local optimistic profile retained', err);
    }
  };

  const handleTabClick = (tab: 'marketplace' | 'vendor' | 'financial' | 'security') => {
    if (canAccessTab(currentProfile, tab)) {
      setActiveTab(tab);
    }
    // If no access, tab will show a gated message (handled below)
    setActiveTab(tab);
  };

  // Permission-gated content wrapper
  const renderGatedContent = () => {
    // Marketplace is always accessible
    if (activeTab === 'marketplace') {
      return (
        <MarketplaceView
          currentProfile={currentProfile}
          onSwitchRole={handleQuickRoleChange}
        />
      );
    }

    if (activeTab === 'vendor') {
      if (!canAccessTab(currentProfile, 'vendor')) {
        return renderAccessDenied(
          'Vendor Portal',
          'You need inventory management or vendor-level access to use this portal.',
          'vendor'
        );
      }
      return (
        <VendorPortalView
          currentProfile={currentProfile}
          onSwitchRole={handleQuickRoleChange}
        />
      );
    }

    if (activeTab === 'financial') {
      if (!canAccessTab(currentProfile, 'financial')) {
        return renderAccessDenied(
          'Financial Analytics',
          'You need analytics:read permission or admin access to view financial data.',
          'admin'
        );
      }
      return (
        <FinancialMatrixView
          currentProfile={currentProfile}
          onSwitchRole={handleQuickRoleChange}
        />
      );
    }

    if (activeTab === 'security') {
      if (!canAccessTab(currentProfile, 'security')) {
        return renderAccessDenied(
          'Security & User Management',
          'You need users:manage permission or admin access for this section.',
          'admin'
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

  const renderAccessDenied = (title: string, message: string, requiredRole: string) => (
    <div style={{
      maxWidth: 520,
      margin: '4rem auto',
      textAlign: 'center',
      padding: '3rem 2rem',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: '#fff7ed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.25rem',
      }}>
        <Lock size={28} color="#ea580c" />
      </div>
      <h2 style={{
        fontSize: '1.35rem',
        fontWeight: 800,
        color: '#0f172a',
        margin: '0 0 0.5rem',
      }}>
        Access Restricted
      </h2>
      <p style={{
        fontSize: '0.875rem',
        color: '#64748b',
        margin: '0 0 1.5rem',
        lineHeight: 1.6,
      }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={() => setIsLoginModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <LogIn size={15} />
          Sign In with Credentials
        </button>
        {requiredRole === 'vendor' && (
          <button
            className="btn btn-secondary"
            onClick={() => handleQuickRoleChange('vendor')}
          >
            Switch to Vendor
          </button>
        )}
        {requiredRole === 'admin' && (
          <button
            className="btn btn-secondary"
            onClick={() => handleQuickRoleChange('admin')}
          >
            Switch to Admin
          </button>
        )}
      </div>
    </div>
  );

  // Show loading state while checking auth
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafbfc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Logo size={40} showText={false} />
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '1rem' }}>
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  const roleMeta = getRoleBadgeStyle(currentProfile?.role || 'guest');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 2rem'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1720px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Brand Logo & Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Logo size={32} showText={true} />

            {/* Main Primary Navigation */}
            <nav className="segmented-nav">
              <button
                onClick={() => handleTabClick('marketplace')}
                className={`segmented-nav-btn ${activeTab === 'marketplace' ? 'active' : ''}`}
              >
                <ShoppingCart size={15} />
                Marketplace
              </button>

              <button
                onClick={() => handleTabClick('vendor')}
                className={`segmented-nav-btn ${activeTab === 'vendor' ? 'active' : ''}`}
                style={{
                  opacity: canAccessTab(currentProfile, 'vendor') ? 1 : 0.5
                }}
              >
                <Store size={15} />
                Vendor Portal
                {!canAccessTab(currentProfile, 'vendor') && (
                  <Lock size={11} style={{ marginLeft: 3, opacity: 0.6 }} />
                )}
              </button>

              <button
                onClick={() => handleTabClick('financial')}
                className={`segmented-nav-btn ${activeTab === 'financial' ? 'active' : ''}`}
                style={{
                  opacity: canAccessTab(currentProfile, 'financial') ? 1 : 0.5
                }}
              >
                <BarChart3 size={15} />
                Analytics
                {!canAccessTab(currentProfile, 'financial') && (
                  <Lock size={11} style={{ marginLeft: 3, opacity: 0.6 }} />
                )}
              </button>

              <button
                onClick={() => handleTabClick('security')}
                className={`segmented-nav-btn ${activeTab === 'security' ? 'active' : ''}`}
                style={{
                  opacity: canAccessTab(currentProfile, 'security') ? 1 : 0.5
                }}
              >
                <ShieldCheck size={15} />
                Security & IAM
                {!canAccessTab(currentProfile, 'security') && (
                  <Lock size={11} style={{ marginLeft: 3, opacity: 0.6 }} />
                )}
              </button>
            </nav>
          </div>

          {/* Right Controls: Database Status & User Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Database indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <Database size={13} color={dbStatus?.connected ? '#059669' : '#d97706'} />
              <span>MongoDB</span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: dbStatus?.connected ? '#059669' : '#d97706'
                }}
              />
            </div>

            {/* User Menu Dropdown (replaces old select) */}
            <UserMenuDropdown
              currentProfile={currentProfile}
              onSignIn={() => setIsLoginModalOpen(true)}
              onSignOut={handleSignOut}
              onOpenUserManagement={() => setIsUserMgmtModalOpen(true)}
              onQuickSwitch={handleQuickRoleChange}
              hasPermission={hasPermission}
            />
          </div>
        </div>
      </header>

      {/* Contextual Role Bar */}
      <div
        style={{
          background:
            currentProfile?.role === 'admin'
              ? '#ecfdf5'
              : currentProfile?.role === 'vendor'
              ? '#f5f3ff'
              : currentProfile?.role === 'customer'
              ? '#eff6ff'
              : '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.45rem 2rem',
          fontSize: '0.8rem',
          transition: 'all 0.2s ease'
        }}
      >
        <div
          style={{
            maxWidth: '1720px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className={`badge ${roleMeta.badge}`}>
              {roleMeta.label}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {currentProfile?.role === 'admin' &&
                'Full platform access — catalog, orders, analytics, user management, and security.'}
              {currentProfile?.role === 'vendor' &&
                'Vendor mode — manage inventory, fulfill orders, and track your store analytics.'}
              {currentProfile?.role === 'customer' &&
                'Customer mode — browse products, add to cart, and complete secure checkout.'}
              {(!currentProfile || currentProfile?.role === 'guest') &&
                'Guest mode — browse the marketplace. Sign in for full access.'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area (Full Fluid Width) */}
      <main className="app-container" style={{ paddingTop: '1.5rem', flex: 1 }}>
        {renderGatedContent()}
      </main>

      {/* Clean Minimalist Footer */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: '1.25rem 2rem',
          background: '#ffffff',
          fontSize: '0.825rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Aura Marketplace</span>
          <span>•</span>
          <span>Enterprise Multi-Vendor Commerce Engine</span>
        </div>
        <div>
          <span>© {new Date().getFullYear()} Aura Marketplace Inc. All rights reserved.</span>
        </div>
      </footer>

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
              handleQuickRoleChange('guest');
            }
          }
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isUserMgmtModalOpen}
        onClose={() => setIsUserMgmtModalOpen(false)}
        currentProfile={currentProfile}
      />
    </div>
  );
};

function getRoleBadgeStyle(role: string) {
  switch (role) {
    case 'admin':
      return { badge: 'badge-emerald', label: 'Super-Admin' };
    case 'vendor':
      return { badge: 'badge-purple', label: 'Vendor (Aurora Labs)' };
    case 'customer':
      return { badge: 'badge-blue', label: 'Customer' };
    default:
      return { badge: 'badge-neutral', label: 'Guest' };
  }
}

export default App;
