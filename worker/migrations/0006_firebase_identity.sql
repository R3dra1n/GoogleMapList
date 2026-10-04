-- Separate identity namespace; preserves previous pilot identities without auto-linking by email.
CREATE TABLE creator_firebase_identities (
 provider TEXT NOT NULL DEFAULT 'firebase' CHECK(provider='firebase'),
 subject TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES creator_users(id), email TEXT NOT NULL
);
CREATE INDEX creator_firebase_user ON creator_firebase_identities(user_id);
