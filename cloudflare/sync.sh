#!/usr/bin/env bash
# Copy the shared UI from apps/content-review/static into the Cloudflare Pages output dir.
set -e; cd "$(dirname "$0")"; cp ../apps/content-review/static/{index.html,tools.html,tools.json,sheets.js} public/; echo synced
