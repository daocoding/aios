# AGENT_SETUP.md: instructions for an AI agent

You are an agent setting up **aiOS Grok Edition** for your owner (the human you work for). Follow these steps in order.
Ask the owner only where this file says **ASK**. Don't skip the human gates.

> aiOS has a home and hosted version at **https://aios.pages.dev**. The recommended setup is to **self-host on the owner's own Cloudflare account**, so their queue and data live in their own account. Anything private (passcodes, API tokens) is created and stored only in the owner's account or secret store, never in this repo.

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
git clone https://github.com/daocoding/aios.git && cd aios
mkdir -p workspace/{opportunity,paid,reviews}
cp templates/*.csv workspace/
```

## 3. Deploy the approval gate

### Option A: owner's Cloudflare account (recommended)
Prereqs: Node 18+, and a Cloudflare account. **ASK** the owner to sign up at https://dash.cloudflare.com/sign-up if they don't have one, then to run `npx wrangler login` themselves (or create a scoped API token with *Pages: Edit* and *D1: Edit* permissions and put it in your secret store as `CLOUDFLARE_API_TOKEN`).

```bash
cd cloudflare
PROJECT=aios-review-<shortname>                  # unique per owner
npx wrangler d1 create aios-review              # copy the database_id it prints
# put database_id into wrangler.toml (keep that edit local; don't commit it to a public fork)
npx wrangler d1 execute aios-review --remote --file=schema.sql
npx wrangler pages project create $PROJECT --production-branch main
python3 -c 'import secrets;print(secrets.token_urlsafe(24))' | npx wrangler pages secret put OWNER_TOKEN --project-name $PROJECT
npx wrangler pages deploy public --project-name $PROJECT --branch main
```
Verify:
```bash
curl -s https://$PROJECT.pages.dev/api/healthz          # {"ok":true}
curl -s https://$PROJECT.pages.dev/api/posts            # {"error":"unauthorized"}
```
Give the owner the URL, and give them the passcode through a private channel only (the secret-put step above printed nothing; generate it into your secret store first if you need to hand it over). Optionally add a custom domain in the Pages dashboard, and put Cloudflare Access in front of the site for SSO.

Images: upload them to an R2 bucket with a public URL (or any https host) and set `image_path` to that URL.

### Option B: local or private machine
```bash
cd apps/content-review && ./run.sh     # creates data/owner_token, serves on 127.0.0.1:8787
```
To reach it from the owner's phone, use a private network (for example Tailscale) and set `AIOS_HOST` to the private interface. Don't expose plain HTTP publicly.

## 4. Talk to the queue (both options use the same API)
```bash
export AIOS_URL=https://$PROJECT.pages.dev     # or http://127.0.0.1:8787
export AIOS_TOKEN_FILE=~/.secrets/aios_owner_token   # chmod 600
python3 apps/content-review/cli.py add --slug c-001 --pillar "content:selling-point-B" \
  --at 2026-11-02T08:30:00-05:00 --text "Draft script or post..."
python3 apps/content-review/cli.py due        # approved items whose time has come
python3 apps/content-review/cli.py posted c-001 --url https://...
```
Conventions: `pillar` = module or campaign, `operator_note` = the hypothesis ID and what's being tested, `slug` = a stable ID (upsert-safe).
Publish **only** items with `status=approved`. Re-read `owner_comment` on `changes_requested`, revise, and set the status back to `draft`.

## 4b. Operating Sheets (numbers live here)
The app serves `/tools`: 15 spreadsheets defined in `static/tools.json` (formula columns compute in the browser; data saves per user).
- `GET /api/me` → current user · `GET /api/sheets` → list · `GET /api/sheets/<tool>` → rows · `PUT /api/sheets/<tool>` with a JSON array of row objects (max 5000) → save.
- Same bearer token/passcode as the queue. Multiple users: put `name:passcode` lines in the token file (Option B) or in the `OWNER_TOKEN` secret, comma- or newline-separated (Option A). Sheets are private per user; the review queue is shared.
- Offline/Excel: `templates/xlsx/<tool>.xlsx` or the combined `templates/aios-operating-sheets.xlsx`. The UI imports and exports CSV/XLSX.
Each module names the sheet it fills. Write results there, not in chat.

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
- Cookie login fails locally over http: the Cloudflare version sets `Secure` cookies, so use the https `*.pages.dev` URL.
