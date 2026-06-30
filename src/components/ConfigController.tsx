"use client";

import { Sparkles, Loader2, AlertCircle, Settings2 } from "lucide-react";

export type BioStyle = "Formal" | "Conversational" | "Executive";
export type BioLength = "Brief" | "Standard" | "Detailed";

const STYLES: { value: BioStyle; description: string }[] = [
  { value: "Formal", description: "Polished, third-person, program-ready" },
  { value: "Conversational", description: "Warm and natural introduction" },
  { value: "Executive", description: "Sharp, leadership-focused tone" },
];

const LENGTHS: { value: BioLength; description: string }[] = [
  { value: "Brief", description: "2–3 sentences" },
  { value: "Standard", description: "One short paragraph" },
  { value: "Detailed", description: "Two full paragraphs" },
];

interface Props {
  bioStyle: BioStyle;
  bioLength: BioLength;
  onStyleChange: (value: BioStyle) => void;
  onLengthChange: (value: BioLength) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isDisabled: boolean;
  error: string | null;
}

export default function ConfigController({
  bioStyle,
  bioLength,
  onStyleChange,
  onLengthChange,
  onGenerate,
  isGenerating,
  isDisabled,
  error,
}: Props) {
  return (
    <div className="card card-hover rounded-3xl p-7 flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <Settings2 className="w-4 h-4 text-ink-700/40" />
        <p className="micro-label !text-ink-700/50">Generation Settings</p>
      </div>

      <div className="space-y-5 flex-1">
        <div>
          <label className="text-sm font-semibold text-ink-900 mb-2 block">Bio Style</label>
          <select
            value={bioStyle}
            onChange={(e) => onStyleChange(e.target.value as BioStyle)}
            disabled={isDisabled}
            className="w-full rounded-xl border border-ink-700/15 bg-surface-muted px-4 py-2.5 text-sm font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-shadow disabled:opacity-50"
          >
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value} — {s.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-ink-900 mb-2 block">Bio Length</label>
          <select
            value={bioLength}
            onChange={(e) => onLengthChange(e.target.value as BioLength)}
            disabled={isDisabled}
            className="w-full rounded-xl border border-ink-700/15 bg-surface-muted px-4 py-2.5 text-sm font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-shadow disabled:opacity-50"
          >
            {LENGTHS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.value} — {l.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600/90">{error}</p>
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={isDisabled || isGenerating}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 disabled:from-ink-700/15 disabled:to-ink-700/15 disabled:text-ink-700/40 text-white font-semibold py-3 transition-all duration-200 shadow-sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Bio
          </>
        )}
      </button>
    </div>
  );
}
