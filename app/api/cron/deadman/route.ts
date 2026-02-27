import { NextResponse } from "next/server";

import { ensureSchema } from "@/lib/server/db";
import { getEnv } from "@/lib/server/cloudflare-env";

type Row = {
  check_in_hours: number;
  warning_hours: number;
  last_check_in_ts: number;
  notify_emails: string;
};

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export async function POST(req: Request) {
  await ensureSchema();
  const env = await getEnv();
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!env.CRON_SECRET || token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await env.JOURNAL_DB.prepare(
    "SELECT check_in_hours, warning_hours, last_check_in_ts, notify_emails FROM deadman_settings WHERE id = 1",
  ).first();
  const typed = row as Row | null;

  if (!typed) {
    return NextResponse.json({ ok: true, skipped: "no_settings" });
  }

  const now = Date.now();
  const elapsedHours = (now - typed.last_check_in_ts) / 3600000;
  const isTriggered = elapsedHours >= typed.check_in_hours;

  if (!isTriggered) {
    return NextResponse.json({ ok: true, state: "armed" });
  }

  const dbEmails = (typed.notify_emails ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const envEmails = (env.DEADMAN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const emails = [...new Set([...dbEmails, ...envEmails])];

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || emails.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Faltan RESEND_API_KEY/RESEND_FROM_EMAIL o correos destino.",
    });
  }

  await sendResendEmail({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
    to: emails,
    subject: "Dead Man's Switch activado - Null Journal",
    html: `
      <h2>Alerta de inactividad</h2>
      <p>El Dead Man's Switch se ha activado.</p>
      <p>Ultimo check-in: ${new Date(typed.last_check_in_ts).toISOString()}</p>
      <p>Tiempo configurado: ${typed.check_in_hours} horas</p>
    `,
  });

  return NextResponse.json({ ok: true, state: "triggered", notified: emails.length });
}
