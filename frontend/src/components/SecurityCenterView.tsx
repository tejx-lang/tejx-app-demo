import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Users,
  Lock,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  loginAs,
  fetchAuthMe,
  revokeToken,
  getStoredToken,
  fetchStaffAccounts,
  createStaffAccount
} from '../services/api';
import { AuthProfile, StaffAccount } from '../services/types';

interface SecurityCenterViewProps {
  currentProfile: AuthProfile | null;
  onProfileChange: (profile: AuthProfile | null) => void;
}

export const SecurityCenterView: React.FC<SecurityCenterViewProps> = ({
  currentProfile,
  onProfileChange
}) => {
  const [tokenString, setTokenString] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Staff sub-accounts state
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['inventory:read', 'orders:read']);

  const availablePermissions = [
    { id: 'inventory:read', label: 'View Inventory & Stock' },
    { id: 'inventory:write', label: 'Modify Stock & Pricing' },
    { id: 'orders:read', label: 'Inspect Sub-Orders' },
    { id: 'orders:fulfillment', label: 'Dispatch & Mark Fulfilled' },
    { id: 'finance:read', label: 'Access Financial Analytics' }
  ];

  useEffect(() => {
    const token = getStoredToken();
    if (token) setTokenString(token);
    loadStaff();
  }, [currentProfile]);

  const loadStaff = async () => {
    const list = await fetchStaffAccounts(currentProfile?.vendorId || 'vnd-aurora');
    setStaffList(list);
  };

  const handleRoleSwitch = async (role: 'guest' | 'customer' | 'vendor' | 'admin') => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await loginAs(role, role === 'vendor' ? 'vnd-aurora' : '');
      if (res.success && res.data) {
        onProfileChange(res.data);
        setTokenString(res.data.token);
        setMessage({
          text: `Switched active profile to ${role.toUpperCase()} with Asymmetric JWT!`,
          type: 'success'
        });
      } else {
        setMessage({ text: res.error || 'Authentication failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    try {
      await revokeToken();
      onProfileChange(null);
      setTokenString('');
      setMessage({
        text: 'Session revoked. Token placed into the server-side Blacklist Cache.',
        type: 'info'
      });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetchAuthMe();
      if (res.success && res.data) {
        onProfileChange(res.data);
        setMessage({
          text: `Verified via Public Key! Active User: ${res.data.name} (${res.data.role})`,
          type: 'success'
        });
      } else {
        setMessage({
          text: `Verification rejected: ${res.error || 'Token invalid or blacklisted'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePerm = (perm: string) => {
    if (selectedPerms.includes(perm)) {
      setSelectedPerms(selectedPerms.filter(p => p !== perm));
    } else {
      setSelectedPerms([...selectedPerms, perm]);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail) return;
    setLoading(true);
    try {
      const res = await createStaffAccount({
        vendorId: currentProfile?.vendorId || 'vnd-aurora',
        name: staffName,
        email: staffEmail,
        permissions: selectedPerms
      });
      if (res.success) {
        setMessage({ text: `Staff sub-account for ${staffName} created!`, type: 'success' });
        setStaffName('');
        setStaffEmail('');
        loadStaff();
      } else {
        setMessage({ text: res.error || 'Failed to create staff', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Security & Access Control (IAM)
            </h2>
            <span className="badge badge-purple">Zero-Trust Architecture</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Asymmetric JWT verification, 4-tier Role-Based Access Control, session revocation cache, and granular vendor staff sub-accounts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={handleVerify}
            disabled={loading || !tokenString}
          >
            Verify Token
          </button>
          <button
            className="btn btn-danger"
            onClick={handleRevoke}
            disabled={loading || !tokenString}
          >
            Revoke Session
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: '0.85rem',
            background:
              message.type === 'success'
                ? '#ecfdf5'
                : message.type === 'error'
                ? '#fff1f2'
                : '#eff6ff',
            border:
              message.type === 'success'
                ? '1px solid #a7f3d0'
                : message.type === 'error'
                ? '1px solid #fecdd3'
                : '1px solid #bfdbfe',
            color:
              message.type === 'success'
                ? '#059669'
                : message.type === 'error'
                ? '#e11d48'
                : '#2563eb'
          }}
        >
          {message.text}
        </div>
      )}

      {/* RBAC Role Switcher */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>
          Role-Based Access Control (RBAC) Switcher
        </h3>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Switch between roles to test endpoint authorization and UI permissions in real-time.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div
            onClick={() => handleRoleSwitch('guest')}
            className={`rbac-card ${currentProfile?.role === 'guest' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>Anonymous Guest</span>
              {currentProfile?.role === 'guest' && <span className="badge badge-neutral" style={{ fontSize: '0.675rem' }}>ACTIVE</span>}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Can browse catalog & view facets. Cannot checkout.
            </span>
          </div>

          <div
            onClick={() => handleRoleSwitch('customer')}
            className={`rbac-card ${currentProfile?.role === 'customer' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>Customer (Buyer)</span>
              {currentProfile?.role === 'customer' && <span className="badge badge-blue" style={{ fontSize: '0.675rem' }}>ACTIVE</span>}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Can checkout, generate invoices, & test idempotency.
            </span>
          </div>

          <div
            onClick={() => handleRoleSwitch('vendor')}
            className={`rbac-card ${currentProfile?.role === 'vendor' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>Verified Vendor</span>
              {currentProfile?.role === 'vendor' && <span className="badge badge-purple" style={{ fontSize: '0.675rem' }}>ACTIVE</span>}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Can replenish warehouse stock & manage staff.
            </span>
          </div>

          <div
            onClick={() => handleRoleSwitch('admin')}
            className={`rbac-card ${currentProfile?.role === 'admin' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>Platform Super-Admin</span>
              {currentProfile?.role === 'admin' && <span className="badge badge-emerald" style={{ fontSize: '0.675rem' }}>ACTIVE</span>}
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Full access: Financial ledger, data tiering, settlements.
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {/* Active Session & Claims */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Asymmetric JWT Claims
            </h3>
            <span className={`badge ${currentProfile ? 'badge-green' : 'badge-amber'}`}>
              {currentProfile ? `${currentProfile.role.toUpperCase()} ACTIVE` : 'UNAUTHENTICATED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Subject (sub)</span>
              <span style={{ fontWeight: 600, fontSize: '0.825rem', fontFamily: 'monospace' }}>{currentProfile?.sub || 'None'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Principal User</span>
              <span style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                {currentProfile ? `${currentProfile.name} (${currentProfile.email})` : '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Active Role</span>
              <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>
                {currentProfile?.role || 'Guest'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Signature Algorithm</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                EdDSA (Ed25519 Asymmetric)
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>
                Raw Token Payload:
              </span>
              <div
                style={{
                  padding: 8,
                  borderRadius: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  color: 'var(--text-secondary)',
                  maxHeight: 80,
                  overflowY: 'auto'
                }}
              >
                {tokenString || 'No active token. Select a role above to generate an asymmetric JWT.'}
              </div>
            </div>
          </div>
        </div>

        {/* Granular Staff Sub-Accounts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Vendor Staff Sub-Accounts
            </h3>
            <span className="badge badge-blue">Multi-Tenant IAM</span>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Create restricted sub-accounts for employees with custom permission scopes.
          </p>

          <form onSubmit={handleCreateStaff} style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Staff Member Name"
                className="input"
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="staff@vendor.com"
                className="input"
                value={staffEmail}
                onChange={e => setStaffEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                Permissions:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {availablePermissions.map(p => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: selectedPerms.includes(p.id) ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(p.id)}
                      onChange={() => handleTogglePerm(p.id)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !staffName || !staffEmail}
              style={{ width: '100%', fontSize: '0.825rem' }}
            >
              Issue Restricted Staff Account
            </button>
          </form>

          {/* Existing Staff list */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
              Active Staff Members ({staffList.length}):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, maxHeight: 120, overflowY: 'auto' }}>
              {staffList.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{s.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {s.permissions?.map(perm => (
                      <span key={perm} className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityCenterView;
