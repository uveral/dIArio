import { NextResponse } from "next/server";

import { ensureSchema } from "@/lib/server/db";
import { getEnv } from "@/lib/server/cloudflare-env";

type DeadmanRow = {
  check_in_hours: number;
  warning_hours: number;
  last_check_in_ts: number;
  notify_emails: string;
  owner_email: string;
  last_notified_stage: number;
};

function parseEmails(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

async function getOrCreateSettings() {
  await ensureSchema();
  const env = await getEnv();
  let result = await env.JOURNAL_DB.prepare(
    "SELECT check_in_hours, warning_hours, last_check_in_ts, notify_emails, owner_email, last_notified_stage FROM deadman_settings WHERE id = 1",
  ).first();
  let typed = result as DeadmanRow | null;

  if (!typed) {
    const now = Date.now();
    await env.JOURNAL_DB.prepare(
      "INSERT INTO deadman_settings (id, check_in_hours, warning_hours, last_check_in_ts, notify_emails, owner_email, last_notified_stage, last_notified_ts) VALUES (1, 720, 168, ?, '', '', 0, NULL)",
    )
      .bind(now)
      .run();
    typed = {
      check_in_hours: 720,
      warning_hours: 168,
      last_check_in_ts: now,
      notify_emails: "",
      owner_email: "",
      last_notified_stage: 0,
    };
  }

  return { env, row: typed };
}

export async function GET() {
  const { row } = await getOrCreateSettings();
  const now = Date.now();
  const elapsedHours = (now - row.last_check_in_ts) / 3600000;
  const remainingHours = Math.max(0, row.check_in_hours - elapsedHours);
  const state =
    remainingHours <= 0 ? "triggered" : remainingHours <= row.warning_hours ? "warning" : "armed";

  return NextResponse.json({
    state,
    remainingHours,
    settings: {
      checkInHours: row.check_in_hours,
      warningHours: row.warning_hours,
      lastCheckInTs: row.last_check_in_ts,
      ownerEmail: row.owner_email,
      notifyEmails: parseEmails(row.notify_emails),
      lastNotifiedStage: row.last_notified_stage,
    },
  });
}

export async function PUT(req: Request) {
  const { env, row } = await getOrCreateSettings();
  const body = (await req.json()) as {
    ownerEmail?: string;
    notifyEmails?: string[];
  };
  const ownerEmail = (body.ownerEmail ?? row.owner_email).trim();
  const notifyEmails = Array.isArray(body.notifyEmails)
    ? body.notifyEmails.map((x) => x.trim()).filter(Boolean)
    : parseEmails(row.notify_emails);

  await env.JOURNAL_DB.prepare(
    "UPDATE deadman_settings SET owner_email = ?, notify_emails = ? WHERE id = 1",
  )
    .bind(ownerEmail, notifyEmails.join(","))
    .run();

  return NextResponse.json({ ok: true });
}
