-- Shared, licensed Wikimedia metadata. Private uploads remain scoped to their list.
CREATE TABLE place_photo_cache (
 place_key TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 lat REAL,
 lng REAL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','ready','missing','failed')),
 photo TEXT,
 checked_at INTEGER NOT NULL DEFAULT 0,
 lease TEXT NOT NULL DEFAULT '',
 lease_until INTEGER NOT NULL DEFAULT 0,
 retry_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX place_photo_queue ON place_photo_cache(state,retry_at,lease_until);
ALTER TABLE saved_map_places ADD COLUMN photo_queued_at INTEGER NOT NULL DEFAULT 0;
CREATE TABLE place_photo_overrides (
 list_key TEXT NOT NULL,
 place_key TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('upload','hidden')),
 image TEXT,
 credit TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL DEFAULT '',
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(list_key,place_key)
);
