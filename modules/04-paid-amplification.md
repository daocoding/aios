# 04 · Paid amplification

**Purpose:** put money behind assets that are already proven, with rules that change by growth stage.
**Core belief:** when campaigns are automated, your only levers are the target and the budget. Results are decided by **offer + creative**. Bad ad results are almost always a creative problem.

## Before you spend (gate)
- The offer has passed module 01 (positive value gap).
- At least one creative follows Stop → Believe → Act, carries a validated selling point, and shows organic or creator traction.

## Stage playbook
| Stage | Goal | Rules |
|---|---|---|
| **0→1 Validate** | Close the loop and let the algorithm learn who buys | Set the target slightly below break-even to reach about **50 conversions**. Don't judge the project on early ROI. A target set too high starves delivery. |
| **1→10 Replicate** | Turn lucky hits into repeatable ones | Build a creative matrix (rule of thumb: about 2 live creatives per daily order targeted). Concentrate budget on high converters. Keep seeding creatives running, because killing them drops volume the next day. |
| **10→100 Scale** | Many offers, markets, and teams | Run paid media as a shared service across products. Every new creative test is a search for more "hero" creatives, because scale = the number of heroes. |

## Diagnosis order when ROI is below break-even
1. **Target setting**: too high (no delivery) or too low (unprofitable)?
2. **Creative activation rate**: how many creatives actually get spend?
3. **Creative quality**: hook retention, proof, CTA. Triage each creative:
   - **P0**: fix now (usually the opening seconds)
   - **P1**: watch
   - **P2**: leave alone
4. **Conversion path**: product page, price, reviews, offer.
Pause chronic losers quickly. Remake heroes with one change at a time.

## Outputs
`workspace/paid/<date>-diagnosis.md`: stage, findings in diagnosis order, a P0/P1/P2 table, and recommended changes with expected effect and budget delta.

## Human gate
Any budget increase or new campaign above the owner's threshold, and any change to the target ROI.

## Agent prompt spec
```
Role: Paid Amplification Analyst (aiOS module 04).
Input: campaign export (CSV), break-even ROI, stage (0→1, 1→10, 10→100), budget cap.
1) Restate the stage and what "good" means in that stage. 2) Diagnose strictly in order: target → activation →
creative quality → conversion path. 3) Triage every creative P0/P1/P2 with one-line reasons. 4) Recommend
at most 3 changes, each single-variable, with expected effect and a check date. 5) Identify seeding creatives
that must not be paused. Never change live campaigns yourself; output recommendations for owner approval.
```

## Field notes (v2)
- Compute break-even ROI before judging any campaign; a target above break-even starves delivery.
- Check creative activation: if only a small share of uploaded creatives deliver, fix homogeneity/rejections before adding more.
- On a spike, identify its source (product, creative, price, creator, event) and replicate that same day.
- 10→100: profit model first; run sales events as warm-up → peak → encore.
- **Operating Sheet:** `ad-diagnosis` (KPIs: blended ROAS, conversions toward 50).
- The `ad-diagnosis` sheet is stage-aware: in 0→1, a creative below break-even with fewer than ~50 conversions reads **"Learning - hold until ~50 conversions"**, not P0.
