import { getEnv } from "@/lib/server/cloudflare-env";
import { Buffer } from "node:buffer";

type CloudflareTranscriptionResponse = {
  text?: string;
};

export type TranscriptionDebug = {
  ok: boolean;
  model: string;
  textLength: number;
  error?: string;
};

export async function transcribeAudioFromR2(audioKey: string) {
  const env = await getEnv();
  const model = env.CF_WHISPER_MODEL || "@cf/openai/whisper-large-v3-turbo";
  if (!env.AI?.run) {
    return {
      text: "",
      debug: { ok: false, model, textLength: 0, error: "AI binding no disponible" } as TranscriptionDebug,
    };
  }

  const object = await env.JOURNAL_AUDIO_BUCKET.get(audioKey);
  if (!object) {
    return {
      text: "",
      debug: { ok: false, model, textLength: 0, error: "Audio no encontrado en R2" } as TranscriptionDebug,
    };
  }

  const audioBuffer = await new Response(object.body).arrayBuffer();

  try {
    const input = model.includes("whisper-large-v3-turbo")
      ? {
          audio: Buffer.from(audioBuffer).toString("base64"),
          language: "es",
          task: "transcribe",
        }
      : {
          audio: [...new Uint8Array(audioBuffer)],
        };

    const result = (await env.AI.run(model, input)) as CloudflareTranscriptionResponse;
    const text = (result?.text ?? "").trim();
    return {
      text,
      debug: { ok: text.length > 0, model, textLength: text.length } as TranscriptionDebug,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Transcription error:", message);
    return {
      text: "",
      debug: { ok: false, model, textLength: 0, error: message } as TranscriptionDebug,
    };
  }
}
