CREATE TABLE notification_outbox (
 recommendation_id TEXT PRIMARY KEY,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 first_attempt INTEGER,
 provider_id TEXT,
 last_error TEXT
);
CREATE TRIGGER queue_recommendation_notification AFTER INSERT ON recommendations
BEGIN
 INSERT OR IGNORE INTO notification_outbox(recommendation_id) VALUES (NEW.id);
END;
CREATE TRIGGER remove_recommendation_notification AFTER DELETE ON recommendations
BEGIN
 DELETE FROM notification_outbox WHERE recommendation_id = OLD.id;
END;
