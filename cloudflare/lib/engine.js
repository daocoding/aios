// Server-side evaluator for aiOS Operating Sheets (no eval / new Function: safe on Workers).
// Mirrors apps/content-review/sheets_engine.py. MIT.
const NUMERIC = new Set(["number", "money", "pct", "num2", "int"]);
const TOK = /\s*(?:(\d+\.?\d*|\.\d+)|("[^"]*")|\{(\w+)\}|([A-Za-z_]\w*)|(<>|<=|>=|[-+*/&=<>(),]))/y;
const AGG = new Set(["SUM", "COUNT", "AVG"]);
const num = v => typeof v === "boolean" ? +v : typeof v === "number" ? v : (v === "" || v == null ? 0 : (isNaN(+v) ? 0 : +v));
const truthy = v => typeof v === "string" ? v !== "" : !!v && !Number.isNaN(v);
const eq = (a, b) => (typeof a === "string" && typeof b === "string") ? a === b : (typeof a === "string" || typeof b === "string") ? a == b : num(a) === num(b);
const FN = {
  IF: (c, a = "", b = "") => truthy(c) ? a : b, AND: (...a) => a.every(truthy), OR: (...a) => a.some(truthy),
  ROUND: (v, d = 0) => { v = num(v); if (!isFinite(v)) return v; const p = 10 ** num(d); return Math.round(v * p) / p; },
  IFERROR: (v, alt) => (typeof v === "number" && !isFinite(v)) ? alt : v,
  MIN: (...a) => Math.min(...a.map(num)), MAX: (...a) => Math.max(...a.map(num)), ABS: a => Math.abs(num(a)),
};
function tokens(s) {
  const out = []; s = s.trim(); TOK.lastIndex = 0;
  while (TOK.lastIndex < s.length) {
    const at = TOK.lastIndex, m = TOK.exec(s);
    if (!m || TOK.lastIndex === at) throw new Error("bad formula near " + s.slice(at, at + 12));
    if (m[1] != null) out.push(["num", +m[1]]); else if (m[2] != null) out.push(["str", m[2].slice(1, -1)]);
    else if (m[3] != null) out.push(["ref", m[3]]); else if (m[4] != null) out.push(["name", m[4].toUpperCase()]); else out.push(["op", m[5]]);
    while (TOK.lastIndex < s.length && /\s/.test(s[TOK.lastIndex])) TOK.lastIndex++;
  }
  return out;
}
export function evaluate(f, ref, agg) {
  const t = tokens(f); let i = 0;
  const peek = () => t[i] || [null, null], is = (k, v) => peek()[0] === k && peek()[1] === v;
  const take = v => { const k = peek(); if (v !== undefined && k[1] !== v) throw new Error("expected " + v); i++; return k; };
  const CMP = ["=", "<>", "<", "<=", ">", ">="];
  function expr() { let a = concat(); while (peek()[0] === "op" && CMP.includes(peek()[1])) { const op = take()[1], b = concat();
      if (op === "=") a = eq(a, b); else if (op === "<>") a = !eq(a, b);
      else { const s = typeof a === "string" && typeof b === "string"; const x = s ? a : num(a), y = s ? b : num(b);
        a = op === "<" ? x < y : op === "<=" ? x <= y : op === ">" ? x > y : x >= y; } } return a; }
  function concat() { let a = add(); while (is("op", "&")) { take(); a = str(a) + str(add()); } return a; }
  function add() { let a = mul(); while (is("op", "+") || is("op", "-")) { const op = take()[1], b = mul(); a = op === "+" ? num(a) + num(b) : num(a) - num(b); } return a; }
  function mul() { let a = unary(); while (is("op", "*") || is("op", "/")) { const op = take()[1], b = unary(); a = op === "*" ? num(a) * num(b) : num(a) / num(b); } return a; }
  function unary() { if (is("op", "-")) { take(); return -num(unary()); } if (is("op", "+")) { take(); return num(unary()); } return primary(); }
  function primary() {
    const [k, v] = take();
    if (k === "num" || k === "str") return v;
    if (k === "ref") return ref(v);
    if (k === "op" && v === "(") { const x = expr(); take(")"); return x; }
    if (k === "name" && AGG.has(v) && agg) { take("("); const col = take()[1]; take(")"); return agg(v, col); }
    if (k === "name" && FN[v]) { take("("); const args = []; if (!is("op", ")")) { args.push(expr()); while (is("op", ",")) { take(); args.push(expr()); } } take(")"); return FN[v](...args); }
    throw new Error("unexpected " + v);
  }
  const v = expr(); if (i !== t.length) throw new Error("trailing tokens"); return v;
}
const str = v => v == null ? "" : String(v);
const clean = v => typeof v === "number" ? (isFinite(v) ? (Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6) : null) : v;
export function computeRow(tool, row) {
  const types = Object.fromEntries(tool.columns.map(c => [c.key, c.type === "formula" ? (c.fmt || "text") : c.type]));
  const out = { ...row };
  const ref = k => { const v = out[k]; return NUMERIC.has(types[k]) ? (v === "" || v == null ? 0 : num(v)) : (v == null ? "" : v); };
  for (const c of tool.columns) if (c.type === "formula") { try { out[c.key] = evaluate(c.f, ref); } catch { out[c.key] = "#ERR"; } }
  for (const k in out) out[k] = clean(out[k]);
  return out;
}
export function kpis(tool, rows) {
  const agg = (fn, col) => { const v = rows.map(r => r[col]).filter(x => x !== "" && x != null);
    if (fn === "COUNT") return v.length; const s = v.reduce((a, b) => a + num(b), 0); return fn === "SUM" ? s : s / (v.length || 1); };
  return (tool.kpis || []).map(k => { let v = 0; try { v = num(evaluate(k.f, () => 0, agg)); } catch {} return { label: k.label, value: isFinite(v) ? Math.round(v * 1e6) / 1e6 : 0, fmt: k.fmt || "num" }; });
}
