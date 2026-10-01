-- Apply only when enabling the creator-account pilot; no existing data is changed.
CREATE TABLE creator_users (
 id TEXT PRIMARY KEY, primary_email TEXT NOT NULL UNIQUE,
 suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1)), created_at INTEGER NOT NULL
);
CREATE TABLE creator_identities (
 provider TEXT NOT NULL CHECK(provider IN ('google','email')), subject TEXT NOT NULL,
 user_id TEXT NOT NULL REFERENCES creator_users(id), email TEXT NOT NULL,
 PRIMARY KEY(provider,subject)
);
CREATE TABLE creator_invitations (email TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)));
CREATE TABLE creator_sessions (
 hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES creator_users(id),
 csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX creator_sessions_expiry ON creator_sessions(expires_at);
CREATE TABLE creator_challenges (
 hash TEXT PRIMARY KEY, kind TEXT NOT NULL, browser_hash TEXT NOT NULL,
 email TEXT, verifier TEXT, target_user TEXT REFERENCES creator_users(id), expires_at INTEGER NOT NULL
);
CREATE INDEX creator_challenges_expiry ON creator_challenges(expires_at);
CREATE TABLE creator_profiles (
 user_id TEXT PRIMARY KEY REFERENCES creator_users(id), creator_id TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', links TEXT NOT NULL DEFAULT '[]',
 version INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
);
CREATE TABLE creator_media (
 user_id TEXT NOT NULL REFERENCES creator_users(id), slot TEXT NOT NULL CHECK(slot IN ('avatar','banner')),
 mime TEXT NOT NULL, bytes BLOB NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,slot)
);
