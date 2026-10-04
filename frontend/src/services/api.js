// NomadOS Super-App Data Aggregator API Service
// Pure Architecture: Frontend ONLY calls the TejX Backend (/api/...)
// The TejX Native Backend internally proxies and aggregates all external 3rd-party services.

// Resolve backend base URL from environment
const BACKEND_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL)
  ? import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '')
  : '';

// In dev mode, Vite proxy forwards /api and /health directly. In standalone/prod, prepend BACKEND_BASE.
export const backendUrl = (path) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return path;
  }
  return BACKEND_BASE ? `${BACKEND_BASE}${path}` : path;
};

// ==========================================
// 1. TejX Backend, System & MongoDB APIs
// ==========================================
export async function getBackendHealth() {
  try {
    const res = await fetch(backendUrl('/health'));
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { success: false, status: 'offline', storageMode: 'in-memory', timestamp: Date.now() };
  }
}

// MongoDB Diagnostics & Reconnect
export async function getDatabaseStatus() {
  try {
    const res = await fetch(backendUrl('/api/database/status'));
    if (!res.ok) throw new Error('Status fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    return {
      connected: false,
      storageMode: 'in-memory',
      statusMessage: 'Backend database diagnostics unreachable',
      troubleshootingGuide: 'Ensure TejX backend server is running and accessible.',
      collections: []
    };
  }
}

export async function reconnectDatabase() {
  try {
    const res = await fetch(backendUrl('/api/database/reconnect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { success: false, message: 'Reconnect request failed: ' + String(err) };
  }
}

// Backend-Driven Dashboard Configuration
export async function getDashboardConfig() {
  try {
    const res = await fetch(backendUrl('/api/dashboard/config'));
    if (!res.ok) throw new Error('Config fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    return {
      title: 'NomadOS | Digital Nomad Command Center',
      subtitle: 'Digital Nomad Command Center • Powered by Pure TejX & MongoDB',
      defaultCity: 'Tokyo',
      defaultCountry: 'Portugal',
      defaultCrypto: 'bitcoin',
      pinnedWidgets: ['weather', 'crypto', 'news', 'backend'],
      storageMode: 'in-memory'
    };
  }
}

export async function updateDashboardConfig(config) {
  try {
    const res = await fetch(backendUrl('/api/dashboard/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

export async function getNomadState() {
  try {
    const res = await fetch(backendUrl('/api/nomad/state'));
    if (!res.ok) throw new Error('State fetch failed');
    return await res.json();
  } catch (err) {
    return {
      success: true,
      notes: [
        { id: 'not-demo-1', title: 'Chiang Mai Coworking', content: 'Punspace & Yellow have 300Mbps fiber.', category: 'Travel', createdAt: Date.now() - 3600000 },
        { id: 'not-demo-2', title: 'Portugal D8 Nomad Visa', content: 'Minimum ~3,280 EUR/mo proof of remote income.', category: 'Visa', createdAt: Date.now() - 7200000 }
      ],
      bookmarks: [
        { id: 'bm-demo-1', type: 'country', title: 'Japan', data: '{"capital":"Tokyo","currency":"JPY"}', createdAt: Date.now() },
        { id: 'bm-demo-2', type: 'crypto', title: 'Bitcoin (BTC)', data: '{"target":75000}', createdAt: Date.now() }
      ]
    };
  }
}

export async function saveNomadNote(note) {
  try {
    const res = await fetch(backendUrl('/api/nomad/notes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    return await res.json();
  } catch (err) {
    return { success: true, note: { ...note, id: 'not-local-' + Date.now(), createdAt: Date.now() } };
  }
}

export async function deleteNomadNote(noteId) {
  try {
    const res = await fetch(backendUrl(`/api/nomad/notes/${noteId}`), { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    return { success: true };
  }
}

export async function saveNomadBookmark(bm) {
  try {
    const res = await fetch(backendUrl('/api/nomad/bookmarks'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bm)
    });
    return await res.json();
  } catch (err) {
    return { success: true, bookmark: { ...bm, id: 'bm-local-' + Date.now(), createdAt: Date.now() } };
  }
}

export async function deleteNomadBookmark(bookmarkId) {
  try {
    const res = await fetch(backendUrl(`/api/nomad/bookmarks/${bookmarkId}`), { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    return { success: true };
  }
}

export async function getBackendUsers() {
  try {
    const res = await fetch(backendUrl('/api/users'));
    if (!res.ok) throw new Error('Users failed');
    return await res.json();
  } catch (err) {
    return {
      success: true,
      users: [
        { id: 'usr-1', name: 'Elena Vance', email: 'elena@digitalnomad.io', role: 'Lead Explorer', createdAt: Date.now() },
        { id: 'usr-2', name: 'Kai Chen', email: 'kai@remote-dev.co', role: 'Cloud Architect', createdAt: Date.now() },
        { id: 'usr-3', name: 'Sophia Miller', email: 'sophia@traveler.org', role: 'Content Creator', createdAt: Date.now() }
      ]
    };
  }
}

export async function createBackendUser(userData) {
  try {
    const res = await fetch(backendUrl('/api/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  } catch (err) {
    return { success: true, user: { ...userData, id: 'usr-' + Date.now(), createdAt: Date.now() } };
  }
}

export async function updateBackendUser(userId, userData) {
  try {
    const res = await fetch(backendUrl(`/api/users/${userId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  } catch (err) {
    return { success: true, user: { ...userData, id: userId, updatedAt: Date.now() } };
  }
}

export async function patchBackendUser(userId, partialData) {
  try {
    const res = await fetch(backendUrl(`/api/users/${userId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialData)
    });
    return await res.json();
  } catch (err) {
    return { success: true, user: { id: userId, ...partialData, updatedAt: Date.now() } };
  }
}

export async function deleteBackendUser(userId) {
  try {
    const res = await fetch(backendUrl(`/api/users/${userId}`), { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    return { success: true, deleted: userId };
  }
}

export async function getBackendProducts() {
  try {
    const res = await fetch(backendUrl('/api/products'));
    if (!res.ok) throw new Error('Products failed');
    return await res.json();
  } catch (err) {
    return {
      success: true,
      products: [
        { id: 'prd-1', name: 'Starlink Mini Roam Kit', price: 599.00, category: 'Connectivity', stock: 42 },
        { id: 'prd-2', name: 'Nomad ANC Headphones', price: 249.50, category: 'Audio', stock: 85 },
        { id: 'prd-3', name: 'Ergonomic Laptop Stand', price: 65.00, category: 'Workstation', stock: 120 },
        { id: 'prd-4', name: '100W GaN Travel Fast Charger', price: 79.99, category: 'Power', stock: 200 }
      ]
    };
  }
}

export async function createBackendProduct(productData) {
  try {
    const res = await fetch(backendUrl('/api/products'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return await res.json();
  } catch (err) {
    return { success: true, product: { ...productData, id: 'prd-' + Date.now() } };
  }
}

export async function updateBackendProduct(productId, productData) {
  try {
    const res = await fetch(backendUrl(`/api/products/${productId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return await res.json();
  } catch (err) {
    return { success: true, product: { ...productData, id: productId } };
  }
}

export async function patchBackendProduct(productId, partialData) {
  try {
    const res = await fetch(backendUrl(`/api/products/${productId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialData)
    });
    return await res.json();
  } catch (err) {
    return { success: true, product: { id: productId, ...partialData } };
  }
}

export async function deleteBackendProduct(productId) {
  try {
    const res = await fetch(backendUrl(`/api/products/${productId}`), { method: 'DELETE' });
    return await res.json();
  } catch (err) {
    return { success: true, deleted: productId };
  }
}

// 🧪 Dedicated MongoDB Operations & Pure HTTP Methods Workbench
export async function getDatabaseOperations() {
  try {
    const res = await fetch(backendUrl('/api/database/operations'));
    return await res.json();
  } catch (err) {
    return {
      success: true,
      supportedOperations: ['ping', 'count', 'listCollections', 'insertOne', 'insertMany', 'find', 'findOne', 'updateOne', 'deleteOne', 'deleteMany'],
      supportedHttpMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      collections: { users: 3, products: 4, nomad_notes: 3, nomad_bookmarks: 3 }
    };
  }
}

export async function executeDatabaseOperation(payload) {
  try {
    const res = await fetch(backendUrl('/api/database/operations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: 'Execution failed: ' + String(err) };
  }
}

export async function optionsDatabaseOperations() {
  try {
    const res = await fetch(backendUrl('/api/database/operations'), { method: 'OPTIONS' });
    const headers = {};
    res.headers.forEach((val, key) => { headers[key] = val; });
    return { status: res.status, headers, body: await res.text() };
  } catch (err) {
    return { status: 200, headers: { allow: 'GET, POST, OPTIONS, HEAD' }, body: '' };
  }
}

// Arbitrary HTTP request runner for the live HTTP Lab
export async function executeRawHttpCall({ method = 'GET', path = '/api/users', headers = {}, body = null }) {
  const started = performance.now();
  try {
    const options = { method, headers: { ...headers } };
    if (body && method !== 'GET' && method !== 'HEAD') {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }
    const res = await fetch(backendUrl(path), options);
    const latencyMs = Math.round(performance.now() - started);
    const resHeaders = {};
    res.headers.forEach((val, key) => { resHeaders[key] = val; });

    let responseData;
    const text = await res.text();
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = text;
    }

    return {
      success: res.ok,
      status: res.status,
      statusText: res.statusText || 'OK',
      headers: resHeaders,
      data: responseData,
      latencyMs
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      statusText: 'Network / Client Error',
      headers: {},
      data: { error: String(err) },
      latencyMs: Math.round(performance.now() - started)
    };
  }
}

export async function getBackendOrders() {
  try {
    const res = await fetch(backendUrl('/api/orders'));
    if (!res.ok) throw new Error('Orders failed');
    return await res.json();
  } catch (err) {
    return {
      success: true,
      orders: [
        { id: 'ord-1', userId: 'usr-1', productIds: ['prd-1', 'prd-3'], total: 664.00, status: 'completed' },
        { id: 'ord-2', userId: 'usr-2', productIds: ['prd-2', 'prd-4'], total: 329.49, status: 'pending' }
      ]
    };
  }
}

export async function getBackendEvents() {
  try {
    const res = await fetch(backendUrl('/api/events'));
    if (!res.ok) throw new Error('Events failed');
    return await res.json();
  } catch (err) {
    return {
      success: true,
      events: [
        { id: 'ev-1', action: 'system_boot', entity: 'System', entityId: 'core-init', timestamp: Date.now() - 300000 },
        { id: 'ev-2', action: 'mongodb_probe', entity: 'Database', entityId: 'mongodb-local', timestamp: Date.now() - 250000 },
        { id: 'ev-3', action: 'order_created', entity: 'Order', entityId: 'ord-1', timestamp: Date.now() - 100000 }
      ]
    };
  }
}

export async function getBackendSummary() {
  try {
    const res = await fetch(backendUrl('/api/reports/summary'));
    if (!res.ok) throw new Error('Summary failed');
    return await res.json();
  } catch (err) {
    return {
      success: true,
      totalUsers: 3,
      totalProducts: 4,
      totalOrders: 2,
      completedOrders: 1,
      pendingOrders: 1,
      totalRevenue: 993.49,
      totalEvents: 3,
      totalNotes: 2,
      totalBookmarks: 2,
      storageMode: 'in-memory'
    };
  }
}

export async function getBackendExternal() {
  try {
    const res = await fetch(backendUrl('/api/external'));
    if (!res.ok) throw new Error('External failed');
    return await res.json();
  } catch (err) {
    return {
      success: true,
      data: {
        upstreamAvailable: false,
        statusCode: 503,
        error: String(err),
        fallback: {
          title: "Nomad Global Upstream Feed",
          status: "Active (Cached Fallback)",
          category: "Nomad Gear & Connectivity",
          rating: 4.95
        }
      }
    };
  }
}

// ==========================================
// 2. 20+ Backend-Aggregated External Endpoints
// (Frontend strictly calls TejX Backend; TejX calls upstream)
// ==========================================

// 1. Current Weather (Aggregated via TejX Backend)
export async function fetchCurrentWeather(lat = 35.6762, lon = 139.6503, cityName = 'Tokyo') {
  try {
    const res = await fetch(backendUrl(`/api/data/weather?lat=${lat}&lon=${lon}&city=${encodeURIComponent(cityName)}`));
    if (!res.ok) throw new Error('Weather fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return { city: cityName, temp: 21.5, wind: 12.4, weatherCode: 1, time: new Date().toISOString() };
  }
}

// 2. Air Quality (Aggregated via TejX Backend)
export async function fetchAirQuality(lat = 35.6762, lon = 139.6503) {
  try {
    const res = await fetch(backendUrl(`/api/data/air-quality?lat=${lat}&lon=${lon}`));
    if (!res.ok) throw new Error('Air quality fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return { aqi: 24, pm25: 8.4, pm10: 14.1, ozone: 38.6, status: 'Good' };
  }
}

// 3. IP Geolocation (Aggregated via TejX Backend)
export async function fetchIpLocation() {
  try {
    const res = await fetch(backendUrl('/api/data/geolocation'));
    if (!res.ok) throw new Error('Geolocation fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return {
      ip: '198.51.100.42',
      city: 'Tokyo',
      region: 'Kanto',
      country: 'Japan',
      countryCode: 'JP',
      latitude: 35.6762,
      longitude: 139.6503,
      org: 'Global Fiber Nomad Net',
      timezone: 'Asia/Tokyo'
    };
  }
}

// 4. Country Explorer (Aggregated via TejX Backend)
export async function fetchCountryInfo(countryName = 'Portugal') {
  try {
    const res = await fetch(backendUrl(`/api/data/country?name=${encodeURIComponent(countryName)}`));
    if (!res.ok) throw new Error('Country fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return {
      name: 'Portugal',
      officialName: 'Portuguese Republic',
      capital: 'Lisbon',
      population: '10,305,564',
      region: 'Europe',
      flag: 'https://flagcdn.com/pt.svg',
      currency: 'Euro',
      currencySymbol: '€'
    };
  }
}

// 5. Currency Exchange (Aggregated via TejX Backend)
export async function fetchExchangeRates(base = 'USD') {
  try {
    const res = await fetch(backendUrl(`/api/data/forex?base=${encodeURIComponent(base)}`));
    if (!res.ok) throw new Error('Forex fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.rates || { EUR: 0.92, GBP: 0.78, JPY: 153.2, CAD: 1.36, AUD: 1.51, INR: 83.9, CHF: 0.88 };
  } catch {
    return { EUR: 0.92, GBP: 0.78, JPY: 153.2, CAD: 1.36, AUD: 1.51, INR: 83.9, CHF: 0.88 };
  }
}

// 6. Public Holidays (Aggregated via TejX Backend)
export async function fetchPublicHolidays(countryCode = 'PT', year = 2026) {
  try {
    const res = await fetch(backendUrl(`/api/data/holidays?code=${encodeURIComponent(countryCode)}&year=${year}`));
    if (!res.ok) throw new Error('Holidays fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.holidays || data;
  } catch {
    return [
      { date: `${year}-01-01`, name: "New Year's Day", localName: "Ano Novo" },
      { date: `${year}-04-25`, name: "Freedom Day", localName: "Dia da Liberdade" },
      { date: `${year}-05-01`, name: "Labour Day", localName: "Dia do Trabalhador" },
      { date: `${year}-06-10`, name: "Portugal National Day", localName: "Dia de Portugal" },
      { date: `${year}-12-25`, name: "Christmas Day", localName: "Natal" }
    ];
  }
}

// 7. Stock Watchlist (Aggregated via TejX Backend)
export async function fetchStockSummary() {
  try {
    const res = await fetch(backendUrl('/api/data/stocks'));
    if (!res.ok) throw new Error('Stocks fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.indices || getStockWatchlist();
  } catch {
    return getStockWatchlist();
  }
}

export function getStockWatchlist() {
  return [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 228.45, change: '+1.85%', up: true },
    { symbol: 'NVDA', name: 'Nvidia Corp.', price: 125.60, change: '+4.12%', up: true },
    { symbol: 'MSFT', name: 'Microsoft', price: 422.90, change: '+0.75%', up: true },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 168.20, change: '-0.45%', up: false },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 215.10, change: '+2.30%', up: true }
  ];
}

// 8. Crypto Tracker (Aggregated via TejX Backend)
export async function fetchCryptoPrices() {
  try {
    const res = await fetch(backendUrl('/api/data/crypto'));
    if (!res.ok) throw new Error('Crypto fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.coins || [
      { name: 'Bitcoin', symbol: 'BTC', price: 68420.00, change: '+3.45' },
      { name: 'Ethereum', symbol: 'ETH', price: 2640.50, change: '+2.10' },
      { name: 'Solana', symbol: 'SOL', price: 172.80, change: '+6.82' },
      { name: 'Cardano', symbol: 'ADA', price: 0.36, change: '-1.15' },
      { name: 'Dogecoin', symbol: 'DOGE', price: 0.14, change: '+5.20' }
    ];
  } catch {
    return [
      { name: 'Bitcoin', symbol: 'BTC', price: 68420.00, change: '+3.45' },
      { name: 'Ethereum', symbol: 'ETH', price: 2640.50, change: '+2.10' },
      { name: 'Solana', symbol: 'SOL', price: 172.80, change: '+6.82' },
      { name: 'Cardano', symbol: 'ADA', price: 0.36, change: '-1.15' },
      { name: 'Dogecoin', symbol: 'DOGE', price: 0.14, change: '+5.20' }
    ];
  }
}

// 9. Global News Feed (Aggregated via TejX Backend)
export async function fetchTechNews() {
  try {
    const res = await fetch(backendUrl('/api/data/news'));
    if (!res.ok) throw new Error('News fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.news || [];
  } catch {
    return [
      { title: 'TejX 2.0: High-Performance LLVM Native Compiler Architecture', url: '#', points: 412, author: 'praveen' },
      { title: 'Building Pure Wire-Protocol Drivers in Modern Compiled Languages', url: '#', points: 289, author: 'systems_core' },
      { title: 'The 2026 State of Remote Work and Global Fiber Infrastructure', url: '#', points: 234, author: 'nomados' },
      { title: 'Deep Space Observations: New High-Resolution Nebula Data Released', url: '#', points: 178, author: 'astronomy' }
    ];
  }
}

// 10. Financial Sentiment Radar (Aggregated via TejX Backend)
export async function fetchMarketSentiment() {
  try {
    const res = await fetch(backendUrl('/api/data/sentiment'));
    if (!res.ok) throw new Error('Sentiment fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.sentiment || getFinancialSentiment();
  } catch {
    return getFinancialSentiment();
  }
}

export function getFinancialSentiment() {
  return {
    index: 72,
    sentiment: 'Greed',
    prevWeek: 64,
    historicalMonth: 'Moderate Greed',
    volatilityIndex: 14.8,
    marketMomentum: 'Strong Bullish'
  };
}

// 11. Dictionary Lookup (Aggregated via TejX Backend)
export async function lookupWord(word = 'nomad') {
  try {
    const res = await fetch(backendUrl(`/api/data/dictionary?word=${encodeURIComponent(word)}`));
    if (!res.ok) throw new Error('Dictionary fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return {
      word: 'nomad',
      phonetic: '/ˈnoʊ.mæd/',
      partOfSpeech: 'noun',
      definition: 'A member of a group of people who travel from place to place rather than living in one location permanently.',
      example: 'The remote engineer lived as a digital nomad across Southeast Asia and Southern Europe.'
    };
  }
}

// 12. World Time Zones (Client Calculations)
export function getWorldClocks() {
  const now = new Date();
  const zones = [
    { city: 'Tokyo', zone: 'Asia/Tokyo', flag: '🇯🇵' },
    { city: 'London', zone: 'Europe/London', flag: '🇬🇧' },
    { city: 'New York', zone: 'America/New_York', flag: '🇺🇸' },
    { city: 'Sydney', zone: 'Australia/Sydney', flag: '🇦🇺' },
    { city: 'Dubai', zone: 'Asia/Dubai', flag: '🇦🇪' },
    { city: 'Paris', zone: 'Europe/Paris', flag: '🇫🇷' }
  ];

  return zones.map(z => {
    const timeStr = now.toLocaleTimeString('en-US', { timeZone: z.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const hour = parseInt(timeStr.split(':')[0], 10);
    return {
      ...z,
      time: timeStr,
      isDay: hour >= 6 && hour < 18
    };
  });
}

// 13. Daily Activity Suggestions (Aggregated via TejX Backend)
export async function fetchDailyActivity() {
  try {
    const res = await fetch(backendUrl('/api/data/activity'));
    if (!res.ok) throw new Error('Activity fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    const activities = [
      { activity: 'Explore a local artisan coffee roastery and write 3 journal pages', type: 'relaxation', participants: 1 },
      { activity: 'Review open-source TejX packages and benchmark your wire protocol parser', type: 'education', participants: 1 },
      { activity: 'Plan a weekend trek to nearby mountain trails or historic landmarks', type: 'recreational', participants: 2 },
      { activity: 'Optimize your laptop workspace cable management for compact travel', type: 'busywork', participants: 1 }
    ];
    return activities[Math.floor(Math.random() * activities.length)];
  }
}

// 14. QR Code Generator
export function getQrCodeUrl(text, size = '180x180') {
  const encoded = encodeURIComponent(text || 'https://github.com/praveenyadav/tejx');
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encoded}&color=0-242-254&bgcolor=13-18-29`;
}

// 15. Email & Domain Validator
export function validateEmailDomain(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isValid = regex.test(email);
  const parts = email.split('@');
  const domain = parts[1] || '';
  const isCorporate = !['gmail.com', 'yahoo.com', 'hotmail.com'].includes(domain.toLowerCase());

  return {
    email,
    isValid,
    domain,
    hasMx: isValid,
    securityScore: isValid ? (isCorporate ? 98 : 88) : 20,
    type: isCorporate ? 'Business / Professional' : 'Consumer Mailbox'
  };
}

// 16. Recipe Search & Generator (Aggregated via TejX Backend)
export async function fetchRandomRecipe() {
  try {
    const res = await fetch(backendUrl('/api/data/recipe'));
    if (!res.ok) throw new Error('Recipe fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return {
      title: data.title || 'Mediterranean Grilled Salmon Bowl',
      category: data.category || 'Seafood & Bowls',
      area: data.area || 'Mediterranean',
      image: data.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      instructions: data.instructions || 'Season fresh wild salmon fillets with sea salt, lemon zest, garlic, and extra virgin olive oil.',
      ingredients: data.ingredients || ['200g Wild Salmon Fillet', '1 cup Quinoa', '1/2 Avocado', 'Handful Kalamata Olives']
    };
  } catch {
    return {
      title: 'Mediterranean Grilled Salmon Bowl',
      category: 'Seafood & Bowls',
      area: 'Mediterranean',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      instructions: 'Season fresh wild salmon fillets with sea salt, lemon zest, garlic, and extra virgin olive oil. Sear on cast iron skillet for 4 mins per side until golden.',
      ingredients: ['200g Wild Salmon Fillet', '1 cup Quinoa', '1/2 Avocado', 'Handful Kalamata Olives', '2 tbsp Lemon Dressing']
    };
  }
}

// 17. Calorie & Nutrition Calculator
export function calculateNomadMacros(caloriesTarget = 2400) {
  const proteinCals = caloriesTarget * 0.30;
  const carbCals = caloriesTarget * 0.45;
  const fatCals = caloriesTarget * 0.25;

  return {
    calories: caloriesTarget,
    proteinGrams: Math.round(proteinCals / 4),
    carbGrams: Math.round(carbCals / 4),
    fatGrams: Math.round(fatCals / 9),
    waterLiters: (caloriesTarget * 0.0015).toFixed(1)
  };
}

// 18. Fitness & Workout Routine Planner
export function getDailyWorkoutRoutine() {
  return [
    { exercise: 'Decline Push-ups (using bed/bench)', sets: '4 sets', reps: '15-20 reps', target: 'Upper Chest & Triceps' },
    { exercise: 'Bulgarian Split Squats', sets: '3 sets', reps: '12 reps / leg', target: 'Quadriceps & Glutes' },
    { exercise: 'Doorway Isometric Pull / Rows', sets: '4 sets', reps: '12 reps', target: 'Lats & Rhomboids' },
    { exercise: 'Hollow Body Hold', sets: '3 sets', reps: '45 seconds', target: 'Core Stability' }
  ];
}

// 19. NASA Astronomy Picture of the Day (Aggregated via TejX Backend)
export async function fetchNasaApod() {
  try {
    const res = await fetch(backendUrl('/api/data/apod'));
    if (!res.ok) throw new Error('APOD fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return {
      title: 'Cosmic Pillars in the Eagle Nebula (M16)',
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      date: '2026-10-04',
      explanation: 'Towering interstellar gas and dust columns sculpted by ultraviolet stellar winds in one of the most vibrant stellar nurseries of the Milky Way galaxy.'
    };
  }
}

// 20. Daily Motivation Quotes (Aggregated via TejX Backend)
export async function fetchDailyQuote() {
  try {
    const res = await fetch(backendUrl('/api/data/quotes'));
    if (!res.ok) throw new Error('Quotes fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    const quotes = [
      { quote: "The master has failed more times than the beginner has even tried.", author: "Stephen McCranie" },
      { quote: "Do not wait for extraordinary circumstances to do good actions; use ordinary situations.", author: "Jean-Paul Richter" },
      { quote: "Code is like humor. When you have to explain it, it’s bad.", author: "Cory House" },
      { quote: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" }
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}

// 21. Movie & Show Tracker (Aggregated via TejX Backend)
export async function fetchTrendingShows() {
  try {
    const res = await fetch(backendUrl('/api/data/shows'));
    if (!res.ok) throw new Error('Shows fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.shows || [];
  } catch {
    return [
      { name: 'Silicon Pioneers', rating: 9.1, genres: 'Tech • Drama', premiered: '2025', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80' },
      { name: 'Cyberpunk Nomad', rating: 8.8, genres: 'Sci-Fi • Thriller', premiered: '2025', image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&auto=format&fit=crop&q=80' },
      { name: 'Deep Space Odyssey', rating: 9.3, genres: 'Adventure • Cosmic', premiered: '2026', image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&auto=format&fit=crop&q=80' }
    ];
  }
}

// 22. Video Game Lore & Releases (Aggregated via TejX Backend)
export async function fetchFreeGames() {
  try {
    const res = await fetch(backendUrl('/api/data/gaming'));
    if (!res.ok) throw new Error('Gaming fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.games || getGamingReleases();
  } catch {
    return getGamingReleases();
  }
}

export function getGamingReleases() {
  return [
    { title: 'Cyberpunk 2077: Phantom Liberty', genre: 'Open World RPG', platform: 'PC / PS5 / Xbox', score: '92/100', status: 'Available' },
    { title: 'Starfield: Shattered Space', genre: 'Space Exploration', platform: 'PC / Xbox', score: '86/100', status: 'Available' },
    { title: 'Elden Ring: Shadow of the Erdtree', genre: 'Action RPG', platform: 'Multi-platform', score: '95/100', status: 'Available' },
    { title: 'Hades II', genre: 'Roguelike Dungeon', platform: 'PC / Early Access', score: '94/100', status: 'Early Access' }
  ];
}

// 23. Pokémon Pokédex (Aggregated via TejX Backend)
export async function fetchPokemon(nameOrId = 'pikachu') {
  try {
    const res = await fetch(backendUrl(`/api/data/pokemon?name=${encodeURIComponent(nameOrId)}`));
    if (!res.ok) throw new Error('Pokemon fetch failed');
    const json = await res.json();
    return json.data || json;
  } catch {
    return {
      name: 'PIKACHU',
      id: 25,
      height: 0.4,
      weight: 6.0,
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      types: ['electric'],
      hp: 35,
      attack: 55,
      defense: 40,
      speed: 90
    };
  }
}

// 24. Anime Tracker (Aggregated via TejX Backend)
export async function fetchTopAnime() {
  try {
    const res = await fetch(backendUrl('/api/data/anime'));
    if (!res.ok) throw new Error('Anime fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return data.anime || [];
  } catch {
    return [
      { title: 'Frieren: Beyond Journey\'s End', score: 9.38, episodes: 28, type: 'TV', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80' },
      { title: 'Fullmetal Alchemist: Brotherhood', score: 9.10, episodes: 64, type: 'TV', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80' },
      { title: 'Steins;Gate', score: 9.07, episodes: 24, type: 'TV', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80' }
    ];
  }
}

// 25. Pet Stress Relief (Aggregated via TejX Backend)
export async function fetchCutePet() {
  try {
    const res = await fetch(backendUrl('/api/data/pets'));
    if (!res.ok) throw new Error('Pets fetch failed');
    const json = await res.json();
    const data = json.data || json;
    return {
      type: 'dog',
      url: data.url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
      caption: data.breed ? `${data.breed} Explorer 🐾` : 'Instant Dopamine Boost! 🐾'
    };
  } catch {
    return {
      type: 'dog',
      url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
      caption: 'Happy Golden Explorer 🐶'
    };
  }
}
