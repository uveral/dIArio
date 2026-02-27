import { getEnv } from "@/lib/server/cloudflare-env";

let schemaReady = false;

async function runSql(sql: string, bindings?: unknown[]) {
  const env = await getEnv();
  const stmt = env.JOURNAL_DB.prepare(sql);
  return bindings && bindings.length > 0 ? stmt.bind(...bindings).run() : stmt.run();
}

async function addColumnIfMissing(sql: string) {
  const env = await getEnv();
  try {
    await env.JOURNAL_DB.prepare(sql).run();
  } catch (error) {
    const message = String(
      error instanceof Error ? error.message : error,
    ).toLowerCase();
    if (
      !message.includes("duplicate column name") &&
      !message.includes("already exists")
    ) {
      throw error;
    }
  }
}

export async function ensureSchema() {
  if (schemaReady) return;
  await runSql(
    "CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, content TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, audio_key TEXT, audio_duration_sec INTEGER)",
  );
  await runSql(
    "CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC)",
  );
  await runSql(
    "CREATE TABLE IF NOT EXISTS deadman_settings (id INTEGER PRIMARY KEY CHECK (id = 1), check_in_hours INTEGER NOT NULL DEFAULT 720, warning_hours INTEGER NOT NULL DEFAULT 168, last_check_in_ts INTEGER NOT NULL, notify_emails TEXT NOT NULL DEFAULT '', owner_email TEXT NOT NULL DEFAULT '', last_notified_stage INTEGER NOT NULL DEFAULT 0, last_notified_ts INTEGER)",
  );
  await runSql(
    "ALTER TABLE deadman_settings ADD COLUMN owner_email TEXT NOT NULL DEFAULT ''",
  );
  await addColumnIfMissing(
    "ALTER TABLE deadman_settings ADD COLUMN last_notified_stage INTEGER NOT NULL DEFAULT 0",
  );
  await addColumnIfMissing(
    "ALTER TABLE deadman_settings ADD COLUMN last_notified_ts INTEGER",
  );
  await addColumnIfMissing(
    "ALTER TABLE deadman_settings ADD COLUMN check_in_hours INTEGER NOT NULL DEFAULT 720",
  );
  await addColumnIfMissing(
    "ALTER TABLE deadman_settings ADD COLUMN warning_hours INTEGER NOT NULL DEFAULT 168",
  );
  await addColumnIfMissing(
    "ALTER TABLE deadman_settings ADD COLUMN notify_emails TEXT NOT NULL DEFAULT ''",
  );
  await addColumnIfMissing(
    "ALTER TABLE deadman_settings ADD COLUMN last_check_in_ts INTEGER NOT NULL DEFAULT 0",
  );
  await runSql(
    "INSERT OR IGNORE INTO deadman_settings (id, check_in_hours, warning_hours, last_check_in_ts, notify_emails, owner_email, last_notified_stage, last_notified_ts) VALUES (1, 720, 168, ?, '', '', 0, NULL)",
    [Date.now()],
  );

  schemaReady = true;
}
