import { AlertTriangle, Mail, Briefcase, Building2, ExternalLink } from "lucide-react";
import type { AttendeeDTO } from "@/lib/types";
import Avatar from "@/components/Avatar";

interface Props {
  attendee: AttendeeDTO;
  isPublic?: boolean;
}

function tierLabel(tier: number | null, status: string): string | null {
  if (status === "FAILED") return null;
  if (tier === 1) return "Verified via primary identity match";
  if (tier === 2) return "Resolved via live web/domain scan";
  return null;
}

export default function IdentityCard({ attendee, isPublic = false }: Props) {
  const failed = attendee.enrichmentStatus === "FAILED";
  const tier = tierLabel(attendee.enrichmentTier, attendee.enrichmentStatus);

  return (
    <div className="card card-hover rounded-3xl p-7">
      <div className="flex items-start gap-5">
        <Avatar
          headshotUrl={attendee.headshotUrl}
          firstName={attendee.firstName}
          lastName={attendee.lastName}
          size={88}
        />
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-xl font-extrabold text-ink-900 leading-tight truncate">
            {attendee.firstName} {attendee.lastName}
          </h2>
          {attendee.jobTitle || attendee.company ? (
            <p className="text-sm font-medium text-ink-700/70 mt-0.5">
              {attendee.jobTitle ?? "Title unknown"}
              {attendee.jobTitle && attendee.company ? " at " : ""}
              {attendee.company ?? ""}
            </p>
          ) : (
            !failed && <p className="text-sm font-medium text-ink-700/40 mt-0.5 italic">No role data found</p>
          )}
          {tier && !isPublic && (
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
              {tier}
            </span>
          )}
        </div>
      </div>

      {failed ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {isPublic ? "Profile information unavailable" : "Enrichment failed"}
            </p>
            <p className="text-xs text-red-600/80 mt-0.5">
              {isPublic
                ? "We weren't able to find additional information for this attendee."
                : attendee.enrichmentError ||
                  "Both waterfall tiers failed to return identity data for this attendee."}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3.5">
          <MetaRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={attendee.email} />
          {attendee.industry && (
            <MetaRow
              icon={<Building2 className="w-3.5 h-3.5" />}
              label="Industry"
              value={attendee.industry}
            />
          )}
          {attendee.interests.length > 0 && (
            <MetaRow
              icon={<Briefcase className="w-3.5 h-3.5" />}
              label="Interests"
              value={attendee.interests.join(" · ")}
            />
          )}
          {attendee.bioNotes && (
            <MetaRow icon={null} label="Bio Notes" value={attendee.bioNotes} fullText />
          )}
          {attendee.linkedinUrl && (
            <a
              href={attendee.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors w-fit"
            >
              View LinkedIn profile
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
  fullText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  fullText?: boolean;
}) {
  return (
    <div>
      <p className="micro-label flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={`text-sm text-ink-900/85 mt-1 ${fullText ? "leading-relaxed" : "font-medium"}`}>
        {value}
      </p>
    </div>
  );
}
