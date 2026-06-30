"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import type { StagedUploadInfo } from "@/app/page";

interface Props {
  staged: StagedUploadInfo;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (mapping: { firstName: string; lastName: string; email: string }) => void;
}

type FieldKey = "firstName" | "lastName" | "email";

const FIELD_LABELS: Record<FieldKey, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
};

function guessMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const lower = headers.map((h) => h.toLowerCase());
  const guess: Partial<Record<FieldKey, string>> = {};

  const findMatch = (patterns: string[]) => {
    for (const pattern of patterns) {
      const idx = lower.findIndex((h) => h === pattern || h.includes(pattern));
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  };

  guess.firstName = findMatch(["first name", "firstname", "first_name", "fname", "given name"]);
  guess.lastName = findMatch(["last name", "lastname", "last_name", "lname", "surname", "family name"]);
  guess.email = findMatch(["email", "e-mail", "email address"]);

  return guess;
}

export default function MappingWizard({ staged, isSubmitting, onCancel, onConfirm }: Props) {
  const initialGuess = useMemo(() => guessMapping(staged.headers), [staged.headers]);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>(initialGuess);

  const isComplete = mapping.firstName && mapping.lastName && mapping.email;
  const fields: FieldKey[] = ["firstName", "lastName", "email"];

  function handleSubmit() {
    if (!mapping.firstName || !mapping.lastName || !mapping.email) return;
    onConfirm({ firstName: mapping.firstName, lastName: mapping.lastName, email: mapping.email });
  }

  return (
    <div className="card rounded-3xl p-8 animate-fade-in">
      <button
        onClick={onCancel}
        disabled={isSubmitting}
        className="inline-flex items-center gap-1.5 text-sm text-ink-700/60 hover:text-ink-900 transition-colors mb-6 disabled:opacity-40"
      >
        <ArrowLeft className="w-4 h-4" />
        Choose a different file
      </button>

      <h2 className="text-xl font-bold text-ink-900">Map your columns</h2>
      <p className="text-sm text-ink-700/60 mt-1 mb-6">
        <span className="font-medium text-ink-900">{staged.fileName}</span> · {staged.totalRows} row
        {staged.totalRows === 1 ? "" : "s"} detected. Confirm which columns map to each required field.
      </p>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field} className="flex items-center gap-4">
            <div className="w-32 shrink-0">
              <span className="text-sm font-semibold text-ink-900">{FIELD_LABELS[field]}</span>
              <span className="text-red-500 ml-0.5">*</span>
            </div>
            <select
              value={mapping[field] ?? ""}
              onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))}
              className="flex-1 rounded-xl border border-ink-700/15 bg-surface-muted px-4 py-2.5 text-sm font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-shadow"
            >
              <option value="">Select a column…</option>
              {staged.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-2xl bg-surface-muted border border-ink-700/5 p-4 overflow-x-auto">
        <p className="micro-label mb-3">Preview</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-700/50 text-xs uppercase tracking-wide">
              {staged.headers.map((h) => (
                <th key={h} className="pr-6 pb-2 font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staged.previewRows.map((row, i) => (
              <tr key={i} className="border-t border-ink-700/5">
                {staged.headers.map((h) => (
                  <td key={h} className="pr-6 py-2 text-ink-900/80 whitespace-nowrap">
                    {row[h] || <span className="text-ink-700/30">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isComplete || isSubmitting}
        className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-ink-700/15 disabled:text-ink-700/40 text-white font-semibold py-3 transition-colors duration-200"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enriching attendees…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Process {staged.totalRows} attendee{staged.totalRows === 1 ? "" : "s"}
          </>
        )}
      </button>
    </div>
  );
}
