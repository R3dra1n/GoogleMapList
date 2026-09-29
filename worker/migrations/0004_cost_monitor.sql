CREATE TABLE monitor_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE usage_alerts (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0);
CREATE INDEX usage_alerts_pending ON usage_alerts(status,next_attempt);
