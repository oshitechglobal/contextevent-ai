"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { ConversationStarter } from "@/lib/types";

interface Props {
  starter: ConversationStarter;
}

export default function ConversationStarterRow({ starter }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(starter.text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        // Clipboard API unavailable (e.g. insecure context) — fail silently,
        // the row remains visible and the user can manually select the text.
      }
    },
    [starter.text]
  );

  return (
    <li>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full group flex items-start gap-3 rounded-xl bg-surface-muted hover:bg-brand-50 px-4 py-3 text-left transition-colors duration-150"
      >
        <div className="min-w-0 flex-1">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-brand-600 bg-white px-2 py-0.5 rounded-full mb-1.5">
            {starter.theme}
          </span>
          <p className="text-sm text-ink-900/85 leading-relaxed">{starter.text}</p>
        </div>
        <span className="shrink-0 mt-0.5 text-ink-700/30 group-hover:text-brand-600 transition-colors">
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </span>
      </button>
    </li>
  );
}
