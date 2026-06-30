import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
        <FileQuestion className="w-8 h-8 text-brand-600" />
      </div>
      <h1 className="text-xl font-bold text-ink-900">Batch not found</h1>
      <p className="text-sm text-ink-700/60 mt-2 max-w-sm">
        This batch may have been deleted, or the link is incorrect.
      </p>
      <Link
        href="/admin"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 transition-colors"
      >
        Start a new upload
      </Link>
    </div>
  );
}
