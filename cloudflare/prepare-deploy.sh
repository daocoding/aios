#!/usr/bin/env bash
# Build a git-ignored deploy dir (cloudflare/.deploy) with your real D1 id and project name.
# Wrangler Pages doesn't accept a custom config path (-c), so we never edit the committed wrangler.toml.
# Usage: bash prepare-deploy.sh <d1-database-id> <pages-project-name> [--with-site]
#   --with-site  put the landing page (site/) at /; the review queue stays at /review and the sheets at /tools
set -euo pipefail; cd "$(dirname "$0")"
[ $# -ge 2 ] && [ $# -le 3 ] || { echo "usage: $0 <d1-database-id> <pages-project-name> [--with-site]" >&2; exit 1; }
bash sync.sh
rm -rf .deploy && mkdir .deploy && cp -r public functions lib schema.sql migrations .deploy/
# The D1 database is named after the project (one account can host several copies).
sed "s/REPLACE_WITH_YOUR_D1_DATABASE_ID/$1/; s/^name = .*/name = \"$2\"/; s/^database_name = .*/database_name = \"$2\"/" wrangler.toml > .deploy/wrangler.toml
if [ "${3:-}" = "--with-site" ]; then
  cp ../site/index.html .deploy/public/index.html
  cp ../site/aios.config.json .deploy/public/
fi
[ -f .dev.vars ] && cp .dev.vars .deploy/ || true
echo "ready: cd cloudflare/.deploy"
