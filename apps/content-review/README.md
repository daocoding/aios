# Content Review: the human approval gate of aiOS

Agents draft. Humans decide. Every post, video script, and outreach message an aiOS agent produces lands in this queue first.
The owner sees one compact, full-width row per item, can **select all and bulk-approve**, skip, edit inline, or request changes with a comment.
The agent publishes only items marked `approved` and records the published URL afterward.

Two ways to run it:
- **Local or self-hosted (this folder):** Python 3.10+ standard library only (`http.server` + `sqlite3`), one HTML file. No dependencies.
- **Cloudflare (Pages + Functions + D1):** see [`/cloudflare`](../../cloudflare) and [`AGENT_SETUP.md`](../../AGENT_SETUP.md). Same UI, same API, and your data stays in your own Cloudflare account.

## Run locally
```bash
./run.sh            # creates data/owner_token (chmod 600) if missing, then starts on 127.0.0.1:8787
```
Open `http://127.0.0.1:8787/` and enter the passcode from `data/owner_token`.

Env: `AIOS_PORT` (8787) · `AIOS_HOST` (127.0.0.1) · `AIOS_DB` (data/queue.db) · `AIOS_TOKEN_FILE` (data/owner_token) ·
`AIOS_IMAGE_ROOTS` (colon-separated dirs that images may be served from; default is this folder).

**Security:** the default bind is localhost. To reach it from your phone, use a private network (for example Tailscale) or put it behind TLS. Don't expose plain HTTP to the internet. Logs record request paths only, never tokens.

## Data model: `posts`
`id, slug, account, pillar, scheduled_at (ISO 8601 with offset), text, parts (JSON array for threads), image_path,
status (draft|approved|changes_requested|skipped|posted), owner_comment, operator_note, posted_url, edited_by_owner,
created_at, updated_at, approved_at, posted_at`

Use `pillar` for the module or campaign (for example `content:selling-point-B` or `creator-outreach`) and `operator_note` for the hypothesis being tested.

## API (everything except `/healthz` and `/api/login` requires the session cookie or `Authorization: Bearer <token>`)
| Method | Path | Body |
|---|---|---|
| POST | /api/login | `{"token": "..."}` sets the session cookie |
| GET | /api/posts?status=&due=1 | list (`due=1` returns approved items whose time has passed) |
| GET | /api/posts/{id or slug} | one item |
| POST | /api/posts | create, or upsert by `slug` |
| POST | /api/posts/{id}/update | operator field update |
| POST | /api/posts/{id}/approve · /skip | owner action |
| POST | /api/posts/{id}/request_changes | `{"comment": "..."}` |
| POST | /api/posts/{id}/edit | `{"text": "..."}` or `{"parts": [...]}` (an owner edit approves) |
| POST | /api/posts/{id}/posted | `{"url": "https://..."}` |
| POST | /api/bulk | `{"action": "approve"|"skip", "ids": [..]}` |
| GET | /api/image/{id} | image preview |

## CLI (for agents)
```bash
./cli.py add --slug w1-01 --pillar "content:selling-point-B" --at 2026-11-02T08:30:00-05:00 --text "..."
./cli.py list --status approved
./cli.py due                 # what to publish now
./cli.py posted 3 --url https://example.com/post/123
```
Env: `AIOS_URL` (default http://127.0.0.1:8787), `AIOS_TOKEN_FILE`.

MIT licensed.
