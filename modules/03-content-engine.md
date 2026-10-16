# 03 · Content engine

**Purpose:** produce short videos and posts that sell, and turn every winner into a reusable asset.

## Content that sells answers three questions
1. Why would this spread? 2. Which pain does it hit? 3. What reason to buy does it give, and why *from us*?
If a piece answers none of them, it's an announcement, not an asset.

## The Three-Beat Resonance structure
| Beat | Time | Job | Elements |
|---|---|---|---|
| **A · Stop** | 0–3s (≤6s) | Stop the scroll | Relatable hook, escalating pain, close-up emotion |
| **B · Believe** | ~3–11s | Earn trust fast | Demo, proof (test, comparison, before/after), real scene, credentials, social proof |
| **C · Act** | ~11–15s | Convert | Offer, urgency, explicit instruction |
Rules: every beat is required, in this order. **One selling point per piece.** Shoot in the scene where the product is used. Always include an explicit call to action.

**Seed vs. harvest:** keep a share of content as *seeding* (no hard sell; it builds an aware audience) and a share as *harvesting* (offer-led). Start seeding weeks before any sales event.

## Procedure
1. **Positioning meeting** (agent-prepared). Pick the selling point under test this week and the script framework.
2. **Build and maintain the hook library** (`templates/hook-library.csv`). For every winning piece, ours or a competitor's, log the hook, proof type, scene, CTA, length, and a keyframe path. Write a one-line reason it worked.
3. **Generate variants by combination** (Hook × Proof × CTA). Expand each winner into five types: pain, review/test, comparison, scene, and creator recommendation.
4. **Write production briefs** that specify setting, style, lighting, wardrobe, props, framing, emotion, and pacing. More detail in means better quality out, whether a human or an AI tool produces it.
5. **Queue every piece in Content Review** with its hypothesis in `operator_note` (for example: "Tests selling point B with a pain hook").
6. **Log every published asset** in `templates/asset-log.csv`, good or bad: views, 3-second retention, completion, CTR, orders, and cost.
7. **Selling-point sprint:** validate two selling points per week. Promote the winner to "proven" in `selling-points.csv`.
8. **Remake winners until they stop working.** Change one variable per remake.

## Script frameworks to keep in the library
Context clash · gifting/occasion · review/test · visual wow · pain → agitate → solve · side-by-side comparison · creator recommendation · day-in-the-life · myth vs. fact · unboxing with stakes.

## Decision rules
- 3-second retention is the first gate. If it's weak, fix the hook before anything else.
- Views but no orders → check proof strength (B), then the CTA (C), then offer-page fit.
- A piece with no orders but large reach may be doing seeding work. Judge it by its role.
- Never put several selling points in one 15–20 second piece.
- Learn the craft before you automate it. Automating a structure you don't understand fails.

## Ethics
Disclose sponsorships. Label AI-generated or synthetic people and likenesses as required by platform rules and law. Use a real creator's likeness only with explicit written consent and a revenue agreement.

## Human gate
Every piece is approved, edited, or sent back in Content Review before it's published.

## Agent prompt spec
```
Role: Content Engine Agent (aiOS module 03).
Inputs: offer brief, proven/under-test selling points, hook library, asset log.
For each requested piece output: selling point (exactly one), framework, Beat A/B/C script with timings,
on-screen text, shot list (setting, lighting, framing, emotion), CTA, seeding vs harvesting role, and
hypothesis being tested. When given a winning video, decompose it (hook, product frequency, cut rhythm,
realism, proof type) and propose 5 variants (pain, review, comparison, scene, creator-recommendation).
Submit drafts to the Content Review queue; never publish directly.
```

## Field notes (v2)
- Ask before shooting: why would it spread, which pain does it hit, what reason to buy does it give?
- A selling video = pain hook × product proof × usage scene × call to action; drop one and you get views without sales.
- **Operating Sheets:** `selling-points`, `hook-library`, `content-positioning`, `asset-log`.
