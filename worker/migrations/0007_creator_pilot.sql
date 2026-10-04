-- Published snapshots are separate from private profile/media drafts.
CREATE TABLE pilot_profiles (
 user_id TEXT PRIMARY KEY REFERENCES creator_users(id),
 creator_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL,
 visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN (0,1)), published_at INTEGER NOT NULL
);
CREATE TABLE pilot_media (
 user_id TEXT NOT NULL REFERENCES creator_users(id), slot TEXT NOT NULL,
 mime TEXT NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(user_id,slot)
);
CREATE TABLE pilot_lists (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES creator_users(id),
 draft TEXT NOT NULL, published TEXT,
 visible INTEGER NOT NULL DEFAULT 0 CHECK(visible IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL, published_at INTEGER
);
CREATE INDEX pilot_lists_owner ON pilot_lists(user_id);
CREATE INDEX pilot_lists_feed ON pilot_lists(visible,published_at);
