import { TrendingUp } from "lucide-react";

interface Props {
  wins: string[];
}

export default function WinsPanel({ wins }: Props) {
  if (wins.length === 0) {
    // Collapses automatically — renders nothing, allowing the Generated Bio
    // box below to expand and fill the vertical space (Epic 5 requirement).
    return null;
  }

  return (
    <div className="card rounded-3xl p-6 animate-collapse-up overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-brand-600" />
        <p className="micro-label !text-ink-700/50">Latest Accomplishments & Wins</p>
      </div>
      <ul className="space-y-2.5">
        {wins.map((win, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-ink-900/85 bg-surface-muted rounded-xl px-4 py-2.5"
          >
            <span className="leading-relaxed">{win}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
