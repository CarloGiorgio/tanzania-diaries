-- Comments table for the Tanzania Diaries.
-- Create it once after the D1 database exists (see README.md).

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    TEXT    NOT NULL,          -- the post's URL path, e.g. /2026/07/08/rientro-dalle-vacanze/
  name       TEXT    NOT NULL,          -- display name, or "Anonymous"
  body       TEXT    NOT NULL,          -- the comment text
  status     TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved'
  created_at INTEGER NOT NULL           -- Unix ms
);

CREATE INDEX IF NOT EXISTS idx_post_status ON comments (post_id, status);
CREATE INDEX IF NOT EXISTS idx_status ON comments (status);
