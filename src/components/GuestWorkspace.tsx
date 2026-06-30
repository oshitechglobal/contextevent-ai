"use client";

import { useMemo, useState } from "react";
import { Users, RefreshCw } from "lucide-react";
import type { BatchDTO } from "@/lib/types";
import AttendeeListSidebar from "@/components/AttendeeListSidebar";
import IdentityCard from "@/components/IdentityCard";
import WinsPanel from "@/components/WinsPanel";
import OutputMatrix from "@/components/OutputMatrix";

interface Props {
  batch: BatchDTO;
}

export default function GuestWorkspace({ batch: initialBatch }: Props) {
  const [batch, setBatch] = useState<BatchDTO>(initialBatch);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBatch.attendees[0]?.id ?? null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selected = useMemo(
    () => batch.attendees.find((a) => a.id === selectedId) ?? null,
    [batch.attendees, selectedId]
  );

  async function refreshBatch() {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/batches/${batch.id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setBatch(data.batch);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-ink-700/5 px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink-900 leading-tight">{batch.fileName}</p>
          <p className="text-xs text-ink-700/50 flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            {batch.attendees.length} attendee{batch.attendees.length === 1 ? "" : "s"}
          </p>
        </div>

        <button
          onClick={refreshBatch}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700/60 hover:text-ink-900 px-3 py-1.5 rounded-lg hover:bg-surface-sunken transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </nav>

      <div className="flex flex-1 min-h-0">
        <AttendeeListSidebar
          attendees={batch.attendees}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <main className="flex-1 px-6 py-8 overflow-y-auto">
          {!selected ? (
            <div className="card rounded-3xl p-16 text-center text-ink-700/50">
              No attendees found for this event yet.
            </div>
          ) : (
            <GuestAttendeeDetail key={selected.id} attendee={selected} />
          )}
        </main>
      </div>
    </div>
  );
}

function GuestAttendeeDetail({ attendee }: { attendee: BatchDTO["attendees"][number] }) {
  const wins = attendee.timelineWins ?? [];
  const hasWins = wins.length > 0;
  const hasGeneratedContent = Boolean(attendee.generatedBio || attendee.conversationStarters);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <IdentityCard attendee={attendee} isPublic />

      <WinsPanel wins={wins} />

      {hasGeneratedContent && (
        <OutputMatrix
          bio={attendee.generatedBio}
          conversationStarters={attendee.conversationStarters}
          isGenerating={false}
          winsPanelCollapsed={!hasWins}
        />
      )}
    </div>
  );
}
