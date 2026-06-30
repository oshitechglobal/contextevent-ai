import { EnrichmentInput, EnrichmentProvider, EnrichmentResult, emptyResult } from "./types";

/**
 * WebScanEnrichmentProvider — tier 2 / fallback provider.
 *
 * When the primary tier (Apify/PDL/Apollo) returns incomplete data, this
 * provider performs a lighter-weight "live web scan" using free-tier
 * services:
 *   - Hunter.io Domain Search (25 free lookups/month) to confirm the
 *     person's company from their email domain and recover an
 *     organization name + a generic company description.
 *   - Clearbit Logo API (free, keyless) for a company logo as a visual
 *     fallback when no personal headshot is available.
 *
 * This tier intentionally does NOT claim to find a personal headshot —
 * it only validates company/industry signal from the email domain, which
 * is what's realistically achievable for free. Swap in Cleanlist or
 * Origami Chat here later by implementing the same EnrichmentProvider
 * interface — no other code changes required.
 */
export class WebScanEnrichmentProvider implements EnrichmentProvider {
  name = "web-scan";
  private readonly hunterApiKey: string | null;
  private readonly timeoutMs: number;

  constructor(hunterApiKey: string | null, timeoutMs = 15000) {
    this.hunterApiKey = hunterApiKey;
    this.timeoutMs = timeoutMs;
  }

  private extractDomain(email: string): string | null {
    const parts = email.split("@");
    if (parts.length !== 2) return null;
    const domain = parts[1].toLowerCase().trim();
    const freeProviders = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];
    if (freeProviders.includes(domain)) return null;
    return domain;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const domain = this.extractDomain(input.email);

    if (!domain) {
      return emptyResult(
        "Email uses a consumer provider (gmail/yahoo/etc.) — no company domain signal available for web scan"
      );
    }

    if (!this.hunterApiKey) {
      // No Hunter key configured: still return a best-effort result derived
      // purely from the domain itself, so the waterfall has *something*
      // rather than a hard failure.
      const companyGuess = domain.split(".")[0];
      return {
        success: true,
        tier: 2,
        jobTitle: null,
        company: companyGuess.charAt(0).toUpperCase() + companyGuess.slice(1),
        industry: null,
        linkedinUrl: null,
        headshotUrl: `https://logo.clearbit.com/${domain}`,
        interests: [],
        bioNotes: null,
        careerHistory: [],
        error: null,
      };
    }

    try {
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
        domain
      )}&api_key=${this.hunterApiKey}&limit=1`;
      const res = await this.fetchWithTimeout(url);

      if (!res.ok) {
        throw new Error(`Hunter.io domain search failed: HTTP ${res.status}`);
      }

      const json = await res.json();
      const orgName: string | null = json?.data?.organization ?? null;
      const industry: string | null = json?.data?.industry ?? null;

      if (!orgName) {
        return emptyResult("Hunter.io returned no organization record for this domain");
      }

      return {
        success: true,
        tier: 2,
        jobTitle: null,
        company: orgName,
        industry,
        linkedinUrl: json?.data?.linkedin ? `https://linkedin.com/company/${json.data.linkedin}` : null,
        headshotUrl: `https://logo.clearbit.com/${domain}`,
        interests: [],
        bioNotes: `Identified via live web/domain scan rather than a personal profile match.`,
        careerHistory: [],
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown web-scan enrichment error";
      return emptyResult(message);
    }
  }
}
