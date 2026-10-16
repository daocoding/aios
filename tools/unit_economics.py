#!/usr/bin/env python3
"""aiOS unit economics: work backwards from price to margin, then classify the offer (module 01).
Usage: python3 tools/unit_economics.py --price 39.99 --unit-cost 6 --logistics 7 --platform-fee-pct 6 \
          --payment-fee-pct 3 --refund-pct 5 --marketing-pct 30 [--old-solution-cost 120] [--json]"""
import argparse, json
a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
for k, d in (("price", None), ("unit-cost", None), ("logistics", 0.0), ("platform-fee-pct", 6.0), ("payment-fee-pct", 3.0),
             ("refund-pct", 5.0), ("marketing-pct", 30.0), ("other-cost", 0.0), ("old-solution-cost", None)):
    a.add_argument("--" + k, type=float, default=d, required=d is None and k in ("price", "unit-cost"))
a.add_argument("--json", action="store_true")
x = a.parse_args()
p = x.price
fees = p * (x.platform_fee_pct + x.payment_fee_pct) / 100
refunds = p * x.refund_pct / 100
direct = x.unit_cost + x.logistics + x.other_cost
contribution = p - direct - fees - refunds
gm_pct = 100 * contribution / p
marketing = p * x.marketing_pct / 100
operating = contribution - marketing
r = {"price": p, "direct_cost": round(direct, 2), "fees": round(fees, 2), "refund_reserve": round(refunds, 2),
     "contribution": round(contribution, 2), "gross_margin_pct": round(gm_pct, 1),
     "marketing_reserve": round(marketing, 2), "operating_margin": round(operating, 2),
     "operating_margin_pct": round(100 * operating / p, 1),
     "producer_surplus": round(contribution, 2)}
if x.old_solution_cost is not None:
    r["consumer_surplus"] = round(x.old_solution_cost - p, 2)
if operating <= 0 or contribution <= 0:
    r["classification"] = "drop: no room to survive marketing or a price war"
elif gm_pct >= 65 and r.get("consumer_surplus", 1) > 0:
    r["classification"] = "profit product: prioritize (room for creators, ads, and tests)"
elif gm_pct >= 50:
    r["classification"] = "traffic product: testable, but not the profit engine"
else:
    r["classification"] = "thin: only proceed with a clear path to higher value or lower cost"
if a.parse_args().json: print(json.dumps(r, indent=2))
else:
    for k, v in r.items(): print(f"{k:>22}: {v}")
