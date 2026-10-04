import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Thermometer, MapPin, Globe, Compass, Calendar, Clock, RefreshCw } from 'lucide-react';
import { fetchCurrentWeather, fetchAirQuality, fetchIpLocation, fetchCountryInfo, fetchPublicHolidays, getWorldClocks } from '../../services/api';

// 1. Current Weather
export function WeatherWidget() {
  const defaultCity = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_CITY) || 'Tokyo';
  const [city, setCity] = useState(defaultCity);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const cities = [
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    { name: 'Lisbon', lat: 38.7223, lon: -9.1393 },
    { name: 'Chiang Mai', lat: 18.7883, lon: 98.9853 },
    { name: 'London', lat: 51.5074, lon: -0.1278 },
    { name: 'New York', lat: 40.7128, lon: -74.0060 }
  ];

  const loadWeather = async (targetCity) => {
    setLoading(true);
    const c = cities.find(item => item.name === targetCity) || cities[0];
    const data = await fetchCurrentWeather(c.lat, c.lon, c.name);
    setWeather(data);
    setLoading(false);
  };

  useEffect(() => {
    loadWeather(city);
  }, [city]);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">⛅</span>
          <div>
            <div className="widget-title">Current Weather</div>
            <div className="widget-category-badge">Open-Meteo API</div>
          </div>
        </div>
        <select 
          className="form-select" 
          style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          value={city} 
          onChange={(e) => setCity(e.target.value)}
        >
          {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)' }}>
                  {weather?.temp}°C
                </span>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{weather?.city} • Local Station</div>
              </div>
              <div style={{ fontSize: '2.5rem' }}>🌤️</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <Wind size={15} color="var(--accent-blue)" />
                <span>Wind: {weather?.wind} km/h</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <Thermometer size={15} color="var(--accent-amber)" />
                <span>Comfort: High</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Air Quality Index
export function AirQualityWidget() {
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAirQuality().then(d => {
      setAqiData(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🍃</span>
          <div>
            <div className="widget-title">Air Quality Index</div>
            <div className="widget-category-badge">Weatherbit / Open-Meteo AQI</div>
          </div>
        </div>
        <span className="status-pill" style={{ color: 'var(--accent-emerald)' }}>
          {aqiData?.status || 'Good'}
        </span>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-emerald)' }}>
                {aqiData?.aqi}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>European AQI Index</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PM 2.5</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{aqiData?.pm25} µg/m³</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PM 10</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{aqiData?.pm10} µg/m³</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ozone</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{aqiData?.ozone} µg/m³</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 3. IP Geolocation
export function GeoLocationWidget() {
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIpLocation().then(d => {
      setGeo(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">📍</span>
          <div>
            <div className="widget-title">IP Geolocation</div>
            <div className="widget-category-badge">IP-API / ipapi</div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{geo?.ip}</span>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Location:</span>
              <span style={{ fontWeight: 600 }}>{geo?.city}, {geo?.region}, {geo?.country}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>ISP & Network:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{geo?.org}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Timezone:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{geo?.timezone}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. Country Explorer
export function CountryExplorerWidget() {
  const defaultCountry = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_COUNTRY) || 'Portugal';
  const [countryQuery, setCountryQuery] = useState(defaultCountry);
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(true);

  const searchCountry = async (name) => {
    setLoading(true);
    const data = await fetchCountryInfo(name);
    setCountry(data);
    setLoading(false);
  };

  useEffect(() => {
    searchCountry(countryQuery);
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🗺️</span>
          <div>
            <div className="widget-title">Country Explorer</div>
            <div className="widget-category-badge">REST Countries API</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search destination (e.g. Japan, Spain)"
            value={countryQuery}
            onChange={(e) => setCountryQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchCountry(countryQuery)}
          />
          <button className="btn-primary" onClick={() => searchCountry(countryQuery)}>Search</button>
        </div>

        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : country && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <img src={country.flag} alt={country.name} style={{ width: '48px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{country.name} ({country.capital})</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Pop: {country.population} • Currency: {country.currency} ({country.currencySymbol})
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 5. World Clocks
export function WorldClocksWidget() {
  const [clocks, setClocks] = useState(getWorldClocks());

  useEffect(() => {
    const timer = setInterval(() => setClocks(getWorldClocks()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">⏰</span>
          <div>
            <div className="widget-title">World Time Zones</div>
            <div className="widget-category-badge">TimeAPI / WorldTime</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {clocks.map(c => (
            <div key={c.city} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.flag} {c.city}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.isDay ? '☀️ Day' : '🌙 Night'}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                {c.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 6. Public Holidays
export function PublicHolidaysWidget() {
  const [countryCode, setCountryCode] = useState('PT');
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPublicHolidays(countryCode, 2026).then(data => {
      setHolidays(data.slice(0, 4));
      setLoading(false);
    });
  }, [countryCode]);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🎉</span>
          <div>
            <div className="widget-title">Public Holidays 2026</div>
            <div className="widget-category-badge">Nager.Date API</div>
          </div>
        </div>
        <select 
          className="form-select" 
          style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          value={countryCode} 
          onChange={(e) => setCountryCode(e.target.value)}
        >
          <option value="PT">Portugal (PT)</option>
          <option value="JP">Japan (JP)</option>
          <option value="TH">Thailand (TH)</option>
          <option value="GB">United Kingdom (GB)</option>
          <option value="US">United States (US)</option>
        </select>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {holidays.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 500 }}>{h.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>{h.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
