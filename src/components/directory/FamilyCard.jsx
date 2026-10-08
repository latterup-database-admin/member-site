import { ChevronRight, MapPin, UserRound, Users } from "lucide-react";

import { householdAudience, locationLabel } from "../../data/directory";

export default function FamilyCard({ household, onOpen }) {
  const audience = householdAudience(household);
  const location = locationLabel(household.location);

  const students = [...household.youth, ...household.juniors];

  return (
    <button
      type="button"
      onClick={() => onOpen(household)}
      className="focus-ring group overflow-hidden rounded-2xl border border-brand-sand/45 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`h-1.5 ${familyAccent(audience)}`} />

      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="brand-title text-3xl leading-tight text-brand-navy">
              {household.familyName}
            </h2>

            {location && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-brand-taupe">
                <MapPin size={14} />
                <span>{location}</span>
              </div>
            )}
          </div>

          <ChevronRight
            size={20}
            className="mt-1 shrink-0 text-brand-taupe transition group-hover:translate-x-1 group-hover:text-brand-navy"
          />
        </div>

        <div className="mt-5 space-y-4">
          {household.adults.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
                <UserRound size={14} />
                Adults
              </div>

              <div className="space-y-2">
                {household.adults.map((adult) => (
                  <PersonPreview key={adult.id} member={adult} />
                ))}
              </div>
            </section>
          )}

          {students.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
                <Users size={14} />
                Students
              </div>

              <div className="flex flex-wrap gap-2">
                {students.map((student) => (
                  <StudentChip key={student.id} member={student} />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="mt-auto pt-5 text-sm font-bold text-brand-navy">
          View family
          <span aria-hidden="true"> →</span>
        </div>
      </div>
    </button>
  );
}

function PersonPreview({ member }) {
  const primaryServicePosition = member.servicePositions?.[0];

  return (
    <div className="flex items-center gap-3.5">
      <MemberAvatar member={member} size="small" />

      <div className="min-w-0">
        <div className="truncate text-base font-bold text-brand-navy">
          {member.displayName}
        </div>

        {(member.teaching?.length > 0 || primaryServicePosition) && (
          <div className="mt-1 space-y-0.5">
            {member.teaching?.length > 0 && (
              <div className="text-xs font-semibold text-brand-taupe">
                Teaches {member.teaching.length}{" "}
                {member.teaching.length === 1 ? "class" : "classes"}
              </div>
            )}

            {primaryServicePosition && (
              <div className="text-xs font-semibold text-brand-taupe">
                {primaryServicePosition.title}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentChip({ member }) {
  const isJunior = member.memberType === "junior";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        isJunior
          ? "bg-brand-junior/15 text-[#9f3d39] ring-1 ring-brand-junior/30"
          : "bg-brand-sky/20 text-brand-navy ring-1 ring-brand-sky/35"
      }`}
    >
      <span>{member.displayName}</span>

      <span className="opacity-65">· {isJunior ? "Junior" : "Youth"}</span>

      {member.isBringAFriend && (
        <span className="text-brand-gold">· Bring A Friend</span>
      )}
    </span>
  );
}

export function MemberAvatar({ member, size = "medium" }) {
  const sizeClass =
    size === "small" ? "h-12 w-12 text-sm" : "h-14 w-14 text-base";

  const initials = getInitials(member);

  if (member.profilePhotoUrl) {
    return (
      <img
        src={member.profilePhotoUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border border-brand-sand/40 object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-brand-sky/20 font-extrabold text-brand-navy ring-1 ring-brand-sky/30`}
    >
      {initials}
    </div>
  );
}

function getInitials(member) {
  const first = member.preferredName || member.firstName || "";

  const last = member.lastName || "";

  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function familyAccent(audience) {
  if (audience === "junior") {
    return "bg-brand-junior";
  }

  if (audience === "youth") {
    return "bg-brand-sky";
  }

  if (audience === "both") {
    return "bg-brand-navy";
  }

  return "bg-brand-sand";
}
