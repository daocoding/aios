-- aiOS Content Review: D1 schema (same model as the Python app)
CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE,
  account TEXT NOT NULL DEFAULT '@your_account', pillar TEXT,
  scheduled_at TEXT, text TEXT NOT NULL DEFAULT '', parts TEXT,
  image_path TEXT, status TEXT NOT NULL DEFAULT 'draft',
  owner_comment TEXT, operator_note TEXT, posted_url TEXT, edited_by_owner INTEGER DEFAULT 0,
  created_at TEXT, updated_at TEXT, approved_at TEXT, posted_at TEXT);
CREATE INDEX IF NOT EXISTS posts_status ON posts(status, scheduled_at);
