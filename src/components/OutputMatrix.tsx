"use client";

import { FileText, MessageSquareQuote } from "lucide-react";
import type { ConversationStarter } from "@/lib/types";
import ConversationStarterRow from "@/components/ConversationStarterRow";

interface Props {
  bio: string | null;
  conversationStarters: ConversationStarter[] | null;
  isGenerating: boolean;
  winsPanelCollapsed: boolean;
}

function BioSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="h-3.5 rounded-full skeleton-shimmer animate-shimmer w-full" />
      <div className="h-3.5 rounded-full skeleton-shimmer animate-shimmer w-[92%]" />
      <div className="h-3.5 rounded-full skeleton-shimmer animate-shimmer w-[78%]" />
    </div>
  );
}

function StarterSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl skeleton-shimmer animate-shimmer w-full" />
      ))}
    </div>
  );
}

export default function OutputMatrix({ bio, conversationStarters, isGenerating, winsPanelCollapsed }: Props) {
  const hasContent = Boolean(bio || conversationStarters);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Generated Bio box - expands to fill space when wins panel is collapsed */}
      <div
        className={`card rounded-3xl p-6 transition-all duration-300 ${
          winsPanelCollapsed ? "lg:row-span-1 min-h-[220px]" : "min-h-[160px]"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-brand-600" />
          <p className="micro-label !text-ink-700/50">Generated Bio</p>
        </div>

        {isGenerating ? (
          <BioSkeleton />
        ) : bio ? (
          <p className="text-sm leading-relaxed text-ink-900/85 whitespace-pre-wrap animate-fade-in">
            {bio}
          </p>
        ) : (
          <p className="text-sm text-ink-700/35 italic">
            No bio generated yet. Configure your settings and click Generate Bio.
          </p>
        )}
      </div>

      {/* Conversation Starters - exactly 5 rows */}
      <div className="card rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareQuote className="w-4 h-4 text-brand-600" />
          <p className="micro-label !text-ink-700/50">Conversation Starters</p>
        </div>

        {isGenerating ? (
          <StarterSkeleton />
        ) : conversationStarters && conversationStarters.length > 0 ? (
          <ul className="space-y-2 animate-fade-in">
            {conversationStarters.map((starter, i) => (
              <ConversationStarterRow key={i} starter={starter} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-700/35 italic">
            Conversation starters will appear here after generation.
          </p>
        )}
      </div>
    </div>
  );
}
