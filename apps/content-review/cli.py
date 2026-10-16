#!/usr/bin/env python3
"""Operator CLI for the aiOS Content Review Queue (talks to the JSON API).
  ./cli.py list [--status approved]          list posts
  ./cli.py due                               approved posts whose time has come
  ./cli.py show ID
  ./cli.py add --slug w2-01 --pillar AI --at 2026-11-02T08:30:00-05:00 --text "..." [--image PATH] [--parts-file f.json]
  ./cli.py update ID --text "..." [--status draft] [--at ...]
  ./cli.py posted ID --url https://x.com/your_account/status/...
Env: AIOS_URL (default http://127.0.0.1:8787), AIOS_TOKEN_FILE."""
import argparse, json, os, sys, urllib.request, urllib.error
URL = os.environ.get("AIOS_URL", "http://127.0.0.1:8787")
TF = os.environ.get("AIOS_TOKEN_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "owner_token"))

def call(method, path, data=None):
    tok = open(TF).read().strip()
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
a = ap.parse_args()

if a.cmd in ("list", "due"):
    q = "/api/posts?due=1" if a.cmd == "due" else "/api/posts" + (f"?status={a.status}" if a.status else "")
    r = call("GET", q); print(json.dumps(r, indent=2, ensure_ascii=False) if a.json else "\n".join(map(fmt, r)) or "(none)")
elif a.cmd == "show": print(json.dumps(call("GET", f"/api/posts/{a.id}"), indent=2, ensure_ascii=False))
elif a.cmd == "add": print(fmt(call("POST", "/api/posts", fields(a))))
elif a.cmd == "update": print(fmt(call("POST", f"/api/posts/{a.id}/update", fields(a))))
elif a.cmd == "posted": print(fmt(call("POST", f"/api/posts/{a.id}/posted", {"url": a.url})))
