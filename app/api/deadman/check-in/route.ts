import { NextResponse } from "next/server";

import { getEnv } from "@/lib/server/cloudflare-env";

export async function POST() {
  const env = await getEnv();
  const now = Date.now();

  await env.JOURNAL_DB.prepare(
    "UPDATE deadman_settings SET last_check_in_ts = ? WHERE id = 1",
  )
    .bind(now)
    .run();

  return NextResponse.json({ ok: true, lastCheckInTs: now });
}
