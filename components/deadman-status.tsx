"use client";

import { formatDistanceStrict } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Siren,
  TimerReset,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeadManState } from "@/lib/types";

type DeadmanStatusProps = {
  state: DeadManState;
  remainingHours: number;
  totalHours: number;
  lastCheckIn: Date;
  onCheckIn: () => void;
};

const STATE_UI = {
  armed: {
    label: "Armado",
    detail: "El sistema está estable y monitoreando actividad.",
    className: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    Icon: ShieldCheck,
  },
  warning: {
    label: "Ventana crítica",
    detail: "Debes confirmar presencia pronto para evitar el disparo.",
    className: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    Icon: AlertTriangle,
  },
  triggered: {
    label: "Disparado",
    detail: "Se activó el protocolo de contingencia configurado.",
    className: "text-rose-300 border-rose-500/30 bg-rose-500/10",
    Icon: Siren,
  },
};

export function DeadmanStatus({
  state,
  remainingHours,
  totalHours,
  lastCheckIn,
  onCheckIn,
}: DeadmanStatusProps) {
  const ui = STATE_UI[state];
  const Icon = ui.Icon;
  const remainingLabel =
    state === "triggered"
      ? "Expirado"
      : formatDistanceStrict(new Date(), new Date(Date.now() + remainingHours * 3600000), {
          locale: es,
        });

  return (
    <Card className="rounded-2xl bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-zinc-200">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-zinc-400" />
            Dead Man&apos;s Switch
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
              ui.className,
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {ui.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-zinc-400">{ui.detail}</p>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>Tiempo restante</span>
            <span>{remainingLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className={cn(
                "h-full rounded-full",
                state === "triggered"
                  ? "bg-rose-400"
                  : state === "warning"
                    ? "bg-amber-400"
                    : "bg-emerald-400",
              )}
              initial={{ width: 0 }}
              animate={{
                width: `${Math.max(0, Math.min(100, (remainingHours / totalHours) * 100))}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <TimerReset className="h-3.5 w-3.5" />
            Ultimo check-in:{" "}
            {formatDistanceStrict(lastCheckIn, new Date(), {
              locale: es,
              addSuffix: true,
            })}
          </span>
          <Button
            onClick={onCheckIn}
            size="sm"
            className="rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white"
          >
            Confirmar presencia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
