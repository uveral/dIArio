"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, StickyNote, Mic, Shield } from "lucide-react";

import { DeadmanStatus } from "@/components/deadman-status";
import { EntryCard } from "@/components/entry-card";
import { RecordingIndicator } from "@/components/recording-indicator";
import { Button } from "@/components/ui/button";
import { useDeadManSwitch } from "@/hooks/use-deadman-switch";
import type { JournalEntry } from "@/lib/types";

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: "1",
    content:
      "Hoy sentí más claridad. Cerrar el día escribiendo me ayudó a detectar patrones que antes ignoraba.",
    date: new Date("2026-02-27T22:15:00"),
  },
  {
    id: "2",
    content:
      "Revisión semanal completada. Próximo foco: entrenar consistencia y reducir ruido de notificaciones.",
    date: new Date("2026-02-27T09:40:00"),
    audioUrl:
      "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8d2d8f4f5.mp3?filename=recording-95129.mp3",
  },
  {
    id: "3",
    content:
      "Momento de calma en la tarde. Buenas decisiones cuando freno y respiro antes de responder.",
    date: new Date("2026-02-26T18:03:00"),
  },
];

function toTimeLabel(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Page() {
  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const deadman = useDeadManSwitch(new Date(Date.now() - 9 * 60 * 60 * 1000));

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [entries],
  );

  const saveRecording = () => {
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      content:
        "Nueva entrada de voz procesada. Queda pendiente la transcripción automática en segundo plano.",
      date: new Date(),
    };
    setEntries((prev) => [newEntry, ...prev]);
    setIsRecording(false);
    setSeconds(0);
  };

  const discardRecording = () => {
    setIsRecording(false);
    setSeconds(0);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-zinc-600/10 blur-3xl" />
        <div className="absolute bottom-8 left-0 h-64 w-64 rounded-full bg-zinc-400/10 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-4xl px-4 pb-28 pt-6 sm:px-6">
        <header className="sticky top-4 z-20 mb-6">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/45 px-4 py-3 backdrop-blur-xl">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
              Null Journal
            </h1>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl text-zinc-400 active:scale-95"
              aria-label="Abrir ajustes"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.section
              key="recording-mode"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex min-h-[70vh] items-center justify-center"
            >
              <RecordingIndicator
                durationLabel={toTimeLabel(seconds)}
                onStop={saveRecording}
                onDiscard={discardRecording}
              />
            </motion.section>
          ) : (
            <motion.section
              key="timeline-mode"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="space-y-5"
            >
              <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <StickyNote className="h-3.5 w-3.5" />
                    Timeline
                  </div>
                  <div className="space-y-4">
                    {sorted.map((entry) => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <Shield className="h-3.5 w-3.5" />
                    Seguridad
                  </div>
                  <DeadmanStatus
                    state={deadman.state}
                    remainingHours={deadman.remainingHours}
                    lastCheckIn={deadman.lastCheckIn}
                    onCheckIn={deadman.ping}
                  />
                </section>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </section>

      {!isRecording ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-5">
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.34 }}
            className="pointer-events-auto"
          >
            <Button
              onClick={() => setIsRecording(true)}
              className="h-14 min-w-[220px] rounded-full border border-zinc-700/80 bg-zinc-100 text-zinc-950 shadow-xl shadow-black/40 hover:-translate-y-0.5"
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir Entrada
            </Button>
          </motion.div>
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-5">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-none inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/85 px-4 py-2 backdrop-blur-xl"
          >
            <Mic className="h-4 w-4 text-zinc-200" />
            <span className="text-xs text-zinc-300">Grabando en vivo</span>
          </motion.div>
        </div>
      )}
    </main>
  );
}
