export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
        <p className="text-sm text-ink-700/50 font-medium">Loading batch…</p>
      </div>
    </div>
  );
}
