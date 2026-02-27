CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  audio_key TEXT,
  audio_duration_sec INTEGER
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);

CREATE TABLE IF NOT EXISTS deadman_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  check_in_hours INTEGER NOT NULL DEFAULT 720,
  warning_hours INTEGER NOT NULL DEFAULT 168,
  last_check_in_ts INTEGER NOT NULL,
  notify_emails TEXT NOT NULL DEFAULT '',
  owner_email TEXT NOT NULL DEFAULT '',
  last_notified_stage INTEGER NOT NULL DEFAULT 0,
  last_notified_ts INTEGER
);

INSERT OR IGNORE INTO deadman_settings (
  id,
  check_in_hours,
  warning_hours,
  last_check_in_ts,
  notify_emails,
  owner_email,
  last_notified_stage,
  last_notified_ts
) VALUES (1, 720, 168, unixepoch() * 1000, '', '', 0, NULL);
