export interface CareerEvent {
  title: string;
  company: string;
  startDate: string | null; // ISO date string or null if unknown
  endDate: string | null; // null = current role
  description?: string;
}

export interface EnrichmentInput {
  firstName: string;
  lastName: string;
  email: string;
}

export interface EnrichmentResult {
  success: boolean;
  tier: 1 | 2 | null;
  jobTitle: string | null;
  company: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  headshotUrl: string | null;
  interests: string[];
  bioNotes: string | null;
  careerHistory: CareerEvent[];
  error: string | null;
}

export interface EnrichmentProvider {
  name: string;
  enrich(input: EnrichmentInput): Promise<EnrichmentResult>;
}

export function emptyResult(error: string | null = null): EnrichmentResult {
  return {
    success: false,
    tier: null,
    jobTitle: null,
    company: null,
    industry: null,
    linkedinUrl: null,
    headshotUrl: null,
    interests: [],
    bioNotes: null,
    careerHistory: [],
    error,
  };
}

/**
 * A result counts as "incomplete" for waterfall purposes if we're missing
 * the core professional identity fields a recipient would expect.
 * This is what triggers fallthrough to tier 2.
 */
export function isIncomplete(result: EnrichmentResult): boolean {
  if (!result.success) return true;
  return !result.jobTitle || !result.company;
}
