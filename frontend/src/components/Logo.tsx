import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '', showText = true }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }} className={className}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.12))' }}
      >
        <defs>
          {/* Luminous Light Theme Gradients */}
          <linearGradient id="auraBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>
          <linearGradient id="auraStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="auraGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>

        {/* Clean Light Squircle Container */}
        <rect
          x="1.5"
          y="1.5"
          width="37"
          height="37"
          rx="11"
          fill="url(#auraBgGrad)"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />

        {/* Inner Soft Ambient Glow */}
        <circle cx="20" cy="20" r="14" fill="#EFF6FF" fillOpacity="0.8" />

        {/* Dynamic Geometric Apex 'A' Glyphs */}
        <path
          d="M12 28.5L20 11.5L28 28.5"
          stroke="url(#auraGlowGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.5 23H24.5"
          stroke="#2563EB"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Apex Light Vertex Pearl */}
        <circle cx="20" cy="11.5" r="2.4" fill="#3B82F6" />
        <circle cx="20" cy="11.5" r="1" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em' }}>
              Aura
            </span>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: '#2563EB',
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                padding: '2px 6px',
                borderRadius: 4,
                letterSpacing: '0.06em'
              }}
            >
              MARKETPLACE
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
