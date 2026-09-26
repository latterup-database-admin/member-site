import { CalendarDays, Clock3, DollarSign, UserRound, Users } from 'lucide-react'
import { formatMeeting, periodLabel } from '../../data/classes'

export default function ClassCard({ offering, onOpen }) {
  const teacherNames = offering.instructors?.map((instructor) => instructor.name).join(', ') || 'Instructor TBD'
  const primaryMeeting = offering.meetings?.[0]

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-sand/45 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky hover:shadow-md">
      <div className={`h-1.5 ${offering.program === 'junior' ? 'bg-brand-junior' : 'bg-brand-sky'}`} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge>{offering.program === 'junior' ? 'Junior' : 'Youth'}</Badge>
              <Badge>{periodLabel(offering.offeringPeriod)}</Badge>
              {offering.catalogGroup && <Badge>{offering.catalogGroup}</Badge>}
            </div>
            <h3 className="brand-title mt-3 text-2xl leading-tight text-brand-navy">{offering.title}</h3>
          </div>

          <AvailabilityBadge offering={offering} />
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-brand-taupe">
          {offering.description || 'Class description coming soon.'}
        </p>

        <dl className="mt-5 space-y-2 text-sm text-brand-taupe">
          <InfoRow icon={UserRound} label={teacherNames} />
          <InfoRow icon={CalendarDays} label={primaryMeeting ? formatMeeting(primaryMeeting) : 'Schedule TBD'} />
          {offering.meetings?.length > 1 && (
            <p className="pl-7 text-xs font-semibold text-brand-taupe">+ {offering.meetings.length - 1} additional meeting time</p>
          )}
          <InfoRow icon={DollarSign} label={offering.fee > 0 ? `$${offering.fee.toFixed(2)}` : 'No class fee'} />
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
  )
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-brand-sand/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-navy">
      {children}
    </span>
  )
}

function AvailabilityBadge({ offering }) {
  if (offering.isFull) {
    return <span className="rounded-full bg-brand-junior/15 px-2.5 py-1 text-xs font-extrabold text-[#9f3d39]">Waitlist</span>
  }

  if (offering.seatsRemaining === null) {
    return <span className="rounded-full bg-brand-sky/20 px-2.5 py-1 text-xs font-extrabold text-brand-navy">Open</span>
  }

  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
      {offering.seatsRemaining} {offering.seatsRemaining === 1 ? 'seat' : 'seats'} left
    </span>
  )
}

function InfoRow({ icon: Icon, label }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-brand-sky" />
      <span>{label}</span>
    </div>
  )
}

function capacityLabel(offering) {
  if (offering.maxEnrollment === null || offering.maxEnrollment === undefined) return 'No enrollment cap listed'
  return `${offering.enrolledCount} of ${offering.maxEnrollment} spots filled`
}
