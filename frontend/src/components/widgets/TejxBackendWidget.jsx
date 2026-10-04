import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, UserPlus, ShoppingBag, ShieldCheck, RefreshCw, Settings, AlertTriangle, CheckCircle, Terminal, Play, Send, Zap, Activity } from 'lucide-react';
import { 
  getNomadState, 
  saveNomadNote, 
  deleteNomadNote, 
  getBackendUsers, 
  createBackendUser, 
  getBackendProducts, 
  getBackendOrders, 
  getBackendEvents,
  getBackendSummary,
  getBackendExternal,
  getDatabaseStatus,
  reconnectDatabase,
  getDashboardConfig,
  updateDashboardConfig,
  getDatabaseOperations,
  executeDatabaseOperation,
  optionsDatabaseOperations,
  executeRawHttpCall
} from '../../services/api';

export function TejxBackendWidget({ onConfigUpdated }) {
  const [activeTab, setActiveTab] = useState('lab');
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [externalData, setExternalData] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [dashConfig, setDashConfig] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Note state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Travel');

  // New User state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Digital Nomad');

  // Dashboard Config Form state
  const [cfgTitle, setCfgTitle] = useState('');
  const [cfgSubtitle, setCfgSubtitle] = useState('');
  const [cfgCity, setCfgCity] = useState('');
  const [cfgCountry, setCfgCountry] = useState('');
  const [cfgCrypto, setCfgCrypto] = useState('');

  // 🧪 Live API & Mongo Lab state
  const [httpMethod, setHttpMethod] = useState('GET');
  const [httpPath, setHttpPath] = useState('/api/users');
  const [httpBody, setHttpBody] = useState('{\n  "name": "Alex Mercer",\n  "email": "alex@nomados.io",\n  "role": "Cloud Architect"\n}');
  const [httpResult, setHttpResult] = useState(null);
  const [httpRunning, setHttpRunning] = useState(false);

  const [mongoOp, setMongoOp] = useState('ping');
  const [mongoCol, setMongoCol] = useState('nomad_notes');
  const [mongoCustomPayload, setMongoCustomPayload] = useState('{\n  "filter": {},\n  "document": {\n    "id": "lab-1",\n    "title": "Interactive Note",\n    "category": "Lab"\n  }\n}');
  const [mongoResult, setMongoResult] = useState(null);
  const [mongoRunning, setMongoRunning] = useState(false);
  const [mongoManifest, setMongoManifest] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [stateData, usersData, prodsData, ordsData, eventsData, sumData, extData, dbData, confData, opData] = await Promise.all([
      getNomadState(),
      getBackendUsers(),
      getBackendProducts(),
      getBackendOrders(),
      getBackendEvents(),
      getBackendSummary(),
      getBackendExternal(),
      getDatabaseStatus(),
      getDashboardConfig(),
      getDatabaseOperations()
    ]);

    setNotes(stateData?.notes || []);
    setUsers(usersData?.users || []);
    setProducts(prodsData?.products || []);
    setOrders(ordsData?.orders || []);
    setEvents(eventsData?.events || []);
    setSummary(sumData);
    setExternalData(extData?.data || extData);
    setDbStatus(dbData);
    setDashConfig(confData);
    setMongoManifest(opData);


    if (confData) {
      setCfgTitle(confData.title || '');
      setCfgSubtitle(confData.subtitle || '');
      setCfgCity(confData.defaultCity || '');
      setCfgCountry(confData.defaultCountry || '');
      setCfgCrypto(confData.defaultCrypto || '');
    }

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

  const handleReconnectMongo = async () => {
    setReconnecting(true);
    const res = await reconnectDatabase();
    await loadData();
    setReconnecting(false);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(false);
    const updated = {
      title: cfgTitle,
      subtitle: cfgSubtitle,
      defaultCity: cfgCity,
      defaultCountry: cfgCountry,
      defaultCrypto: cfgCrypto,
      pinnedWidgets: dashConfig?.pinnedWidgets || ['weather', 'crypto', 'news', 'backend']
    };
    const res = await updateDashboardConfig(updated);
    setSavingConfig(false);
    if (res.success) {
      setConfigSuccess(true);
      if (onConfigUpdated) {
        onConfigUpdated(updated);
      }
      setTimeout(() => setConfigSuccess(false), 3000);
    }
  };

  const handleRunHttpCall = async (overrideMethod, overridePath, overrideBody) => {
    setHttpRunning(true);
    const m = overrideMethod || httpMethod;
    const p = overridePath || httpPath;
    let b = overrideBody !== undefined ? overrideBody : httpBody;
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS' || m === 'DELETE') {
      b = null;
    }
    const result = await executeRawHttpCall({ method: m, path: p, body: b });
    setHttpResult(result);
    setHttpRunning(false);
  };

  const handleRunMongoOp = async (opName, colName, customPayload) => {
    setMongoRunning(true);
    const op = (opName || mongoOp).toLowerCase();
    const col = colName || mongoCol;
    let payload = { op, collection: col };
    const raw = customPayload !== undefined ? customPayload : mongoCustomPayload;
    if (raw && raw.trim() !== '') {
      try {
        const extra = JSON.parse(raw);
        payload = { ...payload, ...extra };
      } catch (err) {
        // ignore parse error
      }
    }
    const result = await executeDatabaseOperation(payload);
    setMongoResult(result);
    setMongoRunning(false);
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
          <span className="status-pill" style={{ color: dbStatus?.connected ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
            Storage: {dbStatus?.connected ? '🍃 MongoDB Wired' : '💾 In-Memory Cache'}
          </span>
          <button className="widget-btn" onClick={loadData} title="Sync with TejX Backend">
            <RefreshCw size={13} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="widget-body">
        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`btn-secondary ${activeTab === 'lab' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'lab' ? 'var(--gradient-cyan-blue)' : 'rgba(56, 189, 248, 0.12)', color: activeTab === 'lab' ? '#000' : 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', fontWeight: 700 }}
            onClick={() => setActiveTab('lab')}
          >
            🧪 Live API & Mongo Lab
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'mongo' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'mongo' ? 'var(--gradient-cyan-blue)' : 'transparent', color: activeTab === 'mongo' ? '#000' : 'inherit' }}
            onClick={() => setActiveTab('mongo')}
          >
            🍃 MongoDB Diagnostics
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'config' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'config' ? 'var(--gradient-cyan-blue)' : 'transparent', color: activeTab === 'config' ? '#000' : 'inherit' }}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Backend Config
          </button>
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
          <button 
            className={`btn-secondary ${activeTab === 'upstream' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: activeTab === 'upstream' ? 'var(--gradient-cyan-blue)' : 'transparent', color: activeTab === 'upstream' ? '#000' : 'inherit' }}
            onClick={() => setActiveTab('upstream')}
          >
            🌐 Upstream Feed
          </button>
        </div>

        {/* Tab: Live API & Mongo Lab */}
        {activeTab === 'lab' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Capability Badges Strip */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={14} color="var(--accent-amber)" /> Pure Wire Protocols & Endpoints Verified
                </span>
                <span className="status-pill" style={{ color: dbStatus?.connected ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontSize: '0.75rem' }}>
                  {dbStatus?.connected ? '🟢 Native MongoDB Socket (SCRAM-SHA-256 Active)' : '💾 In-Memory Fast Cache'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '0.2rem', alignSelf: 'center' }}>HTTP Verbs:</span>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map(m => (
                  <span key={m} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    {m}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '0.2rem', alignSelf: 'center' }}>Mongo Wire Ops:</span>
                {['ping', 'count', 'listCollections', 'insertOne', 'insertMany', 'find', 'findOne', 'updateOne', 'deleteOne', 'deleteMany'].map(op => (
                  <span key={op} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                    {op}
                  </span>
                ))}
              </div>
            </div>

            {/* Workbench Grid: Left = HTTP Verbs Lab, Right = MongoDB Wire Lab */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              
              {/* Panel 1: HTTP Methods Lab */}
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🌐 HTTP Methods Tester
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Pure REST Router</span>
                </div>

                {/* Quick Preset Buttons */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('GET', '/api/users')}>
                    GET Users
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('POST', '/api/users', '{"name":"Aria Stark","email":"aria@nomad.io","role":"Security Auditor"}')}>
                    POST User
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('PUT', '/api/users/usr-1', '{"name":"Elena Vance Full","email":"elena@nomad.io","role":"Lead Explorer"}')}>
                    PUT User
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('PATCH', '/api/users/usr-1', '{"role":"Chief Nomad Officer"}')}>
                    PATCH User
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('DELETE', '/api/users/usr-2')}>
                    DELETE User
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('OPTIONS', '/api/users')}>
                    OPTIONS Users
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('HEAD', '/health')}>
                    HEAD Health
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunHttpCall('OPTIONS', '/api/database/operations')}>
                    OPTIONS DB
                  </button>
                </div>

                {/* Custom HTTP Call inputs */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select 
                    value={httpMethod} 
                    onChange={e => setHttpMethod(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-accent)', color: 'var(--accent-cyan)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    value={httpPath} 
                    onChange={e => setHttpPath(e.target.value)}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                    placeholder="/api/users"
                  />
                  <button 
                    className="btn-primary" 
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }} 
                    onClick={() => handleRunHttpCall()}
                    disabled={httpRunning}
                  >
                    {httpRunning ? 'Calling...' : 'Send'}
                  </button>
                </div>

                {/* Optional Body */}
                {(httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH') && (
                  <textarea 
                    value={httpBody} 
                    onChange={e => setHttpBody(e.target.value)}
                    rows={3}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)', resize: 'vertical' }}
                    placeholder="JSON Payload"
                  />
                )}

                {/* HTTP Response Console */}
                {httpResult && (
                  <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: httpResult.status >= 200 && httpResult.status < 300 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        Status: {httpResult.status} {httpResult.statusText}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Latency: {httpResult.latencyMs}ms
                      </span>
                    </div>
                    {httpResult.headers && Object.keys(httpResult.headers).length > 0 && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                        <div>allow: {httpResult.headers['allow'] || 'N/A'}</div>
                        <div>content-type: {httpResult.headers['content-type'] || 'N/A'}</div>
                      </div>
                    )}
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: '140px', overflowY: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {JSON.stringify(httpResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Panel 2: MongoDB Wire Operations Lab */}
              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🍃 MongoDB Wire Operations
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Driver Socket OP_MSG</span>
                </div>

                {/* Quick Op Buttons */}
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('ping')}>
                    ping
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('count', 'users')}>
                    count
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('listcollections')}>
                    listCollections
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('insertone', 'nomad_notes', '{"document":{"id":"op-note-live","title":"Direct Wire Note","category":"Lab"}}')}>
                    insertOne
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('find', 'nomad_notes')}>
                    find
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('findone', 'nomad_notes')}>
                    findOne
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('updateone', 'nomad_notes', '{"filter":{"id":"op-note-live"},"update":{"category":"Lab-Updated"}}')}>
                    updateOne
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('deleteone', 'nomad_notes', '{"filter":{"id":"op-note-live"}}')}>
                    deleteOne
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('insertmany', 'nomad_notes', '{"documents":[{"id":"m1","tag":"test"},{"id":"m2","tag":"test"}]} scale')}>
                    insertMany
                  </button>
                  <button className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }} onClick={() => handleRunMongoOp('deletemany', 'nomad_notes', '{"filter":{"tag":"test"}}')}>
                    deleteMany
                  </button>
                </div>

                {/* Op & Collection Controls */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select 
                    value={mongoOp} 
                    onChange={e => setMongoOp(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-accent)', color: '#c084fc', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  >
                    {['ping', 'count', 'listCollections', 'insertOne', 'insertMany', 'find', 'findOne', 'updateOne', 'deleteOne', 'deleteMany'].map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <select 
                    value={mongoCol} 
                    onChange={e => setMongoCol(e.target.value)}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                  >
                    {['users', 'products', 'nomad_notes', 'nomad_bookmarks', 'orders', 'events'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button 
                    className="btn-primary" 
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: 'var(--gradient-purple)', borderColor: '#a855f7', whiteSpace: 'nowrap' }} 
                    onClick={() => handleRunMongoOp()}
                    disabled={mongoRunning}
                  >
                    {mongoRunning ? 'Executing...' : 'Run Op'}
                  </button>
                </div>

                {/* Custom Payload */}
                {(mongoOp !== 'ping' && mongoOp !== 'listcollections') && (
                  <textarea 
                    value={mongoCustomPayload} 
                    onChange={e => setMongoCustomPayload(e.target.value)}
                    rows={3}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)', resize: 'vertical' }}
                    placeholder="Filter / Document Payload (JSON)"
                  />
                )}

                {/* MongoDB Result Console */}
                {mongoResult && (
                  <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: mongoResult.success ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        Op: {mongoResult.op || mongoOp} ({mongoResult.executedOnLiveMongo ? '🍃 Live Mongo' : '💾 In-Memory'})
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Latency: {mongoResult.latencyMs || 0}ms
                      </span>
                    </div>
                    {mongoResult.result && (
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.72rem' }}>
                        {mongoResult.result}
                      </div>
                    )}
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: '140px', overflowY: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      {JSON.stringify(mongoResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: MongoDB Diagnostics & Reconnect */}
        {activeTab === 'mongo' && (
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: dbStatus?.connected ? 'var(--accent-emerald)' : 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {dbStatus?.connected ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  MongoDB Driver Status: {dbStatus?.connected ? 'Connected & Active' : 'Offline / In-Memory Fallback'}
                </h4>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {dbStatus?.statusMessage || 'Checking connection status...'}
                </p>
              </div>

              <button 
                className="btn-primary" 
                onClick={handleReconnectMongo} 
                disabled={reconnecting}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
              >
                <RefreshCw size={13} className={reconnecting ? 'spinning' : ''} />
                {reconnecting ? 'Probing Database...' : 'Test / Reconnect MongoDB'}
              </button>
            </div>

            {/* Connection Specs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Configured MONGO_URI</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                  {dbStatus?.uri || 'mongodb://127.0.0.1:27017/tejx_nomad_db'}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Storage Engine Mode</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: dbStatus?.connected ? 'var(--accent-emerald)' : 'var(--accent-amber)', marginTop: '0.2rem' }}>
                  {dbStatus?.storageMode === 'mongodb' ? '⚡ Pure MongoDB Wire Protocol' : '💾 In-Memory Fast Cache'}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Managed Collections</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {dbStatus?.collections?.length ? dbStatus.collections.join(', ') : 'users, products, orders, nomad_notes, events'}
                </div>
              </div>
            </div>

            {/* Error & Troubleshooting Guidance */}
            {!dbStatus?.connected && (
              <div style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 600, color: 'var(--accent-amber)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Terminal size={14} /> Database Connection Diagnostics & How to Fix:
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  {dbStatus?.troubleshootingGuide || 'MongoDB server is not reachable on localhost:27017. The backend has activated zero-downtime memory persistence.'}
                </div>
                <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: '#070a13', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                  # To start MongoDB on macOS:<br/>
                  $ brew services start mongodb-community<br/>
                  # Or run with Docker:<br/>
                  $ docker run -d -p 27017:27017 --name nomad-mongo mongo:latest
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Backend-Driven Dashboard Configuration */}
        {activeTab === 'config' && (
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-cyan)' }}>
                ⚙️ Backend-Driven Dynamic Dashboard Configuration
              </h4>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                The frontend layout, title, default location, and modules are dynamically served by the TejX backend API (<code style={{ color: 'var(--accent-cyan)' }}>/api/dashboard/config</code>). Changes persist across restarts via MongoDB.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Dashboard App Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={cfgTitle}
                  onChange={(e) => setCfgTitle(e.target.value)}
                  placeholder="NomadOS | Command Center"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Subtitle / Motto</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={cfgSubtitle}
                  onChange={(e) => setCfgSubtitle(e.target.value)}
                  placeholder="Digital Nomad Super-App"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Default Weather City</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={cfgCity}
                  onChange={(e) => setCfgCity(e.target.value)}
                  placeholder="Tokyo, Lisbon, Chiang Mai"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Default Explorer Country</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={cfgCountry}
                  onChange={(e) => setCfgCountry(e.target.value)}
                  placeholder="Portugal, Japan, Thailand"
                  required
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: configSuccess ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {configSuccess ? '✅ Configuration saved to backend & MongoDB successfully!' : 'Storage: ' + (dbStatus?.connected ? 'Persisting to MongoDB' : 'Persisting to Memory Cache')}
                </span>

                <button type="submit" className="btn-primary" disabled={savingConfig}>
                  <Settings size={14} /> {savingConfig ? 'Saving...' : 'Save Configuration to Backend'}
                </button>
              </div>
            </form>
          </div>
        )}

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

        {/* Tab 5: Upstream External Integration */}
        {activeTab === 'upstream' && (
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  Backend External Integration Endpoint
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                  Target: {externalData?.targetUrl || 'Configured via EXTERNAL_UPSTREAM_URL in .env'}
                </div>
              </div>
              <span className="status-pill" style={{ color: externalData?.upstreamAvailable ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                {externalData?.upstreamAvailable ? '🟢 Online Reachable' : '🟡 Active (Cached Fallback)'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HTTP Status</div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                  {externalData?.statusCode || 200}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roundtrip Latency</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                  {externalData?.latencyMs ? `${externalData.latencyMs}ms` : '< 5ms'}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Handler Route</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                  GET /api/external
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', maxHeight: '120px', overflowY: 'auto' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(externalData?.fallback || externalData?.body || externalData || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
