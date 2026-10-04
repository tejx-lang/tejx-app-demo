import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricsStrip from './components/MetricsStrip';

// Travel & Environment Widgets
import { 
  WeatherWidget, 
  AirQualityWidget, 
  GeoLocationWidget, 
  CountryExplorerWidget, 
  WorldClocksWidget, 
  PublicHolidaysWidget 
} from './components/widgets/TravelWidgets';

// Finance & Crypto Widgets
import { 
  CryptoTrackerWidget, 
  CurrencyConverterWidget, 
  StockWatchlistWidget, 
  FinancialSentimentWidget 
} from './components/widgets/FinanceWidgets';

// Productivity & Tools Widgets
import { 
  DictionaryWidget, 
  DailyActivityWidget, 
  QRCodeGeneratorWidget, 
  EmailValidatorWidget, 
  GlobalNewsWidget 
} from './components/widgets/ProductivityWidgets';

// Health & Fitness Widgets
import { 
  RecipeFinderWidget, 
  NutritionCalculatorWidget, 
  WorkoutPlannerWidget 
} from './components/widgets/HealthFitnessWidgets';

// Cosmic & Zen Widgets
import { 
  NasaCosmicWidget, 
  MotivationQuoteWidget, 
  MovieShowsWidget, 
  GamingLoreWidget, 
  PokemonPokedexWidget, 
  AnimeTrackerWidget, 
  PetStressReliefWidget 
} from './components/widgets/CosmicZenWidgets';

// TejX Backend + MongoDB Central Manager
import { TejxBackendWidget } from './components/widgets/TejxBackendWidget';

import { getBackendHealth, getBackendSummary, fetchCurrentWeather, fetchCryptoPrices, fetchIpLocation } from './services/api';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [backendStatus, setBackendStatus] = useState({ online: true, storage: 'in-memory' });
  const [summaryData, setSummaryData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [cryptoData, setCryptoData] = useState(null);
  const [ipLocation, setIpLocation] = useState(null);

  const refreshAll = async () => {
    try {
      const [h, s, w, c, ip] = await Promise.all([
        getBackendHealth(),
        getBackendSummary(),
        fetchCurrentWeather(),
        fetchCryptoPrices(),
        fetchIpLocation()
      ]);
      setBackendStatus({ online: h.status === 'healthy', storage: h.storageMode || 'in-memory' });
      setSummaryData(s);
      setWeatherData(w);
      setCryptoData(c);
      setIpLocation(ip);
    } catch {
      // Graceful fallback values
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Category & search filtering logic
  const isVisible = (category, keywords) => {
    const matchesCategory = activeCategory === 'all' || activeCategory === category;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return keywords.some(k => k.toLowerCase().includes(q));
  };

  return (
    <div className="app-container">
      <Header 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        backendStatus={backendStatus}
        onRefreshAll={refreshAll}
      />

      <MetricsStrip 
        summaryData={summaryData}
        weatherData={weatherData}
        cryptoData={cryptoData}
        ipLocation={ipLocation}
      />

      <main className="widgets-grid">
        {/* Core TejX + MongoDB Manager */}
        {isVisible('backend', ['tejx', 'mongo', 'mongodb', 'database', 'users', 'products', 'orders', 'events', 'notes']) && (
          <TejxBackendWidget />
        )}

        {/* Travel & Environment */}
        {isVisible('travel', ['weather', 'forecast', 'temperature', 'climate']) && <WeatherWidget />}
        {isVisible('travel', ['air', 'quality', 'aqi', 'pollution', 'pm25']) && <AirQualityWidget />}
        {isVisible('travel', ['ip', 'location', 'geolocation', 'network', 'isp']) && <GeoLocationWidget />}
        {isVisible('travel', ['country', 'destination', 'population', 'capital', 'flag']) && <CountryExplorerWidget />}
        {isVisible('travel', ['time', 'clocks', 'zones', 'world', 'hours']) && <WorldClocksWidget />}
        {isVisible('travel', ['holiday', 'calendar', 'vacation', 'nager']) && <PublicHolidaysWidget />}

        {/* Finance & Markets */}
        {isVisible('finance', ['crypto', 'bitcoin', 'ethereum', 'solana', 'btc']) && <CryptoTrackerWidget />}
        {isVisible('finance', ['currency', 'exchange', 'forex', 'usd', 'eur', 'converter']) && <CurrencyConverterWidget />}
        {isVisible('finance', ['stocks', 'market', 'nasdaq', 'apple', 'nvidia', 'shares']) && <StockWatchlistWidget />}
        {isVisible('finance', ['sentiment', 'fear', 'greed', 'vix', 'radar']) && <FinancialSentimentWidget />}

        {/* Productivity & Tools */}
        {isVisible('productivity', ['dictionary', 'word', 'meaning', 'definition', 'lexicon']) && <DictionaryWidget />}
        {isVisible('productivity', ['activity', 'bored', 'task', 'todo', 'idea']) && <DailyActivityWidget />}
        {isVisible('productivity', ['qr', 'qrcode', 'generator', 'barcode', 'scan']) && <QRCodeGeneratorWidget />}
        {isVisible('productivity', ['email', 'validator', 'mailbox', 'mx', 'domain']) && <EmailValidatorWidget />}
        {isVisible('productivity', ['news', 'headlines', 'tech', 'hackernews', 'articles']) && <GlobalNewsWidget />}

        {/* Health, Food & Fitness */}
        {isVisible('health', ['recipe', 'food', 'cooking', 'meal', 'chef', 'ingredients']) && <RecipeFinderWidget />}
        {isVisible('health', ['nutrition', 'calories', 'macros', 'protein', 'diet']) && <NutritionCalculatorWidget />}
        {isVisible('health', ['workout', 'fitness', 'exercise', 'gym', 'hotel', 'training']) && <WorkoutPlannerWidget />}

        {/* Cosmic Zen & Entertainment */}
        {isVisible('entertainment', ['nasa', 'space', 'astronomy', 'apod', 'cosmos', 'galaxy']) && <NasaCosmicWidget />}
        {isVisible('entertainment', ['quote', 'motivation', 'inspiration', 'zen']) && <MotivationQuoteWidget />}
        {isVisible('entertainment', ['movies', 'shows', 'tv', 'trending', 'cinema', 'series']) && <MovieShowsWidget />}
        {isVisible('entertainment', ['gaming', 'games', 'video games', 'steam', 'rpg']) && <GamingLoreWidget />}
        {isVisible('entertainment', ['pokemon', 'pokedex', 'pikachu', 'nintendo']) && <PokemonPokedexWidget />}
        {isVisible('entertainment', ['anime', 'manga', 'jikan', 'mal', 'otaku']) && <AnimeTrackerWidget />}
        {isVisible('entertainment', ['pet', 'dog', 'cat', 'stress', 'relief', 'cute']) && <PetStressReliefWidget />}
      </main>

      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        <div>
          NomadOS Super-App • Powered by <strong style={{ color: 'var(--accent-cyan)' }}>TejX Native Compiler</strong> & <strong style={{ color: 'var(--accent-emerald)' }}>MongoDB SDK</strong>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>
          26 Live Modules • Zero Latency Execution
        </div>
      </footer>
    </div>
  );
}
