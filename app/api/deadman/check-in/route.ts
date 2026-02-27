import { NextResponse } from "next/server";

import { ensureSchema } from "@/lib/server/db";
import { getEnv } from "@/lib/server/cloudflare-env";

export async function POST() {
  await ensureSchema();
  const env = await getEnv();
  const now = Date.now();

  await env.JOURNAL_DB.prepare(
    "UPDATE deadman_settings SET last_check_in_ts = ?, last_notified_stage = 0, last_notified_ts = NULL WHERE id = 1",
  )
    .bind(now)
    .run();

  return NextResponse.json({ ok: true, lastCheckInTs: now });
}
