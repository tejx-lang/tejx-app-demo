import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Store,
  Tag,
  DollarSign,
  Boxes,
  Check,
  AlertCircle
} from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import { saveProduct } from '../services/api';
import { MarketplaceProduct, MarketplaceVariant, VendorStorefront, AuthProfile } from '../services/types';

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentProfile: AuthProfile | null;
  storefronts: VendorStorefront[];
  initialProduct?: MarketplaceProduct | null;
  defaultVendorId?: string;
}

interface VariantDraft {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

const CATEGORY_OPTIONS = [
  { value: 'Connectivity', label: 'Connectivity', badge: 'Network & IoT' },
  { value: 'Audio', label: 'Audio', badge: 'Hi-Res Acoustics' },
  { value: 'Power', label: 'Power', badge: 'GaN & Battery' },
  { value: 'Workstation', label: 'Workstation', badge: 'Productivity' },
  { value: 'Displays', label: 'Displays', badge: 'Monitors & Video' },
  { value: 'Computing', label: 'Computing', badge: 'Hardware' },
  { value: 'Accessories', label: 'Accessories', badge: 'Peripherals' }
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentProfile,
  storefronts,
  initialProduct,
  defaultVendorId
}) => {
  const isEditing = Boolean(initialProduct);

  // Form State
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Connectivity');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [specifications, setSpecifications] = useState('');

  // Flash Sale
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [flashDiscountPercent, setFlashDiscountPercent] = useState(15);

  // Variants State - Pricing & inventory are strictly managed per SKU variant
  const [variants, setVariants] = useState<VariantDraft[]>([
    { id: 'v-default', sku: 'SKU-01', name: 'Standard Edition', price: 199, stock: 50 }
  ]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine effective vendor ID
  const effectiveVendorId =
    currentProfile?.role === 'vendor' && currentProfile.vendorId
      ? currentProfile.vendorId
      : selectedVendorId || defaultVendorId || (storefronts[0]?.id || '');

  // Populate state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);

    if (initialProduct) {
      setTitle(initialProduct.title || '');
      setBrand(initialProduct.brand || '');
      setCategory(initialProduct.category || 'Connectivity');
      setSelectedVendorId(initialProduct.vendorId || '');
      setSpecifications(initialProduct.specifications || '');
      setIsFlashSale(Boolean(initialProduct.isFlashSale));
      setFlashDiscountPercent(initialProduct.flashDiscountPercent || 15);

      if (initialProduct.variants && initialProduct.variants.length > 0) {
        setVariants(
          initialProduct.variants.map((v, i) => ({
            id: `v-${i}-${Date.now()}`,
            sku: v.sku,
            name: v.name,
            price: Number(v.price) || 199,
            stock: Number(v.stock) || 0
          }))
        );
      } else {
        setVariants([
          {
            id: `v-1-${Date.now()}`,
            sku: `SKU-${initialProduct.id ? initialProduct.id.slice(-4) : '01'}`,
            name: `${initialProduct.title || 'Standard'} (Standard)`,
            price: initialProduct.salePrice || initialProduct.basePrice || 199,
            stock: initialProduct.totalStock || 50
          }
        ]);
      }
    } else {
      // New Product Defaults
      setTitle('');
      setCategory('Connectivity');
      setSpecifications('');
      setIsFlashSale(false);
      setFlashDiscountPercent(15);
      setVariants([
        {
          id: `v-1-${Date.now()}`,
          sku: 'SKU-01',
          name: 'Standard Edition',
          price: 199,
          stock: 50
        }
      ]);

      const initialVid =
        currentProfile?.role === 'vendor' && currentProfile.vendorId
          ? currentProfile.vendorId
          : defaultVendorId || (storefronts[0]?.id || '');
      setSelectedVendorId(initialVid);
      const matchedStore = storefronts.find(s => s.id === initialVid);
      setBrand(matchedStore?.name || '');
    }
  }, [isOpen, initialProduct, defaultVendorId, storefronts, currentProfile]);

  // When store selection changes, keep brand in sync if unset
  const handleStoreChange = (vid: string) => {
    setSelectedVendorId(vid);
    const found = storefronts.find(s => s.id === vid);
    if (found && (!brand || brand === 'Acme Labs')) {
      setBrand(found.name);
    }
  };

  // Add a new empty variant
  const handleAddVariant = () => {
    const nextIdx = variants.length + 1;
    const slug = title
      ? title.split(' ').slice(0, 2).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '')
      : 'SKU';
    const lastPrice = variants.length > 0 ? variants[variants.length - 1].price : 199;
    const lastStock = variants.length > 0 ? variants[variants.length - 1].stock : 25;
    const newVar: VariantDraft = {
      id: `v-${Date.now()}-${nextIdx}`,
      sku: `${slug}-V${nextIdx}`,
      name: `Option ${nextIdx}`,
      price: lastPrice,
      stock: lastStock
    };
    setVariants(prev => [...prev, newVar]);
  };

  // Remove a variant (prevent deleting if only 1 remains)
  const handleRemoveVariant = (id: string) => {
    if (variants.length <= 1) return;
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  // Update a single variant field
  const handleUpdateVariant = (id: string, field: keyof VariantDraft, val: any) => {
    setVariants(prev =>
      prev.map(v => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  // Variant summary metrics
  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const variantPrices = variants.map(v => Number(v.price) || 0);
  const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
  const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0;

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Product title is required.');
      return;
    }

    if (!effectiveVendorId) {
      setErrorMessage('A valid storefront owner must be selected.');
      return;
    }

    if (variants.length === 0) {
      setErrorMessage('At least one product variant is required.');
      return;
    }

    // Prepare variants payload
    const finalVariantsPayload = variants.map((v, idx) => ({
      sku: v.sku.trim() || `SKU-${Date.now()}-${idx + 1}`,
      name: v.name.trim() || `Variant ${idx + 1}`,
      price: Number(v.price) || 0,
      stock: Number(v.stock) || 0
    }));

    const computedBasePrice = minPrice;
    const computedSalePrice = isFlashSale && flashDiscountPercent > 0
      ? Number((minPrice * (1 - flashDiscountPercent / 100)).toFixed(2))
      : minPrice;

    const payload: Partial<MarketplaceProduct> = {
      ...(initialProduct?.id ? { id: initialProduct.id } : {}),
      title: title.trim(),
      category,
      brand: brand.trim() || 'Acme Labs',
      vendorId: effectiveVendorId,
      basePrice: computedBasePrice,
      salePrice: computedSalePrice,
      isFlashSale,
      flashDiscountPercent: isFlashSale ? Number(flashDiscountPercent) : 0,
      specifications: specifications.trim(),
      variants: finalVariantsPayload as any,
      totalStock: totalStock
    };

    setIsSubmitting(true);
    try {
      const res = await saveProduct(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to save product listing.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.25rem'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card no-scrollbar"
        style={{
          maxWidth: 680,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: 16,
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          animation: 'modalFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {isEditing ? 'Edit Product Details & Variants' : 'Add New Detailed Product'}
              </h3>
              <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Multi-tenant catalog inventory with dynamic SKU variants and specifications
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Storefront Ownership */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Storefront / Vendor Owner *
            </label>
            {currentProfile?.role === 'vendor' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155'
                }}
              >
                <Store size={15} color="#6366f1" />
                <span>
                  {storefronts.find(s => s.id === effectiveVendorId)?.name || 'Assigned Store'} ({effectiveVendorId})
                </span>
                <span className="badge badge-indigo" style={{ marginLeft: 'auto', fontSize: '0.675rem' }}>
                  Verified Vendor
                </span>
              </div>
            ) : storefronts.length > 0 ? (
              <CustomDropdown
                value={effectiveVendorId}
                onChange={handleStoreChange}
                options={storefronts.map(s => ({
                  value: s.id,
                  label: s.name,
                  sublabel: `(${s.id})`,
                  badge: s.tier || 'Verified',
                  badgeColor: s.tier === 'Enterprise' ? '#6366f1' : s.tier === 'Gold' ? '#eab308' : '#10b981'
                }))}
                placeholder="Select Storefront..."
                searchable={storefronts.length > 4}
              />
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                No storefronts registered in the system. Register a storefront in Users & Security first.
              </div>
            )}
          </div>

          {/* Section 2: Product Name & Category */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Product Title *
            </label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. UltraSlim 140W GaN Desktop Charger Pro"
              required
              style={{ fontWeight: 600 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Category *
              </label>
              <CustomDropdown
                value={category}
                onChange={val => setCategory(val)}
                options={CATEGORY_OPTIONS}
                placeholder="Select Category"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Brand Name *
              </label>
              <input
                type="text"
                className="input"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Solaris Labs"
                required
              />
            </div>
          </div>



          {/* Section 4: Live Flash Sale Promotion Option */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: isFlashSale ? '#fff1f2' : '#ffffff',
              border: `1px solid ${isFlashSale ? '#fecdd3' : '#e2e8f0'}`,
              marginBottom: 16,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.825rem', fontWeight: 650, cursor: 'pointer', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={isFlashSale}
                  onChange={e => setIsFlashSale(e.target.checked)}
                  style={{ accentColor: '#e11d48' }}
                />
                <Sparkles size={14} color="#e11d48" />
                <span>Mark as Live Flash Deal Promotion</span>
              </label>
              {isFlashSale && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e11d48' }}>Discount:</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    className="input"
                    style={{ width: 68, padding: '3px 8px', fontSize: '0.8rem', textAlign: 'center' }}
                    value={flashDiscountPercent}
                    onChange={e => setFlashDiscountPercent(parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48' }}>% OFF</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: PRODUCT VARIANTS BUILDER */}
          <div
            style={{
              padding: '14px',
              borderRadius: 12,
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              marginBottom: 16
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={16} color="#2563eb" />
                <span style={{ fontSize: '0.875rem', fontWeight: 750, color: 'var(--text-primary)' }}>
                  Product SKU Variants
                </span>
                <span className="badge badge-blue" style={{ fontSize: '0.675rem' }}>
                  {variants.length} {variants.length === 1 ? 'Variant' : 'Variants'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddVariant}
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={13} /> Add Variant
              </button>
            </div>

            {/* Variants List Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }} className="no-scrollbar">
              {variants.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 34px',
                    gap: 8,
                    alignItems: 'center',
                    background: '#ffffff',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>Variant Name</span>
                    <input
                      type="text"
                      value={v.name}
                      onChange={e => handleUpdateVariant(v.id, 'name', e.target.value)}
                      placeholder="e.g. Standard Edition or Midnight Black"
                      style={{ width: '100%', fontSize: '0.775rem', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                      required
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>SKU Code</span>
                    <input
                      type="text"
                      value={v.sku}
                      onChange={e => handleUpdateVariant(v.id, 'sku', e.target.value)}
                      placeholder="SKU-XXX"
                      style={{ width: '100%', fontSize: '0.775rem', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4, fontFamily: 'monospace' }}
                      required
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>Price ($)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={v.price}
                      onChange={e => handleUpdateVariant(v.id, 'price', parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', fontSize: '0.775rem', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                      required
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>Stock</span>
                    <input
                      type="number"
                      value={v.stock}
                      onChange={e => handleUpdateVariant(v.id, 'stock', parseInt(e.target.value) || 0)}
                      style={{ width: '100%', fontSize: '0.775rem', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                      required
                    />
                  </div>
                  <div style={{ paddingTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      disabled={variants.length <= 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: variants.length <= 1 ? 'not-allowed' : 'pointer',
                        color: variants.length <= 1 ? '#cbd5e1' : '#ef4444',
                        padding: 4
                      }}
                      title={variants.length <= 1 ? 'Product must have at least one variant' : 'Remove variant'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '6px 10px', borderRadius: 6 }}>
              <span>
                Variant Pricing: <strong style={{ color: '#0f172a' }}>{minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`}</strong>
              </span>
              <span>
                Total Inventory: <strong style={{ color: '#059669' }}>{totalStock} units</strong> across {variants.length} SKU{variants.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Section 6: Technical Specifications */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Technical Specifications & Key Features
            </label>
            <input
              type="text"
              className="input"
              value={specifications}
              onChange={e => setSpecifications(e.target.value)}
              placeholder="e.g. 140W GaN III Fast Charging, Dual USB-C PD 3.1, Foldable US/EU Pins, Multi-Protocol"
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
              Separate features with commas to automatically generate feature chips on the product card.
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ minWidth: 160 }}
            >
              {isSubmitting ? (isEditing ? 'Saving Updates...' : 'Publishing Product...') : (isEditing ? 'Save Product Changes' : 'Publish Product to Store')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
