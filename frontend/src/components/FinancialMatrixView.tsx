import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  RefreshCw,
  Archive,
  ArrowUpRight,
  Database
} from 'lucide-react';
import {
  fetchPlatformFinancialMatrix,
  fetchCommissionLedger,
  fetchTopKAnalytics,
  fetchDataTiering,
  archiveColdData
} from '../services/api';
import {
  FinancialMatrix,
  CommissionLedgerEntry,
  TopKAnalytics,
  DataTieringStatus,
  AuthProfile
} from '../services/types';

interface FinancialMatrixViewProps {
  currentProfile?: AuthProfile | null;
  onSwitchRole?: (role: 'guest' | 'customer' | 'vendor' | 'admin') => void;
}

export const FinancialMatrixView: React.FC<FinancialMatrixViewProps> = ({ currentProfile, onSwitchRole }) => {
  const [period, setPeriod] = useState<string>('daily');
  const [matrix, setMatrix] = useState<FinancialMatrix | null>(null);
  const [ledger, setLedger] = useState<CommissionLedgerEntry[]>([]);
  const [topK, setTopK] = useState<TopKAnalytics | null>(null);
  const [tiering, setTiering] = useState<DataTieringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [archiveMsg, setArchiveMsg] = useState<string | null>(null);

  const loadAllFinancialData = async () => {
    setLoading(true);
    try {
      const [mat, led, top, tier] = await Promise.all([
        fetchPlatformFinancialMatrix(period),
        fetchCommissionLedger(),
        fetchTopKAnalytics(5),
        fetchDataTiering()
      ]);
      setMatrix(mat);
      setLedger(led || []);
      setTopK(top);
      setTiering(tier);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFinancialData();
  }, [period]);

  const handleArchive = async () => {
    setArchiving(true);
    setArchiveMsg(null);
    try {
      const res = await archiveColdData();
      if (res.success) {
        setArchiveMsg(`Transferred ${res.movedOrdersCount} order records to cold archive tier.`);
        loadAllFinancialData();
      } else {
        setArchiveMsg(res.message || 'Archival completed.');
      }
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="section-container">
      {/* Header Banner */}
      <div className="section-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Financial Analytics & Revenue Matrix
            </h2>
            <span className="badge badge-emerald">Audited Settlements</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Real-time Gross Merchandise Value (GMV), 12% marketplace commission cut, Top-K rankings, and data tiering.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Period selector */}
          <div className="segmented-nav">
            {['hourly', 'daily', 'monthly'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`segmented-nav-btn ${period === p ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={loadAllFinancialData}
            className="btn btn-secondary"
            title="Refresh metrics"
            disabled={loading}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Role Context & Permissions Notice */}
      {currentProfile?.role !== 'admin' && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 10,
            background: currentProfile?.role === 'vendor' ? '#f5f3ff' : '#eff6ff',
            border: `1px solid ${currentProfile?.role === 'vendor' ? '#ddd6fe' : '#bfdbfe'}`,
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>
              {currentProfile?.role === 'vendor' ? '💼' : 'ℹ️'}
            </span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                {currentProfile?.role === 'vendor'
                  ? `${currentProfile?.name || currentProfile?.vendorId || 'Vendor'} Financial View (Vendor Mode)`
                  : `Viewing Platform Analytics in Read-Only Mode (${currentProfile?.name || 'Customer / Guest'})`}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {currentProfile?.role === 'vendor'
                  ? 'Tracking your net disbursements and gross sales across settled multi-vendor customer invoices.'
                  : 'Platform commission adjustments and automated cold-storage lifecycle runs require Super-Admin clearance.'}
              </div>
            </div>
          </div>
          {onSwitchRole && currentProfile?.role !== 'admin' && currentProfile?.originalRole === 'admin' && (
            <button
              onClick={() => onSwitchRole('admin')}
              className="btn btn-secondary"
              style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
            >
              Switch to Platform Admin
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Gross Merchandise Value (GMV)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            ${matrix?.grossMerchandiseValue ? matrix.grossMerchandiseValue.toFixed(2) : '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={13} /> Processed transaction volume
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Platform Revenue (12% Cut)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
            ${matrix?.platformCommissionRevenue ? matrix.platformCommissionRevenue.toFixed(2) : '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Net marketplace cut
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Vendor Payout Reserve
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
            ${matrix?.netVendorPayoutReserve ? matrix.netVendorPayoutReserve.toFixed(2) : '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Payable to sellers
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Sales Tax (8%)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>
            ${matrix?.totalTaxCollected ? matrix.totalTaxCollected.toFixed(2) : '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Statutory tax escrow
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
            Average Order Value
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            ${matrix?.averageOrderValue ? matrix.averageOrderValue.toFixed(2) : '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {matrix?.settledTransactionsCount || 0} orders settled
          </div>
        </div>
      </div>

      {/* Top-K Analytical Grouping & Data Tiering */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Top-K Grouping */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Top-K Products by Revenue
            </h3>
            <span className="badge badge-purple">Top 5 Leaders</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Units Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topK?.topProducts && topK.topProducts.length > 0 ? (
                  topK.topProducts.map(tp => (
                    <tr key={tp.productId}>
                      <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>#{tp.rank}</td>
                      <td style={{ fontWeight: 600 }}>{tp.title}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{tp.category}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{tp.unitsSold}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>
                        ${tp.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No analytical data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Lifecycle Tiering */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Automated Data Lifecycle Tiering
            </h3>
            <span className="badge badge-amber">Cost Optimization</span>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Transfers older historical transactions to compressed cold archive storage while keeping them accessible for annual tax audits.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Hot Query Cluster</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 4 }}>
                {tiering?.hotClusterCount ?? 0} Orders
              </div>
              <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: 4 }}>Retention: Active 365 Days</div>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Cold Archive Tier</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 4 }}>
                {tiering?.coldArchiveCount ?? 0} Orders
              </div>
              <div style={{ fontSize: '0.7rem', color: '#2563eb', marginTop: 4 }}>Compressed BSON Storage</div>
            </div>
          </div>

          {archiveMsg && (
            <div style={{ padding: 8, borderRadius: 6, background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', marginBottom: 12 }}>
              {archiveMsg}
            </div>
          )}

          <button
            onClick={handleArchive}
            className="btn btn-secondary"
            disabled={archiving}
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            <Archive size={14} />
            {archiving ? 'Archiving Records...' : 'Execute Lifecycle Cold Archival Run'}
          </button>
        </div>
      </div>

      {/* Platform Commission Ledger Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Platform Commission Ledger & Settlement Audit
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Itemized ledger tracking marketplace commission cuts, statutory taxes, and seller disbursements.
            </p>
          </div>
          <span className="badge badge-emerald">Audited Entries ({ledger.length})</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Entry Ref</th>
                <th>Order & SKU</th>
                <th>Seller</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
                <th style={{ textAlign: 'right' }}>Commission (12%)</th>
                <th style={{ textAlign: 'right' }}>Tax (8%)</th>
                <th style={{ textAlign: 'right' }}>Vendor Payout</th>
                <th style={{ textAlign: 'center' }}>Settlement</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length > 0 ? (
                ledger.map(entry => (
                  <tr key={entry.entryRef}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                      {entry.entryRef}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{entry.itemTitle}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {entry.orderId} • {entry.sku}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>
                      {entry.vendorName}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      ${entry.grossSubtotal.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 600 }}>
                      +${entry.platformCommissionCut.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#d97706' }}>
                      ${entry.taxAmount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      ${entry.netVendorCredit.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-green">
                        {entry.settlementStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No settled commission entries found yet. Complete a checkout in the Marketplace to trigger ledger generation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialMatrixView;
