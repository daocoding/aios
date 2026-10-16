#!/usr/bin/env bash
# (Re)start the aiOS Content Review queue in the background (local / self-hosted Python version).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data
TOKEN_FILE="${AIOS_TOKEN_FILE:-data/owner_token}"
if [ ! -s "$TOKEN_FILE" ]; then
  (umask 077; python3 -c 'import secrets;print(secrets.token_urlsafe(24))' > "$TOKEN_FILE")
  echo "Created owner passcode at $TOKEN_FILE (keep it private)"
fi
chmod 600 "$TOKEN_FILE"
if [ -f data/server.pid ] && kill -0 "$(cat data/server.pid)" 2>/dev/null; then kill "$(cat data/server.pid)"; sleep 1; fi
nohup python3 app.py >> data/server.log 2>&1 &
echo $! > data/server.pid
sleep 1
curl -fsS "http://127.0.0.1:${AIOS_PORT:-8787}/healthz" >/dev/null && echo "running pid $(cat data/server.pid) on :${AIOS_PORT:-8787}"
