import React from 'react';
import { MapPin, CloudSun, TrendingUp, Cpu, Database, CheckCircle2 } from 'lucide-react';

export default function MetricsStrip({ summaryData, weatherData, cryptoData, ipLocation }) {
  return (
    <div className="metrics-strip">
      <div className="kpi-card">
        <div className="kpi-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
          <MapPin size={22} />
        </div>
        <div className="kpi-content">
          <h3>Active Hub</h3>
          <div className="kpi-value">{ipLocation ? `${ipLocation.city}, ${ipLocation.countryCode}` : 'Tokyo, JP'}</div>
          <div className="kpi-sub">Fiber Network Connected</div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)' }}>
          <CloudSun size={22} />
        </div>
        <div className="kpi-content">
          <h3>Current Climate</h3>
          <div className="kpi-value">{weatherData ? `${weatherData.temp}°C` : '21.5°C'}</div>
          <div className="kpi-sub">{weatherData ? `${weatherData.city} • Wind ${weatherData.wind} km/h` : 'Clear Sky'}</div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
          <TrendingUp size={22} />
        </div>
        <div className="kpi-content">
          <h3>Bitcoin Benchmark</h3>
          <div className="kpi-value">{cryptoData ? `$${cryptoData[0]?.price?.toLocaleString()}` : '$68,420'}</div>
          <div className="kpi-sub">24h: {cryptoData ? `${cryptoData[0]?.change}%` : '+3.45%'}</div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-neon-violet)' }}>
          <Cpu size={22} />
        </div>
        <div className="kpi-content">
          <h3>TejX Engine</h3>
          <div className="kpi-value">Active • {summaryData?.storageMode === 'mongodb' ? 'MongoDB' : 'In-Memory'}</div>
          <div className="kpi-sub">{summaryData?.totalUsers || 3} Users • {summaryData?.totalOrders || 2} Orders</div>
        </div>
      </div>
    </div>
  );
}
