"""Server-side evaluator for aiOS Operating Sheets formulas (same spec as static/tools.json).

Formulas use a small Excel subset with {key} placeholders: + - * / & comparisons (= <> < <= > >=),
IF, AND, OR, ROUND, IFERROR, MIN, MAX, ABS, and string/number literals. No eval() is used.
KPI expressions use SUM(col), COUNT(col), AVG(col) with arithmetic.
"""
import json, math, os, re

NUMERIC = {"number", "money", "pct", "num2", "int"}
_TOK = re.compile(r'\s*(?:(\d+\.?\d*|\.\d+)|("[^"]*")|\{(\w+)\}|([A-Za-z_]\w*)|(<>|<=|>=|[-+*/&=<>(),]))')

def _tokens(s):
    out, i = [], 0
    s = s.strip()
    while i < len(s):
        m = _TOK.match(s, i)
        if not m or m.end() == i: raise ValueError(f"bad formula near: {s[i:i+12]!r}")
        num, st, ref, name, op = m.groups()
        if num is not None: out.append(("num", float(num)))
        elif st is not None: out.append(("str", st[1:-1]))
        elif ref is not None: out.append(("ref", ref))
        elif name is not None: out.append(("name", name.upper() if name.upper() in FN or name.upper() in AGG else name))
        else: out.append(("op", op))
        i = m.end()
        while i < len(s) and s[i].isspace(): i += 1
    return out

def _num(v):
    if isinstance(v, bool): return 1.0 if v else 0.0
    if isinstance(v, (int, float)): return float(v)
    try: return float(v)
    except (TypeError, ValueError): return 0.0

def _div(a, b):
    a, b = _num(a), _num(b)
    if b == 0: return math.nan if a == 0 else math.copysign(math.inf, a)
    return a / b

def _round(v, d=0):
    v = _num(v)
    if not math.isfinite(v): return v
    p = 10 ** int(_num(d)); x = v * p
    return math.floor(x + 0.5) / p  # JS Math.round semantics

def _iferror(v, alt):
    return alt if isinstance(v, float) and not math.isfinite(v) else v

def _eq(a, b):
    if isinstance(a, str) and isinstance(b, str): return a == b
    if isinstance(a, str) or isinstance(b, str):  # loose like JS ==
        try: return _num_strict(a) == _num_strict(b)
        except ValueError: return str(a) == str(b)
    return _num(a) == _num(b)

def _num_strict(v):
    if isinstance(v, (int, float)): return float(v)
    s = str(v).strip()
    return 0.0 if s == "" else float(s)

def _cmp(op, a, b):
    if op == "=": return _eq(a, b)
    if op == "<>": return not _eq(a, b)
    if isinstance(a, str) and isinstance(b, str): x, y = a, b
    else: x, y = _num(a), _num(b)
    return {"<": x < y, "<=": x <= y, ">": x > y, ">=": x >= y}[op]

FN = {
    "IF": lambda c, a="", b="": a if _truthy(c) else b,
    "AND": lambda *a: all(_truthy(x) for x in a), "OR": lambda *a: any(_truthy(x) for x in a),
    "ROUND": _round, "IFERROR": _iferror,
    "MIN": lambda *a: min(_num(x) for x in a), "MAX": lambda *a: max(_num(x) for x in a), "ABS": lambda a: abs(_num(a)),
}
AGG = {"SUM", "COUNT", "AVG"}

def _truthy(v):
    if isinstance(v, str): return v != ""
    if isinstance(v, float) and math.isnan(v): return False
    return bool(v)

class _P:
    def __init__(self, toks, ref, agg=None): self.t, self.i, self.ref, self.agg = toks, 0, ref, agg
    def peek(self): return self.t[self.i] if self.i < len(self.t) else (None, None)
    def take(self, v=None):
        k = self.peek()
        if v is not None and k[1] != v: raise ValueError(f"expected {v}, got {k[1]}")
        self.i += 1; return k
    def expr(self):
        a = self.concat()
        while self.peek()[0] == "op" and self.peek()[1] in ("=", "<>", "<", "<=", ">", ">="):
            op = self.take()[1]; a = _cmp(op, a, self.concat())
        return a
    def concat(self):
        a = self.add()
        while self.peek() == ("op", "&"):
            self.take(); a = _str(a) + _str(self.add())
        return a
    def add(self):
        a = self.mul()
        while self.peek()[0] == "op" and self.peek()[1] in "+-" and self.peek()[1] in ("+", "-"):
            op = self.take()[1]; b = self.mul()
            a = _num(a) + _num(b) if op == "+" else _num(a) - _num(b)
        return a
    def mul(self):
        a = self.unary()
        while self.peek()[0] == "op" and self.peek()[1] in ("*", "/"):
            op = self.take()[1]; b = self.unary()
            a = _num(a) * _num(b) if op == "*" else _div(a, b)
        return a
    def unary(self):
        if self.peek() == ("op", "-"): self.take(); return -_num(self.unary())
        if self.peek() == ("op", "+"): self.take(); return _num(self.unary())
        return self.primary()
    def primary(self):
        k, v = self.take()
        if k == "num" or k == "str": return v
        if k == "ref": return self.ref(v)
        if k == "op" and v == "(":
            x = self.expr(); self.take(")"); return x
        if k == "name" and v in AGG and self.agg:
            self.take("("); col = self.take()[1]; self.take(")"); return self.agg(v, col)
        if k == "name" and v in FN:
            self.take("("); args = []
            if self.peek() != ("op", ")"):
                args.append(self.expr())
                while self.peek() == ("op", ","): self.take(); args.append(self.expr())
            self.take(")"); return FN[v](*args)
        raise ValueError(f"unexpected token {v!r}")

def _str(v):
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    return "" if v is None else str(v)

def evaluate(formula, ref, agg=None):
    p = _P(_tokens(formula), ref, agg); v = p.expr()
    if p.i != len(p.t): raise ValueError("trailing tokens")
    return v

def _clean(v):
    if isinstance(v, bool): return v
    if isinstance(v, float):
        if not math.isfinite(v): return None
        return int(v) if v.is_integer() else round(v, 6)
    return v

def compute_row(tool, row):
    types = {c["key"]: (c.get("fmt", "text") if c["type"] == "formula" else c["type"]) for c in tool["columns"]}
    out = dict(row)
    def ref(k):
        v = out.get(k)
        if types.get(k) in NUMERIC: return 0.0 if v in ("", None) else _num(v)
        return "" if v is None else v
    for c in tool["columns"]:
        if c["type"] == "formula":
            try: out[c["key"]] = evaluate(c["f"], ref)
            except Exception: out[c["key"]] = "#ERR"
    return {k: _clean(v) for k, v in out.items()}

def kpis(tool, rows):
    def agg(fn, col):
        vals = [r.get(col) for r in rows if r.get(col) not in ("", None)]
        if fn == "COUNT": return float(len(vals))
        s = sum(_num(v) for v in vals)
        return s if fn == "SUM" else (s / (len(vals) or 1))
    out = []
    for k in tool.get("kpis", []):
        try: v = evaluate(k["f"], lambda _k: 0.0, agg)
        except Exception: v = 0.0
        v = _num(v); out.append({"label": k["label"], "value": round(v, 6) if math.isfinite(v) else 0, "fmt": k.get("fmt", "num")})
    return out

def load_spec(path):
    with open(path, encoding="utf-8") as f: spec = json.load(f)
    return {t["id"]: t for t in spec["tools"]}
