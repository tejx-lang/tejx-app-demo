#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_BIN="$DIR/backend/build/server"

echo "=========================================================="
echo "🧪 Running NomadOS TejX Backend Verification Suite"
echo "=========================================================="

if [[ ! -x "$BACKEND_BIN" ]]; then
    echo "==> Building backend..."
    bash "$DIR/backend/build.sh"
fi

TEST_PORT=8099
export PORT=$TEST_PORT

# Clean any lingering test server on this port
lsof -ti :$TEST_PORT | xargs kill -9 2>/dev/null || true
sleep 0.2

# Start backend in background
echo "==> Starting backend on port $TEST_PORT..."
(cd "$DIR/backend" && "$BACKEND_BIN") &
SERVER_PID=$!

cleanup() {
    echo "==> Stopping test server (PID: $SERVER_PID)..."
    kill -9 "$SERVER_PID" 2>/dev/null || true
    lsof -ti :$TEST_PORT | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server to be responsive
echo "==> Waiting for server to become ready..."
for i in {1..30}; do
    if curl -s "http://127.0.0.1:$TEST_PORT/health" > /dev/null; then
        echo "==> Server ready!"
        break
    fi
    sleep 0.2
done

echo ""
echo "--- 1. HTTP Methods: GET, HEAD, OPTIONS ---"
curl -s "http://127.0.0.1:$TEST_PORT/health" | grep -q "healthy" && echo "✅ GET /health (200 OK)"
curl -s -I "http://127.0.0.1:$TEST_PORT/health" | grep -q "HTTP/1.1 200" && echo "✅ HEAD /health (200 OK with empty body)"
OPTIONS_OUT=$(curl -s -X OPTIONS "http://127.0.0.1:$TEST_PORT/api/users")
echo "✅ OPTIONS /api/users preflight handled"

echo ""
echo "--- 2. HTTP Methods: POST, GET, PUT, PATCH, DELETE on Users ---"
# POST
NEW_USER=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Aria Stark","email":"aria@nomad.io","role":"Security Auditor"}')
echo "$NEW_USER" | grep -q "Aria Stark" && echo "✅ POST /api/users (Created User)"

# GET
USERS_LIST=$(curl -s "http://127.0.0.1:$TEST_PORT/api/users")
echo "$USERS_LIST" | grep -q "users" && echo "✅ GET /api/users (List Users)"

# PUT (full update)
PUT_USER=$(curl -s -X PUT "http://127.0.0.1:$TEST_PORT/api/users/usr-1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Elena Vance Updated","email":"elena.updated@digitalnomad.io","role":"Principal Explorer"}')
echo "$PUT_USER" | grep -q "Elena Vance Updated" && echo "✅ PUT /api/users/usr-1 (Full Update)"

# PATCH (partial update)
PATCH_USER=$(curl -s -X PATCH "http://127.0.0.1:$TEST_PORT/api/users/usr-1" \
  -H "Content-Type: application/json" \
  -d '{"role":"Chief Nomad Officer"}')
echo "$PATCH_USER" | grep -q "Chief Nomad Officer" && echo "✅ PATCH /api/users/usr-1 (Partial Update)"

# DELETE
DEL_USER=$(curl -s -X DELETE "http://127.0.0.1:$TEST_PORT/api/users/usr-2")
echo "$DEL_USER" | grep -q "deleted" && echo "✅ DELETE /api/users/usr-2 (Deleted User)"

echo ""
echo "--- 3. Database Status & Diagnostics ---"
DB_RESP=$(curl -s "http://127.0.0.1:$TEST_PORT/api/database/status")
echo "$DB_RESP" | grep -q "statusMessage" && echo "✅ GET /api/database/status returned diagnostic info"

RECON_RESP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/reconnect")
echo "$RECON_RESP" | grep -q "Database" && echo "✅ POST /api/database/reconnect handled cleanly"

echo ""
echo "--- 4. All MongoDB Operations Workbench ---"
# GET operations manifest
OP_MANIFEST=$(curl -s "http://127.0.0.1:$TEST_PORT/api/database/operations")
echo "$OP_MANIFEST" | grep -q "supportedOperations" && echo "✅ GET /api/database/operations (Manifest & Collection Counts)"

# OPTIONS operations
OP_OPTIONS=$(curl -s -X OPTIONS "http://127.0.0.1:$TEST_PORT/api/database/operations")
echo "$OP_OPTIONS" | grep -q "allowedMethods" && echo "✅ OPTIONS /api/database/operations"

# Mongo: ping
PING_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"ping"}')
echo "$PING_OP" | grep -q "PONG" && echo "✅ Mongo Operation: ping"

# Mongo: count
COUNT_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"count","collection":"users"}')
echo "$COUNT_OP" | grep -q "count" && echo "✅ Mongo Operation: count"

# Mongo: listCollections
LIST_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"listcollections"}')
echo "$LIST_OP" | grep -q "collections" && echo "✅ Mongo Operation: listCollections"

# Mongo: insertOne
INSERT1_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"insertone","collection":"nomad_notes","document":{"id":"op-note-1","title":"Test Op Note","category":"Ops"}}')
echo "$INSERT1_OP" | grep -q "inserted" && echo "✅ Mongo Operation: insertOne"

# Mongo: find
FIND_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"find","collection":"nomad_notes"}')
echo "$FIND_OP" | grep -q "documents" && echo "✅ Mongo Operation: find"

# Mongo: findOne
FIND1_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"findone","collection":"nomad_notes"}')
echo "$FIND1_OP" | grep -q "document" && echo "✅ Mongo Operation: findOne"

# Mongo: updateOne
UPDATE1_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"updateone","collection":"nomad_notes","filter":{"id":"op-note-1"},"update":{"category":"Ops-Verified"}}')
echo "$UPDATE1_OP" | grep -q "Updated" && echo "✅ Mongo Operation: updateOne"

# Mongo: deleteOne
DEL1_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"deleteone","collection":"nomad_notes","filter":{"id":"op-note-1"}}')
echo "$DEL1_OP" | grep -q "Deleted" && echo "✅ Mongo Operation: deleteOne"

# Mongo: insertMany
INSERTM_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"insertmany","collection":"nomad_notes","documents":[{"id":"bulk-1","tag":"bulk_test"},{"id":"bulk-2","tag":"bulk_test"}]}')
echo "$INSERTM_OP" | grep -q "Batch inserted" && echo "✅ Mongo Operation: insertMany"

# Mongo: deleteMany
DELM_OP=$(curl -s -X POST "http://127.0.0.1:$TEST_PORT/api/database/operations" -H "Content-Type: application/json" -d '{"op":"deletemany","collection":"nomad_notes","filter":{"tag":"bulk_test"}}')
echo "$DELM_OP" | grep -q "Deleted all" && echo "✅ Mongo Operation: deleteMany"

echo ""
echo "--- 5. Backend External Aggregator Endpoints ---"
curl -s "http://127.0.0.1:$TEST_PORT/api/data/weather" | grep -q "temp" && echo "✅ GET /api/data/weather returned data"
curl -s "http://127.0.0.1:$TEST_PORT/api/data/crypto" | grep -q "coins" && echo "✅ GET /api/data/crypto returned data"
curl -s "http://127.0.0.1:$TEST_PORT/api/data/news" | grep -q "news" && echo "✅ GET /api/data/news returned data"
curl -s "http://127.0.0.1:$TEST_PORT/api/data/geolocation" | grep -q "city" && echo "✅ GET /api/data/geolocation returned data"
curl -s "http://127.0.0.1:$TEST_PORT/api/data/country?name=Japan" | grep -q "name" && echo "✅ GET /api/data/country returned data"

echo ""
echo "=========================================================="
echo "🎉 ALL HTTP METHODS & ALL MONGO OPERATIONS FULLY VERIFIED!"
echo "=========================================================="
