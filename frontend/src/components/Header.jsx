import React, { useState, useEffect } from 'react';
import { Search, Compass, Activity, Server, Database, Globe, RefreshCw } from 'lucide-react';

export default function Header({ 
  activeCategory, 
  setActiveCategory, 
  searchQuery, 
  setSearchQuery, 
  backendStatus,
  dashboardConfig,
  onRefreshAll
}) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const defaultCategories = [
    { id: 'all', label: 'All Widgets', icon: '🌐', count: 26 },
    { id: 'travel', label: 'Travel & Environment', icon: '✈️', count: 6 },
    { id: 'finance', label: 'Finance & Crypto', icon: '📈', count: 4 },
    { id: 'productivity', label: 'Productivity & Tools', icon: '⚡', count: 5 },
    { id: 'health', label: 'Health & Fitness', icon: '🥗', count: 3 },
    { id: 'entertainment', label: 'Cosmic & Zen', icon: '🪐', count: 7 },
    { id: 'backend', label: 'TejX + MongoDB', icon: '⚡', count: 1 }
  ];

  const categories = dashboardConfig?.categories || defaultCategories;
  const title = dashboardConfig?.title || (import.meta.env?.VITE_APP_TITLE ? import.meta.env.VITE_APP_TITLE.split('|')[0].trim() : 'NomadOS');
  const subtitle = dashboardConfig?.subtitle || (import.meta.env?.VITE_APP_TITLE ? (import.meta.env.VITE_APP_TITLE.split('|')[1] ? import.meta.env.VITE_APP_TITLE.split('|')[1].trim() : 'Digital Nomad Command Center') : 'Digital Nomad Command Center • Powered by Pure TejX & MongoDB');

  return (
    <header>
      <div className="header">
        <div className="brand-section">
          <div className="brand-logo">
            <span>⚡</span>
          </div>
          <div className="brand-info">
            <h1>{title.includes('|') ? title.split('|')[0].trim() : title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        <div className="header-center">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search across all 25+ modules, cities, crypto, tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="header-right">
          <div className="status-pill">
            <span className={`status-dot ${backendStatus.online ? (backendStatus.storage === 'mongodb' ? 'online' : 'memory') : 'offline'}`}></span>
            <span>
              TejX: {backendStatus.online ? (backendStatus.storage === 'mongodb' ? 'Mongo Live' : 'In-Memory') : 'Offline'}
            </span>
          </div>

          <div className="time-display">
            {currentTime} UTC
          </div>

          <button className="widget-btn" onClick={onRefreshAll} title="Refresh All Feeds">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <nav className="categories-nav">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span className="tab-count">{cat.count}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
