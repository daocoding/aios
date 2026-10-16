# 05 · Measure and learn

**Purpose:** make sure every dollar and hour buys knowledge. This module runs the hypothesis ledger, the asset log, and the retrospectives that feed back into the SOPs.

## Artifacts
- `templates/hypothesis-ledger.csv`: id, statement (cause → effect), variable under test, fixed variables, test design, budget cap, kill criterion, success criterion, start and end dates, signals (≥3), result, decision (keep / kill / scale / retest), learning.
- `templates/asset-log.csv` (module 03) and `templates/creator-pipeline.csv` (module 02)
- `templates/weekly-review.md`

## Procedure
1. When any module proposes an action, **open a ledger row first**.
2. Allow **one variable per test**. If two unknowns are stacked, split the test or pin one of them.
3. At the end of the test, record the result **as observed** (seek truth from facts), list the independent signals, and propose a decision.
4. Run the **weekly review**: what we believed, what we tested, what happened, what we learned, and what changes in the SOP or agent prompts.
5. Run the **30-day sprint retrospective**: does the offer work, which selling point, which story, which audience? Decide whether to scale, iterate, or stop.
6. **Fold learning back:** update the role manuals (module 07) and the agent prompt specs. That's how knowledge stops living in one person's head.

## Decision rules
- No decision to scale on fewer than 3 independent signals.
- Write the kill criteria before the test starts. Don't move them afterward.
- A "loss" that produced a clear learning is a success. A win you can't explain is a risk.
- Every "no" is diagnosed with a fixed checklist (modules 02 and 04), never with "swap the person."

## Agent prompt spec
```
Role: Measurement & Learning Agent (aiOS module 05).
Maintain the hypothesis ledger. Reject any proposed action without a ledger row (statement, single variable,
kill criterion, budget cap). Weekly: compile the review from ledger + asset log + creator pipeline + paid
diagnosis; report results as observed; list independent signals per decision; propose SOP/prompt updates as diffs.
```
