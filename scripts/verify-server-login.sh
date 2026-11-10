#!/bin/bash
# Live server proof for server login, admin gate, and logout.
# Local proof only. No live deployment, no spending, no real user data.
#
# What it proves, against a production build (next start) on localhost:
#   1. Logged out GET /admin returns 307 to /auth/login?next=%2Fadmin.
#   2. A forged lpg_session cookie GET /admin returns 307.
#   3. A wrong password login returns 200 with the generic message
#      "Email or password is incorrect." and sets no cookie.
#   4. The seeded admin login returns 303 to /admin and sets the
#      httpOnly lpg_session cookie (Secure in production, SameSite Lax).
#   5. Logged in GET /admin returns 200 and contains "Admin panel".
#   6. Logout returns 303 to /auth/login, clears the cookie, and the
#      old token then returns 307 on /admin.
#
# How to run it (from the repo root):
#   npm run build -w apps/web
#   LPG_SEED_ADMIN_EMAIL="seed-admin@example.com" \
#   LPG_SEED_ADMIN_PASSWORD="a strong seed password" \
#   bash scripts/verify-server-login.sh
#
# The seed credentials come from env only. They are never printed and
# never written to a file. The server it starts is killed on exit.
# The login POST uses the Next.js server action wire format: the
# FormData argument is sent as fields prefixed 1_ (1_email,
# 1_password, 1_next), and field 0 holds the args JSON ["$K1"]. The
# 1_ fields must come before field 0 in the multipart body, because
# the server resolves the FormData reference in field order. A plain
# POST of email and password fields does not invoke the action.
# The cookie is sent back with an explicit Cookie header because the
# cookie is Secure in production and curl does not send Secure cookies
# over plain http. A browser on https sends it normally.

set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
PORT="${PORT:-3102}"
BASE="http://localhost:$PORT"
FAILURES=0

fail() {
  FAILURES=$((FAILURES + 1))
  echo "FAIL: $1"
}

pass() {
  echo "PASS: $1"
}

if [ -z "${LPG_SEED_ADMIN_EMAIL:-}" ] || [ -z "${LPG_SEED_ADMIN_PASSWORD:-}" ]; then
  echo "Set LPG_SEED_ADMIN_EMAIL and LPG_SEED_ADMIN_PASSWORD in env first (local proof only)."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is needed to read the action ids from the build."
  exit 1
fi
if [ ! -f "$WEB/.next/BUILD_ID" ]; then
  echo "No production build found. Run this first: npm run build -w apps/web"
  exit 1
fi

# Action ids are content hashes that change when the action code
# changes, so they are read from the current build, never hard coded.
ACTION_IDS="$(python3 - "$WEB" <<'PYEOF'
import glob
import json
import re
import sys
web = sys.argv[1]
manifest = json.load(open(web + "/.next/server/server-reference-manifest.json"))
ids = list(manifest["node"].keys())
text = ""
for path in glob.glob(web + "/.next/server/chunks/*.js"):
    with open(path, encoding="utf-8", errors="ignore") as handle:
        text += handle.read()
found = {}
for action_id in ids:
    for name in ("loginAction", "logoutAction"):
        pattern = '"' + re.escape(action_id) + r'":\(\)=>Promise[^}]{0,200}?' + name
        if re.search(pattern, text):
            found[name] = action_id
print(found.get("loginAction", ""))
print(found.get("logoutAction", ""))
PYEOF
)"
LOGIN_ACTION_ID="$(printf '%s' "$ACTION_IDS" | sed -n '1p')"
LOGOUT_ACTION_ID="$(printf '%s' "$ACTION_IDS" | sed -n '2p')"
if [ -z "$LOGIN_ACTION_ID" ] || [ -z "$LOGOUT_ACTION_ID" ]; then
  echo "Could not read the login and logout action ids from the build."
  exit 1
fi

TMPDIR_WORK="$(mktemp -d)"
JAR="$TMPDIR_WORK/jar.txt"
# setsid puts the server in its own process group, so the EXIT trap
# kills the npm wrapper and the next-server child together. Killing
# only the npm wrapper would leave next-server listening.
trap 'kill -- -"$SERVER_PID" 2>/dev/null; rm -rf "$TMPDIR_WORK"' EXIT

cd "$WEB"
LPG_SEED_ADMIN_EMAIL="$LPG_SEED_ADMIN_EMAIL" LPG_SEED_ADMIN_PASSWORD="$LPG_SEED_ADMIN_PASSWORD" \
  setsid npx next start -p "$PORT" >"$TMPDIR_WORK/server.log" 2>&1 < /dev/null &
SERVER_PID=$!

READY=0
for _ in $(seq 1 30); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$BASE/auth/login" || true)"
  if [ "$CODE" = "200" ]; then
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" != "1" ]; then
  echo "Server did not become ready on port $PORT. See $TMPDIR_WORK/server.log"
  exit 1
fi

# 1. Logged out GET /admin returns 307 to the login page.
RESULT="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/admin")"
if [ "$RESULT" = "307 $BASE/auth/login?next=%2Fadmin" ]; then
  pass "logged out GET /admin is 307 to /auth/login?next=%2Fadmin"
else
  fail "logged out GET /admin, got: $RESULT"
fi

# 2. A forged cookie GET /admin returns 307.
RESULT="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Cookie: lpg_session=forged-token-value" "$BASE/admin")"
if [ "$RESULT" = "307 $BASE/auth/login?next=%2Fadmin" ]; then
  pass "forged cookie GET /admin is 307 to /auth/login?next=%2Fadmin"
else
  fail "forged cookie GET /admin, got: $RESULT"
fi

# 3. Wrong password returns 200 with the generic message, no cookie.
BODY="$(curl -s -H "Next-Action: $LOGIN_ACTION_ID" -H "Accept: text/x-component" \
  -F "1_email=$LPG_SEED_ADMIN_EMAIL" -F "1_password=a wrong password here" \
  -F "1_next=/admin" -F '0=["$K1"]' "$BASE/auth/login")"
if printf '%s' "$BODY" | grep -q "Email or password is incorrect."; then
  pass "wrong password returns the generic message"
else
  fail "wrong password did not return the generic message, body: $BODY"
fi

# 4. Correct login returns 303 to /admin and sets the cookie.
curl -s -D "$TMPDIR_WORK/login-head.txt" -o "$TMPDIR_WORK/login-body.txt" -c "$JAR" \
  -H "Next-Action: $LOGIN_ACTION_ID" -H "Accept: text/x-component" \
  -F "1_email=$LPG_SEED_ADMIN_EMAIL" -F "1_password=$LPG_SEED_ADMIN_PASSWORD" \
  -F "1_next=/admin" -F '0=["$K1"]' "$BASE/auth/login" >/dev/null
STATUS="$(head -1 "$TMPDIR_WORK/login-head.txt")"
REDIRECT="$(grep -i "^x-action-redirect:" "$TMPDIR_WORK/login-head.txt" | tr -d '\r' | awk '{print $2}')"
COOKIE_LINE="$(grep -i "^set-cookie:" "$TMPDIR_WORK/login-head.txt" | tr -d '\r')"
if printf '%s' "$STATUS" | grep -q "303" && [ "$REDIRECT" = "/admin" ]; then
  pass "correct login is 303 with x-action-redirect /admin"
else
  fail "correct login, status: $STATUS redirect: $REDIRECT"
fi
if printf '%s' "$COOKIE_LINE" | grep -q "lpg_session=" && printf '%s' "$COOKIE_LINE" | grep -qi "httponly" && printf '%s' "$COOKIE_LINE" | grep -qi "samesite=lax"; then
  pass "login sets an HttpOnly SameSite=Lax lpg_session cookie"
else
  fail "login Set-Cookie header is wrong or missing (header value not printed)"
fi
TOKEN="$(awk '/lpg_session/ {print $NF}' "$JAR")"
if [ -z "$TOKEN" ]; then
  fail "no lpg_session token was captured in the cookie jar"
fi

# 5. Logged in GET /admin returns 200 and contains "Admin panel".
if [ -n "$TOKEN" ]; then
  curl -s -o "$TMPDIR_WORK/admin.html" -w '%{http_code}' -H "Cookie: lpg_session=$TOKEN" "$BASE/admin" >"$TMPDIR_WORK/admin-code.txt"
  CODE="$(cat "$TMPDIR_WORK/admin-code.txt")"
  if [ "$CODE" = "200" ] && grep -q "Admin panel" "$TMPDIR_WORK/admin.html" && grep -q "Sign out" "$TMPDIR_WORK/admin.html"; then
    pass "logged in GET /admin is 200 with Admin panel and Sign out"
  else
    fail "logged in GET /admin, code: $CODE"
  fi

  # 6. Logout returns 303 to /auth/login and the old token stops working.
  curl -s -D "$TMPDIR_WORK/logout-head.txt" -o /dev/null \
    -H "Cookie: lpg_session=$TOKEN" -H "Next-Action: $LOGOUT_ACTION_ID" -H "Accept: text/x-component" \
    -F '0=["$K1"]' "$BASE/admin" >/dev/null
  LOGOUT_STATUS="$(head -1 "$TMPDIR_WORK/logout-head.txt")"
  LOGOUT_REDIRECT="$(grep -i "^x-action-redirect:" "$TMPDIR_WORK/logout-head.txt" | tr -d '\r' | awk '{print $2}')"
  AFTER="$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: lpg_session=$TOKEN" "$BASE/admin")"
  if printf '%s' "$LOGOUT_STATUS" | grep -q "303" && [ "$LOGOUT_REDIRECT" = "/auth/login" ] && [ "$AFTER" = "307" ]; then
    pass "logout is 303 to /auth/login and the old token then gets 307 on /admin"
  else
    fail "logout, status: $LOGOUT_STATUS redirect: $LOGOUT_REDIRECT, /admin after logout: $AFTER"
  fi
fi

if [ "$FAILURES" = "0" ]; then
  echo "All server login checks passed."
  exit 0
fi
echo "$FAILURES check(s) failed."
exit 1
