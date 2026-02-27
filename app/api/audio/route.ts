import { NextResponse } from "next/server";

import { getEnv } from "@/lib/server/cloudflare-env";

export async function POST(req: Request) {
  const env = await getEnv();
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo de audio." }, { status: 400 });
  }

  const safeExt = file.type.includes("ogg")
    ? "ogg"
    : file.type.includes("mp4")
      ? "m4a"
      : "webm";
  const key = `audio/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;
  const body = await file.arrayBuffer();

  await env.JOURNAL_AUDIO_BUCKET.put(key, body, {
    httpMetadata: {
      contentType: file.type || "audio/webm",
    },
    customMetadata: {
      originalName: file.name || "recording",
    },
  });

  return NextResponse.json({
    key,
    url: `/api/audio/${encodeURIComponent(key)}`,
  });
}
