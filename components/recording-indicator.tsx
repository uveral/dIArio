"use client";

import { Mic, Pause, Square } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RecordingIndicatorProps = {
  durationLabel: string;
  onStop?: () => void;
  onDiscard?: () => void;
};

export function RecordingIndicator({
  durationLabel,
  onStop,
  onDiscard,
}: RecordingIndicatorProps) {
  return (
    <Card className="w-full max-w-md rounded-3xl border-zinc-800 bg-zinc-900/60 p-1 backdrop-blur-2xl">
      <CardContent className="space-y-8 px-6 py-10">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Modo escucha
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            Grabando entrada
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Habla con naturalidad. El audio se cifra antes de almacenarse.
          </p>
          <p className="mt-3 text-xs text-zinc-500">Duracion {durationLabel}</p>
        </div>

        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              className="absolute h-28 w-28 rounded-full border border-zinc-400/30"
              animate={{
                scale: [1, 1.45],
                opacity: [0.55, 0],
              }}
              transition={{
                duration: 2.2,
                ease: "easeOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 0,
                delay: ring * 0.45,
              }}
            />
          ))}

          <motion.div
            animate={{ scale: [1, 1.07, 1] }}
            transition={{
              duration: 1.4,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
            className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-700 bg-zinc-100 text-zinc-900 shadow-xl shadow-black/40"
          >
            <Mic className="h-8 w-8" />
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onDiscard}
            className="h-11 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98]"
          >
            <Square className="mr-2 h-4 w-4" />
            Descartar
          </Button>
          <Button
            onClick={onStop}
            className="h-11 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-white active:scale-[0.98]"
          >
            <Pause className="mr-2 h-4 w-4" />
            Pausar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
