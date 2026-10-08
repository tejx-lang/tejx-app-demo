import React, { useState } from 'react';
import { LogIn, Key, User, Shield, AlertCircle, X } from 'lucide-react';
import { loginWithCredentials } from '../services/api';
import { AuthProfile } from '../services/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: AuthProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const handleGuestBrowse = () => {
    onClose();
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
          maxWidth: 420,
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
                fontWeight: 650,
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
                placeholder="Enter username"
                required
                autoFocus
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
                fontWeight: 650,
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Clean Guest Browse Link */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleGuestBrowse}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.775rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              textDecoration: 'underline'
            }}
          >
            Continue browsing as Guest (Logged Out) →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
