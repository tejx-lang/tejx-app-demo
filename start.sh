#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_BIN="$SCRIPT_DIR/backend/build/server"

echo "=========================================================="
echo "⚡ NomadOS | Digital Nomad Super-App Full Stack"
echo "=========================================================="

# 1. Safe environment loader function (prevents shell execution of special chars like '|')
load_env_file() {
    local env_file="$1"
    if [[ -f "$env_file" ]]; then
        echo "==> Loading $(basename "$env_file") from ${env_file%/*} ..."
        while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
            local line="${raw_line%$'\r'}"
            line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
            if [[ -z "$line" || "$line" =~ ^# ]]; then
                continue
            fi
            if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
                local key="${BASH_REMATCH[1]}"
                local val="${BASH_REMATCH[2]}"
                if [[ "$val" =~ ^\"(.*)\"$ ]]; then
                    val="${BASH_REMATCH[1]}"
                elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
                    val="${BASH_REMATCH[1]}"
                fi
                export "$key=$val"
            fi
        done < "$env_file"
    fi
}

load_env_file "$SCRIPT_DIR/.env"
load_env_file "$SCRIPT_DIR/backend/.env"
load_env_file "$SCRIPT_DIR/frontend/.env"

BACKEND_HOST="127.0.0.1"
BACKEND_PORT="${PORT:-8080}"
FRONTEND_PORT="${VITE_PORT:-3000}"

# 2. Build backend if not already built
if [[ ! -x "$BACKEND_BIN" ]]; then
    echo "==> Backend binary missing. Compiling with TejX..."
    bash "$SCRIPT_DIR/backend/build.sh"
fi

# 3. Trap signals for graceful shutdown
cleanup() {
    echo ""
    echo "==> Shutting down NomadOS services..."
    if [[ -n "${BACKEND_PID:-}" ]]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [[ -n "${FRONTEND_PID:-}" ]]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "==> All services stopped cleanly."
    exit 0
}

trap cleanup INT TERM EXIT

# 4. Launch TejX Backend
echo "==> Starting TejX Native Backend on http://${BACKEND_HOST}:${BACKEND_PORT} ..."
(cd "$SCRIPT_DIR/backend" && "$BACKEND_BIN") &
BACKEND_PID=$!

sleep 1

# 5. Launch React Frontend
echo "==> Starting NomadOS React Frontend on port ${FRONTEND_PORT} ..."
(cd "$SCRIPT_DIR/frontend" && npx vite --port "$FRONTEND_PORT" --host) &
FRONTEND_PID=$!

echo ""
echo "✨ NomadOS is LIVE!"
echo "   - Frontend: http://localhost:${FRONTEND_PORT}"
echo "   - Backend:  http://${BACKEND_HOST}:${BACKEND_PORT}"
echo "   - Health:   http://${BACKEND_HOST}:${BACKEND_PORT}/health"
echo "Press Ctrl+C to terminate both servers."
echo ""

wait "$FRONTEND_PID" "$BACKEND_PID"
