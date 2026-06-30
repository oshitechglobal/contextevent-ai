"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import MappingWizard from "@/components/MappingWizard";

export interface StagedUploadInfo {
  stagingId: string;
  fileName: string;
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
}

export default function HomePage() {
  const router = useRouter();
  const [staged, setStaged] = useState<StagedUploadInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMappingConfirm(mapping: { firstName: string; lastName: string; email: string }) {
    if (!staged) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/map-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stagingId: staged.stagingId, mapping }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process the batch.");
      }

      router.push(`/batch/${data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsProcessing(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <header className="mb-10 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold tracking-wide uppercase">
            ContextEvent AI
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
            Walk into every event already in the know
          </h1>
          <p className="mt-3 text-ink-700/70 max-w-xl mx-auto">
            Upload your attendee list. We enrich every record, surface their recent career wins,
            and generate a tailored bio and conversation starters for each person.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
            {error}
          </div>
        )}

        {!staged ? (
          <UploadDropzone
            onParsed={(info) => setStaged(info)}
            onError={(msg) => setError(msg)}
          />
        ) : (
          <MappingWizard
            staged={staged}
            isSubmitting={isProcessing}
            onCancel={() => {
              setStaged(null);
              setError(null);
            }}
            onConfirm={handleMappingConfirm}
          />
        )}
      </div>
    </main>
  );
}
