-- Upgrade a D1 created before workspaces/open signup (posts.slug was globally UNIQUE).
-- npx wrangler d1 execute <db> --remote --file=migrations/001-workspaces-signup.sql   (run once, inside cloudflare/.deploy)
CREATE TABLE posts_new(
  id INTEGER PRIMARY KEY AUTOINCREMENT, ws TEXT NOT NULL DEFAULT 'team', slug TEXT,
  account TEXT NOT NULL DEFAULT '@your_account', pillar TEXT,
  scheduled_at TEXT, text TEXT NOT NULL DEFAULT '', parts TEXT,
  image_path TEXT, status TEXT NOT NULL DEFAULT 'draft',
  owner_comment TEXT, operator_note TEXT, posted_url TEXT, edited_by_owner INTEGER DEFAULT 0,
  created_at TEXT, updated_at TEXT, approved_at TEXT, posted_at TEXT);
INSERT INTO posts_new(id, slug, account, pillar, scheduled_at, text, parts, image_path, status, owner_comment, operator_note, posted_url, edited_by_owner, created_at, updated_at, approved_at, posted_at)
  SELECT id, slug, account, pillar, scheduled_at, text, parts, image_path, status, owner_comment, operator_note, posted_url, edited_by_owner, created_at, updated_at, approved_at, posted_at FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;
CREATE UNIQUE INDEX IF NOT EXISTS posts_ws_slug ON posts(ws, slug);
CREATE INDEX IF NOT EXISTS posts_status ON posts(ws, status, scheduled_at);
CREATE TABLE IF NOT EXISTS accounts(name TEXT PRIMARY KEY, tok_hash TEXT NOT NULL UNIQUE, created_at TEXT);
CREATE TABLE IF NOT EXISTS signups(ip TEXT NOT NULL, ts INTEGER NOT NULL);
