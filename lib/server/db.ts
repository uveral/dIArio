import { getEnv } from "@/lib/server/cloudflare-env";

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  const env = await getEnv();

  await env.JOURNAL_DB.batch([
    env.JOURNAL_DB.prepare(
      "CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, content TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, audio_key TEXT, audio_duration_sec INTEGER)",
    ),
    env.JOURNAL_DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC)",
    ),
    env.JOURNAL_DB.prepare(
      "CREATE TABLE IF NOT EXISTS deadman_settings (id INTEGER PRIMARY KEY CHECK (id = 1), check_in_hours INTEGER NOT NULL DEFAULT 48, warning_hours INTEGER NOT NULL DEFAULT 6, last_check_in_ts INTEGER NOT NULL, notify_emails TEXT NOT NULL DEFAULT '')",
    ),
    env.JOURNAL_DB.prepare(
      "INSERT OR IGNORE INTO deadman_settings (id, check_in_hours, warning_hours, last_check_in_ts, notify_emails) VALUES (1, 48, 6, ?, '')",
    ).bind(Date.now()),
  ]);

  schemaReady = true;
}
