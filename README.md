# aiOS Grok Edition

**An open, agent-runnable operating system for businesses that grow through the creator economy.**
Your agents do the research, drafting, and analysis. You make the decisions. Every decision gets tested before it gets scaled.

🌐 Hosted version: URL TBD (set once in [`site/aios.config.json`](site/aios.config.json)) · 🧠 Methodology: [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) · 🤖 Agent setup: [`AGENT_SETUP.md`](AGENT_SETUP.md)

---

## Why aiOS
Most creator-led businesses don't fail from lack of effort. They fail because the effort was never *verified*. They copy last year's winners, send hundreds of creator messages that nobody reads, re-edit videos that had the wrong hook, and kill ad campaigns at the wrong stage.

aiOS replaces "I think" with "I verified":

> **Real problem → Key hypotheses → Minimum test → Scaled replication**

and then hands each repeatable step to an agent, with a human approval gate before anything goes public.

## Who it's for
Any business that sells through creators, influencers, and short-form content: consumer products, apps, courses, services, local businesses, and personal brands, on any platform (TikTok, Instagram, YouTube Shorts, X, and newer ones).

## What's inside
| Path | What it is |
|---|---|
| [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) | The theory: the Verified Growth Method (principles, the six traps, frameworks, decision rules, loops) |
| [`docs/LECTURE-EVIDENCE.md`](docs/LECTURE-EVIDENCE.md) | The practitioner layer: lecture numbers, cases and decision rules with timestamps (what is lecture vs. aiOS default is listed in METHODOLOGY §10) |
| [`modules/`](modules/) | Nine agent-runnable playbooks, each with procedure, decision rules, outputs, a human gate, and a pasteable agent prompt |
| [`templates/`](templates/) | Hypothesis ledger, offer scorecard, launch plan, outreach, creator brief, hook library, asset log, creator pipeline, weekly review, role manual |
| [`tools/unit_economics.py`](tools/unit_economics.py) | Price → margin → "profit product / traffic product / drop" classifier |
| **Operating Sheets** (`/tools` in the app) | 16 live spreadsheets with formulas, saved per user, CSV/XLSX import and export: owner self-check, market stage, offer scorecard, unit economics, selling points, hook library, content positioning, asset log, creator pipeline, ad diagnosis, scale ceiling test, hypothesis ledger, test sprint, launch plan, weekly review, role KPIs |
| [`templates/xlsx/`](templates/xlsx/) · [`templates/aios-operating-sheets.xlsx`](templates/aios-operating-sheets.xlsx) | The same 16 sheets as Excel workbooks (formulas, dropdowns, sample rows); rebuild with `tools/build_xlsx.py` |
| [`apps/content-review/`](apps/content-review/) | The human approval gate: full-width rows, select all, bulk approve. Python stdlib + SQLite, no dependencies |
| [`cloudflare/`](cloudflare/) | The same approval app for Cloudflare Pages + Functions + D1, so it runs on *your* account |
| [`site/`](site/) | The landing site (static); its hosted URL is TBD and configured in `site/aios.config.json` |

### The modules
`00` Operating principles · `01` Opportunity & offer fit · `02` Creator partnerships · `03` Content engine · `04` Paid amplification · `05` Measure & learn · `06` Operating cadence · `07` AI-native team · `08` Channel flywheel

## Get the code
Until PR #1 is merged, the code lives on the `aios-grok-edition` branch (`main` has only a README):
```bash
git clone -b aios-grok-edition https://github.com/daocoding/aios.git
```

## Quick start (human)
1. Read [`modules/00-operating-principles.md`](modules/00-operating-principles.md). It takes five minutes.
2. Give your agent this repo and say: *"Set up aiOS for my business by following AGENT_SETUP.md."*
3. Answer its intake questions (offer, audience, channels, budget caps).
4. In **Operating Sheets**, follow the *Start here: 30-day path* in the sidebar (day 1: Owner Self-Check + Unit Economics; days 1–3: Offer Scorecard + Launch Plan; week 1: Selling Points + Creator Pipeline; weeks 2–4: Asset Log + Ad Diagnosis; when scaling: Scale Ceiling; weekly: Hypothesis Ledger + Weekly Review). You don't need all 16 sheets on day one.
5. Each day, open your Content Review page and approve, edit, or send back what your agents drafted. Keep the numbers in **Operating Sheets** (link in the header).

## Quick start (agent)
Read [`AGENT_SETUP.md`](AGENT_SETUP.md). It's written for you.

## Tests
```bash
python3 -m unittest discover -s tests          # Python app + formula engine (stdlib only; parity check needs node)
cd tests && npm install && npm test             # Cloudflare function against an in-memory D1 shim
```

## Principles we won't compromise
- **Humans decide, and agents execute.** Nothing is published, sent, or paid for without owner approval.
- **Your data stays in your account.** Self-host the approval app on your own Cloudflare account or machine.
- **Honest marketing.** Disclose sponsorships and AI-generated content. Use real people's likeness only with consent.

## About
aiOS Grok Edition is built in the open by a small US team that builds products and people. The methodology is our own synthesis of practitioner lessons from creator-commerce operators, generalized beyond any single platform or market.

MIT licensed. Contributions welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md).
