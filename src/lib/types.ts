export type EnrichmentStatus = "PENDING" | "ENRICHED_TIER1" | "ENRICHED_TIER2" | "FAILED";
export type BatchStatus = "PENDING_MAPPING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ConversationStarter {
  text: string;
  theme: string;
}

export interface CareerEvent {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  description?: string;
}

export interface AttendeeDTO {
  id: string;
  batchId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  company: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  headshotUrl: string | null;
  interests: string[];
  bioNotes: string | null;
  careerHistory: CareerEvent[] | null;
  enrichmentStatus: EnrichmentStatus;
  enrichmentTier: number | null;
  enrichmentError: string | null;
  timelineWins: string[] | null;
  generatedBio: string | null;
  conversationStarters: ConversationStarter[] | null;
  bioStyle: string | null;
  bioLength: string | null;
  generatedAt: string | null;
}

export interface BatchDTO {
  id: string;
  fileName: string;
  status: BatchStatus;
  rawRowCount: number;
  errorMessage: string | null;
  attendees: AttendeeDTO[];
  createdAt: string;
}
