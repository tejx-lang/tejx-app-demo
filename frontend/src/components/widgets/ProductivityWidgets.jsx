import React, { useState, useEffect } from 'react';
import { QrCode, BookOpen, Mail, Sparkles, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchDailyActivity, getQrCodeUrl, lookupWord, validateEmailDomain, fetchTechNews } from '../../services/api';

// 11. Dictionary Lookup
export function DictionaryWidget() {
  const [word, setWord] = useState('nomad');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchWord = async (w) => {
    setLoading(true);
    const data = await lookupWord(w);
    setResult(data);
    setLoading(false);
  };

  useEffect(() => {
    searchWord('nomad');
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">📖</span>
          <div>
            <div className="widget-title">Dictionary Lookup</div>
            <div className="widget-category-badge">Free Dictionary API</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Type word (e.g. serendipity, nomad)"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchWord(word)}
          />
          <button className="btn-primary" onClick={() => searchWord(word)}>Define</button>
        </div>

        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : result && (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>{result.word}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{result.phonetic}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-neon-violet)', background: 'rgba(168,85,247,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                {result.partOfSpeech}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: 'var(--text-main)' }}>{result.definition}</p>
            {result.example && (
              <p style={{ fontSize: '0.75rem', marginTop: '0.3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                "{result.example}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 12. Daily Activity Suggestions
export function DailyActivityWidget() {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadActivity = async () => {
    setLoading(true);
    const data = await fetchDailyActivity();
    setActivity(data);
    setLoading(false);
  };

  useEffect(() => {
    loadActivity();
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">⚡</span>
          <div>
            <div className="widget-title">Daily Activity Idea</div>
            <div className="widget-category-badge">Bored API Alternative</div>
          </div>
        </div>
        <button className="widget-btn" onClick={loadActivity} title="Get Another Idea">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-cyan)', lineHeight: '1.4' }}>
              "{activity?.activity}"
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="status-pill" style={{ color: 'var(--accent-emerald)' }}>
                Type: {activity?.type}
              </span>
              <span className="status-pill">
                👥 {activity?.participants} Person
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 13. QR Code Generator
export function QRCodeGeneratorWidget() {
  const [text, setText] = useState('https://github.com/praveenyadav/tejx');
  const [qrUrl, setQrUrl] = useState(getQrCodeUrl(text));

  const handleGenerate = (val) => {
    setText(val);
    setQrUrl(getQrCodeUrl(val));
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">📲</span>
          <div>
            <div className="widget-title">Instant QR Generator</div>
            <div className="widget-category-badge">QR Server API</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <input 
          type="text" 
          className="form-input" 
          style={{ marginBottom: '0.75rem' }}
          placeholder="Paste URL, WiFi credential, or note"
          value={text}
          onChange={(e) => handleGenerate(e.target.value)}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <img src={qrUrl} alt="Generated QR" style={{ width: '130px', height: '130px', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

// 14. Email & Domain Validator
export function EmailValidatorWidget() {
  const [email, setEmail] = useState('elena@digitalnomad.io');
  const [validation, setValidation] = useState(validateEmailDomain(email));

  const handleCheck = (val) => {
    setEmail(val);
    setValidation(validateEmailDomain(val));
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🛡️</span>
          <div>
            <div className="widget-title">Email & Domain Validator</div>
            <div className="widget-category-badge">Mailboxlayer Service</div>
          </div>
        </div>
        <span className="status-pill" style={{ color: validation.isValid ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
          {validation.isValid ? 'Valid Format' : 'Invalid'}
        </span>
      </div>

      <div className="widget-body">
        <input 
          type="email" 
          className="form-input" 
          placeholder="Enter email to inspect..."
          value={email}
          onChange={(e) => handleCheck(e.target.value)}
          style={{ marginBottom: '0.75rem' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Security Score:</span>
            <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>{validation.securityScore}/100</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Mailbox Type:</span>
            <div style={{ fontWeight: 600 }}>{validation.type}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 15. Global News Feed
export function GlobalNewsWidget() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTechNews().then(data => {
      setStories(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="widget-card wide">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">📰</span>
          <div>
            <div className="widget-title">Global Tech Headlines</div>
            <div className="widget-category-badge">HackerNews / Dev.to API</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {stories.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem' }}>
                    0{idx + 1}
                  </span>
                  <div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
                      {s.title}
                    </a>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>By @{s.author}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-amber)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <span>▲ {s.points}</span>
                  <ExternalLink size={13} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
