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
  updateStorefront,
  deleteStorefront
} from '../services/api';
import { UserAccount, AuthProfile, VendorStorefront } from '../services/types';
import { CustomDropdown } from './CustomDropdown';

interface SecurityCenterViewProps {
  currentProfile: AuthProfile | null;
  onProfileChange: (profile: AuthProfile | null) => void;
}

export const SecurityCenterView: React.FC<SecurityCenterViewProps> = ({
  currentProfile,
  onProfileChange
}) => {
  const getInitialSection = (): 'users' | 'storefronts' => {
    if (typeof window === 'undefined') return 'users';
    const params = new URLSearchParams(window.location.search);
    const sec = (params.get('section') || params.get('subtab') || params.get('view') || '').toLowerCase();
    if (sec === 'storefronts' || sec === 'store' || sec === 'stores' || sec === 'tenants') return 'storefronts';
    return 'users';
  };

  const [activeSection, setActiveSectionState] = useState<'users' | 'storefronts'>(getInitialSection);

  const handleSectionChange = (sec: 'users' | 'storefronts') => {
    setActiveSectionState(sec);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', sec);
      window.history.pushState({}, '', url.pathname + url.search + url.hash);
    }
  };

  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search);
      const sec = (params.get('section') || params.get('subtab') || params.get('view') || '').toLowerCase();
      if (sec === 'storefronts' || sec === 'store' || sec === 'stores' || sec === 'tenants') {
        setActiveSectionState('storefronts');
      } else if (sec === 'users') {
        setActiveSectionState('users');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('section')) {
        url.searchParams.set('section', activeSection);
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    }
  }, [activeSection]);
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
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'vendor' | 'customer'>('customer');
  const [editVendorId, setEditVendorId] = useState('');

  // Password Modal State
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserAccount | null>(null);
  const [updatedPassword, setUpdatedPassword] = useState('');

  // Add Storefront State
  const [showAddStorefrontModal, setShowAddStorefrontModal] = useState(false);
  const [storefrontName, setStorefrontName] = useState('');
  const [storefrontId, setStorefrontId] = useState('');
  const [storefrontTier, setStorefrontTier] = useState('Verified Partner');
  const [isSubmittingStorefront, setIsSubmittingStorefront] = useState(false);

  // Edit Storefront State
  const [editingStorefront, setEditingStorefront] = useState<VendorStorefront | null>(null);
  const [editStorefrontName, setEditStorefrontName] = useState('');
  const [editStorefrontTier, setEditStorefrontTier] = useState('Verified Partner');
  const [editStorefrontStatus, setEditStorefrontStatus] = useState('active');
  const [editStorefrontCommissionRate, setEditStorefrontCommissionRate] = useState(12);
  const [isSubmittingEditStorefront, setIsSubmittingEditStorefront] = useState(false);

  // Delete Storefront State
  const [deletingStorefront, setDeletingStorefront] = useState<VendorStorefront | null>(null);
  const [forceDeleteStorefront, setForceDeleteStorefront] = useState(false);
  const [isDeletingStorefront, setIsDeletingStorefront] = useState(false);

  // Pure Role-Based Access Configurations (Fine-grained checklist eliminated)
  const ROLE_ACCESS_CONFIG: Record<string, {
    title: string;
    badge: string;
    badgeClass: string;
    scope: string;
    color: string;
    bg: string;
    border: string;
    description: string;
  }> = {
    admin: {
      title: 'Platform Administrator',
      badge: 'Super-Admin (*)',
      badgeClass: 'badge-emerald',
      scope: 'Full Root Access (*)',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      description: 'Unrestricted root control across all tenant stores, products, orders, financial matrix, and system security.'
    },
    vendor: {
      title: 'Vendor Partner Merchant',
      badge: 'Vendor Partner',
      badgeClass: 'badge-purple',
      scope: 'Storefront Operations & Catalog',
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      description: 'Operational control for assigned storefront: publish products, update inventory stock, dispatch orders, and view store analytics.'
    },
    customer: {
      title: 'Standard Shopper Customer',
      badge: 'Standard Customer',
      badgeClass: 'badge-blue',
      scope: 'Marketplace Shopper & Orders',
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      description: 'Customer shopper access to browse public marketplace listings, manage personal cart, and execute checkouts.'
    }
  };

  // Determine effective creator role and allowed roles for creating accounts
  const creatorEffectiveRole = (
    currentProfile?.originalRole && currentProfile.originalRole !== 'guest'
      ? currentProfile.originalRole
      : (currentProfile?.role || 'customer')
  ).toLowerCase();

  const isCreatorAdmin = creatorEffectiveRole === 'admin' || currentProfile?.role === 'admin';
  const isCreatorVendor = creatorEffectiveRole === 'vendor' || currentProfile?.role === 'vendor';

  // Role whitelist based on logged in user:
  // Admin -> can create Admin, Vendor, Customer
  // Vendor -> can ONLY create Vendor (for their storefront) or Customer (cannot create Admin)
  // Others -> customer only
  const allowedRoles: Array<'admin' | 'vendor' | 'customer'> = isCreatorAdmin
    ? ['admin', 'vendor', 'customer']
    : isCreatorVendor
    ? ['vendor', 'customer']
    : ['customer'];

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, sList] = await Promise.all([
        fetchUserAccounts(),
        fetchStorefronts()
      ]);
      setUsers(uList);
      setStorefronts(sList);
      if (sList.length > 0 && !newVendorId) {
        setNewVendorId(isCreatorVendor && currentProfile?.vendorId ? currentProfile.vendorId : sList[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProfile]);

  useEffect(() => {
    if (!allowedRoles.includes(newRole)) {
      setNewRole(allowedRoles[0]);
    }
    if (isCreatorVendor && currentProfile?.vendorId) {
      setNewVendorId(currentProfile.vendorId);
    }
  }, [currentProfile, isCreatorAdmin, isCreatorVendor]);

  const handleRolePreset = (role: 'admin' | 'vendor' | 'customer') => {
    setNewRole(role);
    if (role === 'vendor') {
      if (isCreatorVendor && currentProfile?.vendorId) {
        setNewVendorId(currentProfile.vendorId);
      } else if (!newVendorId && storefronts.length > 0) {
        setNewVendorId(storefronts[0].id);
      }
    } else {
      setNewVendorId('');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const assignedVendor = newRole === 'vendor'
        ? (isCreatorVendor ? (currentProfile?.vendorId || newVendorId.trim()) : newVendorId.trim())
        : undefined;

      const res = await createUserAccount({
        username: newUsername.trim(),
        password: newPassword.trim(),
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        vendorId: assignedVendor
      });

      if (res.success) {
        setSuccessMsg(`User account '${newUsername.trim()}' created successfully with ${newRole.toUpperCase()} role access!`);
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
    setEditUsername(u.username);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role === 'admin' ? 'admin' : u.role === 'vendor' ? 'vendor' : 'customer');
    setEditVendorId(u.vendorId || (isCreatorVendor ? (currentProfile?.vendorId || '') : ''));
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
      const assignedVendor = editRole === 'vendor'
        ? (isCreatorVendor ? (currentProfile?.vendorId || editVendorId.trim()) : editVendorId.trim())
        : undefined;

      const res = await updateUserAccount(editingUser.id, {
        username: editUsername.trim(),
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        vendorId: assignedVendor
      });

      if (res.success) {
        setSuccessMsg(`User '${editUsername.trim()}' updated with ${editRole.toUpperCase()} role access!`);
        if (currentProfile && (currentProfile.sub === editingUser.id || currentProfile.name === editingUser.name)) {
          if (onProfileChange) {
            onProfileChange({
              ...currentProfile,
              name: editName.trim(),
              email: editEmail.trim(),
              role: editRole,
              vendorId: assignedVendor
            });
          }
        }
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

  const handleStartEditStorefront = (s: VendorStorefront) => {
    setEditingStorefront(s);
    setEditStorefrontName(s.name);
    setEditStorefrontTier(s.tier || 'Verified Partner');
    setEditStorefrontStatus(s.status || 'active');
    setEditStorefrontCommissionRate(Math.round((s.commissionRate ?? 0.12) * 100));
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleUpdateStorefrontSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStorefront || !editStorefrontName.trim()) return;
    setIsSubmittingEditStorefront(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updateStorefront(editingStorefront.id, {
        name: editStorefrontName.trim(),
        tier: editStorefrontTier,
        status: editStorefrontStatus,
        commissionRate: Number(editStorefrontCommissionRate) / 100
      });
      if (res.success) {
        setSuccessMsg(`Storefront tenant '${editStorefrontName}' (${editingStorefront.id}) updated successfully!`);
        setEditingStorefront(null);
        await loadData();
      } else {
        setErrorMsg(res.error || 'Failed to update storefront');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating storefront');
    } finally {
      setIsSubmittingEditStorefront(false);
    }
  };

  const handleDeleteStorefrontSubmit = async () => {
    if (!deletingStorefront) return;
    setIsDeletingStorefront(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await deleteStorefront(deletingStorefront.id, forceDeleteStorefront);
      if (res.success) {
        setSuccessMsg(`Storefront tenant '${deletingStorefront.name}' (${deletingStorefront.id}) deleted successfully.`);
        setDeletingStorefront(null);
        setForceDeleteStorefront(false);
        await loadData();
      } else {
        setErrorMsg(res.error || 'Failed to delete storefront');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting storefront');
    } finally {
      setIsDeletingStorefront(false);
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
            Unified User Directory, Granular Permissions & Multi-Tenant Storefronts
          </p>
        </div>

        {/* Unified Sub-Navigation */}
        <div className="segmented-nav">
          <button
            onClick={() => handleSectionChange('users')}
            className={`segmented-nav-btn ${activeSection === 'users' ? 'active' : ''}`}
          >
            <Users size={14} />
            User Directory ({users.length})
          </button>
          <button
            onClick={() => handleSectionChange('storefronts')}
            className={`segmented-nav-btn ${activeSection === 'storefronts' ? 'active' : ''}`}
          >
            <Store size={14} />
            Storefront Tenants ({storefronts.length})
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
                Registered User Accounts & Role-Based Access
              </span>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                Access capabilities are strictly determined by the assigned user role archetype.
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
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                Create New User Account (Role-Based Access)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                Access is automatically governed by the assigned user role.
              </p>
              <form onSubmit={handleCreateUserSubmit}>
                {/* Role Preset Quick Selection */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Select User Role Archetype:
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {allowedRoles.map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRolePreset(r)}
                        className={`segmented-nav-btn ${newRole === r ? 'active' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        {ROLE_ACCESS_CONFIG[r]?.title || r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role Access Scope Info Card */}
                {ROLE_ACCESS_CONFIG[newRole] && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: ROLE_ACCESS_CONFIG[newRole].bg,
                      border: `1px solid ${ROLE_ACCESS_CONFIG[newRole].border}`,
                      marginBottom: 16
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={16} color={ROLE_ACCESS_CONFIG[newRole].color} />
                        <strong style={{ fontSize: '0.825rem', color: ROLE_ACCESS_CONFIG[newRole].color }}>
                          {ROLE_ACCESS_CONFIG[newRole].scope}
                        </strong>
                      </div>
                      <span className={`badge ${ROLE_ACCESS_CONFIG[newRole].badgeClass}`} style={{ fontSize: '0.7rem' }}>
                        {ROLE_ACCESS_CONFIG[newRole].badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.775rem', color: '#475569', margin: 0 }}>
                      {ROLE_ACCESS_CONFIG[newRole].description}
                    </p>
                  </div>
                )}

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
                        Assigned Storefront Tenant
                      </label>
                      {isCreatorAdmin ? (
                        <CustomDropdown
                          value={newVendorId}
                          onChange={val => setNewVendorId(val)}
                          options={storefronts.map(s => ({
                            value: s.id,
                            label: s.name,
                          }))}
                          placeholder="Select Storefront..."
                          searchable={storefronts.length > 4}
                        />
                      ) : (
                        <div
                          style={{
                            padding: '8px 12px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Store size={14} />
                          {currentProfile?.vendorId
                            ? (storefronts.find(s => s.id === currentProfile.vendorId)?.name || currentProfile.vendorId)
                            : 'Assigned Storefront'}
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400, marginLeft: 'auto' }}>
                            (Locked to your tenant)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
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
                    {isSubmittingUser ? 'Creating...' : `Create ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} Account`}
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
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#92400e' }}>
                Editing User: @{editUsername || editingUser.username} ({editingUser.name})
              </h3>
              <p style={{ fontSize: '0.775rem', color: '#78350f', margin: '0 0 1rem 0' }}>
                Access capabilities are governed by the assigned user role.
              </p>
              <form onSubmit={handleUpdateUserSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={editUsername}
                      onChange={e => setEditUsername(e.target.value)}
                      placeholder="e.g. john_ops"
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
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Email *
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
                      Role Archetype
                    </label>
                    <CustomDropdown
                      value={editRole}
                      onChange={val => setEditRole(val as any)}
                      options={allowedRoles.map(r => ({
                        value: r,
                        label: ROLE_ACCESS_CONFIG[r]?.title || r,
                        badge: ROLE_ACCESS_CONFIG[r]?.badge,
                        badgeColor: ROLE_ACCESS_CONFIG[r]?.color
                      }))}
                      placeholder="Select Role..."
                    />
                  </div>
                  {editRole === 'vendor' && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                        Assigned Storefront
                      </label>
                      {isCreatorAdmin ? (
                        <CustomDropdown
                          value={editVendorId}
                          onChange={val => setEditVendorId(val)}
                          options={storefronts.map(s => ({
                            value: s.id,
                            label: s.name,
                          }))}
                          placeholder="Select Storefront..."
                          searchable={storefronts.length > 4}
                        />
                      ) : (
                        <div
                          style={{
                            padding: '8px 12px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Store size={14} />
                          {editVendorId || currentProfile?.vendorId || 'Assigned Storefront'}
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400, marginLeft: 'auto' }}>
                            (Locked to your tenant)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Role Access Scope card for Edit */}
                {ROLE_ACCESS_CONFIG[editRole] && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      background: ROLE_ACCESS_CONFIG[editRole].bg,
                      border: `1px solid ${ROLE_ACCESS_CONFIG[editRole].border}`,
                      marginBottom: 16
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={16} color={ROLE_ACCESS_CONFIG[editRole].color} />
                        <strong style={{ fontSize: '0.825rem', color: ROLE_ACCESS_CONFIG[editRole].color }}>
                          {ROLE_ACCESS_CONFIG[editRole].scope}
                        </strong>
                      </div>
                      <span className={`badge ${ROLE_ACCESS_CONFIG[editRole].badgeClass}`} style={{ fontSize: '0.7rem' }}>
                        {ROLE_ACCESS_CONFIG[editRole].badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.775rem', color: '#475569', margin: 0 }}>
                      {ROLE_ACCESS_CONFIG[editRole].description}
                    </p>
                  </div>
                )}

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
                  <th>Access Scope</th>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ROLE_ACCESS_CONFIG[u.role]?.scope || `${u.role.toUpperCase()} Access`}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {u.role === 'admin'
                            ? 'Root platform & tenant administration'
                            : u.role === 'vendor'
                            ? 'Catalog, inventory, orders & storefront analytics'
                            : 'Marketplace browsing, cart, checkout & invoices'}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {(isCreatorAdmin || (isCreatorVendor && u.vendorId === currentProfile?.vendorId) || u.id === currentProfile?.sub) && (
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Edit User"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                        )}
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
                        {u.username !== 'admin' && (isCreatorAdmin || (isCreatorVendor && u.vendorId === currentProfile?.vendorId && u.id !== currentProfile?.sub)) && (
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
            {isCreatorAdmin && (
              <button
                onClick={() => setShowAddStorefrontModal(true)}
                className="btn btn-primary"
              >
                <PlusCircle size={15} />
                + Add Storefront Tenant
              </button>
            )}
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
                    <CustomDropdown
                      value={storefrontTier}
                      onChange={val => setStorefrontTier(val)}
                      options={[
                        { value: 'Verified Platinum', label: 'Verified Platinum', badge: 'Tier 1 Top Seller', badgeColor: '#8b5cf6' },
                        { value: 'Gold Merchant', label: 'Gold Merchant', badge: 'Tier 2 Premier', badgeColor: '#f59e0b' },
                        { value: 'Verified Partner', label: 'Verified Partner', badge: 'Tier 3 Standard', badgeColor: '#10b981' }
                      ]}
                      placeholder="Select Seller Tier..."
                    />
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

          {/* Edit Storefront Modal */}
          {editingStorefront && (
            <div
              className="card"
              style={{
                marginBottom: 20,
                border: '1.5px solid #2563eb',
                background: '#f8fafc',
                padding: '1.5rem',
                borderRadius: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1e40af' }}>
                  Edit Storefront Tenant: {editingStorefront.name} ({editingStorefront.id})
                </h3>
                <button
                  onClick={() => setEditingStorefront(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleUpdateStorefrontSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Storefront Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={editStorefrontName}
                      onChange={e => setEditStorefrontName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Seller Tier
                    </label>
                    <CustomDropdown
                      value={editStorefrontTier}
                      onChange={val => setEditStorefrontTier(val)}
                      options={[
                        { value: 'Verified Platinum', label: 'Verified Platinum', badge: 'Tier 1 Top Seller', badgeColor: '#8b5cf6' },
                        { value: 'Gold Merchant', label: 'Gold Merchant', badge: 'Tier 2 Premier', badgeColor: '#f59e0b' },
                        { value: 'Verified Partner', label: 'Verified Partner', badge: 'Tier 3 Standard', badgeColor: '#10b981' }
                      ]}
                      placeholder="Select Seller Tier..."
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Storefront Status
                    </label>
                    <CustomDropdown
                      value={editStorefrontStatus}
                      onChange={val => setEditStorefrontStatus(val)}
                      options={[
                        { value: 'active', label: 'Active / Operational', badge: 'Normal', badgeColor: '#10b981' },
                        { value: 'suspended', label: 'Suspended / Paused', badge: 'Restricted', badgeColor: '#f59e0b' },
                        { value: 'pending', label: 'Pending Review', badge: 'Verification', badgeColor: '#6366f1' }
                      ]}
                      placeholder="Select Status..."
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Platform Cut / Commission (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="input"
                      value={editStorefrontCommissionRate}
                      onChange={e => setEditStorefrontCommissionRate(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingStorefront(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingEditStorefront} className="btn btn-primary">
                    {isSubmittingEditStorefront ? 'Saving...' : 'Save Storefront Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Storefront Confirmation Modal */}
          {deletingStorefront && (
            <div
              className="card"
              style={{
                marginBottom: 20,
                border: '1.5px solid #ef4444',
                background: '#fff5f5',
                padding: '1.5rem',
                borderRadius: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: '#991b1b' }}>
                    Confirm Storefront Deletion
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to permanently delete storefront tenant{' '}
                    <strong>{deletingStorefront.name}</strong> (<code>{deletingStorefront.id}</code>)?
                  </p>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.8rem', color: '#7f1d1d', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={forceDeleteStorefront}
                        onChange={e => setForceDeleteStorefront(e.target.checked)}
                      />
                      Force Delete (Automatically purge active catalog products and bypass order check)
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingStorefront(null);
                    setForceDeleteStorefront(false);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStorefrontSubmit}
                  disabled={isDeletingStorefront}
                  className="btn btn-danger"
                >
                  {isDeletingStorefront ? 'Deleting...' : 'Confirm Delete Storefront'}
                </button>
              </div>
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                      <span className={`badge ${s.status === 'suspended' ? 'badge-amber' : 'badge-emerald'}`}>
                        {(s.status || 'ACTIVE').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {(isCreatorAdmin || (isCreatorVendor && s.id === currentProfile?.vendorId)) && (
                          <button
                            onClick={() => handleStartEditStorefront(s)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Edit Storefront Organization"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                        )}
                        {isCreatorAdmin && (
                          <button
                            onClick={() => {
                              setDeletingStorefront(s);
                              setForceDeleteStorefront(false);
                            }}
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Delete Storefront Tenant"
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

    </div>
  );
};

export default SecurityCenterView;
