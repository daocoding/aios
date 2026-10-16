#!/usr/bin/env bash
# Build a git-ignored deploy dir (cloudflare/.deploy) with your real D1 id and project name.
# Wrangler Pages doesn't accept a custom config path (-c), so we never edit the committed wrangler.toml.
# Usage: bash prepare-deploy.sh <d1-database-id> <pages-project-name>
set -euo pipefail; cd "$(dirname "$0")"
[ $# -eq 2 ] || { echo "usage: $0 <d1-database-id> <pages-project-name>" >&2; exit 1; }
bash sync.sh
rm -rf .deploy && mkdir .deploy && cp -r public functions lib schema.sql .deploy/
sed "s/REPLACE_WITH_YOUR_D1_DATABASE_ID/$1/; s/^name = .*/name = \"$2\"/" wrangler.toml > .deploy/wrangler.toml
[ -f .dev.vars ] && cp .dev.vars .deploy/ || true
echo "ready: cd cloudflare/.deploy"
