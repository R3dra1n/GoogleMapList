CREATE TABLE IF NOT EXISTS recommendations (
 id TEXT PRIMARY KEY,
 payload_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 country TEXT NOT NULL,
 city TEXT NOT NULL,
 name TEXT NOT NULL,
 category TEXT NOT NULL,
 map_url TEXT NOT NULL,
 reason TEXT NOT NULL,
 email TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','dismissed'))
);
CREATE INDEX IF NOT EXISTS recommendations_status_date ON recommendations(status,created_at DESC);
CREATE TABLE IF NOT EXISTS submission_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
