import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AudioLines, Clock3 } from "lucide-react";

import type { JournalEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntryCardProps = {
  entry: JournalEntry;
};

export function EntryCard({ entry }: EntryCardProps) {
  return (
    <Card className="rounded-2xl bg-zinc-900/45 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-zinc-300">
          <span>
            {format(entry.date, "EEEE, d 'de' MMMM", {
              locale: es,
            })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-500">
            <Clock3 className="h-3.5 w-3.5" />
            {format(entry.date, "HH:mm")}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <p className="text-sm leading-relaxed text-zinc-200/95">{entry.content}</p>

        {entry.audioUrl ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/65 px-3 py-2">
            <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
              <AudioLines className="h-3.5 w-3.5" />
              Audio original
            </div>
            <audio
              controls
              className="h-8 w-full opacity-85"
              preload="metadata"
              src={entry.audioUrl}
            >
              Tu navegador no soporta audio.
            </audio>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
