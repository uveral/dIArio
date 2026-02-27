"use client";

import { useEffect, useMemo, useState } from "react";

import type { DeadManState } from "@/lib/types";

const GRACE_HOURS = 36;
const WARNING_HOURS = 6;

export function useDeadManSwitch(initialCheckedAt: Date) {
  const [lastCheckIn, setLastCheckIn] = useState<Date>(initialCheckedAt);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const derived = useMemo(() => {
    const elapsedMs = now.getTime() - lastCheckIn.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const remainingHours = Math.max(0, GRACE_HOURS - elapsedHours);
    const state: DeadManState =
      remainingHours <= 0
        ? "triggered"
        : remainingHours <= WARNING_HOURS
          ? "warning"
          : "armed";
    return { remainingHours, state };
  }, [lastCheckIn, now]);

  return {
    graceHours: GRACE_HOURS,
    warningHours: WARNING_HOURS,
    lastCheckIn,
    remainingHours: derived.remainingHours,
    state: derived.state,
    ping: () => setLastCheckIn(new Date()),
  };
}
