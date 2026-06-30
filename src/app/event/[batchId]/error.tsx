"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCw } from "lucide-react";

export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Guest portal error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
        <AlertOctagon className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-ink-900">Something went wrong loading this page</h1>
      <p className="text-sm text-ink-700/60 mt-2 max-w-md">
        Please try refreshing, or check back shortly.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 transition-colors"
      >
        <RotateCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
