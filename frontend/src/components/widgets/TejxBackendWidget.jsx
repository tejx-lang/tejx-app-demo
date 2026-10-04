import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, UserPlus, ShoppingBag, ShieldCheck, RefreshCw } from 'lucide-react';
import { 
  getNomadState, 
  saveNomadNote, 
  deleteNomadNote, 
  getBackendUsers, 
  createBackendUser, 
  getBackendProducts, 
  getBackendOrders, 
  getBackendEvents,
  getBackendSummary 
} from '../../services/api';

export function TejxBackendWidget() {
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Note state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Travel');

  // New User state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Digital Nomad');

  const loadData = async () => {
    setLoading(true);
    const [stateData, usersData, prodsData, ordsData, eventsData, sumData] = await Promise.all([
      getNomadState(),
      getBackendUsers(),
      getBackendProducts(),
      getBackendOrders(),
      getBackendEvents(),
      getBackendSummary()
    ]);

    setNotes(stateData?.notes || []);
    setUsers(usersData?.users || []);
    setProducts(prodsData?.products || []);
    setOrders(ordsData?.orders || []);
    setEvents(eventsData?.events || []);
    setSummary(sumData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await saveNomadNote({ title: newTitle, content: newContent, category: newCategory });
    if (res.success) {
      setNewTitle('');
      setNewContent('');
      loadData();
    }
  };

  const handleDeleteNote = async (id) => {
    await deleteNomadNote(id);
    setNotes(notes.filter(n => n.id !== id));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const res = await createBackendUser({ name: newUserName, email: newUserEmail, role: newUserRole });
    if (res.success) {
      setNewUserName('');
      setNewUserEmail('');
      loadData();
    }
  };

  return (
    <div className="widget-card wide" style={{ border: '1px solid var(--border-accent)', background: 'linear-gradient(145deg, rgba(22, 29, 45, 0.9) 0%, rgba(10, 14, 24, 0.8) 100%)' }}>
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">⚡</span>
          <div>
            <div className="widget-title">TejX Native Backend & MongoDB Hub</div>
            <div className="widget-category-badge">Pure TejX Wire Protocol & REST Service</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="status-pill" style={{ color: 'var(--accent-cyan)' }}>
            Storage: {summary?.storageMode === 'mongodb' ? '🍃 MongoDB Wired' : '💾 In-Memory Cache'}
          </span>
          <button className="widget-btn" onClick={loadData} title="Sync with TejX Backend">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="widget-body">
        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <button 
            className={`btn-secondary ${activeTab === 'notes' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'notes' ? 'var(--gradient-cyan-blue)' : 'transparent', color: activeTab === 'notes' ? '#000' : 'inherit' }}
            onClick={() => setActiveTab('notes')}
          >
            📝 Nomad Notes ({notes.length})
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'users' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'users' ? 'var(--gradient-cyan-blue)' : 'transparent', color: activeTab === 'users' ? '#000' : 'inherit' }}
            onClick={() => setActiveTab('users')}
          >
            👥 Users ({users.length})
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'orders' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'orders' ? 'var(--gradient-cyan-blue)' : 'transparent', color: activeTab === 'orders' ? '#000' : 'inherit' }}
            onClick={() => setActiveTab('orders')}
          >
            📦 Orders & Inventory ({orders.length})
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'events' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'events' ? 'var(--gradient-cyan-blue)' : 'transparent', color: activeTab === 'events' ? '#000' : 'inherit' }}
            onClick={() => setActiveTab('events')}
          >
            🛡️ Audit Events ({events.length})
          </button>
        </div>

        {/* Tab 1: Nomad Notes */}
        {activeTab === 'notes' && (
          <div>
            <form onSubmit={handleAddNote} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Note title (e.g. WiFi Password, Visa Date)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Content..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <select 
                className="form-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="Travel">Travel</option>
                <option value="Visa">Visa</option>
                <option value="Coworking">Coworking</option>
                <option value="Finance">Finance</option>
              </select>
              <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                <Plus size={14} /> Add Note
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {notes.map(n => (
                <div key={n.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{n.title}</span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{n.category}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{n.content}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button className="btn-danger" onClick={() => handleDeleteNote(n.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Users */}
        {activeTab === 'users' && (
          <div>
            <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Full Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
              />
              <input 
                type="email" 
                className="form-input" 
                placeholder="Email address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Role / Profession"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                <UserPlus size={14} /> Register
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{u.email}</span>
                  </div>
                  <span className="status-pill" style={{ color: 'var(--accent-blue)', fontSize: '0.7rem' }}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Orders & Inventory */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>Nomad Gear Catalog</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {products.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <span>{p.name} ({p.category})</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-emerald)' }}>${p.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-neon-violet)', marginBottom: '0.5rem' }}>Recent Orders</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {orders.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <span>Order #{o.id} ({o.productIds?.length || 2} items)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>${o.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Events */}
        {activeTab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.775rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={14} color="var(--accent-emerald)" />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ev.action}</span>
                  <span style={{ color: 'var(--text-muted)' }}>on {ev.entity} ({ev.entityId})</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
