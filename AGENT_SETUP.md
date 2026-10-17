# AGENT_SETUP.md: instructions for an AI agent

You are an agent setting up **aiOS Grok Edition** for your owner (the human you work for). Follow these steps in order.
Ask the owner only where this file says **ASK**. Don't skip the human gates.

> The hosted version of aiOS is **URL TBD** (the single place to set it is `site/aios.config.json` → `hosted_url`). The recommended setup is to **self-host on the owner's own Cloudflare account**, so their queue and data live in their own account. Anything private (passcodes, API tokens) is created and stored only in the owner's account or secret store, never in this repo.

## 0. Ground rules
- Read `modules/00-operating-principles.md` and `docs/METHODOLOGY.md` before anything else.
- You **recommend**, and the owner **decides**. Anything that will be published, messaged, or paid for goes into the Content Review queue first.
- Never commit secrets. Never expose the owner's passcode in chat logs, URLs, or files outside a secret store.
- Follow platform rules and the law: disclose sponsorships, label AI-generated media, respect messaging opt-outs.

## 1. Intake (ASK the owner, in one message)
1. What do you sell, and to whom? (offer, price range, audience segments)
2. Which channels and regions? (for example TikTok US, Instagram, YouTube Shorts)
3. Business goal: a new growth curve, or fixing profit?
4. Budget caps: samples, content, paid, and the threshold above which you must approve spend
5. Where should the approval page live? (a) their own Cloudflare account (recommended) (b) a local or private machine
Write the answers to `workspace/intake.md`.

## 2. Create the workspace
```bash
# Until PR #1 is merged, the code lives on the aios-grok-edition branch (main has only a README).
git clone -b aios-grok-edition https://github.com/daocoding/aios.git && cd aios
mkdir -p workspace/{opportunity,paid,reviews}
```
**Numbers live in the Operating Sheets** (§4b). The CSV/XLSX files in `templates/` are for owners who work offline; don't keep a second copy in `workspace/`.

## 3. Deploy the approval gate

### Option A: owner's Cloudflare account (recommended)
**Prereqs**
- **Node 22+** (current wrangler 4 refuses older Node). On Node 18/20, use `npx wrangler@3` in every command below.
- A Cloudflare account. **ASK** the owner to sign up at https://dash.cloudflare.com/sign-up if needed.
- Headless agents can't run `wrangler login` (it opens a browser). **ASK** the owner to create an API token (My Profile → API Tokens → Create Custom Token) with **Account · Cloudflare Pages: Edit**, **Account · D1: Edit**, **Account · Account Settings: Read** (lets wrangler resolve the account), and, if you'll host images, **Account · Workers R2 Storage: Edit**. Store it in your secret store and export it with the account ID (dashboard → any domain/Workers page → Account ID):
```bash
export CLOUDFLARE_API_TOKEN="$(cat ~/.secrets/cf_api_token)"   # never echo it
export CLOUDFLARE_ACCOUNT_ID=<owner account id>
```

**1. Generate the passcode into your secret store first** (you'll need to hand it to the owner privately):
```bash
mkdir -p ~/.secrets && (umask 077; python3 -c 'import secrets;print(secrets.token_urlsafe(24))' > ~/.secrets/aios_owner_token)
# multi-user: put "owner:<pass>,ann:<pass2>" in the file instead (name:passcode, comma-separated)
```

**2. Create D1 and a git-ignored deploy dir**
```bash
cd cloudflare
PROJECT=aios-review-<shortname>                # unique per owner; this becomes https://$PROJECT.pages.dev
npx wrangler d1 create aios-review             # prints a database_id
bash prepare-deploy.sh <database_id> $PROJECT  # runs sync.sh, writes cloudflare/.deploy/ with your id (git-ignored)
cd .deploy
npx wrangler d1 execute aios-review --remote --file=schema.sql
```
Wrangler Pages does not accept a custom config path (`-c`), so the committed `wrangler.toml` keeps its placeholder and your real id lives only in `.deploy/`. Rerun `prepare-deploy.sh` after pulling changes or editing `apps/content-review/static/` (it calls `sync.sh`, which copies the UI into `public/` and regenerates `lib/spec.js`).

**3. Smoke-test locally before deploying** (inside `cloudflare/.deploy`)
```bash
npx wrangler d1 execute aios-review --local --file=schema.sql
printf 'OWNER_TOKEN="%s"\n' "$(cat ~/.secrets/aios_owner_token)" > .dev.vars   # stays in the git-ignored dir
npx wrangler pages dev public --port 8788 > /tmp/aios-dev.log 2>&1 &          # do NOT add --d1 (that creates a second, empty DB)
sleep 10; curl -s localhost:8788/api/healthz                                   # {"ok":true}
PASS=$(cut -d, -f1 ~/.secrets/aios_owner_token); PASS=${PASS#*:}
curl -s -H "Authorization: Bearer $PASS" localhost:8788/api/me                # {"user":"…"}
curl -s -H "Authorization: Bearer $PASS" localhost:8788/api/sheets/unit-economics   # {"rows":[],…}
kill %1
```

**4. Deploy** (inside `cloudflare/.deploy`)
```bash
npx wrangler pages project create $PROJECT --production-branch main
npx wrangler pages secret put OWNER_TOKEN --project-name $PROJECT < ~/.secrets/aios_owner_token
npx wrangler pages deploy public --project-name $PROJECT --branch main
curl -s https://$PROJECT.pages.dev/api/healthz      # {"ok":true}
curl -s https://$PROJECT.pages.dev/api/posts        # {"error":"unauthorized"}
```
Give the owner the URL, and the passcode through a private channel only. Login is rate-limited (5 failures per IP per 10 minutes), but for anything beyond a solo owner, **put Cloudflare Access (Zero Trust → Access → Applications) in front of the site** so login is SSO and the passcode is a second factor.

**Images (optional, R2):**
```bash
npx wrangler r2 bucket create aios-media
npx wrangler r2 object put aios-media/c-001.jpg --file ./c-001.jpg --remote
```
Then enable a public URL for the bucket (dashboard → R2 → aios-media → Settings → Public access / custom domain) and set `image_path` to `https://<public-host>/c-001.jpg`. Any other https host works too.

### Option B: local or private machine
```bash
cd apps/content-review && ./run.sh     # creates data/owner_token, serves on 127.0.0.1:8787
```
To reach it from the owner's phone, use a private network (for example Tailscale) and set `AIOS_HOST` to the private interface. Don't expose plain HTTP publicly.

## 4. Talk to the queue (both options use the same API)
```bash
export AIOS_URL=https://$PROJECT.pages.dev            # Option B: http://127.0.0.1:8787
export AIOS_TOKEN_FILE=~/.secrets/aios_owner_token    # Option B: apps/content-review/data/owner_token
python3 apps/content-review/cli.py add --slug c-001 --pillar "content:selling-point-B" \
  --at 2026-11-02T08:30:00-05:00 --text "Draft script or post..."
python3 apps/content-review/cli.py due        # approved items whose time has come
python3 apps/content-review/cli.py posted c-001 --url https://...
```
The CLI reads the first line of the token file (for `name:passcode` lines it uses the passcode), or `AIOS_TOKEN` if set.
Conventions: `pillar` = module or campaign, `operator_note` = the hypothesis ID and what's being tested, `slug` = a stable ID (upsert-safe).
Publish **only** items with `status=approved`. Re-read `owner_comment` on `changes_requested`, revise, and set the status back to `draft`.

## 4b. Operating Sheets (numbers live here)
The app serves `/tools`: 16 spreadsheets defined in `tools.json`. Discover tool ids and column keys at the unauthenticated **`GET /tools.json`** (or `cli.py sheet tools`). Formulas are evaluated **on the server** too, so you can read the decisions (verdicts, priorities, KPIs).
```bash
python3 apps/content-review/cli.py sheet get unit-economics          # rows + computed + kpis
python3 apps/content-review/cli.py sheet put unit-economics rows.json --base <updated_at from get>
```
Multiple users: `name:passcode` lines in the token file (Option B) or in `OWNER_TOKEN`, comma/newline-separated (Option A). Sheets and settings are per user; the review queue is shared. Offline/Excel: `templates/xlsx/<tool>.xlsx` or `templates/aios-operating-sheets.xlsx` (the UI imports either; it picks the matching tab).
Each module names the sheet it fills. Write results there, not in chat.

### API reference (both servers; `Authorization: Bearer <passcode>` unless noted)
| Method & path | Body | Returns / notes |
|---|---|---|
| `GET /healthz` (Python) · `GET /api/healthz` (Cloudflare) | none | `{"ok":true}`, no auth |
| `GET /tools.json` | none | sheet spec (tool ids, columns, formulas), no auth |
| `POST /api/login` | `{"token":"<passcode>"}` | sets session cookie; 401 wrong; **429** after 5 failures/IP/10 min |
| `GET /api/me` | none | `{"user":"<name>"}` |
| `GET /api/settings` · `PUT /api/settings` | `{"currency":"€","offer_type":"digital"}` | per-user; offer_type ∈ physical, digital, service, local (relabels cost/logistics/sample columns) |
| `GET /api/sheets` | none | `[{"tool","updated_at","n"}]` |
| `GET /api/sheets/<tool>` | none | `{"tool","rows","updated_at","computed":[…],"kpis":[…]}`; `?raw=1` omits computed; unknown tool → 404 |
| `PUT /api/sheets/<tool>` | a JSON **array of row objects**, or `{"rows":[…],"base_updated_at":"…"}` (or header `If-Match: <updated_at>`) | `{"ok":true,"updated_at","n"}`; replaces all rows; formula/unknown keys are dropped; 400 bad body; 404 unknown tool; **409** if `base_updated_at` is stale (reload, merge, retry) |
| `GET /api/posts[?status=…][&due=1]` | none | list of posts |
| `GET /api/posts/<id or slug>` | none | one post |
| `POST /api/posts` | `{"slug","account","pillar","scheduled_at","text","parts","image_path","status","operator_note"}` | upsert by slug |
| `POST /api/posts/<id>/update` | editable fields | agent edits a draft |
| `POST /api/posts/<id>/<action>` | action ∈ `approve`, `skip`, `request_changes` (`{"comment"}`), `edit` (`{"text","parts","approve"}`), `posted` (`{"url"}`) | owner actions (agents use only `posted`) |
| `POST /api/bulk` | `{"action":"approve"\|"skip","ids":[…]}` | owner bulk action |

## 5. Run the modules
1. `01` opportunity and offer fit → submit `launch-plan.md` for approval
2. `05` open the hypothesis ledger rows for the 30-day sprint
3. `02` creator waves + `03` content engine (drafts → queue)
4. `04` paid diagnosis once you have proven assets
5. `06` schedule the cadence (daily approval pass, Mon positioning, Tue/Thu paid, Wed creators, Fri review, day-30 retrospective)
6. `07` write a role manual for every recurring job you perform
7. `08` set up owned-channel capture

Each module file ends with an **Agent prompt spec**. Use it as your system prompt when running that module, or hand it to a sub-agent.

## 6. Report to the owner (template)
> aiOS is set up. Approval page: <url> (passcode sent privately). This week: <2 selling points under test>, <N> creator messages drafted for your approval, <N> content drafts in the queue. Decisions needed from you: <list>.

## Troubleshooting
- `401 unauthorized`: wrong token, or the `OWNER_TOKEN` secret isn't set on the Pages project (redeploy after setting it).
- `D1_ERROR no such table`: run the `schema.sql` execute step with `--remote`.
- Cookie login fails locally over http: the Cloudflare version sets `Secure` cookies; use bearer tokens locally, or the https `*.pages.dev` URL.
- `no such table` under `pages dev`: you passed `--d1`, or skipped the `--local` schema step; run it inside `cloudflare/.deploy`.
- `Pages does not support custom paths for the Wrangler configuration file`: don't use `-c`; run commands inside `cloudflare/.deploy` (see `prepare-deploy.sh`).
- `wrangler requires Node 22`: upgrade Node, or use `npx wrangler@3`.
- `409 conflict` on a sheet save: someone (the owner's browser or another agent) saved first. GET, merge your change, PUT again with the new `updated_at`.
- `429` on login: too many wrong passcodes from this IP; wait 10 minutes.
