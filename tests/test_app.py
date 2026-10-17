"""End-to-end tests for the Python app (stdlib only): python3 -m unittest discover -s tests"""
import json, os, socket, subprocess, sys, tempfile, time, unittest, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "apps", "content-review")
sys.path.insert(0, APP)
import sheets_engine as E

# CC's worked example from the lecture's true-total-cost slide (unit cost shown there as $3.57).
CC_EXAMPLE = {"offer": "cc", "price": 29.99, "unit_cost": 3.5718, "logistics": 6, "warehousing": 0, "payout_pct": 0.06,
              "payout_fixed": 0.3, "platform_pct": 0, "refund_pct": 0.05, "marketing_pct": 0.3, "fx": 7}

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

class AppTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(); tf = os.path.join(cls.tmp, "tok")
        with open(tf, "w") as f: f.write("alice:pw-alice-1\nbob:pw-bob-2\n")
        cls.port = free_port(); cls.base = f"http://127.0.0.1:{cls.port}"
        env = dict(os.environ, AIOS_DB=os.path.join(cls.tmp, "q.db"), AIOS_TOKEN_FILE=tf, AIOS_PORT=str(cls.port))
        cls.p = subprocess.Popen([sys.executable, os.path.join(APP, "app.py")], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try: urllib.request.urlopen(cls.base + "/healthz"); break
            except Exception: time.sleep(0.1)
    @classmethod
    def tearDownClass(cls): cls.p.terminate(); cls.p.wait()

    def req(self, method, path, body=None, tok="pw-alice-1", raw=None, headers=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        h = {"Content-Type": "application/json", **(headers or {})}
        if tok: h["Authorization"] = "Bearer " + tok
        r = urllib.request.Request(self.base + path, data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(r) as resp: return resp.status, json.load(resp)
        except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"{}")

    def test_put_bare_array_and_rows_object(self):
        s, _ = self.req("PUT", "/api/sheets/hook-library", [{"hook": "a"}]); self.assertEqual(s, 200)
        s, d = self.req("GET", "/api/sheets/hook-library"); self.assertEqual(d["rows"], [{"hook": "a"}])
        s, _ = self.req("PUT", "/api/sheets/hook-library", {"rows": [{"hook": "b"}]}); self.assertEqual(s, 200)

    def test_bad_bodies_return_400(self):
        for raw in (b"not json", b'"str"', b"42", b'{"rows": "x"}', b"[1,2]"):
            s, _ = self.req("PUT", "/api/sheets/hook-library", raw=raw); self.assertEqual(s, 400, raw)
        s, _ = self.req("POST", "/api/bulk", raw=b"[1]"); self.assertEqual(s, 400)

    def test_unknown_tool_404(self):
        self.assertEqual(self.req("PUT", "/api/sheets/bogus", [])[0], 404)
        self.assertEqual(self.req("GET", "/api/sheets/bogus")[0], 404)
        _, lst = self.req("GET", "/api/sheets"); self.assertNotIn("bogus", [x["tool"] for x in lst])

    def test_computed_values_on_get(self):
        self.req("PUT", "/api/sheets/unit-economics", [CC_EXAMPLE])
        _, d = self.req("GET", "/api/sheets/unit-economics")
        c = d["computed"][0]
        self.assertEqual(c["verdict"], "Traffic product"); self.assertAlmostEqual(c["gm"], 0.5608, places=4)
        self.assertAlmostEqual(c["op_pct"], 0.2608, places=4); self.assertAlmostEqual(c["breakeven_roas"], 1.783, places=2)
        _, d = self.req("GET", "/api/sheets/unit-economics?raw=1"); self.assertNotIn("computed", d)

    def test_formula_keys_dropped_on_save(self):
        self.req("PUT", "/api/sheets/unit-economics", [{"offer": "x", "price": 10, "verdict": "forged"}])
        _, d = self.req("GET", "/api/sheets/unit-economics?raw=1"); self.assertNotIn("verdict", d["rows"][0])

    def test_optimistic_locking(self):
        _, a = self.req("PUT", "/api/sheets/asset-log", [{"asset": "1"}])
        s, b = self.req("PUT", "/api/sheets/asset-log", {"rows": [{"asset": "2"}], "base_updated_at": a["updated_at"]}); self.assertEqual(s, 200)
        s, c = self.req("PUT", "/api/sheets/asset-log", {"rows": [{"asset": "3"}], "base_updated_at": a["updated_at"]}); self.assertEqual(s, 409)
        self.assertEqual(c["updated_at"], b["updated_at"])
        s, _ = self.req("PUT", "/api/sheets/asset-log", [{"asset": "4"}], headers={"If-Match": a["updated_at"]}); self.assertEqual(s, 409)

    def test_per_user_isolation_and_settings(self):
        self.req("PUT", "/api/sheets/role-kpis", [{"role": "alice-only"}])
        _, d = self.req("GET", "/api/sheets/role-kpis", tok="pw-bob-2"); self.assertEqual(d["rows"], [])
        s, st = self.req("PUT", "/api/settings", {"currency": "€", "offer_type": "digital"}, tok="pw-bob-2"); self.assertEqual(s, 200)
        self.assertEqual(self.req("GET", "/api/settings", tok="pw-bob-2")[1], {"currency": "€", "offer_type": "digital"})
        self.assertEqual(self.req("GET", "/api/settings")[1]["currency"], "$")
        self.assertEqual(self.req("PUT", "/api/settings", {"offer_type": "nope"})[0], 400)

    def test_login_rate_limit(self):
        codes = [self.req("POST", "/api/login", {"token": "wrong"}, tok=None)[0] for _ in range(6)]
        self.assertEqual(codes[:5], [401] * 5); self.assertEqual(codes[5], 429)

class EngineTest(unittest.TestCase):
    T = E.load_spec(os.path.join(APP, "static", "tools.json"))
    def test_all_tools_no_errors(self):
        for tid, t in self.T.items():
            for r in t.get("sample", []) + [{}]:
                c = E.compute_row(t, r)
                self.assertFalse([k for k, v in c.items() if v == "#ERR"], tid)
    def test_stage_aware_ad_diagnosis(self):
        t = self.T["ad-diagnosis"]; base = {"role": "Harvest", "spend": 300, "revenue": 540, "breakeven": 2.6}
        self.assertTrue(E.compute_row(t, {**base, "stage": "0→1 validate", "conversions": 11})["priority"].startswith("Learning"))
        self.assertEqual(E.compute_row(t, {**base, "stage": "0→1 validate", "conversions": 60})["priority"], "P0 fix opening")
        self.assertEqual(E.compute_row(t, {**base, "stage": "1→10 replicate", "conversions": 11})["priority"], "P0 fix opening")
    def test_one_value_gap_rule(self):
        # Same margin => same class in Offer Scorecard and Unit Economics.
        for gm, want in ((0.7, "Profit product"), (0.55, "Traffic product"), (0.3, "Thin - rework")):
            o = E.compute_row(self.T["offer-scorecard"], {"price": 100, "full_cost": 100 * (1 - gm), "old_cost": 200})
            u = E.compute_row(self.T["unit-economics"], {"price": 100, "unit_cost": 100 * (1 - gm)})
            self.assertEqual(o["class"], want); self.assertEqual(u["verdict"], want)
    def test_cc_unit_economics_example(self):
        c = E.compute_row(self.T["unit-economics"], CC_EXAMPLE)
        self.assertEqual(round(c["payout_fee"], 2), 2.10)          # 6% + $0.30
        self.assertEqual(round(c["fee_share"] * 100, 2), 7.00)     # the slide's 7.00% platform fixed fee
        self.assertEqual(round(c["landed_share"] * 100, 2), 31.92)
        self.assertEqual(round(c["fixed_share"] * 100, 2), 38.92)
        self.assertEqual(round(c["gm"] * 100, 2), 56.08)
        self.assertEqual(round(c["op_pct"] * 100, 2), 26.08)
        self.assertEqual(round(c["op_home"], 2), 54.76)
        self.assertEqual(c["verdict"], "Traffic product")
        # warehousing is part of the stack
        w = E.compute_row(self.T["unit-economics"], {**CC_EXAMPLE, "warehousing": 1.5})
        self.assertAlmostEqual(c["gm"] - w["gm"], 1.5 / 29.99, places=5)
    def test_unit_economics_cli_matches(self):
        out = json.loads(subprocess.run([sys.executable, os.path.join(ROOT, "tools", "unit_economics.py"), "--json"], capture_output=True, text=True, check=True).stdout)
        self.assertEqual((out["landed_share_pct"], out["fixed_share_pct"], out["gross_margin_pct"], out["company_margin_pct"], out["company_margin_home"]), (31.92, 38.92, 56.08, 26.08, 54.76))
    def test_ad_stop_loss(self):
        t = self.T["ad-diagnosis"]; base = {"role": "Harvest", "stage": "0→1 validate", "spend": 500, "revenue": 520, "breakeven": 2.6, "conversions": 12}
        self.assertTrue(E.compute_row(t, base)["priority"].startswith("Learning"))
        self.assertTrue(E.compute_row(t, {**base, "stop_loss": 250})["priority"].startswith("Stop-loss hit"))
        self.assertTrue(E.compute_row(t, {**base, "stop_loss": 400})["priority"].startswith("Learning"))
    def test_scale_ceiling(self):
        t = self.T["scale-ceiling"]
        self.assertTrue(E.compute_row(t, {"spend_prev": 2000, "spend": 3000, "profit_prev": 5200, "profit": 5050})["verdict"].startswith("Ceiling"))
        self.assertEqual(E.compute_row(t, {"spend_prev": 2000, "spend": 3000, "profit_prev": 5000, "profit": 5600, "cvr_prev": .03, "cvr": .031, "fresh": 3})["verdict"], "Keep scaling in steps")
    def test_market_stage_three_cc_stages_and_supply_gate(self):
        t = self.T["market-stage"]
        self.assertIn("aiOS addition", E.compute_row(t, {"stage": "4"})["play"])
        self.assertNotIn("aiOS addition", E.compute_row(t, {"stage": "3"})["play"])
        self.assertTrue(E.compute_row(t, {"supply_fit": 2})["supply_gate"].startswith("Fix supply"))
        self.assertIn("Southeast Asia", E.compute_row(t, {"background": "Content-commerce veteran"})["route"])
    def test_three_batch_cash(self):
        c = E.compute_row(self.T["offer-scorecard"], {"cash_wh": 3000, "cash_transit": 3000, "cash_prod": 3000, "cash_cap": 8000})
        self.assertEqual(c["cash_tied"], 9000); self.assertTrue(c["cash_check"].startswith("Over cap"))
    def test_six_second_gate(self):
        t = self.T["asset-log"]
        self.assertTrue(E.compute_row(t, {"views": 1000, "retention_6s": 0.55})["triage"].startswith("P0"))
        self.assertNotEqual(E.compute_row(t, {"views": 1000, "retention_6s": 0.62, "role": "Seed"})["triage"][:2], "P0")
    def test_js_parity(self):
        out = subprocess.run(["node", os.path.join(ROOT, "tests", "engine_parity.mjs")], capture_output=True, text=True, check=True).stdout
        js = json.loads(out)
        for tid, t in self.T.items():
            for a, b in zip([E.compute_row(t, r) for r in t.get("sample", []) + [{}]], js[tid]):
                for k in set(a) | set(b):
                    x, y = a.get(k), b.get(k)
                    if isinstance(x, (int, float)) and not isinstance(x, bool) and isinstance(y, (int, float)): self.assertAlmostEqual(x, y, places=5, msg=f"{tid}.{k}")
                    else: self.assertEqual(x, y, f"{tid}.{k}")

if __name__ == "__main__": unittest.main()
