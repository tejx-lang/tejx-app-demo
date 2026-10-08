import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Key,
  Lock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Store,
  PlusCircle,
  RotateCcw,
  Check,
  X,
  Mail,
  User
} from 'lucide-react';
import {
  fetchUserAccounts,
  createUserAccount,
  updateUserAccount,
  updateUserPassword,
  deleteUserAccount,
  fetchStorefronts,
  createStorefront,
  fetchAuthMe,
  revokeToken,
  getStoredToken
} from '../services/api';
import { UserAccount, AuthProfile, VendorStorefront } from '../services/types';

interface SecurityCenterViewProps {
  currentProfile: AuthProfile | null;
  onProfileChange: (profile: AuthProfile | null) => void;
}

export const SecurityCenterView: React.FC<SecurityCenterViewProps> = ({
  currentProfile,
  onProfileChange
}) => {
  const [activeSection, setActiveSection] = useState<'users' | 'storefronts' | 'security'>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [storefronts, setStorefronts] = useState<VendorStorefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add User State
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'vendor' | 'customer'>('customer');
  const [newVendorId, setNewVendorId] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>([
    'catalog:read',
    'cart:write',
    'checkout:execute',
    'invoices:read'
  ]);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'vendor' | 'customer'>('customer');
  const [editVendorId, setEditVendorId] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  // Password Modal State
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserAccount | null>(null);
  const [updatedPassword, setUpdatedPassword] = useState('');

  // Add Storefront State
  const [showAddStorefrontModal, setShowAddStorefrontModal] = useState(false);
  const [storefrontName, setStorefrontName] = useState('');
  const [storefrontId, setStorefrontId] = useState('');
  const [storefrontTier, setStorefrontTier] = useState('Verified Partner');
  const [isSubmittingStorefront, setIsSubmittingStorefront] = useState(false);

  // Asymmetric Security State
  const [tokenString, setTokenString] = useState<string>('');
  const [securityMessage, setSecurityMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const allAvailablePermissions = [
    { key: '*', label: 'All Super-Admin Access (*)', desc: 'Unrestricted root control' },
    { key: 'catalog:read', label: 'Browse Marketplace (catalog:read)', desc: 'View products and inventory' },
    { key: 'cart:write', label: 'Shopping Cart (cart:write)', desc: 'Add & modify cart items' },
    { key: 'checkout:execute', label: 'Atomic Checkout (checkout:execute)', desc: 'Zero-overdraft order reservation' },
    { key: 'invoices:read', label: 'Invoice Access (invoices:read)', desc: 'View point-in-time snapshot receipts' },
    { key: 'inventory:manage', label: 'Manage Inventory (inventory:manage)', desc: 'Vendor portal stock control' },
    { key: 'products:write', label: 'Create/Edit Products (products:write)', desc: 'Publish and modify listings' },
    { key: 'orders:fulfill', label: 'Dispatch Orders (orders:fulfill)', desc: 'Fulfill customer vendor sub-orders' },
    { key: 'promotions:write', label: 'Flash Promotions (promotions:write)', desc: 'Set flash deal pricing rules' },
    { key: 'analytics:read', label: 'Financial Matrix (analytics:read)', desc: 'View platform GMV & cut audits' },
    { key: 'users:manage', label: 'User Management (users:manage)', desc: 'Add/edit/delete users & passwords' }
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, sList] = await Promise.all([
        fetchUserAccounts(),
        fetchStorefronts()
      ]);
      setUsers(uList);
      setStorefronts(sList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const token = getStoredToken();
    if (token) setTokenString(token);
  }, [currentProfile]);

  const handleRolePreset = (role: 'admin' | 'vendor' | 'customer') => {
    setNewRole(role);
    if (role === 'admin') {
      setNewPermissions(['*']);
      setNewVendorId('');
    } else if (role === 'vendor') {
      setNewPermissions([
        'catalog:read',
        'inventory:manage',
        'products:write',
        'orders:fulfill',
        'promotions:write',
        'analytics:read'
      ]);
      setNewVendorId('');
    } else {
      setNewPermissions(['catalog:read', 'cart:write', 'checkout:execute', 'invoices:read']);
      setNewVendorId('');
    }
  };

  const togglePermission = (perm: string, isEdit: boolean) => {
    if (isEdit) {
      if (editPermissions.includes(perm)) {
        setEditPermissions(editPermissions.filter(p => p !== perm));
      } else {
        setEditPermissions([...editPermissions, perm]);
      }
    } else {
      if (newPermissions.includes(perm)) {
        setNewPermissions(newPermissions.filter(p => p !== perm));
      } else {
        setNewPermissions([...newPermissions, perm]);
      }
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await createUserAccount({
        username: newUsername.trim(),
        password: newPassword.trim(),
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        vendorId: newRole === 'vendor' ? newVendorId.trim() : undefined,
        permissions: newPermissions
      });

      if (res.success) {
        setSuccessMsg(`User account '${newUsername}' created with assigned permissions!`);
        setShowAddUserForm(false);
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        setNewEmail('');
        await loadData();
      } else {
        setErrorMsg(res.error || 'Failed to create user account');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating user');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleStartEdit = (u: UserAccount) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role === 'admin' ? 'admin' : u.role === 'vendor' ? 'vendor' : 'customer');
    setEditVendorId(u.vendorId || '');
    setEditPermissions([...u.permissions]);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmittingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updateUserAccount(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        vendorId: editRole === 'vendor' ? editVendorId.trim() : undefined,
        permissions: editPermissions
      });

      if (res.success) {
        setSuccessMsg(`User '${editingUser.username}' updated successfully!`);
        setEditingUser(null);
        await loadData();
      } else {
        setErrorMsg(res.error || 'Failed to update user');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating user');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handlePasswordUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    setIsSubmittingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updateUserPassword(passwordTargetUser.id, updatedPassword.trim());
      if (res.success) {
        setSuccessMsg(`Password for user '${passwordTargetUser.username}' updated successfully!`);
        setPasswordTargetUser(null);
        setUpdatedPassword('');
      } else {
        setErrorMsg(res.error || 'Failed to update password');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.id === 'usr-admin-1' || u.username === 'admin') {
      alert('Protection: Root super-admin user cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user '${u.username}' (${u.name})?`)) {
      return;
    }
    try {
      const res = await deleteUserAccount(u.id);
      if (res.success) {
        setSuccessMsg(`User '${u.username}' deleted.`);
        await loadData();
      } else {
        setErrorMsg(res.error || 'Failed to delete user');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting user');
    }
  };

  const handleCreateStorefrontSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storefrontName.trim()) return;
    setIsSubmittingStorefront(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const autoId = storefrontId.trim() || `vnd-${storefrontName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const res = await createStorefront({
        id: autoId,
        name: storefrontName.trim(),
        tier: storefrontTier
      });
      if (res.success) {
        setSuccessMsg(`Storefront tenant '${storefrontName}' (${autoId}) created!`);
        setShowAddStorefrontModal(false);
        setStorefrontName('');
        setStorefrontId('');
        await loadData();
      } else {
        setErrorMsg(res.error || 'Failed to create storefront');
      }
    } finally {
      setIsSubmittingStorefront(false);
    }
  };

  const handleVerifyToken = async () => {
    try {
      const res = await fetchAuthMe();
      if (res.success && res.data) {
        onProfileChange(res.data);
        setSecurityMessage({
          text: `Verified via Asymmetric EdDSA Public Key! Subject: ${res.data.name} (${res.data.role})`,
          type: 'success'
        });
      } else {
        setSecurityMessage({
          text: `Verification rejected: ${res.error || 'Invalid signature or expired token'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSecurityMessage({ text: err.message, type: 'error' });
    }
  };

  const handleRevokeToken = async () => {
    try {
      await revokeToken();
      onProfileChange(null);
      setTokenString('');
      setSecurityMessage({
        text: 'Session revoked. Token signature added to the server-side Blacklist Cache.',
        type: 'info'
      });
    } catch (err: any) {
      setSecurityMessage({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="section-container">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Identity, Access & Security Management
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Unified User Directory, Granular Permissions, Multi-Tenant Storefronts & Asymmetric EdDSA Keys
          </p>
        </div>

        {/* Unified Sub-Navigation */}
        <div className="segmented-nav">
          <button
            onClick={() => setActiveSection('users')}
            className={`segmented-nav-btn ${activeSection === 'users' ? 'active' : ''}`}
          >
            <Users size={14} />
            User Directory ({users.length})
          </button>
          <button
            onClick={() => setActiveSection('storefronts')}
            className={`segmented-nav-btn ${activeSection === 'storefronts' ? 'active' : ''}`}
          >
            <Store size={14} />
            Storefront Tenants ({storefronts.length})
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`segmented-nav-btn ${activeSection === 'security' ? 'active' : ''}`}
          >
            <Key size={14} />
            EdDSA Keys & Session
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '0.825rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            fontSize: '0.825rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ========================================================
          TAB 1: USER DIRECTORY & ACCESS CONTROL
          ======================================================== */}
      {activeSection === 'users' && (
        <div>
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Registered Accounts & Permission Grants
              </span>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                Default super-admin is <strong>admin</strong>. Assign granular access capabilities to customize portal behavior.
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddUserForm(!showAddUserForm);
                setEditingUser(null);
                setPasswordTargetUser(null);
              }}
              className="btn btn-primary"
            >
              <UserPlus size={15} />
              {showAddUserForm ? 'Close Form' : '+ Add New User'}
            </button>
          </div>

          {/* Add User Card Form */}
          {showAddUserForm && (
            <div
              className="card"
              style={{
                marginBottom: 20,
                border: '1.5px solid #3b82f6',
                background: '#f8fafc',
                padding: '1.5rem',
                borderRadius: 12
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
                Create New User with Custom Granular Access
              </h3>
              <form onSubmit={handleCreateUserSubmit}>
                {/* Role Preset Quick Selection */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Select Preset Access Archetype:
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['admin', 'vendor', 'customer'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRolePreset(r)}
                        className={`segmented-nav-btn ${newRole === r ? 'active' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
                      >
                        {r === 'admin' ? 'Super-Admin (* Root)' : r === 'vendor' ? 'Vendor Partner' : 'Standard Customer'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      placeholder="e.g. john_ops"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      className="input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      className="input"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="e.g. john@marketplace.io"
                      required
                    />
                  </div>

                  {newRole === 'vendor' && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                        Assigned Storefront Tenant ID
                      </label>
                      <select
                        className="select-custom"
                        value={newVendorId}
                        onChange={e => setNewVendorId(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.85rem' }}
                      >
                        {storefronts.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Granular Permissions Checklist */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Granular Access Permissions ({newPermissions.length} selected):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 6, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {allAvailablePermissions.map(p => (
                      <label
                        key={p.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '0.775rem',
                          padding: '4px 6px',
                          borderRadius: 6,
                          background: newPermissions.includes(p.key) ? '#f0fdf4' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newPermissions.includes(p.key)}
                          onChange={() => togglePermission(p.key, false)}
                        />
                        <div>
                          <strong style={{ color: newPermissions.includes(p.key) ? '#166534' : 'var(--text-primary)' }}>{p.label}</strong>
                          <div style={{ fontSize: '0.675rem', color: '#64748b' }}>{p.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddUserForm(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="btn btn-primary"
                  >
                    {isSubmittingUser ? 'Creating...' : 'Create User Account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit User Card Form */}
          {editingUser && (
            <div
              className="card"
              style={{
                marginBottom: 20,
                border: '1.5px solid #eab308',
                background: '#fffbeb',
                padding: '1.5rem',
                borderRadius: 12
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#92400e' }}>
                Editing User: {editingUser.username} ({editingUser.name})
              </h3>
              <form onSubmit={handleUpdateUserSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      className="input"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Role
                    </label>
                    <select
                      className="select-custom"
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as any)}
                      style={{ width: '100%', padding: '0.55rem 0.85rem' }}
                    >
                      <option value="admin">Platform Admin</option>
                      <option value="vendor">Vendor</option>
                      <option value="customer">Customer</option>
                    </select>
                  </div>
                  {editRole === 'vendor' && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                        Assigned Storefront
                      </label>
                      <select
                        className="select-custom"
                        value={editVendorId}
                        onChange={e => setEditVendorId(e.target.value)}
                        style={{ width: '100%', padding: '0.55rem 0.85rem' }}
                      >
                        {storefronts.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Edit Permissions */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Assigned Permissions ({editPermissions.length}):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 6, background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #fef08a' }}>
                    {allAvailablePermissions.map(p => (
                      <label
                        key={p.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '0.775rem',
                          padding: '4px 6px',
                          borderRadius: 6,
                          background: editPermissions.includes(p.key) ? '#fefce8' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editPermissions.includes(p.key)}
                          onChange={() => togglePermission(p.key, true)}
                        />
                        <div>
                          <strong>{p.label}</strong>
                          <div style={{ fontSize: '0.675rem', color: '#64748b' }}>{p.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingUser} className="btn btn-primary">
                    {isSubmittingUser ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Change Password Dialog */}
          {passwordTargetUser && (
            <div
              className="card"
              style={{
                marginBottom: 20,
                border: '1.5px solid #8b5cf6',
                background: '#f5f3ff',
                padding: '1.25rem',
                borderRadius: 12
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#5b21b6' }}>
                Update Password for: {passwordTargetUser.username}
              </h3>
              <form onSubmit={handlePasswordUpdateSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="password"
                  className="input"
                  value={updatedPassword}
                  onChange={e => setUpdatedPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  style={{ maxWidth: 280 }}
                />
                <button type="submit" disabled={isSubmittingUser} className="btn btn-primary">
                  {isSubmittingUser ? 'Updating...' : 'Save New Password'}
                </button>
                <button type="button" onClick={() => setPasswordTargetUser(null)} className="btn btn-secondary">
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>User & Credentials</th>
                  <th>Role Archetype</th>
                  <th>Storefront</th>
                  <th>Assigned Permissions</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: u.role === 'admin' ? '#ecfdf5' : u.role === 'vendor' ? '#f5f3ff' : '#eff6ff',
                            color: u.role === 'admin' ? '#059669' : u.role === 'vendor' ? '#7c3aed' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.75rem'
                          }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                            username: <strong>{u.username}</strong> • {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'admin' ? 'badge-emerald' : u.role === 'vendor' ? 'badge-purple' : 'badge-blue'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.775rem', color: u.vendorId ? '#7c3aed' : '#94a3b8' }}>
                        {u.vendorId ? u.vendorId : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 380 }}>
                        {u.permissions.map(p => (
                          <span
                            key={p}
                            style={{
                              fontSize: '0.675rem',
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: p === '*' ? '#fef3c7' : '#f1f5f9',
                              color: p === '*' ? '#b45309' : '#334155',
                              border: p === '*' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                              fontWeight: p === '*' ? 700 : 500
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="Edit Profile & Permissions"
                        >
                          <Edit2 size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setPasswordTargetUser(u);
                            setUpdatedPassword('');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="Change Password"
                        >
                          <Key size={13} />
                          Password
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Delete User Account"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: MULTI-TENANT STOREFRONTS DIRECTORY
          ======================================================== */}
      {activeSection === 'storefronts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Registered Vendor Storefront Tenants
              </span>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                Manage independent seller organizations. Products, orders, and fulfillment pipelines are partitioned by Storefront Tenant ID.
              </p>
            </div>
            <button
              onClick={() => setShowAddStorefrontModal(true)}
              className="btn btn-primary"
            >
              <PlusCircle size={15} />
              + Add Storefront Tenant
            </button>
          </div>

          {/* Add Storefront Modal */}
          {showAddStorefrontModal && (
            <div
              className="card"
              style={{
                marginBottom: 20,
                border: '1.5px solid #8b5cf6',
                background: '#faf5ff',
                padding: '1.5rem',
                borderRadius: 12
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#6d28d9' }}>
                Register New Multi-Tenant Storefront
              </h3>
              <form onSubmit={handleCreateStorefrontSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Storefront Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={storefrontName}
                      onChange={e => setStorefrontName(e.target.value)}
                      placeholder="e.g. Solaris Gear Inc."
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Storefront ID (optional auto-slug)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={storefrontId}
                      onChange={e => setStorefrontId(e.target.value)}
                      placeholder="e.g. vnd-solaris"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Seller Tier
                    </label>
                    <select
                      className="select-custom"
                      value={storefrontTier}
                      onChange={e => setStorefrontTier(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.85rem' }}
                    >
                      <option value="Verified Platinum">Verified Platinum</option>
                      <option value="Gold Merchant">Gold Merchant</option>
                      <option value="Verified Partner">Verified Partner</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAddStorefrontModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingStorefront} className="btn btn-primary">
                    {isSubmittingStorefront ? 'Creating...' : 'Register Storefront'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Storefronts Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Storefront Organization</th>
                  <th>Tenant ID</th>
                  <th>Seller Tier</th>
                  <th>Platform Cut</th>
                  <th>Seller Rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {storefronts.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: '#f5f3ff',
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Store size={16} />
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                        {s.id}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-purple">{s.tier}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {((s.commissionRate || 0.12) * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706' }}>
                        ★ {(s.rating || 4.9).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-emerald">{s.status || 'ACTIVE'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: ASYMMETRIC KEYS & TOKEN SECURITY AUDIT
          ======================================================== */}
      {activeSection === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          {/* Active JWT Inspection Card */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Active Asymmetric Session Token
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Cryptographically signed using Ed25519 (EdDSA) private key on TejX backend. Verified statelessly via Public Key.
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                BEARER TOKEN (RAW JWT):
              </label>
              <textarea
                readOnly
                value={tokenString || 'No token active in localStorage'}
                style={{
                  width: '100%',
                  height: 90,
                  fontSize: '0.725rem',
                  fontFamily: 'var(--font-mono)',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 8,
                  resize: 'none',
                  color: '#334155'
                }}
              />
            </div>

            {securityMessage && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.775rem',
                  marginBottom: 12,
                  background: securityMessage.type === 'success' ? '#ecfdf5' : '#fff1f2',
                  color: securityMessage.type === 'success' ? '#065f46' : '#e11d48',
                  border: `1px solid ${securityMessage.type === 'success' ? '#a7f3d0' : '#fecdd3'}`
                }}
              >
                {securityMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleVerifyToken} className="btn btn-primary" style={{ flex: 1 }}>
                <ShieldCheck size={14} />
                Verify Public Key Signature
              </button>
              <button onClick={handleRevokeToken} className="btn btn-danger" style={{ flex: 1 }}>
                <RotateCcw size={14} />
                Revoke & Blacklist
              </button>
            </div>
          </div>

          {/* Security Claims Overview */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Claims & Asymmetric Identity Architecture
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem', marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Algorithm:</span>
                <span style={{ fontWeight: 700 }}>EdDSA (PureEd25519)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Subject (sub):</span>
                <span style={{ fontWeight: 700 }}>{currentProfile?.sub || 'usr-guest'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Role Claim:</span>
                <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{currentProfile?.role || 'Guest'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Assigned Storefront:</span>
                <span style={{ fontWeight: 700 }}>{currentProfile?.vendorId || 'Global / None'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Active Token Type:</span>
                <span style={{ fontWeight: 700 }}>Bearer (RFC 6750)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: '#64748b' }}>Blacklist Verification:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>Synchronized with TejX LRU Cache</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityCenterView;
