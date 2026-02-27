export type JournalEntry = {
  id: string;
  content: string;
  date: Date;
  audioUrl?: string;
};

export type DeadManState = "armed" | "warning" | "triggered";
