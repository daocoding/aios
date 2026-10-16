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
2. **Diagnose the market stage** (1 creator-led, 2 content + paid, 3 live/community/brand, 4 relationship assets) and how well your capabilities match it. Record which play and which first hire that implies.
3. **Mine the pain.** Pull at least 100 reviews and comments from the top 5 competing offers. Cluster the complaints and estimate what customers already pay to solve each one (money, time, failed purchases). Segment by audience.
4. **Enumerate selling points** and grade each one S/A/B/C (`templates/selling-points.csv`). Mark the candidate **core differentiator**.
5. **Score the three axes** in `templates/offer-scorecard.md`: pain value, true cost, and content amplifiability ("can the differentiator be shown convincingly in 20 seconds?").
6. **Price from value.** Estimate consumer surplus (cost of the old solution − your price) and producer surplus (price − full cost). Consider reframing the offer, for example from "improvement" to "solution to an urgent problem."
7. **Run unit economics** with `tools/unit_economics.py`. Reserve a marketing budget (default 30%).
8. **Classify** the offer as profit product, traffic product, or drop (rules below).
9. **Design the minimum viable test:** small batch size, a 30-day sprint plan, three read-outs, and kill criteria. Fill in `templates/launch-plan.md`, including Plan B and Plan C.
10. Submit the launch plan for owner approval.

## Decision rules
- Value gap ≫ cost → **prioritize** as a profit product.
- Gross margin around 50–60% with a thin value gap → **traffic product**. Good for testing, but not the profit engine.
- Value < full cost → **drop**. You can't win a price war.
- If the differentiator can't be shown in a short video → downgrade one level, whatever the score.
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
