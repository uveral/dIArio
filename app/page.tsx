"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, Save, Settings, Shield, StickyNote } from "lucide-react";

import { DeadmanStatus } from "@/components/deadman-status";
import { EntryCard } from "@/components/entry-card";
import { RecordingIndicator } from "@/components/recording-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeadmanSettings, DeadManState, JournalEntry } from "@/lib/types";

function toTimeLabel(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

type DeadmanApiResponse = {
  state: DeadManState;
  remainingHours: number;
  settings: DeadmanSettings;
};

export default function Page() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deadman, setDeadman] = useState<DeadmanApiResponse | null>(null);
  const [notifyEmailsInput, setNotifyEmailsInput] = useState("");
  const [ownerEmailInput, setOwnerEmailInput] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAtTs - a.createdAtTs),
    [entries],
  );

  const safeJson = async <T,>(res: Response): Promise<T> => {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (!text) {
      throw new Error("Respuesta vacia del servidor.");
    }
    return JSON.parse(text) as T;
  };

  const refreshEntries = async () => {
    const res = await fetch("/api/entries", { cache: "no-store" });
    const data = await safeJson<{ entries: JournalEntry[] }>(res);
    setEntries(data.entries ?? []);
  };

  const refreshDeadman = async () => {
    const res = await fetch("/api/deadman", { cache: "no-store" });
    const data = await safeJson<DeadmanApiResponse>(res);
    setDeadman(data);
    setNotifyEmailsInput((data.settings.notifyEmails ?? []).join(", "));
    setOwnerEmailInput(data.settings.ownerEmail ?? "");
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([refreshEntries(), refreshDeadman()]);
        setErrorMsg(null);
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : "Error cargando datos.");
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const saveTextEntry = async () => {
    const text = content.trim();
    if (!text) return;
    setSaving(true);
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.text();
      setErrorMsg(body || "No se pudo guardar el texto.");
      return;
    }
    setContent("");
    await refreshEntries().catch((e: unknown) =>
      setErrorMsg(e instanceof Error ? e.message : "No se pudo refrescar la lista."),
    );
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    recorder.start(400);
    transcriptRef.current = "";

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let allText = "";
          for (let i = 0; i < event.results.length; i += 1) {
            const text = event.results[i][0]?.transcript ?? "";
            allText += ` ${text}`;
          }
          transcriptRef.current = allText.trim();
        };
        recognition.start();
        speechRef.current = recognition;
      } catch {
        setErrorMsg("No se pudo iniciar la transcripcion en este navegador.");
      }
    }

    setSeconds(0);
    setIsRecording(true);
  };

  const stopAndSaveRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    });
    if (speechRef.current) {
      speechRef.current.stop();
      speechRef.current = null;
    }

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size === 0) {
      setIsRecording(false);
      setSeconds(0);
      return;
    }

    const form = new FormData();
    form.append("file", blob, `recording-${Date.now()}.webm`);
    const uploadRes = await fetch("/api/audio", { method: "POST", body: form });
    if (!uploadRes.ok) {
      setErrorMsg("Fallo al subir el audio.");
      setIsRecording(false);
      setSeconds(0);
      return;
    }

    const upload = await safeJson<{ key: string }>(uploadRes);
    const saveRes = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: transcriptRef.current || "Entrada de voz",
        audioKey: upload.key,
        audioDurationSec: seconds,
      }),
    });
    if (!saveRes.ok) {
      const body = await saveRes.text();
      setErrorMsg(body || "Fallo al guardar la entrada de audio.");
    }

    setIsRecording(false);
    setSeconds(0);
    await refreshEntries().catch((e: unknown) =>
      setErrorMsg(e instanceof Error ? e.message : "No se pudo refrescar la lista."),
    );
  };

  const discardRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
    chunksRef.current = [];
    if (speechRef.current) {
      speechRef.current.stop();
      speechRef.current = null;
    }
    setIsRecording(false);
    setSeconds(0);
  };

  const saveDeadmanSettings = async () => {
    if (!deadman) return;
    const notifyEmails = notifyEmailsInput
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const res = await fetch("/api/deadman", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerEmail: ownerEmailInput.trim(),
        notifyEmails,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      setErrorMsg(body || "No se pudieron guardar los ajustes.");
      return;
    }
    await refreshDeadman().catch((e: unknown) =>
      setErrorMsg(e instanceof Error ? e.message : "No se pudo refrescar ajustes."),
    );
  };

  const checkIn = async () => {
    const res = await fetch("/api/deadman/check-in", { method: "POST" });
    if (!res.ok) {
      setErrorMsg("No se pudo confirmar presencia.");
      return;
    }
    await refreshDeadman().catch((e: unknown) =>
      setErrorMsg(e instanceof Error ? e.message : "No se pudo refrescar estado."),
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-zinc-600/10 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-4xl px-4 pb-10 pt-6 sm:px-6">
        <header className="sticky top-4 z-20 mb-6">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/45 px-4 py-3 backdrop-blur-xl">
            <h1 className="text-lg font-semibold tracking-tight">Null Journal</h1>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Abrir ajustes"
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <section className="space-y-4">
            {errorMsg ? (
              <Card className="rounded-2xl border-rose-700/50 bg-rose-950/30">
                <CardContent className="p-3 text-sm text-rose-200">{errorMsg}</CardContent>
              </Card>
            ) : null}
            <div className="flex items-center gap-2 px-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <StickyNote className="h-3.5 w-3.5" />
              Nueva entrada
            </div>

            <Card className="rounded-2xl bg-zinc-900/50 backdrop-blur-xl">
              <CardContent className="space-y-3 p-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe aquí tu entrada..."
                  className="min-h-32 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-700"
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveTextEntry} disabled={saving || !content.trim()}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar texto
                  </Button>
                  {!isRecording ? (
                    <Button variant="outline" onClick={startRecording}>
                      <Mic className="mr-2 h-4 w-4" />
                      Hablar
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {loading ? (
                <Card className="rounded-2xl bg-zinc-900/40">
                  <CardContent className="p-6 text-sm text-zinc-400">Cargando entradas...</CardContent>
                </Card>
              ) : sorted.length === 0 ? (
                <Card className="rounded-2xl bg-zinc-900/40">
                  <CardContent className="p-6 text-sm text-zinc-400">
                    No hay entradas todavía. Escribe o graba la primera.
                  </CardContent>
                </Card>
              ) : (
                sorted.map((entry) => <EntryCard key={entry.id} entry={entry} />)
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <Shield className="h-3.5 w-3.5" />
              Seguridad
            </div>

            {deadman ? (
              <DeadmanStatus
                state={deadman.state}
                remainingHours={deadman.remainingHours}
                totalHours={deadman.settings.checkInHours}
                lastCheckIn={new Date(deadman.settings.lastCheckInTs)}
                onCheckIn={checkIn}
              />
            ) : null}

            <AnimatePresence>
              {settingsOpen && deadman ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  <Card className="rounded-2xl bg-zinc-900/55 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-sm">Configuracion</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <label className="block text-xs text-zinc-400">
                        Tu email (avisos mes 1 a 5)
                        <input
                          type="email"
                          value={ownerEmailInput}
                          onChange={(e) => setOwnerEmailInput(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-2 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-zinc-400">
                        Politica de seguridad
                        <p className="mt-1 rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-2 text-sm text-zinc-300">
                          Si no hay actividad en 1 mes: email 1. Luego un email cada mes hasta 6.
                          En el mes 6 se envia acceso web a los correos destino.
                        </p>
                      </label>
                      <label className="block text-xs text-zinc-400">
                        Correos destino (separados por coma)
                        <input
                          type="text"
                          value={notifyEmailsInput}
                          onChange={(e) => setNotifyEmailsInput(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-2 text-sm"
                        />
                      </label>
                      <Button onClick={saveDeadmanSettings}>Guardar ajustes</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>
      </section>

      <AnimatePresence>
        {isRecording ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-sm"
          >
            <RecordingIndicator
              durationLabel={toTimeLabel(seconds)}
              onStop={stopAndSaveRecording}
              onDiscard={discardRecording}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
