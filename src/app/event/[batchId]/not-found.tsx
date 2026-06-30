import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
        <FileQuestion className="w-8 h-8 text-brand-600" />
      </div>
      <h1 className="text-xl font-bold text-ink-900">This event link isn't valid</h1>
      <p className="text-sm text-ink-700/60 mt-2 max-w-sm">
        The event organizer may need to share an updated link, or this event hasn't been set up yet.
      </p>
    </div>
  );
}
