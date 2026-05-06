#!/usr/bin/env bash
# Sync the Claude Code OAuth access token from the macOS Keychain into
# the project's .env file (under the key CLAUDE_CODE_OAUTH_TOKEN).
#
# Usage:  ./scripts/sync-claude-token.sh
#
# Prerequisites:
#   - Claude Code CLI installed and logged in (`claude logout && claude`
#     once if your token is expired).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if ! command -v security >/dev/null 2>&1; then
  echo "❌ This helper only supports macOS (uses /usr/bin/security)." >&2
  exit 1
fi

BLOB="$(security find-generic-password -s 'Claude Code-credentials' -w 2>/dev/null || true)"
if [ -z "$BLOB" ]; then
  echo "❌ No 'Claude Code-credentials' entry in your Keychain."
  echo "   Run:  claude logout && claude    (then re-run this script)"
  exit 1
fi

read -r TOKEN EXPIRES_HUMAN EXPIRED <<EOF
$(printf '%s' "$BLOB" | python3 - <<'PY'
import json, sys, datetime
d = json.load(sys.stdin).get("claudeAiOauth", {})
tok = d.get("accessToken", "")
exp_ms = int(d.get("expiresAt", 0))
exp = datetime.datetime.fromtimestamp(exp_ms / 1000)
expired = "yes" if exp < datetime.datetime.now() else "no"
print(tok, exp.isoformat(timespec="seconds"), expired)
PY
)
EOF

if [ -z "$TOKEN" ]; then
  echo "❌ Could not read accessToken from Keychain entry." >&2
  exit 1
fi

echo "Token expires: $EXPIRES_HUMAN  (expired? $EXPIRED)"

if [ "$EXPIRED" = "yes" ]; then
  echo
  echo "⚠️  The stored accessToken is expired. Refresh it:"
  echo "      claude logout && claude"
  echo "   Then re-run this script."
  exit 2
fi

# Make sure .env exists; if not, copy the example.
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ROOT/.env.example" ]; then
    cp "$ROOT/.env.example" "$ENV_FILE"
    echo "ℹ️  Created .env from .env.example."
  else
    : > "$ENV_FILE"
  fi
fi

# Replace (or append) the CLAUDE_CODE_OAUTH_TOKEN line.
TMP="$(mktemp)"
NEW_LINE="CLAUDE_CODE_OAUTH_TOKEN=$TOKEN"
if grep -qE '^[# ]*CLAUDE_CODE_OAUTH_TOKEN=' "$ENV_FILE"; then
  awk -v new="$NEW_LINE" '
    /^[# ]*CLAUDE_CODE_OAUTH_TOKEN=/ && !done { print new; done=1; next }
    { print }
  ' "$ENV_FILE" > "$TMP"
  mv "$TMP" "$ENV_FILE"
else
  printf '\n%s\n' "$NEW_LINE" >> "$ENV_FILE"
fi

echo "✅ .env updated with a fresh CLAUDE_CODE_OAUTH_TOKEN."
echo "   Restart your dev server:  npm run dev"
