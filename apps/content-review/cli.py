#!/usr/bin/env python3
"""Operator CLI for the aiOS Content Review Queue (talks to the JSON API).
  ./cli.py list [--status approved]          list posts
  ./cli.py due                               approved posts whose time has come
  ./cli.py show ID
  ./cli.py add --slug w2-01 --pillar AI --at 2026-11-02T08:30:00-05:00 --text "..." [--image PATH] [--parts-file f.json]
  ./cli.py update ID --text "..." [--status draft] [--at ...]
  ./cli.py posted ID --url https://x.com/your_account/status/...
  ./cli.py sheet list                        your Operating Sheets (tool, rows, updated_at)
  ./cli.py sheet get unit-economics [--raw]  rows with formulas computed server-side + KPIs (JSON)
  ./cli.py sheet put unit-economics rows.json [--base UPDATED_AT]   replace rows (JSON array of row objects)
  ./cli.py sheet tools                       tool ids and editable column keys
Env: AIOS_URL (default http://127.0.0.1:8787), AIOS_TOKEN (passcode) or AIOS_TOKEN_FILE
(first non-comment line; 'name:passcode' lines use the passcode part)."""
import argparse, json, os, sys, urllib.request, urllib.error
URL = os.environ.get("AIOS_URL", "http://127.0.0.1:8787")
TF = os.environ.get("AIOS_TOKEN_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "owner_token"))

def call(method, path, data=None):
    tok = os.environ.get("AIOS_TOKEN")
    if not tok:
        lines = [l.strip() for l in open(TF) if l.strip() and not l.strip().startswith("#")]
        tok = lines[0].split(":", 1)[1].strip() if ":" in lines[0] else lines[0]
    req = urllib.request.Request(URL + path, method=method, data=json.dumps(data).encode() if data is not None else None,
                                 headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r: return json.load(r)
    except urllib.error.HTTPError as e: sys.exit(f"HTTP {e.code}: {e.read().decode()}")

def fmt(p):
    t = p["text"] if not p["parts"] else " | ".join(p["parts"])
    return f'#{p["id"]:<3} {p["status"]:<17} {p["scheduled_at"] or "-":<26} {p["pillar"] or "":<24} {t[:70].replace(chr(10)," ")}'

def fields(a):
    d = {}
    for k, f in (("slug","slug"),("pillar","pillar"),("at","scheduled_at"),("text","text"),("image","image_path"),("status","status"),("account","account")):
        v = getattr(a, k, None)
        if v is not None: d[f] = v
    if getattr(a, "parts_file", None): d["parts"] = json.load(open(a.parts_file)); d.setdefault("text", d["parts"][0])
    return d

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sp = ap.add_subparsers(dest="cmd", required=True)
l = sp.add_parser("list"); l.add_argument("--status"); l.add_argument("--json", action="store_true")
d = sp.add_parser("due"); d.add_argument("--json", action="store_true")
s = sp.add_parser("show"); s.add_argument("id")
for name in ("add", "update"):
    x = sp.add_parser(name)
    if name == "update": x.add_argument("id")
    for o in ("--slug", "--pillar", "--at", "--text", "--image", "--status", "--account", "--parts-file"): x.add_argument(o)
p = sp.add_parser("posted"); p.add_argument("id"); p.add_argument("--url", required=True)
sh = sp.add_parser("sheet"); shs = sh.add_subparsers(dest="sub", required=True)
shs.add_parser("list"); shs.add_parser("tools")
g = shs.add_parser("get"); g.add_argument("tool"); g.add_argument("--raw", action="store_true")
u = shs.add_parser("put"); u.add_argument("tool"); u.add_argument("file"); u.add_argument("--base")
a = ap.parse_args()

if a.cmd in ("list", "due"):
    q = "/api/posts?due=1" if a.cmd == "due" else "/api/posts" + (f"?status={a.status}" if a.status else "")
    r = call("GET", q); print(json.dumps(r, indent=2, ensure_ascii=False) if a.json else "\n".join(map(fmt, r)) or "(none)")
elif a.cmd == "show": print(json.dumps(call("GET", f"/api/posts/{a.id}"), indent=2, ensure_ascii=False))
elif a.cmd == "add": print(fmt(call("POST", "/api/posts", fields(a))))
elif a.cmd == "update": print(fmt(call("POST", f"/api/posts/{a.id}/update", fields(a))))
elif a.cmd == "posted": print(fmt(call("POST", f"/api/posts/{a.id}/posted", {"url": a.url})))
elif a.cmd == "sheet":
    if a.sub == "list": print(json.dumps(call("GET", "/api/sheets"), indent=2))
    elif a.sub == "tools":
        with urllib.request.urlopen(URL + "/tools.json") as r: spec = json.load(r)
        for t in spec["tools"]: print(f'{t["id"]:<20} ' + ", ".join(c["key"] for c in t["columns"] if c["type"] != "formula"))
    elif a.sub == "get": print(json.dumps(call("GET", f"/api/sheets/{a.tool}" + ("?raw=1" if a.raw else "")), indent=2, ensure_ascii=False))
    elif a.sub == "put":
        rows = json.load(open(a.file)); body = {"rows": rows}
        if a.base: body["base_updated_at"] = a.base
        print(json.dumps(call("PUT", f"/api/sheets/{a.tool}", body)))
