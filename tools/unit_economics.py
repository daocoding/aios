#!/usr/bin/env python3
"""aiOS unit economics: CC's true-total-cost stack, worked backwards from price (module 01).

profit = price − (unit cost + first/last-mile logistics + warehousing + payout/platform fees + refunds + creators/ads)
  landed share   = (unit cost + logistics + warehousing) / price
  fee share      = (price × payout% + payout fixed) / price + other platform %
  gross margin   = 1 − landed share − fee share − refund reserve      (max room for creators + ads)
  company margin = gross margin − creator commission/ads allocation

Defaults reproduce CC's worked example (lecture slide): price $29.99, unit cost ≈$3.572 (shown as $3.57),
logistics $6.00, payout 6% + $0.30 (= 7.00% of price), refunds 5%, creators+ads 30%, FX 7
→ 31.92% landed, 38.92% fixed, 56.08% gross, 26.08% company margin, 54.76 in home currency.

Usage: python3 tools/unit_economics.py                       # CC's example
       python3 tools/unit_economics.py --price 49.99 --unit-cost 8 --logistics 5 --warehousing 1 [--json]
The 60% "profit product" cut-off is an aiOS default; CC only says ≈50–60% gross margin = traffic product."""
import argparse, json

def compute(price, unit_cost, logistics=0.0, warehousing=0.0, payout_pct=6.0, payout_fixed=0.30, platform_pct=0.0,
            refund_pct=5.0, marketing_pct=30.0, fx=None, old_solution_cost=None):
    p = price
    payout_fee = p * payout_pct / 100 + payout_fixed
    landed = (unit_cost + logistics + warehousing) / p
    fee = payout_fee / p + platform_pct / 100
    fixed = landed + fee
    gm = 1 - fixed - refund_pct / 100
    company = gm - marketing_pct / 100
    r = {"price": p, "payout_fee": round(payout_fee, 2), "landed_share_pct": round(100 * landed, 2),
         "fee_share_pct": round(100 * fee, 2), "fixed_share_pct": round(100 * fixed, 2),
         "gross_margin_pct": round(100 * gm, 2), "contribution": round(p * gm, 2),
         "company_margin_pct": round(100 * company, 2), "company_margin": round(p * company, 2),
         "breakeven_roas": round(1 / gm, 2) if gm > 0 else None}
    if fx: r["company_margin_home"] = round(p * company * fx, 2)
    if old_solution_cost is not None: r["consumer_surplus"] = round(old_solution_cost - p, 2)
    if company <= 0 or gm <= 0: r["classification"] = "drop: no room to survive marketing or a price war"
    elif gm >= 0.60 and r.get("consumer_surplus", 1) > 0: r["classification"] = "profit product (aiOS default ≥60%): prioritize"
    elif gm >= 0.50: r["classification"] = "traffic product (CC: ≈50–60%): testable, thin margin, win on efficiency"
    else: r["classification"] = "thin: only proceed with a clear path to higher value or lower cost"
    return r

if __name__ == "__main__":
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for k, d in (("price", 29.99), ("unit-cost", 3.5718), ("logistics", 6.0), ("warehousing", 0.0), ("payout-pct", 6.0),
                 ("payout-fixed", 0.30), ("platform-pct", 0.0), ("refund-pct", 5.0), ("marketing-pct", 30.0),
                 ("fx", None), ("old-solution-cost", None)):
        a.add_argument("--" + k, type=float, default=d)
    a.add_argument("--json", action="store_true")
    x = a.parse_args()
    fx = x.fx if x.fx is not None else (7.0 if (x.price, x.unit_cost) == (29.99, 3.5718) else None)
    r = compute(x.price, x.unit_cost, x.logistics, x.warehousing, x.payout_pct, x.payout_fixed, x.platform_pct,
                x.refund_pct, x.marketing_pct, fx, x.old_solution_cost)
    if x.json: print(json.dumps(r, indent=2))
    else:
        for k, v in r.items(): print(f"{k:>22}: {v}")
