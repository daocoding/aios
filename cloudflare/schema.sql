-- aiOS Content Review: D1 schema (same model as the Python app)
-- ws = review-queue workspace: 'team' for OWNER_TOKEN users, 'u:<name>' for signed-up accounts (OPEN_SIGNUP=1)
CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT, ws TEXT NOT NULL DEFAULT 'team', slug TEXT,
  account TEXT NOT NULL DEFAULT '@your_account', pillar TEXT,
  scheduled_at TEXT, text TEXT NOT NULL DEFAULT '', parts TEXT,
  image_path TEXT, status TEXT NOT NULL DEFAULT 'draft',
  owner_comment TEXT, operator_note TEXT, posted_url TEXT, edited_by_owner INTEGER DEFAULT 0,
  created_at TEXT, updated_at TEXT, approved_at TEXT, posted_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS posts_ws_slug ON posts(ws, slug);
CREATE INDEX IF NOT EXISTS posts_status ON posts(ws, status, scheduled_at);
-- Operating Sheets: one row per (user, tool); rows = JSON array of objects
CREATE TABLE IF NOT EXISTS sheets(
  user TEXT NOT NULL, tool TEXT NOT NULL, rows TEXT NOT NULL DEFAULT '[]', updated_at TEXT,
  PRIMARY KEY(user, tool));

CREATE TABLE IF NOT EXISTS settings(user TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS login_fails(ip TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_fails_ip ON login_fails(ip);
-- Open signup (OPEN_SIGNUP=1): passcodes are stored only as SHA-256 hashes
CREATE TABLE IF NOT EXISTS accounts(name TEXT PRIMARY KEY, tok_hash TEXT NOT NULL UNIQUE, created_at TEXT);
CREATE TABLE IF NOT EXISTS signups(ip TEXT NOT NULL, ts INTEGER NOT NULL);
