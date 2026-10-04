# TejX Digital Nomad Backend Service (`backend`)

High-performance REST API backend built in TejX, powered by native compilation and the custom `mongo-sdk`.

## Architecture

- **Built with TejX**: Compiled directly to a native Mach-O arm64 binary with `--stdlib-path` and `--runtime-path`.
- **Custom MongoDB SDK**: Uses `mongo-sdk` for wire-protocol communications (`OP_MSG`).
- **Resilient Dual-Mode Storage**:
  - Automatically verifies MongoDB availability via handshake and ping.
  - If MongoDB is live, persists all collections to the database.
  - If MongoDB is unreachable, activates `memory://local-runtime` so the app is always functional.
- **Full CORS Support**: Built-in support for cross-origin requests, custom headers, and `OPTIONS` preflight handling.

## Directory Structure

```text
backend/
├── src/
│   ├── main.tx             # Main entry point
│   ├── server/
│   │   └── index.tx        # High-performance HTTP server & router
│   └── app/
│       ├── server.tx       # Bootstrap runtime & MongoDB probe
│       ├── core/           # App state, ID generator, persistence manager, responses
│       ├── helpers/        # Typed JSON helpers
│       ├── features/
│       │   ├── users/      # Users CRUD
│       │   ├── products/   # Products CRUD
│       │   ├── orders/     # Orders CRUD
│       │   ├── events/     # Audit stream
│       │   ├── reports/    # Analytics & revenue summary
│       │   ├── search/     # Cross-entity search
│       │   └── nomad/      # Nomad notes & bookmarks
│       └── router/         # Route definitions & runtime dispatcher
├── build.sh                # Compilation script
└── README.md
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | API status & metadata |
| `GET` | `/health` | Health check & storage mode (`mongodb` vs `memory`) |
| `GET` | `/api/reports/summary` | Analytics & inventory metrics |
| `GET` | `/api/search?q=...` | Global cross-entity search |
| `GET` | `/api/events` | Audit log stream |
| `GET` / `POST` | `/api/users` | List / Create users |
| `GET` / `PUT` / `DELETE` | `/api/users/:id` | Read / Update / Delete user |
| `GET` / `POST` | `/api/products` | List / Create products |
| `GET` / `PUT` / `DELETE` | `/api/products/:id` | Read / Update / Delete product |
| `GET` / `POST` | `/api/orders` | List / Create orders |
| `GET` / `PUT` / `DELETE` | `/api/orders/:id` | Read / Update / Delete order |
| `GET` | `/api/nomad/state` | Nomad Hub notes & saved bookmarks |
| `POST` / `DELETE` | `/api/nomad/notes` | Create / Delete nomad note |
| `POST` / `DELETE` | `/api/nomad/bookmarks` | Save / Remove nomad bookmark |

## Compiling & Running

```bash
# Build binary
./build.sh

# Run server (default port 8080)
./build/server

# Or with custom port / MongoDB URI
PORT=9000 MONGO_URI="mongodb://127.0.0.1:27017/my_custom_db" ./build/server
```
