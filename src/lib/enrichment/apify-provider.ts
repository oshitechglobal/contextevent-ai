import { EnrichmentInput, EnrichmentProvider, EnrichmentResult, emptyResult, CareerEvent } from "./types";

const APIFY_BASE = "https://api.apify.com/v2";

// Apify actor IDs (public, well-maintained community actors).
// Override via env if you prefer a different actor.
const LINKEDIN_SEARCH_ACTOR =
  process.env.APIFY_LINKEDIN_ACTOR_ID || "dev_fusion~linkedin-profile-scraper";

interface ApifyRunResponse {
  data: {
    id: string;
    defaultDatasetId: string;
    status: string;
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * ApifyEnrichmentProvider — tier 1 / primary provider in the waterfall.
 *
 * Strategy: we don't have a guaranteed LinkedIn URL up front, so we run
 * Apify's Google Search Scraper to resolve "{name} {company-guess} linkedin"
 * style queries down to a profile URL, then run the LinkedIn profile actor
 * against that URL to pull title/company/photo. If either step fails or
 * times out, we surface success=false so the waterfall falls through to
 * tier 2 automatically.
 *
 * Requires APIFY_API_TOKEN. Free accounts include $5/month platform credit,
 * which comfortably covers small event batches (a few hundred lookups).
 */
export class ApifyEnrichmentProvider implements EnrichmentProvider {
  name = "apify";
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(token: string, timeoutMs = 45000) {
    this.token = token;
    this.timeoutMs = timeoutMs;
  }

  private async resolveLinkedInUrl(input: EnrichmentInput): Promise<string | null> {
    const query = `${input.firstName} ${input.lastName} linkedin`;
    const runUrl = `${APIFY_BASE}/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${this.token}`;

    const res = await fetchWithTimeout(
      runUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: query,
          maxPagesPerQuery: 1,
          resultsPerPage: 5,
          countryCode: "us",
        }),
      },
      this.timeoutMs
    );

    if (!res.ok) {
      throw new Error(`Apify Google search actor failed: HTTP ${res.status}`);
    }

    const items: any[] = await res.json();
    for (const item of items) {
      const organicResults = item?.organicResults ?? [];
      for (const result of organicResults) {
        const url: string | undefined = result?.url;
        if (url && url.includes("linkedin.com/in/")) {
          return url.split("?")[0];
        }
      }
    }
    return null;
  }

  private async scrapeProfile(linkedinUrl: string): Promise<Partial<EnrichmentResult> | null> {
    const runUrl = `${APIFY_BASE}/acts/${encodeURIComponent(
      LINKEDIN_SEARCH_ACTOR
    )}/run-sync-get-dataset-items?token=${this.token}`;

    const res = await fetchWithTimeout(
      runUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUrls: [linkedinUrl],
        }),
      },
      this.timeoutMs
    );

    if (!res.ok) {
      throw new Error(`Apify LinkedIn actor failed: HTTP ${res.status}`);
    }

    const items: any[] = await res.json();
    const profile = items?.[0];
    if (!profile) return null;

    const careerHistory: CareerEvent[] = (profile.experiences || profile.positions || [])
      .slice(0, 6)
      .map((exp: any) => ({
        title: exp.title || exp.position || "Unknown role",
        company: exp.companyName || exp.company || "Unknown company",
        startDate: exp.startDate || null,
        endDate: exp.endDate || null,
        description: exp.description || undefined,
      }));

    return {
      jobTitle: profile.headline || profile.jobTitle || profile.positions?.[0]?.title || null,
      company:
        profile.companyName ||
        profile.currentCompany ||
        profile.positions?.[0]?.companyName ||
        null,
      industry: profile.industry || null,
      linkedinUrl,
      headshotUrl: profile.profilePicture || profile.photoUrl || profile.imageUrl || null,
      interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 5) : [],
      bioNotes: profile.summary || profile.about || null,
      careerHistory,
    };
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    try {
      const linkedinUrl = await this.resolveLinkedInUrl(input);
      if (!linkedinUrl) {
        return emptyResult("No LinkedIn profile could be resolved via search");
      }

      const profileData = await this.scrapeProfile(linkedinUrl);
      if (!profileData) {
        return emptyResult("LinkedIn profile scrape returned no data (profile may be private)");
      }

      return {
        success: true,
        tier: 1,
        jobTitle: profileData.jobTitle ?? null,
        company: profileData.company ?? null,
        industry: profileData.industry ?? null,
        linkedinUrl: profileData.linkedinUrl ?? linkedinUrl,
        headshotUrl: profileData.headshotUrl ?? null,
        interests: profileData.interests ?? [],
        bioNotes: profileData.bioNotes ?? null,
        careerHistory: profileData.careerHistory ?? [],
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Apify enrichment error";
      return emptyResult(message);
    }
  }
}
