import { CalendarDays, DollarSign, UserRound, Users } from "lucide-react";
import { formatMeeting, periodLabel } from "../../data/classes";

export default function ClassCard({ offering, onOpen }) {
  const teacherNames =
    offering.instructors?.map((instructor) => instructor.name).join(" · ") ||
    "Instructor TBD";

  const primaryMeeting = offering.meetings?.[0];

  const multipleOfferings = offering.offerings?.length > 1;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-sand/45 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky hover:shadow-md">
      <div className={`h-1.5 ${audienceAccent(offering)}`} />

      <div className="flex flex-1 flex-col p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <AudienceBadge offering={offering} />

              <ClassTypeBadge category={offering.category} />

              <Badge>{sessionBadgeLabel(offering)}</Badge>
            </div>
          </div>

          <AvailabilityBadge offering={offering} />

          <div className="col-span-2 min-w-0">
            <h3 className="brand-title text-2xl leading-tight text-brand-navy">
              {offering.title}
            </h3>

            {getAvailablePeriods(offering).length > 1 && (
              <p className="mt-1.5 text-xs font-bold text-brand-taupe">
                {formatAvailablePeriods(offering)}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-brand-taupe">
          {offering.description || "Class description coming soon."}
        </p>

        <dl className="mt-5 space-y-2 text-sm text-brand-taupe">
          <InfoRow icon={UserRound} label={teacherNames} />

          {offering.scheduleMode === "flexible" ? (
            <InfoRow icon={CalendarDays} label="Flexible / anytime" />
          ) : offering.meetings?.length ? (
            offering.meetings.map((meeting, index) => (
              <InfoRow
                key={`${meeting.dayOfWeek}-${meeting.startTime}-${index}`}
                icon={CalendarDays}
                label={formatMeeting(meeting)}
              />
            ))
          ) : (
            <InfoRow icon={CalendarDays} label="Schedule TBD" />
          )}

          <InfoRow icon={DollarSign} label={feeLabel(offering)} />

          <InfoRow icon={Users} label={capacityLabel(offering)} />
        </dl>

        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={() => onOpen(offering)}
            className="focus-ring w-full rounded-xl border-2 border-brand-navy px-4 py-2.5 text-sm font-extrabold text-brand-navy transition hover:bg-brand-navy hover:text-white"
          >
            View class details
          </button>
        </div>
      </div>
    </article>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-brand-sand/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-navy">
      {children}
    </span>
  );
}

function AvailabilityBadge({ offering }) {
  const offerings = offering.offerings?.length
    ? offering.offerings
    : [offering];

  if (offerings.length > 1) {
    const openCount = offerings.filter((item) => !item.isFull).length;

    if (openCount === 0) {
      return (
        <span className="rounded-full bg-brand-junior/15 px-2.5 py-1 text-xs font-extrabold text-[#9f3d39]">
          Waitlist
        </span>
      );
    }

    return (
      <span className="rounded-full bg-brand-sky/20 px-2.5 py-1 text-xs font-extrabold text-brand-navy">
        {openCount} {openCount === 1 ? "offering open" : "offerings open"}
      </span>
    );
  }

  if (offering.isFull) {
    return (
      <span className="rounded-full bg-brand-junior/15 px-2.5 py-1 text-xs font-extrabold text-[#9f3d39]">
        Waitlist
      </span>
    );
  }

  if (offering.seatsRemaining === null) {
    return (
      <span className="rounded-full bg-brand-sky/20 px-2.5 py-1 text-xs font-extrabold text-brand-navy">
        Open
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
      {offering.seatsRemaining}{" "}
      {offering.seatsRemaining === 1 ? "seat" : "seats"} left
    </span>
  );
}

function InfoRow({ icon: Icon, label }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-sky" />

      <span>{label}</span>
    </div>
  );
}

function capacityLabel(offering) {
  if (offering.offerings?.length > 1) {
    return "Availability varies by session";
  }

  if (offering.maxEnrollment === null || offering.maxEnrollment === undefined) {
    return "No enrollment cap listed";
  }

  return `${offering.enrolledCount} of ${offering.maxEnrollment} spots filled`;
}

function feeLabel(offering) {
  const offerings = offering.offerings?.length
    ? offering.offerings
    : [offering];

  const fees = [...new Set(offerings.map((item) => Number(item.fee || 0)))];

  if (fees.length === 1) {
    return fees[0] > 0 ? `$${fees[0].toFixed(2)}` : "No class fee";
  }

  return "Fee varies by session";
}

function formatAvailablePeriods(offering) {
  const periods = offering.offeringPeriods?.length
    ? offering.offeringPeriods
    : offering.offeringPeriod
      ? [offering.offeringPeriod]
      : [];

  if (!periods.length) {
    return "Schedule TBD";
  }

  return periods.map(periodLabel).join(" · ");
}

function getAvailablePeriods(offering) {
  return offering.offeringPeriods?.length
    ? offering.offeringPeriods
    : offering.offeringPeriod
      ? [offering.offeringPeriod]
      : [];
}

function sessionBadgeLabel(offering) {
  const periods = getAvailablePeriods(offering);

  if (periods.length === 0) {
    return "Schedule TBD";
  }

  if (periods.length === 1) {
    return periodLabel(periods[0]);
  }

  return `${periods.length} Sessions`;
}

function AudienceBadge({ offering }) {
  const label = audienceLabel(offering);

  const styles = {
    Junior: "bg-brand-junior/15 text-[#9f3d39] ring-1 ring-brand-junior/35",

    "Middle School": "bg-brand-sky/20 text-brand-navy ring-1 ring-brand-sky/45",

    "High School": "bg-brand-gold/15 text-brand-navy ring-1 ring-brand-gold/45",

    Youth: "bg-brand-sand/20 text-brand-navy ring-1 ring-brand-sand/50",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
        styles[label] ?? styles.Youth
      }`}
    >
      {label}
    </span>
  );
}

function audienceLabel(offering) {
  if (offering.program === "junior") {
    return "Junior";
  }

  if (offering.catalogGroup === "Middle School") {
    return "Middle School";
  }

  if (offering.catalogGroup === "High School") {
    return "High School";
  }

  return "Youth";
}

function ClassTypeBadge({ category }) {
  const type = normalizeClassType(category);

  const styles = {
    Core: "bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/20",

    Elective: "bg-brand-sky/20 text-brand-navy ring-1 ring-brand-sky/35",

    Enrichment: "bg-brand-gold/20 text-brand-navy ring-1 ring-brand-gold/35",
  };

  if (!type) return null;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
        styles[type]
      }`}
    >
      {type}
    </span>
  );
}

function normalizeClassType(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized.includes("core")) {
    return "Core";
  }

  if (normalized.includes("elective")) {
    return "Elective";
  }

  if (normalized.includes("enrichment")) {
    return "Enrichment";
  }

  return null;
}

function audienceAccent(offering) {
  if (offering.program === "junior") {
    return "bg-brand-junior";
  }

  if (offering.catalogGroup === "High School") {
    return "bg-brand-gold";
  }

  if (offering.catalogGroup === "Middle School") {
    return "bg-brand-sky";
  }

  return "bg-brand-sand";
}
