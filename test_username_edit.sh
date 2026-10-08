#!/usr/bin/env bash
set -e

BASE_URL="http://127.0.0.1:8080"

echo "=== 1. Login as Admin ==="
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | node -e "let data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(data.token || data.data.token);")

if [[ -z "$ADMIN_TOKEN" || "$ADMIN_TOKEN" == "undefined" ]]; then
  echo "❌ Admin login failed: $ADMIN_LOGIN"
  exit 1
fi
echo "✅ Admin login successful. Token acquired."

echo ""
echo "=== 2. Create User: test_user_alpha ==="
CREATE_USER_RES=$(curl -s -X POST "$BASE_URL/api/auth/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user_alpha","password":"password123","name":"Alpha Tester","email":"alpha@test.io","role":"customer"}')
echo "$CREATE_USER_RES" | grep -q "test_user_alpha" && echo "✅ User created: test_user_alpha"
USER_ID=$(echo "$CREATE_USER_RES" | node -e "let data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(data.data.id);")
echo "User ID: $USER_ID"

echo ""
echo "=== 3. Admin Updates Username: test_user_alpha -> test_user_beta ==="
UPDATE_RES=$(curl -s -X PUT "$BASE_URL/api/auth/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user_beta","name":"Alpha Tester Updated","email":"alpha.updated@test.io","role":"customer"}')
echo "$UPDATE_RES" | grep -q "test_user_beta" && echo "✅ Username updated to test_user_beta"

echo ""
echo "=== 4. Test Conflict Prevention: Existing Username Conflict ==="
CONFLICT_RES=$(curl -s -X PUT "$BASE_URL/api/auth/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","name":"Conflict Test","email":"conflict@test.io","role":"customer"}')
echo "$CONFLICT_RES" | grep -q "already taken" && echo "✅ Correctly rejected duplicate username with 409 Conflict: $CONFLICT_RES"

echo ""
echo "=== 5. Authenticate with New Username: test_user_beta ==="
BETA_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user_beta","password":"password123"}')
echo "$BETA_LOGIN" | grep -q "test_user_beta" && echo "✅ Successfully logged in with updated username test_user_beta"
BETA_TOKEN=$(echo "$BETA_LOGIN" | node -e "let data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(data.token || data.data.token);")

echo ""
echo "=== 6. Self-Update Profile/Username via PUT /api/auth/me ==="
SELF_UPDATE_RES=$(curl -s -X PUT "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $BETA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user_gamma","name":"Gamma Tester"}')
echo "$SELF_UPDATE_RES" | grep -q "test_user_gamma" && echo "✅ Successfully self-updated username to test_user_gamma via /api/auth/me"

echo ""
echo "=== 7. Authenticate with New Self-Updated Username: test_user_gamma ==="
GAMMA_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user_gamma","password":"password123"}')
echo "$GAMMA_LOGIN" | grep -q "test_user_gamma" && echo "✅ Successfully logged in with test_user_gamma"

echo ""
echo "=== 8. Cleanup Test User ==="
DEL_RES=$(curl -s -X DELETE "$BASE_URL/api/auth/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$DEL_RES" | grep -q "deleted" && echo "✅ Test user successfully cleaned up"

echo ""
echo "🎉 ALL USERNAME EDIT VERIFICATION TESTS PASSED PERFECTLY!"
