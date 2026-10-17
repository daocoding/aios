// Tests the Cloudflare Pages Function against an in-memory SQLite (sql.js) shim of D1.
// cd tests && npm install && npm test
import initSqlJs from "sql.js"; import fs from "fs"; import assert from "assert/strict";
const SQL = await initSqlJs();
const { onRequest } = await import("../cloudflare/functions/api/[[path]].js");
const s = new SQL.Database(); s.run(fs.readFileSync(new URL("../cloudflare/schema.sql", import.meta.url), "utf8"));
const rows = (q, a) => { const st = s.prepare(q.replace(/\?(\d+)/g, "?")); st.bind(a); const o = []; while (st.step()) o.push(st.getAsObject()); st.free(); return o; };
const DB = { prepare(q) { let a = []; const o = { bind(...x) { a = x; return o; }, first() { return rows(q, a)[0] ?? null; }, all() { return { results: rows(q, a) }; },
  run() { rows(q, a); return { meta: { last_row_id: s.exec("select last_insert_rowid()")[0].values[0][0] } }; } }; return o; } };
const env = { DB, OWNER_TOKEN: "alice:pw-a,bob:pw-b" };
async function call(method, path, body, tok = "pw-a", headers = {}) {
  const h = { "Content-Type": "application/json", ...headers }; if (tok) h.Authorization = "Bearer " + tok;
  const r = await onRequest({ request: new Request("http://x" + path, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) }), env });
  return [r.status, await r.json()];
}
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok -", name); };
await t("bare array and {rows}", async () => {
  assert.equal((await call("PUT", "/api/sheets/hook-library", [{ hook: "a" }]))[0], 200);
  assert.deepEqual((await call("GET", "/api/sheets/hook-library"))[1].rows, [{ hook: "a" }]);
  assert.equal((await call("PUT", "/api/sheets/hook-library", { rows: [{ hook: "b" }] }))[0], 200);
});
await t("bad bodies 400", async () => {
  for (const b of ["not json", '"s"', "42", '{"rows":"x"}', "[1,2]"]) assert.equal((await call("PUT", "/api/sheets/hook-library", b))[0], 400, b);
  assert.equal((await call("POST", "/api/bulk", "[1]"))[0], 400);
});
await t("unknown tool 404", async () => {
  assert.equal((await call("PUT", "/api/sheets/bogus", []))[0], 404);
  assert.ok(!(await call("GET", "/api/sheets"))[1].some(x => x.tool === "bogus"));
});
await t("computed on GET", async () => {
  await call("PUT", "/api/sheets/unit-economics", [{ offer: "cc", price: 29.99, unit_cost: 3.5718, logistics: 6, warehousing: 0, payout_pct: 0.06, payout_fixed: 0.3, platform_pct: 0, refund_pct: 0.05, marketing_pct: 0.3, fx: 7 }]);
  const [, d] = await call("GET", "/api/sheets/unit-economics"); const c = d.computed[0], r2 = x => Math.round(x * 10000) / 100;
  assert.equal(c.verdict, "Traffic product"); assert.ok(Math.abs(c.breakeven_roas - 1.783) < 0.01);
  // CC's worked example (lecture slide): 31.92% landed, 38.92% fixed, 56.08% gross, 26.08% company, 54.76 home currency
  assert.deepEqual([r2(c.landed_share), r2(c.fee_share), r2(c.fixed_share), r2(c.gm), r2(c.op_pct), Math.round(c.op_home * 100) / 100], [31.92, 7, 38.92, 56.08, 26.08, 54.76]);
  assert.ok(!("computed" in (await call("GET", "/api/sheets/unit-economics?raw=1"))[1]));
});
await t("optimistic locking 409", async () => {
  const [, a] = await call("PUT", "/api/sheets/asset-log", [{ asset: "1" }]);
  await new Promise(r => setTimeout(r, 5));
  assert.equal((await call("PUT", "/api/sheets/asset-log", { rows: [{ asset: "2" }], base_updated_at: a.updated_at }))[0], 200);
  assert.equal((await call("PUT", "/api/sheets/asset-log", { rows: [{ asset: "3" }], base_updated_at: a.updated_at }))[0], 409);
});
await t("isolation + settings", async () => {
  await call("PUT", "/api/sheets/role-kpis", [{ role: "a" }]);
  assert.deepEqual((await call("GET", "/api/sheets/role-kpis", undefined, "pw-b"))[1].rows, []);
  assert.equal((await call("PUT", "/api/settings", { currency: "€", offer_type: "service" }, "pw-b"))[0], 200);
  assert.deepEqual((await call("GET", "/api/settings", undefined, "pw-b"))[1], { currency: "€", offer_type: "service" });
  assert.equal((await call("PUT", "/api/settings", { currency: "XX" }))[0], 400);
});
await t("login rate limit", async () => {
  const codes = []; for (let i = 0; i < 6; i++) codes.push((await call("POST", "/api/login", { token: "wrong" }, null))[0]);
  assert.deepEqual(codes, [401, 401, 401, 401, 401, 429]);
});
console.log(`${n} passed`);
