import React, { useState, useEffect } from 'react';
import { Sparkles, Film, Gamepad2, Heart, RefreshCw, Copy, Check } from 'lucide-react';
import { fetchNasaApod, fetchDailyQuote, fetchTrendingShows, getGamingReleases, fetchPokemon, fetchTopAnime, fetchCutePet } from '../../services/api';

// 19. NASA Astronomy Picture of the Day
export function NasaCosmicWidget() {
  const [apod, setApod] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNasaApod().then(d => {
      setApod(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="widget-card wide">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🌌</span>
          <div>
            <div className="widget-title">NASA Cosmic Picture</div>
            <div className="widget-category-badge">NASA APOD API</div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{apod?.date}</span>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : apod && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <img src={apod.url} alt={apod.title} style={{ width: '100%', height: '170px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.4rem' }}>{apod.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{apod.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 20. Daily Motivational Quote
export function MotivationQuoteWidget() {
  const [quote, setQuote] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQuote = async () => {
    setLoading(true);
    const data = await fetchDailyQuote();
    setQuote(data);
    setLoading(false);
  };

  useEffect(() => {
    loadQuote();
  }, []);

  const handleCopy = () => {
    if (quote) {
      navigator.clipboard.writeText(`"${quote.quote}" — ${quote.author}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">✨</span>
          <div>
            <div className="widget-title">Nomad Motivation</div>
            <div className="widget-category-badge">Type.fit / ZenQuotes</div>
          </div>
        </div>
        <div className="widget-actions">
          <button className="widget-btn" onClick={handleCopy} title="Copy Quote">
            {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
          </button>
          <button className="widget-btn" onClick={loadQuote} title="Next Quote">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="widget-body" style={{ justifyContent: 'center' }}>
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ textAlign: 'center', padding: '0.5rem' }}>
            <p style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 500, lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              "{quote?.quote}"
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>— {quote?.author}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// 21. Movie & Show Tracker
export function MovieShowsWidget() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingShows().then(d => {
      setShows(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🎬</span>
          <div>
            <div className="widget-title">Trending Shows</div>
            <div className="widget-category-badge">TMDB / TVMaze</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {shows.map((s, idx) => (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <img src={s.image} alt={s.name} style={{ width: '40px', height: '56px', borderRadius: '4px', objectFit: 'cover' }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.775rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--accent-amber)' }}>★ {s.rating}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.premiered}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 22. Video Game Lore
export function GamingLoreWidget() {
  const [games] = useState(getGamingReleases());

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🎮</span>
          <div>
            <div className="widget-title">Gaming Releases</div>
            <div className="widget-category-badge">IGDB / OpenCritic</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {games.map((g, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{g.title}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{g.genre} • {g.platform}</div>
              </div>
              <span className="status-pill" style={{ color: 'var(--accent-emerald)', fontSize: '0.7rem' }}>
                {g.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 23. Pokémon Pokédex
export function PokemonPokedexWidget() {
  const [pokemonName, setPokemonName] = useState('pikachu');
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchPokemon = async (name) => {
    setLoading(true);
    const data = await fetchPokemon(name);
    setPokemon(data);
    setLoading(false);
  };

  useEffect(() => {
    searchPokemon('pikachu');
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🔴</span>
          <div>
            <div className="widget-title">Pokédex Nostalgia</div>
            <div className="widget-category-badge">PokeAPI</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Pokemon name (e.g. gengar, charizard)"
            value={pokemonName}
            onChange={(e) => setPokemonName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchPokemon(pokemonName)}
          />
          <button className="btn-primary" onClick={() => searchPokemon(pokemonName)}>Search</button>
        </div>

        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : pokemon && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <img src={pokemon.sprite} alt={pokemon.name} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-amber)' }}>#{pokemon.id} {pokemon.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Type: {pokemon.types?.join(', ')} • HP: {pokemon.hp}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                ATK: {pokemon.attack} | DEF: {pokemon.defense} | SPD: {pokemon.speed}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 24. Anime Tracker
export function AnimeTrackerWidget() {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopAnime().then(d => {
      setAnimeList(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">⛩️</span>
          <div>
            <div className="widget-title">Anime Schedule</div>
            <div className="widget-category-badge">Jikan / MAL API</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {animeList.slice(0, 3).map((a, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                <img src={a.image} alt={a.title} style={{ width: '38px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-neon-violet)' }}>Score: {a.score} ★ ({a.type})</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 25. Pet Stress Relief
export function PetStressReliefWidget() {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPet = async () => {
    setLoading(true);
    const data = await fetchCutePet();
    setPet(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPet();
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🐾</span>
          <div>
            <div className="widget-title">Pet Stress Relief</div>
            <div className="widget-category-badge">Dog.CEO API</div>
          </div>
        </div>
        <button className="widget-btn" onClick={loadPet} title="Another Pet!">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : pet && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={pet.url} alt="Stress Relief Pet" style={{ width: '100%', height: '150px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>{pet.caption}</div>
          </div>
        )}
      </div>
    </div>
  );
}
