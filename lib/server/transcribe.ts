import { getEnv } from "@/lib/server/cloudflare-env";
import { Buffer } from "node:buffer";

type CloudflareTranscriptionResponse = {
  text?: string;
};

export async function transcribeAudioFromR2(audioKey: string) {
  const env = await getEnv();
  if (!env.AI?.run) return "";

  const object = await env.JOURNAL_AUDIO_BUCKET.get(audioKey);
  if (!object) return "";

  const audioBuffer = await new Response(object.body).arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");
  const model = env.CF_WHISPER_MODEL || "@cf/openai/whisper";

  try {
    const result = (await env.AI.run(model, {
      audio: audioBase64,
      language: "es",
      task: "transcribe",
    })) as CloudflareTranscriptionResponse;
    return (result?.text ?? "").trim();
  } catch {
    return "";
  }
}
