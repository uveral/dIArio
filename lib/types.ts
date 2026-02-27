export type JournalEntry = {
  id: string;
  content: string;
  date: string;
  createdAtTs: number;
  audioUrl?: string;
  audioKey?: string | null;
  isPendingTranscription?: boolean;
};

export type DeadManState = "armed" | "warning" | "triggered";

export type DeadmanSettings = {
  checkInHours: number;
  warningHours: number;
  lastCheckInTs: number;
  ownerEmail: string;
  notifyEmails: string[];
  lastNotifiedStage: number;
};
