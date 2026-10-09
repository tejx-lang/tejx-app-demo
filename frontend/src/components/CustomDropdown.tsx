import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  menuStyle?: React.CSSProperties;
  required?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  label,
  icon,
  disabled = false,
  searchable = false,
  className = '',
  style,
  buttonStyle,
  menuStyle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: style?.width || '100%',
        ...style
      }}
    >
      {label && (
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 650,
            color: 'var(--text-secondary)',
            display: 'block',
            marginBottom: 5,
            userSelect: 'none'
          }}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          background: disabled ? '#f8fafc' : '#ffffff',
          border: isOpen ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
          borderRadius: 8,
          padding: '0.45rem 0.75rem',
          fontSize: '0.825rem',
          color: disabled ? '#94a3b8' : selectedOption ? '#0f172a' : '#64748b',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(15, 23, 42, 0.08)'
            : '0 1px 2px rgba(0, 0, 0, 0.04)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none',
          ...buttonStyle
        }}
        onMouseEnter={e => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = '#cbd5e1';
          }
        }}
        onMouseLeave={e => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = '#e2e8f0';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
          {icon && (
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {icon}
            </span>
          )}
          {selectedOption?.icon && (
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {selectedOption.icon}
            </span>
          )}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'left'
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.sublabel && (
            <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 500 }}>
              {selectedOption.sublabel}
            </span>
          )}
          {selectedOption?.badge && (
            <span
              style={{
                fontSize: '0.675rem',
                padding: '1px 6px',
                borderRadius: 4,
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontWeight: 500
              }}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          size={14}
          color="#94a3b8"
          style={{
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className="no-scrollbar"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            minWidth: '100%',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05)',
            zIndex: 999,
            padding: '4px',
            maxHeight: 260,
            overflowY: 'auto',
            animation: 'dropdownFadeIn 0.12s ease-out',
            ...menuStyle
          }}
        >
          {searchable && (
            <div style={{ padding: '4px 6px 6px', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px 4px 26px',
                    fontSize: '0.775rem',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                  onClick={e => e.stopPropagation()}
                />
                <Search size={12} color="#94a3b8" style={{ position: 'absolute', left: 8, top: 7 }} />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.775rem', color: '#94a3b8' }}>
              No options available
            </div>
          ) : (
            filteredOptions.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(opt.value);
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: 'none',
                    background: isSelected ? '#f1f5f9' : 'transparent',
                    borderRadius: 6,
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    color: opt.disabled ? '#cbd5e1' : isSelected ? '#0f172a' : '#334155',
                    textAlign: 'left',
                    transition: 'background-color 0.1s ease',
                    marginBottom: 1
                  }}
                  onMouseEnter={e => {
                    if (!opt.disabled && !isSelected) {
                      e.currentTarget.style.background = '#f8fafc';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!opt.disabled && !isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    {opt.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{opt.icon}</span>}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 400 }}>
                        {opt.sublabel}
                      </span>
                    )}
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          fontWeight: 500
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check size={14} color="#059669" style={{ flexShrink: 0, marginLeft: 8 }} />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
