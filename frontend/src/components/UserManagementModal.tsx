import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Key,
  Shield,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User
} from 'lucide-react';
import {
  fetchUserAccounts,
  createUserAccount,
  updateUserAccount,
  updateUserPassword,
  deleteUserAccount
} from '../services/api';
import { UserAccount, AuthProfile } from '../services/types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile?: AuthProfile | null;
  onSwitchUser?: (username: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSwitchUser
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add User State
  const [showAddForm, setShowAddForm] = useState(false);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'vendor' | 'customer'>('customer');
  const [editVendorId, setEditVendorId] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  // Password Update State
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserAccount | null>(null);
  const [updatedPassword, setUpdatedPassword] = useState('');

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

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await fetchUserAccounts();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowAddForm(false);
      setEditingUser(null);
      setPasswordTargetUser(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      setNewVendorId('vnd-aurora');
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await createUserAccount({
        username: newUsername.trim(),
        password: newPassword.trim(),
        name: newName.trim() || newUsername.trim(),
        email: newEmail.trim() || `${newUsername.trim()}@marketplace.io`,
        role: newRole,
        vendorId: newVendorId.trim(),
        permissions: newPermissions
      });

      if (res.success) {
        setSuccessMsg(`User '${newUsername}' created successfully with customized access!`);
        setShowAddForm(false);
        setNewUsername('');
        setNewPassword('');
        setNewName('');
        setNewEmail('');
        loadUsers();
      } else {
        setErrorMsg(res.error || 'Failed to create user account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role as any);
    setEditVendorId(u.vendorId || '');
    setEditPermissions(u.permissions || []);
    setPasswordTargetUser(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateUserAccount(editingUser.username, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        vendorId: editVendorId.trim(),
        permissions: editPermissions
      });

      if (res.success) {
        setSuccessMsg(`User '${editingUser.username}' updated successfully!`);
        setEditingUser(null);
        loadUsers();
      } else {
        setErrorMsg(res.error || 'Failed to update user account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateUserPassword(passwordTargetUser.username, updatedPassword.trim());
      if (res.success) {
        setSuccessMsg(`Password for user '${passwordTargetUser.username}' updated successfully!`);
        setPasswordTargetUser(null);
        setUpdatedPassword('');
      } else {
        setErrorMsg(res.error || 'Failed to update password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.username === 'admin' || u.id === 'usr-admin-1') {
      alert('The root Platform Super-Admin account cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user account '${u.username}' (${u.name})?`)) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await deleteUserAccount(u.username);
    if (res.success) {
      setSuccessMsg(`User '${u.username}' was deleted.`);
      loadUsers();
    } else {
      setErrorMsg(res.error || 'Failed to delete user');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 960,
          width: '100%',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                User & Access Control Management
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Manage user credentials, granular access privileges, and RBAC security policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '0.8rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontSize: '0.8rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total Registered Users: <strong>{users.length}</strong>
          </div>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingUser(null);
              setPasswordTargetUser(null);
            }}
            className="btn btn-primary"
            style={{ fontSize: '0.825rem' }}
          >
            <UserPlus size={14} />
            {showAddForm ? 'Close Add Form' : 'Create New User Account'}
          </button>
        </div>

        {/* Add New User Form */}
        {showAddForm && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
              Add New User Account & Set Access Privileges
            </h4>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="e.g. jdoe"
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
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="jdoe@aura.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Role Preset
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['customer', 'vendor', 'admin'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRolePreset(r)}
                        className={`segmented-nav-btn ${newRole === r ? 'active' : ''}`}
                        style={{ textTransform: 'capitalize', flex: 1, padding: '6px' }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {newRole === 'vendor' && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Assigned Vendor ID
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={newVendorId}
                      onChange={e => setNewVendorId(e.target.value)}
                      placeholder="vnd-aurora"
                    />
                  </div>
                )}
              </div>

              {/* Granular Permissions Checkboxes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  Granular Portal Permissions ({newPermissions.length} selected):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {allAvailablePermissions.map(p => {
                    const checked = newPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: checked ? '#eff6ff' : '#ffffff',
                          border: checked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          fontSize: '0.775rem'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.key, false)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontWeight: checked ? 700 : 500, color: checked ? '#1e40af' : 'var(--text-primary)' }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {p.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.825rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ fontSize: '0.825rem' }}
                >
                  {isSubmitting ? 'Creating User...' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit User Form */}
        {editingUser && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Edit User: <span style={{ color: '#2563eb' }}>{editingUser.username}</span>
              </h4>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
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
                    style={{ width: '100%', padding: '0.45rem' }}
                  >
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {editRole === 'vendor' && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Vendor ID
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={editVendorId}
                      onChange={e => setEditVendorId(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Granular Permissions Checkboxes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  Active Permissions:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {allAvailablePermissions.map(p => {
                    const checked = editPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: checked ? '#eff6ff' : '#ffffff',
                          border: checked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          fontSize: '0.775rem'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.key, true)}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ fontWeight: checked ? 700 : 500, color: checked ? '#1e40af' : 'var(--text-primary)' }}>
                            {p.label}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save User Updates'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Update Password Modal Form */}
        {passwordTargetUser && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={16} color="#2563eb" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Set New Password for: <span style={{ color: '#2563eb' }}>{passwordTargetUser.username}</span>
                </h4>
              </div>
              <button
                onClick={() => setPasswordTargetUser(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  New Password *
                </label>
                <input
                  type="password"
                  className="input"
                  value={updatedPassword}
                  onChange={e => setUpdatedPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Directory Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name & Email</th>
                <th>Role</th>
                <th>Assigned Permissions</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isCurrent = currentProfile?.name === u.name || currentProfile?.email === u.email;
                return (
                  <tr key={u.id} style={{ background: isCurrent ? '#f0fdf4' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {u.username}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {u.id}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'admin'
                            ? 'badge-emerald'
                            : u.role === 'vendor'
                            ? 'badge-purple'
                            : 'badge-blue'
                        }`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {u.role}
                      </span>
                      {u.vendorId && (
                        <div style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {u.vendorId}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 300 }}>
                        {u.permissions?.includes('*') ? (
                          <span className="badge badge-emerald">All Access (*)</span>
                        ) : (
                          u.permissions?.map(p => (
                            <span
                              key={p}
                              className="badge badge-neutral"
                              style={{ fontSize: '0.65rem', padding: '1px 5px' }}
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {onSwitchUser && (
                          <button
                            onClick={() => {
                              onSwitchUser(u.username);
                              onClose();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                            title="Switch to this user session"
                          >
                            Switch
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                          title="Edit user details and access"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => {
                            setPasswordTargetUser(u);
                            setUpdatedPassword('');
                            setEditingUser(null);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                          title="Update password"
                        >
                          <Key size={12} />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.725rem', color: '#e11d48' }}
                            title="Delete user"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
