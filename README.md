# TejX Demo: NomadOS Full-Stack Super-App

A full-stack, modular **Digital Nomad Command Center & Super-App** built with:
1. **`mongo-sdk/`**: A standalone, pure TejX MongoDB wire-protocol package.
2. **`backend/`**: A high-performance REST API service compiled directly from TejX into native machine code.
3. **`frontend/`**: An ultra-modern React dashboard aggregating **25+ public APIs** with real-time sync to the TejX backend and MongoDB.

---

## 🏗️ Architecture & Directory Layout

```text
tejx-demo/
├── mongo-sdk/                 # Standalone pure TejX MongoDB Driver Package
│   ├── src/
│   │   ├── index.tx           # Public driver exports (MongoClient, MongoDatabase)
│   │   ├── client.tx          # OP_MSG wire protocol client
│   │   ├── bson.tx            # Full BSON serializer and deserializer
│   │   ├── auth.tx            # SCRAM-SHA-256 and SCRAM-SHA-1 authentication
│   │   ├── config.tx          # Mongo URI & configuration options
│   │   └── json.tx            # Typed BSON-to-JSON bridge
│   ├── tests/
│   │   ├── test_bson.tx       # BSON encoder/decoder verification
│   │   └── test_client.tx     # Client handshake test
│   └── README.md
│
├── backend/                   # Native TejX REST Backend
│   ├── src/
│   │   ├── main.tx            # Entry point
│   │   ├── server/            # HTTP server, router & CORS preflight support
│   │   └── app/               # Core state, domain models, feature handlers
│   │       ├── features/      # Users, Products, Orders, Events, Reports, Nomad
│   │       └── server.tx      # MongoDB probe with automatic in-memory fallback
│   ├── build.sh               # Native Mach-O compiler script
│   └── README.md
│
├── frontend/                  # React Frontend Application (Vite + React)
│   ├── src/
│   │   ├── components/        # Header, KPI strip, and 26 modular widgets
│   │   ├── services/api.js    # Data aggregator for 25+ APIs + TejX backend
│   │   ├── styles/index.css   # Glassmorphic dark UI design system
│   │   ├── App.jsx            # Main dashboard coordinator
│   │   └── main.jsx
│   ├── vite.config.js         # API proxy to TejX backend
│   └── README.md
│
├── start.sh                   # Unified single-command launcher
├── package.json               # Root scripts runner
└── README.md
```

---

## ⚡ The 25+ APIs in NomadOS

NomadOS integrates 25+ distinct data sources organized into responsive category grids:

| # | Category | Widget Name | Data Source / Public API | Key Features |
|---|---|---|---|---|
| 1 | **Travel & Environment** | Current Weather | [Open-Meteo Weather API](https://open-meteo.com) | Real-time temperature, wind speed, weather code across global nomad hubs |
| 2 | **Travel & Environment** | Air Quality Index | [Open-Meteo Air Quality](https://air-quality-api.open-meteo.com) | European AQI, PM2.5, PM10, and Ozone pollution levels |
| 3 | **Travel & Environment** | IP Geolocation | [ipapi.co](https://ipapi.co) / [IP-API](https://ip-api.com) | Detects client IP, city, region, ISP network, and timezone |
| 4 | **Travel & Environment** | Country Explorer | [REST Countries API](https://restcountries.com) | Capital, population, official currency, national flag |
| 5 | **Travel & Environment** | World Time Clocks | [TimeAPI](https://timeapi.io) | Multi-timezone synchronized clocks (Tokyo, London, NYC, Sydney, Dubai, Paris) |
| 6 | **Travel & Environment** | Public Holidays | [Nager.Date API](https://date.nager.at) | Upcoming statutory holidays by country and year |
| 7 | **Finance & Markets** | Live Crypto Tracker | [CoinGecko API](https://coingecko.com) | Bitcoin, Ethereum, Solana, Cardano, Dogecoin with 24h change |
| 8 | **Finance & Markets** | Currency Converter | [Frankfurter Exchange API](https://frankfurter.app) | Live forex exchange rates (USD, EUR, GBP, JPY, CAD, INR) |
| 9 | **Finance & Markets** | Stock Watchlist | [Alpha Vantage](https://alphavantage.co) / [Finnhub](https://finnhub.io) | Tech market price ticks (AAPL, NVDA, MSFT, GOOGL, TSLA) |
| 10 | **Finance & Markets** | Financial Sentiment | Market Sentiment Radar | Fear & Greed gauge, volatility index (VIX), market momentum |
| 11 | **Productivity & Tools** | Free Dictionary | [Free Dictionary API](https://dictionaryapi.dev) | Word definitions, phonetics, parts of speech, and usage examples |
| 12 | **Productivity & Tools** | Daily Activity Idea | [Bored API](https://bored-api.appbrewery.com) | Random curated productive and leisure tasks for digital nomads |
| 13 | **Productivity & Tools** | QR Code Generator | [QR Server API](https://goqr.me/api) | Real-time text/URL to downloadable QR code |
| 14 | **Productivity & Tools** | Email Validator | [Mailboxlayer](https://mailboxlayer.com) Format Spec | Email syntax check, corporate domain classification, deliverability score |
| 15 | **Productivity & Tools** | Global Tech News | [HackerNews Firebase API](https://news.ycombinator.com) | Live top 5 tech stories with upvotes and direct article links |
| 16 | **Health & Fitness** | Recipe Explorer | [TheMealDB API](https://themealdb.com) | Random meal generator with photo, ingredients list, and modal cooking steps |
| 17 | **Health & Fitness** | Nutrition Calculator | [Edamam Nutrition Model](https://edamam.com) | Calorie slider calculating daily protein, carb, fat, and water targets |
| 18 | **Health & Fitness** | Hotel Workout Routine | [ExerciseDB](https://rapidapi.com) / [Wger](https://wger.de) | Daily bodyweight exercise program for travelers |
| 19 | **Cosmic Zen** | NASA Astronomy Picture | [NASA APOD API](https://api.nasa.gov) | Daily high-res cosmic photography with scientific explanation |
| 20 | **Cosmic Zen** | Nomad Motivation | [ZenQuotes](https://zenquotes.io) / [Type.fit](https://type.fit) | Inspirational quotes with one-click clipboard copy |
| 21 | **Cosmic Zen** | Trending Shows | [TVMaze API](https://tvmaze.com) | Top trending TV series with ratings, genres, and poster artwork |
| 22 | **Cosmic Zen** | Gaming Releases | [IGDB](https://igdb.com) / [OpenCritic](https://opencritic.com) | Notable video game titles, review scores, and platforms |
| 23 | **Cosmic Zen** | Pokémon Pokédex | [PokeAPI](https://pokeapi.co) | Interactive Pokédex with animated sprites, stats, and types |
| 24 | **Cosmic Zen** | Anime Schedule | [Jikan API](https://jikan.moe) (MyAnimeList) | Top anime releases with scores, episode count, and artwork |
| 25 | **Cosmic Zen** | Pet Stress Relief | [Dog.CEO API](https://dog.ceo) / [The Cat API](https://thecatapi.com) | Instant random pet photo button for travel fatigue relief |
| 26 | **Core Integration** | **TejX + MongoDB Hub** | TejX REST Backend | Live CRUD for Users, Products, Orders, Nomad Notes, and Audit Events |

---

## 🚀 Quick Start

### 1. Launch All Services (Single Command)

```bash
cd tejx-demo
./start.sh
```

This will:
1. Automatically compile the TejX backend binary with `backend/build.sh`.
2. Start the native TejX HTTP backend at `http://127.0.0.1:8080`.
3. Start the Vite React development server at `http://localhost:3000`.

### 2. Manual Commands

```bash
# Build the TejX backend
npm run build:backend

# Test the Mongo SDK
npm run test:sdk

# Run the backend standalone
./backend/build/server

# Run the React frontend
npm run start:frontend
```

---

## ⚙️ Environment Configuration (`.env`)

Both backend and frontend are configured via environment files:

### Backend (`backend/.env`)

```env
PORT=8080
HOST=127.0.0.1
MONGO_URI=mongodb://127.0.0.1:27017/tejx_nomad_db
# Initial root administrator. Omit either value only for local development;
# each falls back to admin.
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
```

The backend seeds this root account on startup. Anonymous visitors can create
a browse-only guest session; only a verified root administrator can use the
demo role switcher to enter the customer or vendor views.

### Frontend (`frontend/.env`)

```env
VITE_PORT=3000
VITE_BACKEND_URL=http://127.0.0.1:8080
VITE_APP_TITLE=NomadOS | Digital Nomad Command Center
```

---

## 🍃 MongoDB Integration & Dual-Mode Persistence

1. **When MongoDB is running** (`mongodb://127.0.0.1:27017`):
   - The TejX backend connects using `mongo-sdk` via pure BSON wire protocol.
   - All users, products, orders, notes, and audit events are persisted in the database.
   - The frontend displays a green `MongoDB Live` status indicator.

2. **When MongoDB is not running**:
   - The backend gracefully switches to `memory://local-runtime`.
   - The application continues serving all routes and mutations seamlessly in memory with seed data.
   - The frontend displays an amber `In-Memory` status indicator.
