import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogIn,
  LogOut,
  ChevronDown,
  Users,
  Shield,
  Settings,
  Store,
  ShoppingBag,
  Eye,
  CheckCircle2,
  Key,
  RotateCcw
} from 'lucide-react';
import { AuthProfile } from '../services/types';

interface UserMenuDropdownProps {
  currentProfile: AuthProfile | null;
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenUserManagement: () => void;
  onQuickSwitch: (role: 'guest' | 'customer' | 'vendor' | 'admin', vendorId?: string) => void;
  onRestoreOriginal?: () => void;
  hasOriginalSession?: boolean;
  hasPermission: (perm: string) => boolean;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  currentProfile,
  isAuthenticated,
  onSignIn,
  onSignOut,
  onOpenUserManagement,
  onQuickSwitch,
  hasPermission
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const role = currentProfile?.role || 'guest';
  const rootRole: 'guest' | 'customer' | 'vendor' | 'admin' =
    currentProfile?.originalRole || currentProfile?.role || 'guest';

  const hasActiveSession = Boolean(
    isAuthenticated &&
    currentProfile &&
    ((currentProfile.originalRole && currentProfile.originalRole !== 'guest') || currentProfile.role !== 'guest')
  );

  const name = currentProfile?.name || 'Guest';
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleColor = (r: string) => {
    switch (r) {
      case 'admin': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'vendor': return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' };
      case 'customer': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      default: return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
    }
  };

  const roleColor = getRoleColor(role);

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'admin': return 'Super-Admin';
      case 'vendor': return 'Vendor';
      case 'customer': return 'Customer';
      default: return 'Guest';
    }
  };

  const getAllowedRoles = (r: string): Array<'guest' | 'customer' | 'vendor' | 'admin'> => {
    switch (r) {
      case 'admin':
        return ['admin', 'vendor', 'customer', 'guest'];
      case 'vendor':
        return ['vendor', 'customer', 'guest'];
      case 'customer':
        return ['customer', 'guest'];
      default:
        return ['guest'];
    }
  };

  const allowedRoles = getAllowedRoles(rootRole);

  const quickSwitchItems: { role: 'guest' | 'customer' | 'vendor' | 'admin'; icon: React.ReactNode; label: string; desc: string }[] = [
    { role: 'admin', icon: <Shield size={14} />, label: 'Platform Admin', desc: 'Full root access (*)' },
    { role: 'vendor', icon: <Store size={14} />, label: 'Vendor', desc: 'Storefront inventory & fulfillment' },
    { role: 'customer', icon: <ShoppingBag size={14} />, label: 'Customer', desc: 'Browse & checkout' },
    { role: 'guest', icon: <Eye size={14} />, label: 'Guest', desc: 'Browse only' },
  ];

  const switchableItems = quickSwitchItems.filter(item => allowedRoles.includes(item.role));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '10px',
          padding: '0.35rem 0.65rem 0.35rem 0.4rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : '0 1px 2px rgba(0,0,0,0.04)',
          outline: 'none',
        }}
        onMouseEnter={e => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={e => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
        }}
      >
        {/* Avatar Circle */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColor.bg}, ${roleColor.border})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: 800,
            color: roleColor.text,
            letterSpacing: '0.03em',
            flexShrink: 0
          }}
        >
          {initials}
        </div>

        {/* Name & Role */}
        <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 650, color: '#0f172a', whiteSpace: 'nowrap' }}>
            {name.length > 16 ? name.slice(0, 16) + '…' : name}
          </div>
          <div style={{ fontSize: '0.65rem', color: roleColor.text, fontWeight: 600 }}>
            {getRoleLabel(role)}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={14}
          color="#94a3b8"
          style={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0
          }}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 290,
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05)',
            zIndex: 999,
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.15s ease-out'
          }}
        >
          {/* Profile Section */}
          <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${roleColor.bg}, ${roleColor.border})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: roleColor.text,
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  {name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {currentProfile?.email || 'guest@marketplace.io'}
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: roleColor.bg,
                  color: roleColor.text,
                  border: `1px solid ${roleColor.border}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap'
                }}
              >
                {getRoleLabel(role)}
              </span>
            </div>

            {/* Primary account indicator when switched */}
            {role !== rootRole && (
              <div style={{
                marginTop: 8,
                padding: '6px 8px',
                borderRadius: 6,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                fontSize: '0.725rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={12} />
                  <span>Primary: <strong>{getRoleLabel(rootRole)}</strong></span>
                </div>
                <button
                  onClick={() => {
                    onQuickSwitch(rootRole);
                    setIsOpen(false);
                  }}
                  style={{
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Switch Back
                </button>
              </div>
            )}

            {/* Vendor Storefront Indicator (if vendor) */}
            {currentProfile?.vendorId && (
              <div
                style={{
                  marginTop: 8,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  fontSize: '0.725rem',
                  color: '#6d28d9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Store size={12} />
                <span>Storefront: <strong>{currentProfile.vendorId}</strong></span>
              </div>
            )}
          </div>

          {/* Role switcher list — shows all roles user is entitled to */}
          {switchableItems.length > 0 && (
            <div style={{ padding: '0.5rem' }}>
              <div style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.25rem 0.5rem 0.35rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Switch Role</span>
                <span style={{ fontSize: '0.65rem', color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: 4 }}>
                  Root: {getRoleLabel(rootRole)}
                </span>
              </div>
              {switchableItems.map(item => {
                const isActive = role === item.role;
                return (
                  <button
                    key={item.role}
                    onClick={() => {
                      if (!isActive) {
                        onQuickSwitch(item.role);
                      }
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      width: '100%',
                      padding: '0.5rem 0.5rem',
                      border: 'none',
                      background: isActive ? '#f8fafc' : 'transparent',
                      borderRadius: 8,
                      cursor: isActive ? 'default' : 'pointer',
                      transition: 'background 0.12s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = isActive ? '#f8fafc' : 'transparent';
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: getRoleColor(item.role).bg,
                      color: getRoleColor(item.role).text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                          {item.label}
                        </span>
                        {isActive && (
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: getRoleColor(item.role).bg,
                            color: getRoleColor(item.role).text,
                            border: `1px solid ${getRoleColor(item.role).border}`,
                          }}>
                            Active
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: '#f1f5f9', margin: '0 0.5rem' }} />

          {/* Actions */}
          <div style={{ padding: '0.5rem' }}>
            {/* User & Access Management (Unified Security Center) */}
            {hasPermission('users:manage') && (
              <button
                onClick={() => {
                  onOpenUserManagement();
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  width: '100%',
                  padding: '0.5rem 0.5rem',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: '#fff7ed', color: '#ea580c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Users size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                    User & Access Management
                  </div>
                  <div style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                    Directory, permissions & storefronts
                  </div>
                </div>
              </button>
            )}

            {/* Sign In Button */}
            <button
              onClick={() => {
                onSignIn();
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                width: '100%',
                padding: '0.5rem 0.5rem',
                border: 'none',
                background: 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.12s ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: '#eff6ff', color: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogIn size={14} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                  {hasActiveSession ? 'Switch / Sign In as Other User' : 'Sign In with Credentials'}
                </div>
                <div style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                  Use configured administrator or user credentials
                </div>
              </div>
            </button>
          </div>

          {/* Sign Out Footer - SHOWN FOR ANY ACTIVE ROOT SESSION */}
          {hasActiveSession && (
            <>
              <div style={{ height: 1, background: '#f1f5f9', margin: '0 0.5rem' }} />
              <div style={{ padding: '0.5rem' }}>
                <button
                  onClick={() => {
                    onSignOut();
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.5rem 0.5rem',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#fff1f2';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: '#fff1f2', color: '#e11d48',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <LogOut size={14} />
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e11d48' }}>
                    Sign Out ({currentProfile?.originalName || name})
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
