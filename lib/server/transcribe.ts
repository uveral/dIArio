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
  const model = env.CF_WHISPER_MODEL || "@cf/openai/whisper-large-v3-turbo";

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
    return (result?.text ?? "").trim();
  } catch (error) {
    console.error("Transcription error:", error);
    return "";
  }
}
