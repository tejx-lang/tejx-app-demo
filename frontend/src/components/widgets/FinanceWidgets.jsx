import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Activity, Gauge } from 'lucide-react';
import { fetchCryptoPrices, fetchExchangeRates, getStockWatchlist, getFinancialSentiment } from '../../services/api';

// 7. Crypto Tracker
export function CryptoTrackerWidget() {
  const [cryptoList, setCryptoList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCryptoPrices().then(d => {
      setCryptoList(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🪙</span>
          <div>
            <div className="widget-title">Live Crypto Benchmark</div>
            <div className="widget-category-badge">CoinGecko / CoinCap</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cryptoList.map(c => {
              const isPositive = !String(c.change).startsWith('-');
              return (
                <div key={c.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{c.symbol}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem' }}>
                      ${typeof c.price === 'number' ? c.price.toLocaleString() : c.price}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                      {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {c.change}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// 8. Currency Converter
export function CurrencyConverterWidget() {
  const [rates, setRates] = useState({ EUR: 0.92, GBP: 0.78, JPY: 153.2, INR: 83.9, CAD: 1.36 });
  const [amount, setAmount] = useState(100);
  const [targetCurrency, setTargetCurrency] = useState('EUR');

  useEffect(() => {
    fetchExchangeRates('USD').then(r => setRates(r));
  }, []);

  const converted = (amount * (rates[targetCurrency] || 1)).toFixed(2);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">💱</span>
          <div>
            <div className="widget-title">Currency Converter</div>
            <div className="widget-category-badge">Frankfurter Exchange API</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>USD Amount</label>
            <input 
              type="number" 
              className="form-input" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Currency</label>
            <select 
              className="form-select"
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
            >
              {Object.keys(rates).map(cur => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Converted Equivalent</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)' }}>
            {converted} {targetCurrency}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Rate: 1 USD = {rates[targetCurrency]} {targetCurrency}</div>
        </div>
      </div>
    </div>
  );
}

// 9. Stock Market Watchlist
export function StockWatchlistWidget() {
  const [stocks] = useState(getStockWatchlist());

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">📊</span>
          <div>
            <div className="widget-title">Stock Watchlist</div>
            <div className="widget-category-badge">Alpha Vantage / Finnhub</div>
          </div>
        </div>
        <span className="status-pill" style={{ color: 'var(--accent-cyan)' }}>Market Open</span>
      </div>

      <div className="widget-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {stocks.map(s => (
            <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{s.symbol}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{s.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem' }}>${s.price}</span>
                <span style={{ fontSize: '0.75rem', color: s.up ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginLeft: '0.5rem' }}>
                  {s.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 10. Financial Sentiment Radar
export function FinancialSentimentWidget() {
  const sentiment = getFinancialSentiment();

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🧭</span>
          <div>
            <div className="widget-title">Financial Sentiment</div>
            <div className="widget-category-badge">Market Pulse Radar</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '0.5rem 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--accent-emerald)' }}>
              {sentiment.index}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>{sentiment.sentiment}</div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <div>Last Week: <strong style={{ color: 'var(--text-main)' }}>{sentiment.prevWeek}</strong></div>
            <div>Volatility (VIX): <strong style={{ color: 'var(--accent-cyan)' }}>{sentiment.volatilityIndex}</strong></div>
            <div>Momentum: <strong style={{ color: 'var(--accent-emerald)' }}>{sentiment.marketMomentum}</strong></div>
          </div>
        </div>

        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ width: `${sentiment.index}%`, height: '100%', background: 'linear-gradient(90deg, #f43f5e, #f59e0b, #10b981)', borderRadius: 'var(--radius-full)' }}></div>
        </div>
      </div>
    </div>
  );
}
