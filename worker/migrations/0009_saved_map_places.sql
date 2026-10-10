-- Durable map snapshots. Public page reads never trigger source fetches.
CREATE TABLE saved_map_places (
 source_url TEXT PRIMARY KEY,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','ready','failed')),
 payload TEXT,
 fetched_at INTEGER,
 queued_at INTEGER NOT NULL,
 lease_until INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0,
 retry_at INTEGER NOT NULL DEFAULT 0,
 error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX saved_map_places_queue ON saved_map_places(state,retry_at,queued_at);
