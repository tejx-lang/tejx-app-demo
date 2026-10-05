import React, { useState, useEffect } from 'react';
import {
  Store,
  Boxes,
  PlusCircle,
  TrendingUp,
  Percent,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit,
  Truck,
  Package,
  X
} from 'lucide-react';
import {
  fetchVendorInventory,
  replenishVendorStock,
  fetchVendorPromotions,
  fetchVendorMetrics,
  saveProduct,
  fetchSnapshotOrders,
  updateOrderFulfillment
} from '../services/api';
import { AuthProfile, SnapshotInvoice } from '../services/types';

interface VendorPortalViewProps {
  currentProfile?: AuthProfile | null;
  onSwitchRole?: (role: 'guest' | 'customer' | 'vendor' | 'admin') => void;
}

export const VendorPortalView: React.FC<VendorPortalViewProps> = ({ currentProfile, onSwitchRole }) => {
  const [selectedVendor, setSelectedVendor] = useState(currentProfile?.vendorId || 'vnd-aurora');
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<SnapshotInvoice[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replenishingSku, setReplenishingSku] = useState<string | null>(null);
  const [replenishSuccessMsg, setReplenishSuccessMsg] = useState<string | null>(null);

  // New Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Connectivity');
  const [newBrand, setNewBrand] = useState('Aurora Labs');
  const [newBasePrice, setNewBasePrice] = useState(199);
  const [newSpecs, setNewSpecs] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Product Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editTitle, setEditTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const vendors = [
    { id: 'vnd-aurora', name: 'Aurora Labs', tier: 'Platinum Seller' },
    { id: 'vnd-zenith', name: 'Zenith Systems', tier: 'Gold Seller' },
    { id: 'vnd-hyper', name: 'HyperGear Global', tier: 'Platinum Seller' }
  ];

  // Sync selectedVendor whenever currentProfile changes
  useEffect(() => {
    if (currentProfile?.role === 'vendor' && currentProfile.vendorId) {
      setSelectedVendor(currentProfile.vendorId);
    }
  }, [currentProfile]);

  const loadVendorData = async () => {
    setLoading(true);
    try {
      const [invData, metData, promoData, ordersData] = await Promise.all([
        fetchVendorInventory(selectedVendor),
        fetchVendorMetrics(selectedVendor),
        fetchVendorPromotions(),
        fetchSnapshotOrders()
      ]);

      setInventory(invData.inventory || []);
      setLowStockCount(invData.lowStockAlertCount || 0);
      setMetrics(metData);
      setPromotions(promoData || []);

      // Filter orders relevant to this vendor
      const allOrders = ordersData.orders || [];
      const vendorOrders = allOrders.filter(o =>
        o.items?.some(it => it.vendorId === selectedVendor || selectedVendor === 'all')
      );
      setOrders(vendorOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorData();
  }, [selectedVendor]);

  const handleReplenish = async (sku: string) => {
    setReplenishingSku(sku);
    setReplenishSuccessMsg(null);
    try {
      const res = await replenishVendorStock(sku, 50);
      if (res.success) {
        setReplenishSuccessMsg(`Added +50 units to SKU ${sku} (Current Balance: ${res.stock})`);
        loadVendorData();
        setTimeout(() => setReplenishSuccessMsg(null), 4000);
      }
    } finally {
      setReplenishingSku(null);
    }
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setIsAdding(true);
    try {
      const res = await saveProduct({
        title: newTitle,
        category: newCategory,
        brand: newBrand,
        basePrice: Number(newBasePrice),
        salePrice: Number(newBasePrice),
        vendorId: selectedVendor,
        specifications: newSpecs
      });
      if (res.success) {
        setShowAddModal(false);
        setNewTitle('');
        setNewSpecs('');
        loadVendorData();
      } else {
        alert(res.error || 'Failed to add product');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditTitle(item.productTitle);
    setEditPrice(item.price);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsEditing(true);
    try {
      const res = await saveProduct({
        id: editingItem.productId,
        title: editTitle,
        basePrice: Number(editPrice),
        salePrice: Number(editPrice)
      });
      if (res.success) {
        setEditingItem(null);
        loadVendorData();
      } else {
        alert(res.error || 'Failed to update product');
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleDispatchOrder = async (orderId: string) => {
    try {
      const res = await updateOrderFulfillment(orderId, 'DISPATCHED_IN_TRANSIT');
      if (res.success) {
        setReplenishSuccessMsg(`Order ${orderId} dispatched to carrier.`);
        loadVendorData();
        setTimeout(() => setReplenishSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert('Failed to dispatch order: ' + err.message);
    }
  };

  const isGuestOrCustomer = currentProfile?.role === 'guest' || currentProfile?.role === 'customer';

  return (
    <div className="section-container">
      {/* Role Notice Banner if not Vendor/Admin */}
      {isGuestOrCustomer && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            color: '#6d28d9',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div>
            <strong>Preview Mode:</strong> You are currently signed in as {currentProfile?.name || 'Customer'}.
            Switch to Verified Vendor mode to unlock full store inventory management and fulfillment controls.
          </div>
          <button
            onClick={() => onSwitchRole?.('vendor')}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '4px 12px', background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            Switch to Vendor Mode
          </button>
        </div>
      )}

      {/* Header & Seller Selector */}
      <div className="section-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Vendor Operations Portal
            </h2>
            <span className="badge badge-purple">
              {currentProfile?.role === 'vendor' ? 'Authenticated Store Owner' : 'Multi-Tenant Storefront'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Manage warehouse inventory, adjust pricing, upload new products, and fulfill customer sub-orders.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={selectedVendor}
            onChange={e => setSelectedVendor(e.target.value)}
            className="input select-custom"
            style={{ width: 'auto', minWidth: 220, fontWeight: 600, background: '#ffffff' }}
          >
            {vendors.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.tier})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Plus size={14} /> Add Product
          </button>

          <button
            onClick={loadVendorData}
            className="btn btn-secondary"
            disabled={loading}
            title="Refresh inventory"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {replenishSuccessMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontSize: '0.825rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} />
          <span>{replenishSuccessMsg}</span>
        </div>
      )}

      {/* Seller KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Fulfillment Status
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
            {metrics?.status || 'Active & Verified'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Tier: {metrics?.tier || 'Platinum Partner'}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Platform Commission</span>
            <Percent size={14} color="#64748b" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'monospace' }}>
            {metrics?.commissionRate ? `${metrics.commissionRate}%` : '12%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Tier-based marketplace cut
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Active SKUs</span>
            <Boxes size={14} color="#64748b" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'monospace' }}>
            {inventory.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Across independent warehouses
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Low Stock Watch</span>
            <AlertTriangle size={14} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: lowStockCount > 0 ? '#d97706' : '#059669', marginTop: 4, fontFamily: 'monospace' }}>
            {lowStockCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Variants below 10 items
          </div>
        </div>
      </div>

      {/* Live Inventory Management Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Live Warehouse Stock & Variant Allocation
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Real-time multi-location inventory. Edit product details or replenish +50 units with atomic updates.
            </p>
          </div>
          <span className="badge badge-neutral">{inventory.length} Tracked SKUs</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Product & Variation</th>
                <th>SKU</th>
                <th>Warehouses</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'center' }}>Stock Level</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const isLow = item.stock < 10;
                return (
                  <tr key={item.sku}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.productTitle}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.variantName} ({item.optionValues})</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.sku}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {item.warehouses?.map((wh: any) => (
                          <span key={wh.code} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                            {wh.code}: {wh.stock}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      ${item.price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isLow ? (
                        <span className="badge badge-amber">LOW: {item.stock}</span>
                      ) : (
                        <span className="badge badge-green">{item.stock} Available</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          title="Edit Product Price & Title"
                        >
                          <Edit size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleReplenish(item.sku)}
                          disabled={replenishingSku === item.sku}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          <PlusCircle size={12} />
                          {replenishingSku === item.sku ? 'Saving...' : '+50'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Orders & Fulfillment Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Customer Orders & Sub-Order Fulfillment
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Orders containing items from this vendor. Mark orders dispatched to release escrow payouts.
            </p>
          </div>
          <span className="badge badge-blue">{orders.length} Sub-Orders</span>
        </div>

        {orders.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            No incoming customer orders yet for this vendor.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Customer Email</th>
                  <th>Purchased SKUs</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const isConfirmed = order.status === 'CONFIRMED_ATOMIC';
                  return (
                    <tr key={order.orderId}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {order.orderId}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {order.customerEmail}
                      </td>
                      <td>
                        {order.items?.map(it => `${it.title} (x${it.quantity})`).join(', ')}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        ${order.netVendorPayout.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${isConfirmed ? 'badge-green' : 'badge-blue'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isConfirmed ? (
                          <button
                            onClick={() => handleDispatchOrder(order.orderId)}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            <Truck size={13} /> Dispatch Carrier
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            Dispatched
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promotion Rules Engine */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Active Promotion Rules & Flash Deals
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Scheduled discounts, volume tiers, and sitewide flash deals.
            </p>
          </div>
          <span className="badge badge-blue">{promotions.length} Active Rules</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {promotions.map(promo => (
            <div
              key={promo.id}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{promo.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Type: {promo.discountType} • Scope: {promo.scope}
                </div>
              </div>
              <span className="badge badge-pink" style={{ fontWeight: 700 }}>
                {promo.discountValue}% OFF
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Product Modal */}
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
          <div className="card" style={{ maxWidth: 520, width: '100%', background: '#ffffff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Add New Product to Store
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Product Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. UltraSlim 100W GaN Travel Adapter"
                  className="input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    className="input select-custom"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                  >
                    <option value="Connectivity">Connectivity</option>
                    <option value="Audio">Audio</option>
                    <option value="Power">Power</option>
                    <option value="Workstation">Workstation</option>
                  </select>
                </div>
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
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Dynamic Specifications
                </label>
                <input
                  type="text"
                  placeholder="e.g. Capacity: 25,000mAh, Output: 140W PD 3.1"
                  className="input"
                  value={newSpecs}
                  onChange={e => setNewSpecs(e.target.value)}
                />
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
                  disabled={isAdding}
                  className="btn btn-primary"
                >
                  {isAdding ? 'Adding Product...' : 'Publish Product to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingItem && (
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
          <div className="card" style={{ maxWidth: 480, width: '100%', background: '#ffffff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Edit Product Pricing
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
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

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Unit Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={editPrice}
                  onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="btn btn-primary"
                >
                  {isEditing ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPortalView;
