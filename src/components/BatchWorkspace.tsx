"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Users, Link2, Check } from "lucide-react";
import type { AttendeeDTO, BatchDTO } from "@/lib/types";
import AttendeeListSidebar from "@/components/AttendeeListSidebar";
import IdentityCard from "@/components/IdentityCard";
import ConfigController, { BioStyle, BioLength } from "@/components/ConfigController";
import WinsPanel from "@/components/WinsPanel";
import OutputMatrix from "@/components/OutputMatrix";

interface Props {
  initialBatch: BatchDTO;
}

export default function BatchWorkspace({ initialBatch }: Props) {
  const [batch, setBatch] = useState<BatchDTO>(initialBatch);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialBatch.attendees[0]?.id ?? null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const selected = useMemo(
    () => batch.attendees.find((a) => a.id === selectedId) ?? null,
    [batch.attendees, selectedId]
  );

  function patchAttendee(id: string, patch: Partial<AttendeeDTO>) {
    setBatch((prev) => ({
      ...prev,
      attendees: prev.attendees.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }

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

  async function copyGuestLink() {
    const publicUrl = `${window.location.origin}/event/${batch.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard unavailable — fail silently, link is still visible to copy manually.
    }
  }

  const enrichedCount = batch.attendees.filter((a) => a.enrichmentStatus !== "FAILED").length;
  const failedCount = batch.attendees.filter((a) => a.enrichmentStatus === "FAILED").length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Navigation */}
      <nav className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-ink-700/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700/70 hover:text-ink-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="h-5 w-px bg-ink-700/10" />
          <div>
            <p className="text-sm font-bold text-ink-900 leading-tight">{batch.fileName}</p>
            <p className="text-xs text-ink-700/50 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {enrichedCount} enriched
              {failedCount > 0 && <span className="text-red-500">· {failedCount} failed</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyGuestLink}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
          >
            {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {linkCopied ? "Copied!" : "Copy guest link"}
          </button>
          <button
            onClick={refreshBatch}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700/60 hover:text-ink-900 px-3 py-1.5 rounded-lg hover:bg-surface-sunken transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
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
              No attendees in this batch yet.
            </div>
          ) : (
            <AttendeeDetail
              key={selected.id}
              attendee={selected}
              onPatch={(patch) => patchAttendee(selected.id, patch)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function AttendeeDetail({
  attendee,
  onPatch,
}: {
  attendee: AttendeeDTO;
  onPatch: (patch: Partial<AttendeeDTO>) => void;
}) {
  const [bioStyle, setBioStyle] = useState<BioStyle>((attendee.bioStyle as BioStyle) || "Conversational");
  const [bioLength, setBioLength] = useState<BioLength>((attendee.bioLength as BioLength) || "Standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const wins = attendee.timelineWins ?? [];
  const hasWins = wins.length > 0;

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch("/api/admin/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId: attendee.id, bioStyle, bioLength }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bio generation failed.");
      }

      onPatch({
        generatedBio: data.bio,
        conversationStarters: data.conversationStarters,
        bioStyle,
        bioLength,
        generatedAt: data.generatedAt,
      });
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Top row: Identity Card (left) + Config Controller (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <IdentityCard attendee={attendee} />
        <ConfigController
          bioStyle={bioStyle}
          bioLength={bioLength}
          onStyleChange={setBioStyle}
          onLengthChange={setBioLength}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          isDisabled={attendee.enrichmentStatus === "FAILED"}
          error={generationError}
        />
      </div>

      {/* Center sub-panel: Wins (collapses automatically if empty) */}
      <WinsPanel wins={wins} />

      {/* Lower panel: Streaming Output Matrix */}
      <OutputMatrix
        bio={attendee.generatedBio}
        conversationStarters={attendee.conversationStarters}
        isGenerating={isGenerating}
        winsPanelCollapsed={!hasWins}
      />
    </div>
  );
}
