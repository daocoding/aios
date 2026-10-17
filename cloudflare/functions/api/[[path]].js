// aiOS Content Review: Cloudflare Pages Function (D1). API-compatible with apps/content-review/app.py.
// Bindings: DB (D1), OWNER_TOKEN (secret), optional OPEN_SIGNUP="1" (anyone can create a personal workspace). Images: set image_path to an https:// URL (e.g. R2 public URL).
import { computeRow, kpis } from "../../lib/engine.js";
import SPEC from "../../lib/spec.js";
const TOOLS = Object.fromEntries(SPEC.tools.map(t => [t.id, t]));
const CURRENCIES = ["$", "€", "£", "¥", "₹", "R$", "A$", "C$", "CHF ", "kr "], OFFER_TYPES = ["physical", "digital", "service", "local"];
const MAX_FAILS = 5, FAIL_WINDOW_S = 600, MAX_SIGNUPS = 5, SIGNUP_WINDOW_S = 3600;
const NAME_RE = /^[a-z0-9][a-z0-9_-]{2,31}$/;
const nowMs = () => new Date().toISOString().replace(/Z$/, "+00:00");
const STATUSES = ["draft", "approved", "changes_requested", "skipped", "posted"];
const EDITABLE = ["account", "pillar", "scheduled_at", "text", "parts", "image_path", "status", "owner_comment", "operator_note", "posted_url"];
const now = () => new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", ...headers } });

async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const sessionValue = tok => hmacHex(tok, "aios-session");
async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function newPasscode() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const signupOpen = env => String(env.OPEN_SIGNUP || "") === "1";
// Signed-up accounts (OPEN_SIGNUP=1): passcode stored only as a SHA-256 hash; each gets a private workspace.
const acct = name => ({ name, key: "u:" + name, ws: "u:" + name });
async function accountByToken(db, tok) {
  if (!tok) return null;
  try { const r = await db.prepare("SELECT name FROM accounts WHERE tok_hash=?1").bind(await sha256Hex(tok)).first(); return r ? acct(r.name) : null; }
  catch { return null; }  // accounts table missing on older schemas
}
const acctCookie = async (name, tokHash) => `a.${name}.${await hmacHex(tokHash, "aios-session")}`;
function cookie(req, name) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
// OWNER_TOKEN secret: a single passcode, or several "name:passcode" entries separated by newlines or commas.
// Everyone shares the content queue; Operating Sheets are saved per user name.
function users(env) {
  const out = [];
  for (let ln of String(env.OWNER_TOKEN || "").split(/[\n,]/)) {
    ln = ln.trim(); if (!ln) continue;
    const i = ln.indexOf(":");
    out.push(i > 0 ? { name: ln.slice(0, i).trim(), tok: ln.slice(i + 1).trim() } : { name: "owner", tok: ln });
  }
  return out;
}
// Returns {name, key (sheets/settings owner), ws (review-queue workspace)} or null.
// OWNER_TOKEN users share the "team" queue; signed-up accounts each get their own.
async function authed(req, env, db) {
  const h = req.headers.get("Authorization") || "", c = cookie(req, "aios_session");
  const bearer = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  for (const u of users(env)) {
    if (bearer && safeEq(bearer, u.tok)) return { name: u.name, key: u.name, ws: "team" };
    if (c && safeEq(c, await sessionValue(u.tok))) return { name: u.name, key: u.name, ws: "team" };
  }
  if (bearer) return accountByToken(db, bearer);
  if (c && c.startsWith("a.")) {
    const [, name, sig] = c.split(".");
    try {
      const r = await db.prepare("SELECT tok_hash FROM accounts WHERE name=?1").bind(name || "").first();
      if (r && safeEq(c, await acctCookie(name, r.tok_hash))) return acct(name);
    } catch { }
  }
  return null;
}
const row = r => r && { ...r, parts: r.parts ? JSON.parse(r.parts) : null };
async function getPost(db, ws, id) {
  return row(await db.prepare("SELECT * FROM posts WHERE ws=?1 AND (id=?2 OR slug=?3)").bind(ws, Number(id) || -1, String(id)).first());
}
async function update(db, ws, id, data) {
  data = { ...data, updated_at: now() };
  if (data.status === "approved") data.approved_at = now();
  if (data.status === "posted") data.posted_at = now();
  const keys = Object.keys(data);
  await db.prepare(`UPDATE posts SET ${keys.map((k, i) => `${k}=?${i + 1}`).join(",")} WHERE id=?${keys.length + 1}`)
    .bind(...keys.map(k => data[k]), id).run();
  return getPost(db, ws, id);
}
function clean(b, allowSlug) {
  const d = {};
  for (const [k, v] of Object.entries(b || {})) if (EDITABLE.includes(k) || (allowSlug && k === "slug")) d[k] = v;
  if (d.parts != null && typeof d.parts !== "string") d.parts = JSON.stringify(d.parts);
  if (d.status && !STATUSES.includes(d.status)) throw new Error("bad status");
  return d;
}
async function upsert(db, ws, b) {
  const d = clean(b, true);
  if (d.slug) {
    const ex = await db.prepare("SELECT id FROM posts WHERE ws=?1 AND slug=?2").bind(ws, d.slug).first();
    if (ex) return update(db, ws, ex.id, d);
  }
  d.status = d.status || "draft"; d.created_at = d.updated_at = now(); d.ws = ws;
  const keys = Object.keys(d);
  const r = await db.prepare(`INSERT INTO posts(${keys.join(",")}) VALUES(${keys.map((_, i) => "?" + (i + 1)).join(",")})`)
    .bind(...keys.map(k => d[k])).run();
  return getPost(db, ws, r.meta.last_row_id);
}
async function ownerAction(db, ws, id, action, body = {}) {
  const p = await getPost(db, ws, id); if (!p) return null;
  let ch;
  if (action === "approve") ch = { status: "approved" };
  else if (action === "skip") ch = { status: "skipped" };
  else if (action === "request_changes") ch = { status: "changes_requested", owner_comment: body.comment || "" };
  else if (action === "edit") {
    ch = { edited_by_owner: 1 };
    if ("text" in body) ch.text = body.text;
    if ("parts" in body) ch.parts = JSON.stringify(body.parts);
    ch.status = (body.approve ?? true) || p.status === "approved" ? "approved" : p.status;
  } else if (action === "posted") ch = { status: "posted", posted_url: body.url || "" };
  else throw new Error("unknown action");
  return update(db, ws, p.id, ch);
}

export async function onRequest({ request, env }) {
  const u = new URL(request.url), path = u.pathname.replace(/\/+$/, ""), db = env.DB;
  try {
    if (path === "/api/healthz") return json({ ok: true });
    if (path === "/api/config") return json({ signup: signupOpen(env) });
    if (request.method === "POST" && path === "/api/signup") {
      if (!signupOpen(env)) return json({ error: "signup is closed on this copy" }, 403);
      const ip = request.headers.get("CF-Connecting-IP") || "local", t0 = Math.floor(Date.now() / 1000);
      await db.prepare("DELETE FROM signups WHERE ts < ?1").bind(t0 - SIGNUP_WINDOW_S).run();
      const ns = await db.prepare("SELECT COUNT(*) AS n FROM signups WHERE ip=?1").bind(ip).first();
      if (ns && ns.n >= MAX_SIGNUPS) return json({ error: "too many signups from this network; try again later" }, 429, { "Retry-After": String(SIGNUP_WINDOW_S) });
      const b = await request.json().catch(() => ({}));
      const name = String((b && b.name) || "").trim().toLowerCase();
      if (!NAME_RE.test(name)) return json({ error: "name: 3-32 chars, a-z 0-9 _ -, starting with a letter or digit" }, 400);
      if (users(env).some(x => x.name.toLowerCase() === name) || ["owner", "admin", "team"].includes(name)) return json({ error: "name taken" }, 409);
      if (await db.prepare("SELECT 1 AS x FROM accounts WHERE name=?1").bind(name).first()) return json({ error: "name taken" }, 409);
      const pass = newPasscode(), hash = await sha256Hex(pass);
      await db.prepare("INSERT INTO accounts(name, tok_hash, created_at) VALUES(?1,?2,?3)").bind(name, hash, now()).run();
      await db.prepare("INSERT INTO signups(ip, ts) VALUES(?1, ?2)").bind(ip, t0).run();
      return json({ ok: true, user: name, passcode: pass, note: "Shown once. Save it in a password manager; it is your login." }, 200,
        { "Set-Cookie": `aios_session=${await acctCookie(name, hash)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000` });
    }
    if (request.method === "POST" && path === "/api/login") {
      const ip = request.headers.get("CF-Connecting-IP") || "local", t0 = Math.floor(Date.now() / 1000);
      await db.prepare("DELETE FROM login_fails WHERE ts < ?1").bind(t0 - FAIL_WINDOW_S).run();
      const nf = (await db.prepare("SELECT COUNT(*) AS n, MIN(ts) AS first FROM login_fails WHERE ip=?1").bind(ip).first()) || { n: 0 };
      if (nf.n >= MAX_FAILS) return json({ error: "too many failed attempts; try again later" }, 429, { "Retry-After": String(FAIL_WINDOW_S - (t0 - nf.first) + 1) });
      const b = await request.json().catch(() => ({}));
      const given = String((b && b.token) || "").trim();
      for (const u of users(env)) if (safeEq(given, u.tok)) {
        await db.prepare("DELETE FROM login_fails WHERE ip=?1").bind(ip).run();
        return json({ ok: true }, 200, { "Set-Cookie": `aios_session=${await sessionValue(u.tok)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000` });
      }
      const a = await accountByToken(db, given);
      if (a) {
        await db.prepare("DELETE FROM login_fails WHERE ip=?1").bind(ip).run();
        return json({ ok: true }, 200, { "Set-Cookie": `aios_session=${await acctCookie(a.name, await sha256Hex(given))}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000` });
      }
      await db.prepare("INSERT INTO login_fails(ip, ts) VALUES(?1, ?2)").bind(ip, t0).run();
      await new Promise(r => setTimeout(r, 1000));
      return json({ error: "wrong passcode" }, 401);
    }
    if (request.method === "POST" && path === "/api/logout")
      return json({ ok: true }, 200, { "Set-Cookie": "aios_session=; Path=/; Max-Age=0" });
    const who = await authed(request, env, db);
    if (!who) return json({ error: "unauthorized" }, 401);
    const user = who.key, ws = who.ws;
    if (path === "/api/me") return json({ user: who.name, workspace: ws === "team" ? "team" : "personal" });
    if (path === "/api/settings") {
      const r = await db.prepare("SELECT data FROM settings WHERE user=?1").bind(user).first();
      const cur = { currency: "$", offer_type: "physical", ...(r ? JSON.parse(r.data) : {}) };
      if (request.method === "GET") return json(cur);
      if (request.method === "PUT") {
        const b = await request.json().catch(() => null);
        if (!b || typeof b !== "object" || Array.isArray(b)) return json({ error: "body must be an object" }, 400);
        if ("currency" in b) { if (!CURRENCIES.includes(b.currency)) return json({ error: "currency must be one of " + CURRENCIES.join(", ") }, 400); cur.currency = b.currency; }
        if ("offer_type" in b) { if (!OFFER_TYPES.includes(b.offer_type)) return json({ error: "offer_type must be one of " + OFFER_TYPES.join(", ") }, 400); cur.offer_type = b.offer_type; }
        await db.prepare("INSERT INTO settings(user, data) VALUES(?1,?2) ON CONFLICT(user) DO UPDATE SET data=excluded.data").bind(user, JSON.stringify(cur)).run();
        return json(cur);
      }
    }
    if (path === "/api/sheets" && request.method === "GET")
      return json((await db.prepare("SELECT tool, updated_at, json_array_length(rows) AS n FROM sheets WHERE user=?1 ORDER BY tool").bind(user).all()).results);
    const sm = path.match(/^\/api\/sheets\/([^/]+)$/);
    if (sm && !TOOLS[sm[1]]) return json({ error: `unknown tool '${sm[1]}'`, tools: Object.keys(TOOLS).sort() }, 404);
    if (sm && request.method === "GET") {
      const r = await db.prepare("SELECT rows, updated_at FROM sheets WHERE user=?1 AND tool=?2").bind(user, sm[1]).first();
      const rows = r ? JSON.parse(r.rows) : [], out = { tool: sm[1], rows, updated_at: r ? r.updated_at : null };
      if (u.searchParams.get("raw") !== "1") { const t = TOOLS[sm[1]]; out.computed = rows.map(x => computeRow(t, x)); out.kpis = kpis(t, rows); }
      return json(out);
    }
    if (sm && request.method === "PUT") {
      // Accept a bare JSON array of row objects, or {"rows": [...], "base_updated_at": "..."}.
      const b = await request.json().catch(() => null);
      let rows = null, base = request.headers.get("If-Match");
      if (Array.isArray(b)) rows = b; else if (b && typeof b === "object") { rows = b.rows; if (b.base_updated_at) base = b.base_updated_at; }
      if (!Array.isArray(rows) || rows.length > 5000 || !rows.every(r => r && typeof r === "object" && !Array.isArray(r)))
        return json({ error: 'body must be a JSON array of row objects, or {"rows": [...]} (max 5000 rows)' }, 400);
      const keys = new Set(TOOLS[sm[1]].columns.filter(c => c.type !== "formula").map(c => c.key));
      rows = rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => keys.has(k))));
      const cur = await db.prepare("SELECT updated_at FROM sheets WHERE user=?1 AND tool=?2").bind(user, sm[1]).first();
      if (base && (cur ? cur.updated_at : "") !== base.replace(/"/g, ""))
        return json({ error: "conflict: sheet changed since base_updated_at; reload and retry", updated_at: cur ? cur.updated_at : null }, 409);
      const t = nowMs();
      await db.prepare("INSERT INTO sheets(user, tool, rows, updated_at) VALUES(?1,?2,?3,?4) ON CONFLICT(user, tool) DO UPDATE SET rows=excluded.rows, updated_at=excluded.updated_at")
        .bind(user, sm[1], JSON.stringify(rows), t).run();
      return json({ ok: true, updated_at: t, n: rows.length });
    }

    if (request.method === "GET") {
      if (path === "/api/posts") {
        const st = u.searchParams.get("status"), due = u.searchParams.get("due") === "1";
        let q = "SELECT * FROM posts", w = ["ws=?1"], a = [ws];
        if (st) { w.push(`status=?${a.length + 1}`); a.push(st); }
        if (due) w.push("status='approved'");
        if (w.length) q += " WHERE " + w.join(" AND ");
        q += " ORDER BY scheduled_at, id";
        let rs = (await db.prepare(q).bind(...a).all()).results.map(row);
        if (due) rs = rs.filter(p => p.scheduled_at && new Date(p.scheduled_at) <= new Date());
        return json(rs);
      }
      const m = path.match(/^\/api\/(posts|image)\/([^/]+)$/);
      if (m) {
        const p = await getPost(db, ws, decodeURIComponent(m[2]));
        if (m[1] === "posts") return p ? json(p) : json({ error: "not found" }, 404);
        if (p && /^https:\/\//.test(p.image_path || "")) return Response.redirect(p.image_path, 302);
        return json({ error: "no image" }, 404);
      }
      return json({ error: "not found" }, 404);
    }

    if (request.method === "POST") {
      const b = await request.json().catch(() => null);
      if (!b || typeof b !== "object" || Array.isArray(b)) return json({ error: "body must be a JSON object" }, 400);
      if (path === "/api/posts") return json(await upsert(db, ws, b));
      if (path === "/api/bulk_approve" || path === "/api/bulk") {
        const action = path === "/api/bulk_approve" ? "approve" : b.action;
        if (!["approve", "skip"].includes(action)) return json({ error: "action must be approve or skip" }, 400);
        const ids = [];
        for (const i of b.ids || []) { const p = await ownerAction(db, ws, i, action); if (p) ids.push(p.id); }
        return json(path === "/api/bulk_approve" ? { approved: ids } : { ok: true, action, ids });
      }
      const m = path.match(/^\/api\/posts\/([^/]+)\/([a-z_]+)$/);
      if (m) {
        let r;
        if (m[2] === "update") { const p = await getPost(db, ws, m[1]); r = p && await update(db, ws, p.id, clean(b)); }
        else r = await ownerAction(db, ws, m[1], m[2], b);
        return r ? json(r) : json({ error: "not found" }, 404);
      }
    }
    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e.message || e) }, 400);
  }
}
