# aiOS Grok Edition

**An open, agent-runnable operating system for businesses that grow through the creator economy.**
Your agents do the research, drafting, and analysis. You make the decisions. Every decision gets tested before it gets scaled.

🌐 Home and hosted version: **https://aios.pages.dev** · 🧠 Methodology: [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) · 🤖 Agent setup: [`AGENT_SETUP.md`](AGENT_SETUP.md)

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
| [`modules/`](modules/) | Nine agent-runnable playbooks, each with procedure, decision rules, outputs, a human gate, and a pasteable agent prompt |
| [`templates/`](templates/) | Hypothesis ledger, offer scorecard, launch plan, outreach, creator brief, hook library, asset log, creator pipeline, weekly review, role manual |
| [`tools/unit_economics.py`](tools/unit_economics.py) | Price → margin → "profit product / traffic product / drop" classifier |
| [`apps/content-review/`](apps/content-review/) | The human approval gate: full-width rows, select all, bulk approve. Python stdlib + SQLite, no dependencies |
| [`cloudflare/`](cloudflare/) | The same approval app for Cloudflare Pages + Functions + D1, so it runs on *your* account |
| [`site/`](site/) | The aios.pages.dev landing site (static) |

### The modules
`00` Operating principles · `01` Opportunity & offer fit · `02` Creator partnerships · `03` Content engine · `04` Paid amplification · `05` Measure & learn · `06` Operating cadence · `07` AI-native team · `08` Channel flywheel

## Quick start (human)
1. Read [`modules/00-operating-principles.md`](modules/00-operating-principles.md). It takes five minutes.
2. Give your agent this repo and say: *"Set up aiOS for my business by following AGENT_SETUP.md."*
3. Answer its intake questions (offer, audience, channels, budget caps).
4. Each day, open your Content Review page and approve, edit, or send back what your agents drafted.

## Quick start (agent)
Read [`AGENT_SETUP.md`](AGENT_SETUP.md). It's written for you.

## Principles we won't compromise
- **Humans decide, and agents execute.** Nothing is published, sent, or paid for without owner approval.
- **Your data stays in your account.** Self-host the approval app on your own Cloudflare account or machine.
- **Honest marketing.** Disclose sponsorships and AI-generated content. Use real people's likeness only with consent.

## About
aiOS Grok Edition is built in the open by **G8** (Group of 8), a small team in the US that builds products and people. The methodology is our own synthesis of practitioner lessons from creator-commerce operators, generalized beyond any single platform or market.

MIT licensed. Contributions welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md).
