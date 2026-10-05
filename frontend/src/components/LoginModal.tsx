import React, { useState } from 'react';
import { LogIn, Key, User, Shield, AlertCircle, X, CheckCircle } from 'lucide-react';
import { loginWithCredentials, loginAs } from '../services/api';
import { AuthProfile } from '../services/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: AuthProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginWithCredentials(username.trim(), password.trim());
      if (res.success && res.data) {
        onLoginSuccess(res.data);
        onClose();
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login network error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  const handleGuestBrowse = async () => {
    setLoading(true);
    try {
      const res = await loginAs('guest');
      if (res.success && res.data) {
        onLoginSuccess(res.data);
        onClose();
      }
    } finally {
      setLoading(false);
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
          maxWidth: 440,
          width: '100%',
          background: '#ffffff',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
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
              <Shield size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Sign In to Aura
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Enterprise Access & Security Gateway
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

        {/* Default Credential Notice */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '0.8rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <CheckCircle size={15} color="#059669" />
          <span>
            Default Super-Admin: <strong>admin</strong> / <strong>admin</strong>
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              fontSize: '0.8rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: '0.775rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6
              }}
            >
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                style={{ paddingLeft: 34, fontSize: '0.875rem' }}
              />
              <User
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 12,
                  color: '#94a3b8'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                fontSize: '0.775rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 6
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingLeft: 34, fontSize: '0.875rem' }}
              />
              <Key
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 12,
                  color: '#94a3b8'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.7rem 1rem', fontSize: '0.9rem', marginBottom: 14 }}
          >
            <LogIn size={15} />
            {loading ? 'Authenticating...' : 'Sign In with Asymmetric JWT'}
          </button>
        </form>

        {/* Quick Fill Preset Accounts */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 6 }}>
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              display: 'block',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Quick Select Preset Credentials:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin')}
              className="segmented-nav-btn"
              style={{
                padding: '6px 8px',
                fontSize: '0.75rem',
                textAlign: 'center',
                borderRadius: 8,
                background: username === 'admin' ? '#ecfdf5' : '#f8fafc',
                border: username === 'admin' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                color: username === 'admin' ? '#065f46' : 'var(--text-secondary)'
              }}
            >
              <strong>admin</strong>
              <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Admin</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('vendor', 'vendor')}
              className="segmented-nav-btn"
              style={{
                padding: '6px 8px',
                fontSize: '0.75rem',
                textAlign: 'center',
                borderRadius: 8,
                background: username === 'vendor' ? '#f5f3ff' : '#f8fafc',
                border: username === 'vendor' ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                color: username === 'vendor' ? '#5b21b6' : 'var(--text-secondary)'
              }}
            >
              <strong>vendor</strong>
              <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Aurora</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('customer', 'customer')}
              className="segmented-nav-btn"
              style={{
                padding: '6px 8px',
                fontSize: '0.75rem',
                textAlign: 'center',
                borderRadius: 8,
                background: username === 'customer' ? '#eff6ff' : '#f8fafc',
                border: username === 'customer' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                color: username === 'customer' ? '#1e40af' : 'var(--text-secondary)'
              }}
            >
              <strong>customer</strong>
              <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Elena</div>
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleGuestBrowse}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.775rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Or continue browsing anonymously as Guest →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
