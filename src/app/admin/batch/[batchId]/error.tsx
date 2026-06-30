"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCw } from "lucide-react";

export default function BatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Batch workspace error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
        <AlertOctagon className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-ink-900">Something went wrong loading this batch</h1>
      <p className="text-sm text-ink-700/60 mt-2 max-w-md">
        {error.message || "An unexpected error occurred while rendering this page."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-xl border border-ink-700/15 hover:bg-surface-sunken text-ink-900 font-semibold px-5 py-2.5 transition-colors"
        >
          Start over
        </Link>
      </div>
    </div>
  );
}
