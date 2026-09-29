CREATE INDEX IF NOT EXISTS submission_limits_expiry ON submission_limits(expires_at);
CREATE TABLE usage_daily(day TEXT NOT NULL, metric TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,metric));
CREATE TABLE list_visitors(list_id TEXT NOT NULL, visitor TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, saved INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(list_id,visitor));
CREATE TABLE list_totals(list_id TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0, saved INTEGER NOT NULL DEFAULT 0);
CREATE TRIGGER list_insert AFTER INSERT ON list_visitors BEGIN
 INSERT INTO list_totals(list_id,used,saved) VALUES(NEW.list_id,NEW.used,NEW.saved) ON CONFLICT(list_id) DO UPDATE SET used=used+NEW.used,saved=saved+NEW.saved;
END;
CREATE TRIGGER list_update AFTER UPDATE ON list_visitors BEGIN
 UPDATE list_totals SET used=used+NEW.used-OLD.used,saved=saved+NEW.saved-OLD.saved WHERE list_id=NEW.list_id;
END;
