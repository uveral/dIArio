import { NextResponse } from "next/server";

import { getEnv } from "@/lib/server/cloudflare-env";

type Params = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_req: Request, { params }: Params) {
  const env = await getEnv();
  const parsed = await params;
  const key = decodeURIComponent(parsed.key.join("/"));
  const object = await env.JOURNAL_AUDIO_BUCKET.get(key);

  if (!object) {
    return NextResponse.json({ error: "Audio no encontrado" }, { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
