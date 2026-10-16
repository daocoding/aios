#!/usr/bin/env python3
"""aiOS Grok Edition - Content Review Queue. Zero-dependency (stdlib) server: http.server + sqlite3."""
import hashlib, hmac, json, os, sqlite3, sys, threading
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http.cookies import SimpleCookie
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("AIOS_DB", os.path.join(ROOT, "data", "queue.db"))
TOKEN_FILE = os.environ.get("AIOS_TOKEN_FILE", os.path.join(ROOT, "data", "owner_token"))
HOST = os.environ.get("AIOS_HOST", "127.0.0.1")
PORT = int(os.environ.get("AIOS_PORT", "8787"))
IMAGE_ROOTS = [r for r in os.environ.get("AIOS_IMAGE_ROOTS", ROOT).split(":") if r]
STATUSES = ("draft", "approved", "changes_requested", "skipped", "posted")
EDITABLE = ("account", "pillar", "scheduled_at", "text", "parts", "image_path", "status", "owner_comment", "operator_note", "posted_url")
_lock = threading.Lock()

def now(): return datetime.now(timezone.utc).isoformat(timespec="seconds")

def load_token():
    with open(TOKEN_FILE) as f: return f.read().strip()

def session_value(tok): return hmac.new(tok.encode(), b"aios-session", hashlib.sha256).hexdigest()

def db():
    c = sqlite3.connect(DB_PATH); c.row_factory = sqlite3.Row; return c

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS posts(
          id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE,
          account TEXT NOT NULL DEFAULT '@your_account', pillar TEXT,
          scheduled_at TEXT,            -- ISO 8601 with ET offset, e.g. 2026-10-19T08:30:00-04:00
          text TEXT NOT NULL DEFAULT '', parts TEXT,  -- parts: JSON array for threads
          image_path TEXT, status TEXT NOT NULL DEFAULT 'draft',
          owner_comment TEXT, operator_note TEXT, posted_url TEXT, edited_by_owner INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT, approved_at TEXT, posted_at TEXT)""")

def row(r):
    d = dict(r); d["parts"] = json.loads(d["parts"]) if d.get("parts") else None; return d

def get_post(c, pid):
    r = c.execute("SELECT * FROM posts WHERE id=? OR slug=?", (pid, str(pid))).fetchone()
    return row(r) if r else None

def upsert(data):
    data = {k: v for k, v in data.items() if k in EDITABLE or k == "slug"}
    if "parts" in data and data["parts"] is not None and not isinstance(data["parts"], str):
        data["parts"] = json.dumps(data["parts"], ensure_ascii=False)
    if "status" in data and data["status"] not in STATUSES: raise ValueError("bad status")
    with _lock, db() as c:
        ex = c.execute("SELECT id FROM posts WHERE slug=?", (data["slug"],)).fetchone() if data.get("slug") else None
        if ex:
            return update(c, ex["id"], data)
        data.setdefault("status", "draft"); data["created_at"] = data["updated_at"] = now()
        cols = ",".join(data); q = ",".join("?" * len(data))
        cur = c.execute(f"INSERT INTO posts({cols}) VALUES({q})", list(data.values()))
        return get_post(c, cur.lastrowid)

def update(c, pid, data):
    data = dict(data); data["updated_at"] = now()
    if data.get("status") == "approved": data["approved_at"] = now()
    if data.get("status") == "posted": data["posted_at"] = now()
    sets = ",".join(f"{k}=?" for k in data)
    c.execute(f"UPDATE posts SET {sets} WHERE id=?", list(data.values()) + [pid])
    return get_post(c, pid)

def list_posts(status=None, due=False):
    q, a = "SELECT * FROM posts", []
    w = []
    if status: w.append("status=?"); a.append(status)
    if due: w.append("status='approved'")
    if w: q += " WHERE " + " AND ".join(w)
    q += " ORDER BY scheduled_at, id"
    with db() as c: rs = [row(r) for r in c.execute(q, a)]
    if due:
        t = datetime.now(timezone.utc)
        rs = [p for p in rs if p["scheduled_at"] and datetime.fromisoformat(p["scheduled_at"]) <= t]
    return rs

def owner_action(pid, action, body):
    with _lock, db() as c:
        p = get_post(c, pid)
        if not p: return None
        if action == "approve": ch = {"status": "approved"}
        elif action == "skip": ch = {"status": "skipped"}
        elif action == "request_changes": ch = {"status": "changes_requested", "owner_comment": body.get("comment", "")}
        elif action == "edit":
            ch = {"edited_by_owner": 1}
            if "text" in body: ch["text"] = body["text"]
            if "parts" in body: ch["parts"] = json.dumps(body["parts"], ensure_ascii=False)
            # owner edits keep an approved post approved; otherwise they count as approval of the edited text
            ch["status"] = "approved" if body.get("approve", True) or p["status"] == "approved" else p["status"]
        elif action == "posted":
            ch = {"status": "posted", "posted_url": body.get("url", "")}
        else: raise ValueError("unknown action")
        return update(c, p["id"], ch)

class H(BaseHTTPRequestHandler):
    server_version = "aiOS-Review/0.1"
    def log_message(self, fmt, *a):  # path only, never headers/bodies (no token in logs)
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), (fmt % a).split("?")[0]))

    def send_json(self, code, obj, headers=()):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)));
        for k, v in headers: self.send_header(k, v)
        self.end_headers(); self.wfile.write(b)

    def authed(self):
        tok = load_token()
        h = self.headers.get("Authorization", "")
        if h.startswith("Bearer ") and hmac.compare_digest(h[7:].strip(), tok): return True
        ck = SimpleCookie(self.headers.get("Cookie", ""))
        return "aios_session" in ck and hmac.compare_digest(ck["aios_session"].value, session_value(tok))

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}") if n else {}

    def static(self, name, ctype):
        with open(os.path.join(ROOT, "static", name), "rb") as f: b = f.read()
        self.send_response(200); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        u = urlparse(self.path); qs = parse_qs(u.query)
        if u.path in ("/", "/index.html"): return self.static("index.html", "text/html; charset=utf-8")
        if u.path == "/healthz": return self.send_json(200, {"ok": True})
        if not self.authed(): return self.send_json(401, {"error": "unauthorized"})
        if u.path == "/api/posts":
            return self.send_json(200, list_posts(qs.get("status", [None])[0], qs.get("due", ["0"])[0] == "1"))
        if u.path.startswith("/api/posts/"):
            with db() as c: p = get_post(c, u.path.split("/")[3])
            return self.send_json(200 if p else 404, p or {"error": "not found"})
        if u.path.startswith("/api/image/"):
            with db() as c: p = get_post(c, u.path.split("/")[3])
            ip = p and p.get("image_path")
            real = ip and os.path.realpath(ip)
            if not real or not any(real.startswith(os.path.realpath(r) + os.sep) for r in IMAGE_ROOTS) or not os.path.isfile(real):
                return self.send_json(404, {"error": "no image"})
            ext = real.rsplit(".", 1)[-1].lower()
            ct = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}.get(ext, "application/octet-stream")
            with open(real, "rb") as f: b = f.read()
            self.send_response(200); self.send_header("Content-Type", ct); self.send_header("Content-Length", str(len(b))); self.end_headers(); return self.wfile.write(b)
        self.send_json(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        try: b = self.body()
        except Exception: return self.send_json(400, {"error": "bad json"})
        if u.path == "/api/login":
            if hmac.compare_digest(str(b.get("token", "")).strip(), load_token()):
                return self.send_json(200, {"ok": True}, [("Set-Cookie", f"aios_session={session_value(load_token())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000")])
            return self.send_json(401, {"error": "wrong passcode"})
        if u.path == "/api/logout":
            return self.send_json(200, {"ok": True}, [("Set-Cookie", "aios_session=; Path=/; Max-Age=0")])
        if not self.authed(): return self.send_json(401, {"error": "unauthorized"})
        try:
            if u.path == "/api/posts":
                return self.send_json(200, upsert(b))
            if u.path == "/api/bulk_approve":
                out = [owner_action(i, "approve", {}) for i in b.get("ids", [])]
                return self.send_json(200, {"approved": [p["id"] for p in out if p]})
            if u.path == "/api/bulk":
                action = b.get("action")
                if action not in ("approve", "skip"):
                    return self.send_json(400, {"error": "action must be approve or skip"})
                ids = b.get("ids") or []
                out = [owner_action(i, action, {}) for i in ids]
                done = [p["id"] for p in out if p]
                return self.send_json(200, {"ok": True, "action": action, "ids": done})
            parts = u.path.strip("/").split("/")  # api/posts/<id>/<action>
            if len(parts) == 4 and parts[:2] == ["api", "posts"]:
                if parts[3] == "update":
                    with _lock, db() as c:
                        d = {k: v for k, v in b.items() if k in EDITABLE}
                        if "parts" in d and not isinstance(d["parts"], str): d["parts"] = json.dumps(d["parts"], ensure_ascii=False)
                        p = get_post(c, parts[2]); r = p and update(c, p["id"], d)
                else: r = owner_action(parts[2], parts[3], b)
                return self.send_json(200 if r else 404, r or {"error": "not found"})
        except ValueError as e: return self.send_json(400, {"error": str(e)})
        self.send_json(404, {"error": "not found"})

if __name__ == "__main__":
    init_db(); load_token()
    print(f"aiOS Content Review Queue on http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
