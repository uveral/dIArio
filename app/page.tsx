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

  const [deadman, setDeadman] = useState<DeadmanApiResponse | null>(null);
  const [notifyEmailsInput, setNotifyEmailsInput] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAtTs - a.createdAtTs),
    [entries],
  );

  const refreshEntries = async () => {
    const res = await fetch("/api/entries", { cache: "no-store" });
    const data = (await res.json()) as { entries: JournalEntry[] };
    setEntries(data.entries ?? []);
  };

  const refreshDeadman = async () => {
    const res = await fetch("/api/deadman", { cache: "no-store" });
    const data = (await res.json()) as DeadmanApiResponse;
    setDeadman(data);
    setNotifyEmailsInput((data.settings.notifyEmails ?? []).join(", "));
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([refreshEntries(), refreshDeadman()]);
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
    if (!res.ok) return;
    setContent("");
    await refreshEntries();
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
      setIsRecording(false);
      setSeconds(0);
      return;
    }

    const upload = (await uploadRes.json()) as { key: string };
    await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "",
        audioKey: upload.key,
        audioDurationSec: seconds,
      }),
    });

    setIsRecording(false);
    setSeconds(0);
    await refreshEntries();
  };

  const discardRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
    chunksRef.current = [];
    setIsRecording(false);
    setSeconds(0);
  };

  const saveDeadmanSettings = async () => {
    if (!deadman) return;
    const notifyEmails = notifyEmailsInput
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    await fetch("/api/deadman", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkInHours: deadman.settings.checkInHours,
        warningHours: deadman.settings.warningHours,
        notifyEmails,
      }),
    });
    await refreshDeadman();
  };

  const checkIn = async () => {
    await fetch("/api/deadman/check-in", { method: "POST" });
    await refreshDeadman();
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
                        Horas maximas sin check-in
                        <input
                          type="number"
                          min={1}
                          value={deadman.settings.checkInHours}
                          onChange={(e) =>
                            setDeadman((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    settings: {
                                      ...prev.settings,
                                      checkInHours: Number(e.target.value || 1),
                                    },
                                  }
                                : prev,
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-2 text-sm"
                        />
                      </label>
                      <label className="block text-xs text-zinc-400">
                        Horas de advertencia
                        <input
                          type="number"
                          min={1}
                          value={deadman.settings.warningHours}
                          onChange={(e) =>
                            setDeadman((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    settings: {
                                      ...prev.settings,
                                      warningHours: Number(e.target.value || 1),
                                    },
                                  }
                                : prev,
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-2 text-sm"
                        />
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
