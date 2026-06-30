import { EnrichmentInput, EnrichmentResult, isIncomplete } from "./types";
import { MockEnrichmentProvider } from "./mock-provider";
import { ApifyEnrichmentProvider } from "./apify-provider";
import { WebScanEnrichmentProvider } from "./web-scan-provider";

function isMockMode(): boolean {
  // Mock mode is the safe default: if no Apify token is present we cannot
  // run a real tier-1 lookup, so we fall back to deterministic mock data
  // rather than silently failing every record.
  const explicit = process.env.ENRICHMENT_MOCK_MODE;
  if (explicit === "false") return false;
  if (explicit === "true") return true;
  return !process.env.APIFY_API_TOKEN;
}

/**
 * Runs the full waterfall for a single attendee:
 *   1. Tier 1 (Apify LinkedIn resolution, or mock data in dev mode)
 *   2. If tier 1's result is incomplete (missing title/company) or failed,
 *      fall through to Tier 2 (Hunter.io + Clearbit live web/domain scan)
 *   3. Merge: prefer tier 1 fields where present, fill gaps from tier 2.
 *
 * Never throws — all provider failures are caught and converted into a
 * result with success=false / error populated so the caller can surface
 * an inline error state without crashing the batch.
 */
export async function runEnrichmentWaterfall(input: EnrichmentInput): Promise<EnrichmentResult> {
  const mockMode = isMockMode();

  const tier1Provider = mockMode
    ? new MockEnrichmentProvider(0.08) // ~8% simulated failure rate for realism
    : new ApifyEnrichmentProvider(process.env.APIFY_API_TOKEN as string);

  let tier1Result: EnrichmentResult;
  try {
    tier1Result = await tier1Provider.enrich(input);
  } catch (err) {
    tier1Result = {
      success: false,
      tier: 1,
      jobTitle: null,
      company: null,
      industry: null,
      linkedinUrl: null,
      headshotUrl: null,
      interests: [],
      bioNotes: null,
      careerHistory: [],
      error: err instanceof Error ? err.message : "Tier 1 enrichment threw an unexpected error",
    };
  }

  if (!isIncomplete(tier1Result)) {
    return tier1Result;
  }

  // Fall through to tier 2
  const tier2Provider = new WebScanEnrichmentProvider(process.env.HUNTER_API_KEY || null);

  let tier2Result: EnrichmentResult;
  try {
    tier2Result = await tier2Provider.enrich(input);
  } catch (err) {
    tier2Result = {
      success: false,
      tier: 2,
      jobTitle: null,
      company: null,
      industry: null,
      linkedinUrl: null,
      headshotUrl: null,
      interests: [],
      bioNotes: null,
      careerHistory: [],
      error: err instanceof Error ? err.message : "Tier 2 enrichment threw an unexpected error",
    };
  }

  // If both tiers failed entirely, surface a combined error.
  if (!tier1Result.success && !tier2Result.success) {
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
      error: `Both enrichment tiers failed. Tier 1: ${tier1Result.error ?? "unknown error"}. Tier 2: ${
        tier2Result.error ?? "unknown error"
      }.`,
    };
  }

  // Merge: tier 1 fields win where present, tier 2 fills the gaps.
  const merged: EnrichmentResult = {
    success: true,
    tier: tier2Result.success ? 2 : tier1Result.tier,
    jobTitle: tier1Result.jobTitle ?? tier2Result.jobTitle,
    company: tier1Result.company ?? tier2Result.company,
    industry: tier1Result.industry ?? tier2Result.industry,
    linkedinUrl: tier1Result.linkedinUrl ?? tier2Result.linkedinUrl,
    headshotUrl: tier1Result.headshotUrl ?? tier2Result.headshotUrl,
    interests: tier1Result.interests.length ? tier1Result.interests : tier2Result.interests,
    bioNotes: tier1Result.bioNotes ?? tier2Result.bioNotes,
    careerHistory: tier1Result.careerHistory.length ? tier1Result.careerHistory : tier2Result.careerHistory,
    error: null,
  };

  return merged;
}
