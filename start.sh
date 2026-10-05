#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_BIN="$SCRIPT_DIR/backend/build/server"

echo "=========================================================="
echo "⚡ TejX Marketplace & Real-Time Financial Analytics Engine"
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
    trap - INT TERM EXIT HUP

    if [[ -n "${BACKEND_PID:-}" ]]; then
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi
    if [[ -n "${FRONTEND_PID:-}" ]]; then
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi

    sleep 0.5

    # Force kill any lingering processes on backend and frontend ports
    if command -v lsof >/dev/null 2>&1; then
        local b_pids
        b_pids=$(lsof -ti :"$BACKEND_PORT" 2>/dev/null || true)
        if [[ -n "$b_pids" ]]; then
            kill -9 $b_pids 2>/dev/null || true
        fi
        local f_pids
        f_pids=$(lsof -ti :"$FRONTEND_PORT" 2>/dev/null || true)
        if [[ -n "$f_pids" ]]; then
            kill -9 $f_pids 2>/dev/null || true
        fi
    fi

    # Clean up all background jobs
    kill $(jobs -p) 2>/dev/null || true
    wait 2>/dev/null || true
    echo "==> All backend and frontend services stopped cleanly."
}

trap cleanup INT TERM EXIT HUP

# 4. Launch TejX Backend
echo "==> Starting TejX Native Backend on http://${BACKEND_HOST}:${BACKEND_PORT} ..."
(cd "$SCRIPT_DIR/backend" && exec "$BACKEND_BIN") &
BACKEND_PID=$!

sleep 1

# 5. Launch React Frontend
echo "==> Starting NomadOS Frontend on port ${FRONTEND_PORT} ..."
(cd "$SCRIPT_DIR/frontend" && exec npx vite --port "$FRONTEND_PORT" --host) &
FRONTEND_PID=$!

echo ""
echo "✨ TejX Enterprise Marketplace Engine is LIVE!"
echo "   - Frontend UI:  http://localhost:${FRONTEND_PORT}"
echo "   - TejX Backend: http://${BACKEND_HOST}:${BACKEND_PORT}"
echo "   - Health Check: http://${BACKEND_HOST}:${BACKEND_PORT}/health"
echo "   - Catalog API:  http://${BACKEND_HOST}:${BACKEND_PORT}/api/marketplace/catalog"
echo "Press Ctrl+C to cleanly terminate both servers and release ports."
echo ""

wait "$FRONTEND_PID" "$BACKEND_PID" 2>/dev/null || true
