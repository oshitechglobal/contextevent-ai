import { EnrichmentInput, EnrichmentProvider, EnrichmentResult, CareerEvent } from "./types";

const TITLES = [
  "Director of Operations",
  "VP of Marketing",
  "Senior Product Manager",
  "Chief of Staff",
  "Head of Partnerships",
  "Director of Engineering",
  "VP of Sales",
  "Deputy Chief of Staff",
  "Senior Director, Strategy",
  "Head of Customer Success",
];

const COMPANIES = [
  { name: "Northwind Analytics", industry: "Data & Analytics" },
  { name: "Bluepeak Capital", industry: "Financial Services" },
  { name: "Vertex Health Systems", industry: "Healthcare" },
  { name: "Lumen Robotics", industry: "Industrial Automation" },
  { name: "Brightline Media", industry: "Media & Entertainment" },
  { name: "Cascade Logistics", industry: "Supply Chain & Logistics" },
  { name: "Anchorpoint Legal", industry: "Legal Services" },
  { name: "Helio Energy Group", industry: "Renewable Energy" },
];

const INTEREST_POOL = [
  "AI policy",
  "venture investing",
  "endurance running",
  "public speaking",
  "urban planning",
  "jazz piano",
  "climate tech",
  "open-source software",
  "mentorship programs",
  "behavioral economics",
  "sailing",
  "design systems",
];

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

function pickN<T>(arr: T[], seed: number, n: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  let i = 0;
  while (out.length < n && used.size < arr.length) {
    const idx = (seed + i * 7919) % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
    i++;
  }
  return out;
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split("T")[0];
}

function buildCareerHistory(seed: number, currentTitle: string, currentCompany: string): CareerEvent[] {
  const priorTitleIdx = seed % TITLES.length;
  const priorTitle = TITLES[(priorTitleIdx + 3) % TITLES.length];
  const priorCompany = pick(COMPANIES, seed, 5).name;

  const promotionMonthsAgo = 4 + (seed % 14); // 4-17 months ago, biases toward "recent"
  const joinedMonthsAgo = promotionMonthsAgo + 18 + (seed % 24);
  const priorStintMonthsAgo = joinedMonthsAgo + 30 + (seed % 36);

  return [
    {
      title: currentTitle,
      company: currentCompany,
      startDate: monthsAgo(promotionMonthsAgo),
      endDate: null,
      description: `Promoted internally to ${currentTitle} after leading cross-functional growth initiatives.`,
    },
    {
      title: priorTitle,
      company: currentCompany,
      startDate: monthsAgo(joinedMonthsAgo),
      endDate: monthsAgo(promotionMonthsAgo),
      description: `Joined ${currentCompany} as ${priorTitle}, scaling the team from the ground up.`,
    },
    {
      title: pick(TITLES, seed, 2),
      company: priorCompany,
      startDate: monthsAgo(priorStintMonthsAgo),
      endDate: monthsAgo(joinedMonthsAgo),
      description: `Led key initiatives at ${priorCompany} prior to moving to ${currentCompany}.`,
    },
  ];
}

/**
 * MockEnrichmentProvider — used when ENRICHMENT_MOCK_MODE=true (the default
 * until real API keys are configured). Produces deterministic, realistic
 * enrichment data seeded from the attendee's email so the same person
 * always yields the same mock profile across re-runs.
 */
export class MockEnrichmentProvider implements EnrichmentProvider {
  name = "mock";
  private readonly failureRate: number;

  constructor(failureRate = 0) {
    this.failureRate = failureRate;
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    // Simulate realistic network latency
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

    const seed = hashSeed(input.email || `${input.firstName}${input.lastName}`);

    if (this.failureRate > 0 && seed % 100 < this.failureRate * 100) {
      return {
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
        error: "Mock provider simulated failure (no record found in primary index)",
      };
    }

    const title = pick(TITLES, seed);
    const companyEntry = pick(COMPANIES, seed, 3);
    const interests = pickN(INTEREST_POOL, seed, 3);
    const careerHistory = buildCareerHistory(seed, title, companyEntry.name);

    const initials = `${input.firstName[0] ?? "?"}${input.lastName[0] ?? "?"}`.toUpperCase();
    const slug = encodeURIComponent(`${input.firstName}-${input.lastName}`);

    return {
      success: true,
      tier: 1,
      jobTitle: title,
      company: companyEntry.name,
      industry: companyEntry.industry,
      linkedinUrl: `https://www.linkedin.com/in/${slug}-${seed % 9999}`,
      // Deterministic placeholder photo service — replaced by real headshot URL
      // once a live provider (Apify, PDL, Apollo) is configured.
      headshotUrl: `https://api.dicebear.com/9.x/initials/png?seed=${initials}&backgroundType=gradientLinear&fontSize=42`,
      interests,
      bioNotes: `${input.firstName} has been active in the ${companyEntry.industry} space and frequently engages on professional topics related to ${interests[0]}.`,
      careerHistory,
      error: null,
    };
  }
}
