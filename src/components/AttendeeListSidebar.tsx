"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { AttendeeDTO } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface Props {
  attendees: AttendeeDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function AttendeeListSidebar({ attendees, selectedId, onSelect }: Props) {
  return (
    <aside className="w-72 shrink-0 border-r border-ink-700/5 bg-white/60 overflow-y-auto py-4 px-3 hidden md:block">
      <p className="micro-label px-3 mb-3">Attendees ({attendees.length})</p>
      <ul className="space-y-1">
        {attendees.map((a) => {
          const isSelected = a.id === selectedId;
          const failed = a.enrichmentStatus === "FAILED";
          return (
            <li key={a.id}>
              <button
                onClick={() => onSelect(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150 ${
                  isSelected ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-surface-sunken"
                }`}
              >
                <Avatar headshotUrl={a.headshotUrl} firstName={a.firstName} lastName={a.lastName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="text-xs text-ink-700/50 truncate">
                    {a.jobTitle || (failed ? "Enrichment failed" : "No title found")}
                  </p>
                </div>
                {failed ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : a.generatedBio ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
