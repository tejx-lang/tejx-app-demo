import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Zap,
  CheckCircle,
  AlertTriangle,
  SlidersHorizontal,
  X,
  Sparkles,
  Package,
  RotateCcw,
  Edit,
  Clock,
  FileText,
  User,
  ShoppingBag,
  Plus,
  Trash2,
  Truck,
  Star,
  Eye,
  Check,
  Tag
} from 'lucide-react';
import {
  fetchMarketplaceCatalog,
  fetchCatalogFacets,
  executeAtomicCheckout,
  saveProduct,
  deleteProduct,
  fetchSnapshotOrders,
  fetchStorefronts
} from '../services/api';
import { MarketplaceProduct, SnapshotInvoice, CatalogFacets, AuthProfile, VendorStorefront } from '../services/types';

interface MarketplaceViewProps {
  currentProfile?: AuthProfile | null;
  onSwitchRole?: (role: 'guest' | 'customer' | 'vendor' | 'admin') => void;
  onNavigateTab?: (tab: 'marketplace' | 'vendor' | 'financial' | 'security') => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ currentProfile, onSwitchRole, onNavigateTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'orders'>('catalog');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [orders, setOrders] = useState<SnapshotInvoice[]>([]);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [flashOnly, setFlashOnly] = useState(false);

  // Selected variant map per product: { [productId]: sku }
  const [selectedVariants, setSelectedVariants] = useState<{ [productId: string]: string }>({});

  // Cart: Array of { product, variant, quantity }
  const [cart, setCart] = useState<Array<{ product: MarketplaceProduct; sku: string; quantity: number }>>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{ success: boolean; invoice?: SnapshotInvoice; error?: string } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp-${Date.now().toString(36)}`);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBasePrice, setEditBasePrice] = useState(0);
  const [editSalePrice, setEditSalePrice] = useState(0);
  const [editFlashSale, setEditFlashSale] = useState(false);
  const [editFlashDiscount, setEditFlashDiscount] = useState(15);
  const [editSpecs, setEditSpecs] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [storefronts, setStorefronts] = useState<VendorStorefront[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Connectivity');
  const [newBrand, setNewBrand] = useState('');
  const [newBasePrice, setNewBasePrice] = useState(249);
  const [newSalePrice, setNewSalePrice] = useState(199);
  const [newFlashSale, setNewFlashSale] = useState(false);
  const [newFlashDiscount, setNewFlashDiscount] = useState(20);
  const [newSpecs, setNewSpecs] = useState('Titanium chassis, 4K HDR, Zero-latency DSP');
  const [newStock, setNewStock] = useState(60);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Product Quick View Modal State
  const [viewingProduct, setViewingProduct] = useState<MarketplaceProduct | null>(null);

  // Cart Coupon & Discount State
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<{ text: string; success: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catData, facetData, ordersData, storefrontsData] = await Promise.all([
        fetchMarketplaceCatalog({
          search,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          brand: selectedBrand === 'all' ? undefined : selectedBrand,
          flashOnly
        }),
        fetchCatalogFacets({
          search,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          brand: selectedBrand === 'all' ? undefined : selectedBrand
        }),
        fetchSnapshotOrders(),
        fetchStorefronts()
      ]);
      setProducts(catData.products || []);
      setFacets(facetData);
      setOrders(ordersData.orders || []);
      setStorefronts(storefrontsData);
      if (storefrontsData.length > 0) {
        const initialVnd = storefrontsData.find(s => s.id === currentProfile?.vendorId) || storefrontsData[0];
        setSelectedVendorId(prev => prev || initialVnd.id);
        setNewBrand(prev => prev || initialVnd.name);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, selectedBrand, flashOnly, currentProfile?.role, currentProfile?.sub]);

  const handleSelectVariant = (productId: string, sku: string) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: sku }));
  };

  const handleAddToCart = (product: MarketplaceProduct, skuOverride?: string) => {
    const chosenSku = skuOverride || selectedVariants[product.id] || product.variants[0]?.sku;
    if (!chosenSku) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.sku === chosenSku);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.sku === chosenSku
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, sku: chosenSku, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, sku: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId && item.sku === sku) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: MarketplaceProduct; sku: string; quantity: number }>;
    });
  };

  const handleRemoveFromCart = (productId: string, sku: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.sku === sku)));
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === 'AURA10') {
      setAppliedDiscount(10);
      setCouponMsg({ text: '10% Marketplace Discount Applied!', success: true });
    } else if (code === 'FLASH20') {
      setAppliedDiscount(20);
      setCouponMsg({ text: '20% Flash Deal Discount Applied!', success: true });
    } else {
      setCouponMsg({ text: 'Invalid promo code. Try AURA10 or FLASH20', success: false });
    }
  };

  const handleOpenEdit = (p: MarketplaceProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(p);
    setEditTitle(p.title);
    setEditBasePrice(p.basePrice);
    setEditSalePrice(p.salePrice);
    setEditFlashSale(p.isFlashSale);
    setEditFlashDiscount(p.flashDiscountPercent || 15);
    setEditSpecs(p.specifications || '');
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this listing from the marketplace?')) {
      return;
    }
    const res = await deleteProduct(productId);
    if (res.success) {
      if (editingProduct?.id === productId) setEditingProduct(null);
      if (viewingProduct?.id === productId) setViewingProduct(null);
      loadData();
    } else {
      alert(res.error || 'Failed to delete product');
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingProduct(true);
    try {
      const activeStorefront = storefronts.find(s => s.id === selectedVendorId) || storefronts[0];
      const vendorId = currentProfile?.role === 'vendor' && currentProfile.vendorId
        ? currentProfile.vendorId
        : (activeStorefront ? activeStorefront.id : '');
      const vendorName = currentProfile?.role === 'vendor'
        ? (currentProfile.name || activeStorefront?.name || 'Vendor Store')
        : (activeStorefront ? activeStorefront.name : (newBrand || 'Official Store'));

      if (!vendorId) {
        alert('Please create a storefront in the Vendor Portal before listing products.');
        return;
      }

      const brandName = newBrand || (activeStorefront ? activeStorefront.name : 'Brand');
      const skuPrefix = (brandName.length >= 3 ? brandName.substring(0, 3) : 'PRD').toUpperCase();

      const res = await saveProduct({
        title: newTitle,
        category: newCategory,
        brand: brandName,
        vendorId,
        vendorName,
        basePrice: Number(newBasePrice),
        salePrice: Number(newSalePrice),
        isFlashSale: newFlashSale,
        flashDiscountPercent: Number(newFlashDiscount),
        specifications: newSpecs,
        variants: [
          {
            sku: `${skuPrefix}-${Date.now().toString().slice(-4)}`,
            name: 'Standard Edition',
            price: Number(newSalePrice || newBasePrice),
            stock: Number(newStock) || 60,
            warehouses: ['WH-US-WEST-01']
          }
        ]
      });

      if (res.success) {
        setShowAddModal(false);
        setNewTitle('');
        setNewSpecs('Titanium chassis, 4K HDR, Zero-latency DSP');
        loadData();
      } else {
        alert(res.error || 'Failed to add product listing');
      }
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingProduct(true);
    try {
      const res = await saveProduct({
        id: editingProduct.id,
        title: editTitle,
        basePrice: Number(editBasePrice),
        salePrice: Number(editSalePrice),
        isFlashSale: editFlashSale,
        flashDiscountPercent: Number(editFlashDiscount),
        specifications: editSpecs
      });
      if (res.success) {
        setEditingProduct(null);
        loadData();
      } else {
        alert(res.error || 'Failed to save product changes');
      }
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleCheckout = async (replay: boolean = false) => {
    if (currentProfile?.role === 'guest') {
      if (onSwitchRole) onSwitchRole('customer');
      return;
    }

    if (cart.length === 0 && !replay) return;
    setIsCheckingOut(true);
    setCheckoutResult(null);

    const items = cart.map(c => ({
      productId: c.product.id,
      sku: c.sku,
      quantity: c.quantity
    }));

    const keyToUse = replay ? idempotencyKey : `idemp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    if (!replay) setIdempotencyKey(keyToUse);

    const res = await executeAtomicCheckout({
      items,
      idempotencyKey: keyToUse,
      correlationId: `corr-${Date.now()}`,
      customerId: currentProfile?.sub || 'usr-cust-01',
      customerEmail: currentProfile?.email || 'customer@aura.com'
    });

    setCheckoutResult(res);
    setIsCheckingOut(false);

    if (res.success && res.invoice) {
      setShowInvoiceModal(true);
      if (!replay) setCart([]);
      loadData();
    }
  };

  const cartTotal = cart.reduce((acc, item) => {
    const variant = item.product.variants.find(v => v.sku === item.sku);
    const price = item.product.isFlashSale ? item.product.salePrice : (variant?.price || item.product.basePrice);
    return acc + price * item.quantity;
  }, 0);

  const canEditProduct = (p: MarketplaceProduct) => {
    if (!currentProfile) return false;
    if (currentProfile.role === 'admin') return true;
    if (currentProfile.role === 'vendor' && currentProfile.vendorId === p.vendorId) return true;
    return false;
  };

  return (
    <div className="section-container">
      {/* Top Controls Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem 1.75rem',
          marginBottom: '1.75rem',
          background: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {activeSubTab === 'catalog' ? 'Marketplace Catalog' : 'Order History & Invoices'}
              </h2>
              <span className="badge badge-blue">
                {activeSubTab === 'catalog' ? `${products.length} Products Available` : `${orders.length} Settled Orders`}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              {activeSubTab === 'catalog'
                ? 'Multi-vendor items with zero-overdraft atomic reservation and snapshot pricing.'
                : 'Immutable point-in-time invoices protecting historical records from future catalog changes.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Sub tab switcher: Catalog vs My Orders */}
          <div className="segmented-nav">
            <button
              onClick={() => setActiveSubTab('catalog')}
              className={`segmented-nav-btn ${activeSubTab === 'catalog' ? 'active' : ''}`}
            >
              <ShoppingBag size={14} />
              Catalog
            </button>
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`segmented-nav-btn ${activeSubTab === 'orders' ? 'active' : ''}`}
            >
              <FileText size={14} />
              My Orders ({orders.length})
            </button>
          </div>

          {activeSubTab === 'catalog' && (
            <button
              onClick={() => setFlashOnly(!flashOnly)}
              className={`btn ${flashOnly ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontWeight: 600 }}
            >
              <Sparkles size={14} color={flashOnly ? '#38bdf8' : '#d97706'} />
              {flashOnly ? 'Flash Deals Only' : 'Filter Flash Deals'}
            </button>
          )}

          {activeSubTab === 'catalog' && (currentProfile?.role === 'vendor' || currentProfile?.role === 'admin') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
              style={{ fontWeight: 600 }}
            >
              <Plus size={14} />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Role specific marketplace banner */}
      {currentProfile?.role === 'vendor' && (
        <div style={{ padding: '10px 16px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.825rem', color: '#4c1d95', fontWeight: 600 }}>
            <span>🏪 Seller Mode: {currentProfile?.name || currentProfile?.vendorId || 'Vendor'}</span>
            <span style={{ fontWeight: 400, color: '#6d28d9' }}>• You have permissions to edit prices and stock on your products, or add new listings.</span>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            <Plus size={12} /> Add New Listing
          </button>
        </div>
      )}

      {currentProfile?.role === 'admin' && (
        <div style={{ padding: '10px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.825rem', color: '#065f46', fontWeight: 600 }}>
            <span>👑 Platform Super-Admin Mode</span>
            <span style={{ fontWeight: 400, color: '#047857' }}>• Full marketplace catalog edit, delete, and addition privileges active.</span>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            <Plus size={12} /> Create Product
          </button>
        </div>
      )}

      {activeSubTab === 'orders' ? (
        /* Order History View */
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Historical Order Invoices & Snapshots
            </h3>
            <span className="badge badge-emerald">Audit Compliant ({orders.length})</span>
          </div>

          {currentProfile?.role === 'guest' ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Sign in to view your Order History
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: 420, margin: '0 auto 16px auto' }}>
                You are currently browsing as an Anonymous Guest. Sign in as Customer to track previous purchases and inspect snapshot invoices.
              </p>
              <button
                onClick={() => onSwitchRole && onSwitchRole('customer')}
                className="btn btn-primary"
              >
                Sign in as Elena Vance (Customer)
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No orders placed yet. Return to the Catalog tab and complete an atomic checkout!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Customer</th>
                    <th>Snapshotted Items</th>
                    <th style={{ textAlign: 'right' }}>Total GMV</th>
                    <th style={{ textAlign: 'right' }}>Net Vendor Payout</th>
                    <th style={{ textAlign: 'center' }}>Fulfillment Status</th>
                    <th style={{ textAlign: 'right' }}>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.orderId}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {order.orderId}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {order.customerEmail}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {order.items?.map(it => (
                            <span key={it.sku} style={{ fontSize: '0.75rem' }}>
                              {it.title} (x{it.quantity}) - ${it.unitPrice.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        ${order.grossMerchandiseValue.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb' }}>
                        ${order.netVendorPayout.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${order.status.includes('DELIVERED') ? 'badge-emerald' : order.status.includes('DISPATCHED') ? 'badge-blue' : 'badge-green'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setCheckoutResult({ success: true, invoice: order });
                            setShowInvoiceModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                        >
                          <FileText size={12} /> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Main Catalog & Shopping Grid */
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Faceted Filter Navigation */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <SlidersHorizontal size={15} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Filters</h3>
            </div>

            {/* Search box */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search products & brands..."
                  className="input"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ fontSize: '0.825rem', paddingLeft: 30 }}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-tertiary)' }} />
              </div>
            </div>

            {/* Categories facet */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Categories
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`filter-item ${selectedCategory === 'all' ? 'active' : ''}`}
                >
                  <span>All Categories</span>
                  <span className="badge badge-neutral" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                    {products.length}
                  </span>
                </button>
                {facets?.categories?.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`filter-item ${selectedCategory === cat.name ? 'active' : ''}`}
                  >
                    <span>{cat.name}</span>
                    <span className="badge badge-neutral" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brands facet */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Brands
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <button
                  onClick={() => setSelectedBrand('all')}
                  className={`filter-item ${selectedBrand === 'all' ? 'active' : ''}`}
                >
                  <span>All Brands</span>
                </button>
                {facets?.brands?.map(b => (
                  <button
                    key={b.name}
                    onClick={() => setSelectedBrand(b.name)}
                    className={`filter-item ${selectedBrand === b.name ? 'active' : ''}`}
                  >
                    <span>{b.name}</span>
                    <span className="badge badge-neutral" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                      {b.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Low Stock Watcher Card */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fef3c7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: '0.75rem', fontWeight: 600 }}>
                <AlertTriangle size={14} />
                <span>Stock Watcher</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 4 }}>
                {facets?.lowStockAlertsCount ?? 0} variants below threshold (&lt;10 items)
              </div>
            </div>
          </div>

          {/* Center Column: Product Catalog Grid */}
          <div>
            {loading ? (
              <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {search || selectedCategory !== 'all' || selectedBrand !== 'all'
                    ? 'No products match your filters'
                    : 'Marketplace Catalog is Empty'}
                </div>
                <p style={{ fontSize: '0.85rem', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.5 }}>
                  {search || selectedCategory !== 'all' || selectedBrand !== 'all'
                    ? 'Try resetting the category and brand filters or adjusting your search term.'
                    : 'No products are currently listed in MongoDB. Create a storefront in the Vendor Portal and list products to start selling.'}
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('vendor')}
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <ShoppingBag size={14} /> Open Vendor Portal
                    </button>
                  )}
                  {(currentProfile?.role === 'admin' || currentProfile?.role === 'vendor') && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus size={14} /> Add Product Listing
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
                {products.map(product => {
                  const activeSku = selectedVariants[product.id] || product.variants[0]?.sku;
                  const activeVariant = product.variants.find(v => v.sku === activeSku) || product.variants[0];
                  const displayPrice = product.isFlashSale ? product.salePrice : (activeVariant?.price || product.basePrice);
                  const isLowStock = activeVariant && activeVariant.stock > 0 && activeVariant.stock < 10;
                  const isOutOfStock = !activeVariant || activeVariant.stock === 0;
                  const editable = canEditProduct(product);

                  return (
                    <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
                      <div>
                        {/* Product Header & Seller Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            {product.vendorName}
                          </span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {editable && (
                              <button
                                onClick={e => handleOpenEdit(product, e)}
                                className="btn btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                title="Edit product details, pricing, and specifications"
                              >
                                <Edit size={11} /> Edit
                              </button>
                            )}
                            {currentProfile?.role === 'admin' && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product.id);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '2px 6px', fontSize: '0.7rem', color: '#e11d48' }}
                                title="Delete listing from marketplace"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                            {product.isFlashSale && (
                              <span className="badge badge-pink" style={{ fontSize: '0.7rem' }}>
                                FLASH -{product.flashDiscountPercent}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Product Title (Clickable for Quick View) */}
                        <h4
                          onClick={() => setViewingProduct(product)}
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            margin: '0 0 6px 0',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                          title="Click to view full specifications"
                        >
                          {product.title}
                        </h4>

                        {/* Dynamic Specifications */}
                        {product.specifications && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: '#f8fafc', border: '1px solid #f1f5f9', padding: '4px 8px', borderRadius: 6, marginBottom: 12 }}>
                            {product.specifications}
                          </div>
                        )}

                        {/* Polymorphic Variant Picker */}
                        <div style={{ marginBottom: 14 }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
                            Select Variant / SKU:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {product.variants.map(v => (
                              <button
                                key={v.sku}
                                onClick={() => handleSelectVariant(product.id, v.sku)}
                                className={`variant-btn ${v.sku === activeSku ? 'selected' : ''}`}
                              >
                                {v.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Price, Stock status & Action */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                              ${displayPrice.toFixed(2)}
                            </div>
                            {product.isFlashSale && (
                              <div style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>
                                ${product.basePrice.toFixed(2)}
                              </div>
                            )}
                          </div>

                          <div>
                            {isOutOfStock ? (
                              <span className="badge badge-red">OUT OF STOCK</span>
                            ) : isLowStock ? (
                              <span className="badge badge-amber">ONLY {activeVariant?.stock} LEFT</span>
                            ) : (
                              <span className="badge badge-green">{activeVariant?.stock} IN STOCK</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isOutOfStock}
                            className="btn btn-primary"
                            style={{ flex: 1, fontSize: '0.85rem' }}
                          >
                            <ShoppingCart size={15} />
                            Add to Cart
                          </button>
                          <button
                            onClick={() => setViewingProduct(product)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 0.75rem' }}
                            title="View specifications & details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Sticky Multi-Vendor Cart */}
          <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '5.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShoppingCart size={16} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Shopping Cart</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-neutral">{cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.725rem', cursor: 'pointer', padding: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Cart items list */}
            {cart.length === 0 ? (
              <div style={{ padding: '32px 8px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                Your cart is currently empty.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem', maxHeight: 240, overflowY: 'auto' }}>
                {cart.map(item => {
                  const variant = item.product.variants.find(v => v.sku === item.sku);
                  const price = item.product.isFlashSale ? item.product.salePrice : (variant?.price || item.product.basePrice);

                  return (
                    <div
                      key={`${item.product.id}-${item.sku}`}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.product.title}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                          SKU: {item.sku}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          Vendor: {item.product.vendorName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.sku, -1)}
                            className="btn btn-secondary"
                            style={{ padding: '1px 6px', fontSize: '0.7rem' }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 16, textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.sku, 1)}
                            className="btn btn-secondary"
                            style={{ padding: '1px 6px', fontSize: '0.7rem' }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'monospace' }}>
                          ${(price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id, item.sku)}
                          style={{ background: 'none', border: 'none', color: '#e11d48', fontSize: '0.725rem', cursor: 'pointer', padding: 0, marginTop: 4 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Promo Code Input */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Promo Code (AURA10)"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="input"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                Apply
              </button>
            </form>
            {couponMsg && (
              <div style={{ fontSize: '0.725rem', color: couponMsg.success ? '#059669' : '#e11d48', marginBottom: 10 }}>
                {couponMsg.text}
              </div>
            )}

            {/* Pricing breakdown */}
            {(() => {
              const subtotal = cart.reduce((acc, item) => {
                const variant = item.product.variants.find(v => v.sku === item.sku);
                const price = item.product.isFlashSale ? item.product.salePrice : (variant?.price || item.product.basePrice);
                return acc + price * item.quantity;
              }, 0);
              const discountAmt = (subtotal * appliedDiscount) / 100;
              const shipping = subtotal > 100 || subtotal === 0 ? 0 : 15;
              const tax = (subtotal - discountAmt) * 0.08;
              const totalDue = Math.max(0, subtotal - discountAmt + shipping + tax);

              return (
                <>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span>Subtotal:</span>
                      <span style={{ fontFamily: 'monospace' }}>${subtotal.toFixed(2)}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#059669', marginBottom: 4 }}>
                        <span>Discount ({appliedDiscount}%):</span>
                        <span style={{ fontFamily: 'monospace' }}>-${discountAmt.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span>Shipping:</span>
                      <span style={{ fontFamily: 'monospace' }}>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span>Estimated Tax (8%):</span>
                      <span style={{ fontFamily: 'monospace' }}>${tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, marginTop: 8, color: 'var(--text-primary)' }}>
                      <span>Total Due:</span>
                      <span style={{ fontFamily: 'monospace', color: '#059669' }}>${totalDue.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Guest mode warning */}
                  {currentProfile?.role === 'guest' && (
                    <div style={{ padding: 10, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.775rem', marginBottom: 12 }}>
                      You are browsing as an Anonymous Guest. Sign in as Customer to checkout.
                    </div>
                  )}

                  {checkoutResult?.error && (
                    <div style={{ padding: 10, borderRadius: 8, background: '#fff1f2', color: '#e11d48', fontSize: '0.75rem', marginBottom: 12 }}>
                      {checkoutResult.error}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() => handleCheckout(false)}
                      disabled={isCheckingOut || (cart.length === 0 && currentProfile?.role !== 'guest')}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.9rem', padding: '0.7rem 1rem' }}
                    >
                      <Zap size={15} />
                      {currentProfile?.role === 'guest'
                        ? 'Sign in as Customer to Checkout'
                        : isCheckingOut
                        ? 'Processing Checkout...'
                        : `Place Order Now ($${totalDue.toFixed(2)})`}
                    </button>
                  </div>
                </>
              );
            })()}
            {checkoutResult?.invoice && (
              <button
                onClick={() => handleCheckout(true)}
                disabled={isCheckingOut}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.775rem', marginTop: 8 }}
                title="Tests idempotency: Replays the same purchase without duplicate charges"
              >
                <RotateCcw size={13} />
                Replay Idempotent Checkout
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
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
            zIndex: 100,
            padding: 20
          }}
        >
          <div className="card" style={{ maxWidth: 520, width: '100%', background: '#ffffff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Product Details
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Product Title
                </label>
                <input
                  type="text"
                  className="input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Base Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editBasePrice}
                    onChange={e => setEditBasePrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Sale / Flash Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editSalePrice}
                    onChange={e => setEditSalePrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Dynamic Specifications
                </label>
                <input
                  type="text"
                  placeholder="e.g. Battery: 200W, Weight: 450g, Material: Titanium"
                  className="input"
                  value={editSpecs}
                  onChange={e => setEditSpecs(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 16, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editFlashSale}
                    onChange={e => setEditFlashSale(e.target.checked)}
                  />
                  <span>Mark as Live Flash Sale Promotion</span>
                </label>

                {editFlashSale && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount:</span>
                    <input
                      type="number"
                      className="input"
                      style={{ width: 80, padding: '4px 8px' }}
                      value={editFlashDiscount}
                      onChange={e => setEditFlashDiscount(parseInt(e.target.value) || 0)}
                    />
                    <span style={{ fontSize: '0.75rem' }}>% OFF</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                {(currentProfile?.role === 'admin' || (currentProfile?.role === 'vendor' && currentProfile.vendorId === editingProduct.vendorId)) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    className="btn btn-secondary"
                    style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                  >
                    <Trash2 size={13} /> Delete Listing
                  </button>
                )}
                <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="btn btn-primary"
                  >
                    {isSavingProduct ? 'Saving Changes...' : 'Save Product Updates'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal (For Vendors & Admins) */}
      {showAddModal && (
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
            zIndex: 100,
            padding: 20
          }}
        >
          <div className="card" style={{ maxWidth: 540, width: '100%', background: '#ffffff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Add New Marketplace Product
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Product Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Starlink Mini Satellite Terminal Gen 3"
                  className="input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Storefront / Vendor Owner
                </label>
                {storefronts.length > 0 ? (
                  <select
                    className="select-custom"
                    value={selectedVendorId}
                    onChange={e => {
                      setSelectedVendorId(e.target.value);
                      const found = storefronts.find(s => s.id === e.target.value);
                      if (found) setNewBrand(found.name);
                    }}
                    style={{ width: '100%', padding: '0.45rem 0.75rem' }}
                    required
                  >
                    {storefronts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id}) — {s.tier || 'Verified'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                    No storefronts found in MongoDB. Please create a storefront first in the Vendor Portal before listing products.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    className="select-custom"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.75rem' }}
                  >
                    <option value="Connectivity">Connectivity</option>
                    <option value="Audio">Audio</option>
                    <option value="Power">Power</option>
                    <option value="Workstation">Workstation</option>
                    <option value="Displays">Displays</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Brand
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newBrand}
                    placeholder="e.g. Acme Labs"
                    onChange={e => setNewBrand(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Base Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={newBasePrice}
                    onChange={e => setNewBasePrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={newSalePrice}
                    onChange={e => setNewSalePrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={newStock}
                    onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Technical Specifications
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100W Output, 24000mAh, Aerospace Alloy, IP68 Waterproof"
                  className="input"
                  value={newSpecs}
                  onChange={e => setNewSpecs(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 16, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={newFlashSale}
                    onChange={e => setNewFlashSale(e.target.checked)}
                  />
                  <span>Mark as Live Flash Sale Promotion</span>
                </label>

                {newFlashSale && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discount:</span>
                    <input
                      type="number"
                      className="input"
                      style={{ width: 80, padding: '4px 8px' }}
                      value={newFlashDiscount}
                      onChange={e => setNewFlashDiscount(parseInt(e.target.value) || 0)}
                    />
                    <span style={{ fontSize: '0.75rem' }}>% OFF</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingProduct}
                  className="btn btn-primary"
                >
                  {isAddingProduct ? 'Adding Product...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Quick View / Details Modal */}
      {viewingProduct && (
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
            zIndex: 100,
            padding: 20
          }}
        >
          <div className="card" style={{ maxWidth: 620, width: '100%', background: '#ffffff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: 6 }}>
                  {viewingProduct.brand} • {viewingProduct.category}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--text-primary)' }}>
                  {viewingProduct.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Sold by: <strong>{viewingProduct.vendorName}</strong></span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b', fontWeight: 600 }}>
                    <Star size={13} fill="#f59e0b" /> {viewingProduct.vendorRating || '4.9'} (Audited Seller)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Specifications Card */}
            <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>
                Technical Specifications & Architecture
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {viewingProduct.specifications || 'Constructed with premium components. Engineered for high-throughput nomad performance.'}
              </div>
            </div>

            {/* Variant selector in modal */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Available SKUs & Warehouses:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {viewingProduct.variants.map(v => {
                  const isSelected = (selectedVariants[viewingProduct.id] || viewingProduct.variants[0]?.sku) === v.sku;
                  return (
                    <button
                      key={v.sku}
                      onClick={() => handleSelectVariant(viewingProduct.id, v.sku)}
                      className={`variant-btn ${isSelected ? 'selected' : ''}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      {v.name} (${v.price.toFixed(2)}) - {v.stock} in stock
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trust and Delivery Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <div style={{ padding: 8, background: '#ecfdf5', borderRadius: 6, fontSize: '0.75rem', color: '#065f46', textAlign: 'center' }}>
                ✓ Zero-Overdraft Guarantee
              </div>
              <div style={{ padding: 8, background: '#eff6ff', borderRadius: 6, fontSize: '0.75rem', color: '#1e40af', textAlign: 'center' }}>
                ✓ Free Shipping on $100+
              </div>
              <div style={{ padding: 8, background: '#f5f3ff', borderRadius: 6, fontSize: '0.75rem', color: '#5b21b6', textAlign: 'center' }}>
                ✓ Snapshot Invoice Audit
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)', marginRight: 'auto' }}>
                ${(viewingProduct.isFlashSale ? viewingProduct.salePrice : (viewingProduct.variants[0]?.price || viewingProduct.basePrice)).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="btn btn-secondary"
              >
                Back to Catalog
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddToCart(viewingProduct);
                  setViewingProduct(null);
                }}
                className="btn btn-primary"
              >
                <ShoppingCart size={15} /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point-in-Time Snapshot Receipt Modal */}
      {showInvoiceModal && checkoutResult?.invoice && (
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
            zIndex: 100,
            padding: 20
          }}
        >
          <div className="card" style={{ maxWidth: 580, width: '100%', background: '#ffffff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={22} color="#059669" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Order Confirmed
                </h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Order Reference: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{checkoutResult.invoice.orderId}</strong>
            </p>

            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Item & SKU</th>
                    <th>Seller</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {checkoutResult.invoice.items?.map(it => (
                    <tr key={it.sku}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{it.sku} (x{it.quantity})</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{it.vendorName}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${it.unitPrice.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>${it.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: 14, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                <div>Gross Merchandise Value:</div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                  ${checkoutResult.invoice.grossMerchandiseValue.toFixed(2)}
                </div>

                <div>Platform Cut (12%):</div>
                <div style={{ textAlign: 'right', color: '#059669', fontFamily: 'monospace' }}>
                  +${checkoutResult.invoice.totalPlatformCommission.toFixed(2)}
                </div>

                <div>Sales Tax (8%):</div>
                <div style={{ textAlign: 'right', color: '#d97706', fontFamily: 'monospace' }}>
                  +${checkoutResult.invoice.totalTax.toFixed(2)}
                </div>

                <div style={{ fontWeight: 700 }}>Net Vendor Payout:</div>
                <div style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: '#2563eb' }}>
                  ${checkoutResult.invoice.netVendorPayout.toFixed(2)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInvoiceModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.7rem' }}
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;
