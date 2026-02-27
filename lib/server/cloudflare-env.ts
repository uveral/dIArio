import { getCloudflareContext } from "@opennextjs/cloudflare";

export type CloudflareEnv = {
  JOURNAL_DB: any;
  JOURNAL_AUDIO_BUCKET: any;
  AI?: {
    run: (model: string, input: unknown) => Promise<any>;
  };
  CRON_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  DEADMAN_NOTIFY_EMAILS?: string;
  APP_URL?: string;
  CF_WHISPER_MODEL?: string;
};

export async function getEnv() {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env as CloudflareEnv;
  } catch {
    const ctx = getCloudflareContext();
    return ctx.env as CloudflareEnv;
  }
}
