-- Independent of author visibility: authors cannot republish a moderated list.
CREATE TABLE list_moderation (
 list_id TEXT PRIMARY KEY REFERENCES pilot_lists(id),
 hidden INTEGER NOT NULL CHECK(hidden IN (0,1)), reason TEXT NOT NULL,
 revision INTEGER NOT NULL, action_id TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE list_moderation_log (
 action_id TEXT PRIMARY KEY, list_id TEXT NOT NULL,
 hidden INTEGER NOT NULL, reason TEXT NOT NULL, actor TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX list_moderation_log_list ON list_moderation_log(list_id,created_at);
