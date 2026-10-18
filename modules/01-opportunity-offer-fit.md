# 01 · Opportunity and offer fit

**Purpose:** decide what to sell, to whom, in which market or channel, and at what price, before you commit inventory or big spend.
**When to run:** for each new product or offer, each new market or audience, and every quarter for the existing line.

## Inputs
- A product photo or description and the business goal (a second growth curve or a profit fix?)
- Target market or audience, plus the team's existing capabilities
- Cost data: unit cost, logistics, platform commission, payment fees, expected refund rate
- Public evidence: competitor listings, reviews, comment threads, bestseller lists from the last 1–2 months (not last year)

## Procedure
1. **Frame the real problem** (module 00 questions). Write `workspace/opportunity/<offer>/brief.md`.
2. **Diagnose the market stage** using CC's three stages (1.0 creator outreach, e.g. Latin America and newly opened EU markets; 2.0 short video + paid, e.g. the US; 3.0 live, private traffic and brand, e.g. Southeast Asia) and how well your capabilities match it. A 4th "owned audience" stage exists in the sheet as an aiOS addition. Record which play and first hire that implies, and the route CC suggests for your background (content-commerce veteran → US + Southeast Asia; marketplace-only → US + newly opened markets; marketplace-validated products → US + Southeast Asia).
2b. **Check supply-chain capability** (lecture entry ladder: stage → demand → supply chain → play → small test). Can you source, make and restock at the needed price, quality and speed? If not, fix that before entering. Start with 1–2 SKUs.
3. **Mine the pain.** Pull reviews and comments from the leading competing offers (aiOS default: at least 100 from the top 5). Cluster the complaints and estimate what customers already pay to solve each one (money, time, failed purchases). Segment by audience.
4. **Enumerate selling points** and grade each one S/A/B/C (`templates/selling-points.csv`). Mark the candidate **core differentiator**.
5. **Score the three axes** in `templates/offer-scorecard.md`: pain value, true cost, and content amplifiability ("can the differentiator be shown convincingly in 20 seconds?").
6. **Price from value.** Estimate consumer surplus (cost of the old solution − your price) and producer surplus (price − full cost). Consider reframing the offer, for example from "improvement" to "solution to an urgent problem."
7. **Run unit economics** with CC's full cost stack (Unit Economics sheet or `tools/unit_economics.py`): unit cost, first/last-mile logistics, warehousing, payout fee (e.g. 6% + $0.30 per order), other platform fees, refund reserve (5%), creator + ads allocation (30%). Running the tool with no arguments reproduces CC's $29.99 example: 56.08% gross, 26.08% company margin.
8. **Classify** the offer as profit product, traffic product, or drop (rules below).
9. **Design the minimum viable test:** small batch size, a 30-day sprint plan, three read-outs, and kill criteria. Fill in `templates/launch-plan.md`, including Plan B and Plan C.
10. Submit the launch plan for owner approval.

## Decision rules
- Value gap ≫ cost → **prioritize** as a profit product (aiOS default: ≥60% gross margin with positive consumer surplus; the lecture gives no number).
- Gross margin around 50–60% with a thin value gap → **traffic product** (lecture). Testable, don't bet heavy, win on efficiency.
- Value < full cost → **drop**. You can't win a price war.
- If the differentiator can't be shown in a short video → downgrade one level, whatever the score (aiOS default).
- Feature stacking that blurs the audience or raises cost without raising value → reject.
- Before committing bulk inventory, you need three independent signals: engagement on test content, creator feedback after trying the product, and real conversions at the target price.
- The plan must survive three consecutive "why?" questions (why this product, why this audience, why you think it will sell).

## Outputs
`brief.md`, `pain-map.md`, `selling-points.csv`, `offer-scorecard.md`, `unit-economics.json`, `launch-plan.md`

## Human gate
The owner approves the launch plan and its budget cap. The agent never orders inventory or signs anything.

## Agent prompt spec
```
Role: Opportunity Analyst (aiOS module 01).
Given: product description/photo, business goal, target market, cost inputs, and public evidence links.
Produce a market-insight brief: who buys and why, the market stage and the play it implies, a pain map from
reviews (with quotes paraphrased, counts, segments), graded selling points, a three-axis scorecard,
value-based price options with consumer and producer surplus, unit economics, a classification
(profit / traffic / drop), and a 30-day minimum viable test with kill criteria, Plan B, and Plan C.
Flag risks: seasonality ending, compliance or certification gaps, regional standards (plugs, sizes, labeling).
Be explicit about uncertainty. Never recommend bulk commitment on fewer than 3 independent signals.
```

## Field notes (v2)
- First batch: ~50–80 units by air; have several creative angles ready before stock lands (problem in context, side-by-side result, product in use, value comparison, creator in their own voice).
- MVT metrics in funnel order: product-card CTR → creator response/output → conversion.
- Back-solve competitors' cost from their price; record every candidate in a selection log.
- Selling an existing product first is a cheap way to prove the channel loop before building your own SKU.
- **Operating Sheets:** `market-stage`, `offer-scorecard`, `unit-economics`, `test-sprint`, `launch-plan` (in-app at `/tools`, or `templates/xlsx/`).
- **Prove the loop with an existing product first.** Before committing to your own SKU, run the account selling a proven product from another brand (affiliate or partner). It teaches you the audience, hooks and creator types at almost no inventory risk. (Test Sprint row "0".)
- Copy only winners from the last 1–2 months; older ones are saturated (Offer Scorecard: recency check).
- Count the **three batches** of cash in motion (selling in the destination warehouse, at sea, in production) against a cap; this is CC's argument against blind stocking (Offer Scorecard: three batch columns → cash exposure).
- Non-physical offers: switch **Offer type** in the Operating Sheets header; cost, logistics and sample columns relabel to delivery cost, onboarding and free trials.
