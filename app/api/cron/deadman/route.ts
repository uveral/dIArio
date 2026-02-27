import { NextResponse } from "next/server";

import { ensureSchema } from "@/lib/server/db";
import { getEnv } from "@/lib/server/cloudflare-env";

type Row = {
  check_in_hours: number;
  last_check_in_ts: number;
  owner_email: string;
  notify_emails: string;
  last_notified_stage: number;
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
    "SELECT check_in_hours, last_check_in_ts, owner_email, notify_emails, last_notified_stage FROM deadman_settings WHERE id = 1",
  ).first();
  const typed = row as Row | null;

  if (!typed) {
    return NextResponse.json({ ok: true, skipped: "no_settings" });
  }

  const now = Date.now();
  const elapsedHours = (now - typed.last_check_in_ts) / 3600000;
  const elapsedMonths = Math.floor(elapsedHours / 720);
  const stage = Math.min(6, Math.max(0, elapsedMonths));

  if (stage < 1) {
    return NextResponse.json({ ok: true, state: "armed" });
  }
  if (stage <= typed.last_notified_stage) {
    return NextResponse.json({ ok: true, state: "already_notified", stage });
  }

  const dbEmails = (typed.notify_emails ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const envEmails = (env.DEADMAN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const notifyEmails = [...new Set([...dbEmails, ...envEmails])];
  const ownerEmail = typed.owner_email?.trim();
  const webUrl = env.APP_URL || "https://diario.javilocarretero.workers.dev";

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return NextResponse.json({
      ok: false,
      error: "Faltan RESEND_API_KEY o RESEND_FROM_EMAIL.",
    });
  }

  if (stage < 6) {
    if (!ownerEmail) {
      return NextResponse.json({
        ok: false,
        error: "Configura tu email en Ajustes para avisos mensuales.",
      });
    }
    await sendResendEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: [ownerEmail],
      subject: `Recordatorio Dead Man's Switch - mes ${stage}/6`,
      html: `
        <h2>Sin actividad detectada</h2>
        <p>Llevas ${stage} mes(es) sin actividad en Null Journal.</p>
        <p>Entra y haz check-in para detener la secuencia.</p>
        <p><a href="${webUrl}">${webUrl}</a></p>
      `,
    });
  } else {
    if (notifyEmails.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No hay correos destino configurados para el mes 6.",
      });
    }
    await sendResendEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: notifyEmails,
      subject: "Dead Man's Switch: acceso enviado (mes 6)",
      html: `
        <h2>Dead Man's Switch activado - mes 6</h2>
        <p>Se alcanzaron 6 meses sin actividad del propietario.</p>
        <p>Acceso web:</p>
        <p><a href="${webUrl}">${webUrl}</a></p>
      `,
    });
  }

  await env.JOURNAL_DB.prepare(
    "UPDATE deadman_settings SET last_notified_stage = ?, last_notified_ts = ? WHERE id = 1",
  )
    .bind(stage, now)
    .run();

  return NextResponse.json({ ok: true, stage });
}
