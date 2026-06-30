import { CareerEvent } from "../enrichment/types";

function monthsBetween(dateStr: string | null, reference: Date = new Date()): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const months =
    (reference.getFullYear() - d.getFullYear()) * 12 + (reference.getMonth() - d.getMonth());
  return Math.max(0, months);
}

function formatRecency(months: number | null): string {
  if (months === null) return "recently";
  if (months === 0) return "this month";
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return years === 1 ? "1 year ago" : `${years} years ago`;
  return `${years}y ${remMonths}mo ago`;
}

/**
 * Detects whether a transition between two consecutive career events
 * (sorted most-recent-first) represents an internal promotion (same
 * company, different/more senior title) vs. an external company change.
 */
function isInternalPromotion(current: CareerEvent, previous: CareerEvent | undefined): boolean {
  if (!previous) return false;
  return (
    current.company.trim().toLowerCase() === previous.company.trim().toLowerCase() &&
    current.title.trim().toLowerCase() !== previous.title.trim().toLowerCase()
  );
}

/**
 * Epic 3 — Timeline Analytics & Wins Engine.
 *
 * Takes the raw career history array returned by the enrichment layer and
 * derives a structured array of labeled, human-readable achievement
 * strings ready for direct UI rendering and for inclusion in the LLM
 * generation prompt context.
 *
 * Returns an empty array when there's nothing meaningful to surface —
 * the UI is expected to collapse the Wins panel in that case (Epic 5).
 */
export function computeTimelineWins(careerHistory: CareerEvent[] | null | undefined): string[] {
  if (!careerHistory || careerHistory.length === 0) return [];

  // Sort most-recent-first by startDate (events with no startDate sink to the bottom)
  const sorted = [...careerHistory].sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : -Infinity;
    const bTime = b.startDate ? new Date(b.startDate).getTime() : -Infinity;
    return bTime - aTime;
  });

  const wins: string[] = [];
  const now = new Date();

  sorted.forEach((event, idx) => {
    const previous = sorted[idx + 1]; // chronologically before this one
    const monthsAgo = monthsBetween(event.startDate, now);
    const recency = formatRecency(monthsAgo);

    // Only surface "recent" signal for events within the last 36 months —
    // older history is context, not a "win" worth highlighting.
    const isRecent = monthsAgo !== null && monthsAgo <= 36;
    if (!isRecent && idx > 0) return;

    if (idx === 0 && isInternalPromotion(event, previous)) {
      wins.push(`✨ Promotion: Elevated to ${event.title} · ${recency}`);
      return;
    }

    if (idx === 0 && previous && event.company.trim().toLowerCase() !== previous.company.trim().toLowerCase()) {
      wins.push(`🚀 New Role: Joined ${event.company} as ${event.title} · ${recency}`);
      return;
    }

    if (idx === 0 && !previous) {
      wins.push(`💼 Current Role: ${event.title} at ${event.company} · ${recency}`);
      return;
    }

    // Mid-history internal promotions still worth surfacing if recent
    if (idx > 0 && isInternalPromotion(event, previous) && isRecent) {
      wins.push(`✨ Promotion: Elevated to ${event.title} at ${event.company} · ${recency}`);
    }

    // Detect description-based signals: certifications, funding events, milestones
    if (event.description) {
      const desc = event.description.toLowerCase();
      if (desc.includes("certif")) {
        wins.push(`🎓 Certification: ${event.description.trim()} · ${recency}`);
      } else if (desc.includes("funding") || desc.includes("series ") || desc.includes("raised")) {
        wins.push(`💰 Funding Event: ${event.description.trim()} · ${recency}`);
      } else if (desc.includes("award") || desc.includes("recogni") || desc.includes("named")) {
        wins.push(`🏆 Recognition: ${event.description.trim()} · ${recency}`);
      }
    }
  });

  // Tenure milestone: if current role startDate exists and tenure crosses
  // a clean multi-year boundary, surface it as a loyalty/milestone win.
  const current = sorted[0];
  if (current) {
    const tenureMonths = monthsBetween(current.startDate, now);
    if (tenureMonths !== null && tenureMonths >= 60) {
      const years = Math.floor(tenureMonths / 12);
      wins.push(`🏅 Milestone: ${years}+ years of tenure at ${current.company}`);
    }
  }

  // De-duplicate (in case description heuristics double-counted) and cap at 6
  return Array.from(new Set(wins)).slice(0, 6);
}
