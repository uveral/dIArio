import { NextResponse } from "next/server";

import { ensureSchema } from "@/lib/server/db";
import { getEnv } from "@/lib/server/cloudflare-env";

type EntryRow = {
  id: string;
  content: string;
  created_at: number;
  audio_key: string | null;
};

function mapRow(row: EntryRow) {
  return {
    id: row.id,
    content: row.content,
    createdAtTs: row.created_at,
    date: new Date(row.created_at).toISOString(),
    audioKey: row.audio_key,
    audioUrl: row.audio_key ? `/api/audio/${encodeURIComponent(row.audio_key)}` : undefined,
  };
}

export async function GET() {
  await ensureSchema();
  const env = await getEnv();
  const result = await env.JOURNAL_DB.prepare(
    "SELECT id, content, created_at, audio_key FROM entries ORDER BY created_at DESC LIMIT 200",
  ).all();
  const rows = (result.results ?? []) as EntryRow[];

  return NextResponse.json({ entries: rows.map(mapRow) });
}

export async function POST(req: Request) {
  await ensureSchema();
  const env = await getEnv();
  const body = (await req.json()) as {
    content?: string;
    audioKey?: string | null;
    audioDurationSec?: number | null;
  };

  const content = (body.content ?? "").trim();
  const audioKey = body.audioKey ?? null;
  const audioDurationSec =
    typeof body.audioDurationSec === "number" ? Math.max(0, Math.floor(body.audioDurationSec)) : null;

  if (!content && !audioKey) {
    return NextResponse.json(
      { error: "Debes enviar texto o audio." },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await env.JOURNAL_DB.prepare(
    "INSERT INTO entries (id, content, created_at, audio_key, audio_duration_sec) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(id, content, createdAt, audioKey, audioDurationSec)
    .run();

  const row: EntryRow = {
    id,
    content,
    created_at: createdAt,
    audio_key: audioKey,
  };

  return NextResponse.json({ entry: mapRow(row) }, { status: 201 });
}
