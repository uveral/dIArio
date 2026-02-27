"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith("null-journal-"))
            .map((k) => caches.delete(k)),
        );
      }
    })();
  }, []);

  return null;
}
