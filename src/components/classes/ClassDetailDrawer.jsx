import { ExternalLink, FileText, PlayCircle, Users, X } from 'lucide-react'
import { formatMeeting, periodLabel } from '../../data/classes'
import RegistrationPanel from './RegistrationPanel'

export default function ClassDetailDrawer({ offering, onClose }) {
  if (!offering) return null

  const instructors = offering.instructors?.map((instructor) => instructor.name).join(', ') || 'Instructor TBD'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/45"
        aria-label="Close class details"
      />

      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className={`h-2 ${offering.program === 'junior' ? 'bg-brand-junior' : 'bg-brand-sky'}`} />

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-sand/35 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-taupe">Class details</p>
            <p className="brand-title text-xl text-brand-navy">{offering.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-2 text-brand-navy transition hover:bg-brand-sand/15"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Pill>{offering.program === 'junior' ? 'Junior' : 'Youth'}</Pill>
            <Pill>{periodLabel(offering.offeringPeriod)}</Pill>
            {offering.catalogGroup && <Pill>{offering.catalogGroup}</Pill>}
            {offering.category && <Pill>{offering.category}</Pill>}
          </div>

          <section>
            <h2 className="brand-title text-lg text-brand-navy">About this class</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-brand-taupe">
              {offering.description || 'Class description coming soon.'}
            </p>
          </section>

          <section className="grid gap-3 rounded-2xl border border-brand-sand/40 bg-stone-50 p-4 sm:grid-cols-2">
            <Detail label="Instructor" value={instructors} />
            <Detail label="Fee" value={offering.fee > 0 ? `$${offering.fee.toFixed(2)}` : 'No class fee'} />
            <Detail label="Availability" value={offering.isFull ? 'Full — waitlist available' : availabilityText(offering)} />
            <Detail label="Term / Session" value={periodLabel(offering.offeringPeriod)} />
          </section>

          <section>
            <h2 className="brand-title text-lg text-brand-navy">Schedule</h2>
            <div className="mt-2 space-y-2">
              {offering.meetings?.length ? offering.meetings.map((meeting, index) => (
                <div key={`${meeting.dayOfWeek}-${meeting.startTime}-${index}`} className="rounded-xl border border-brand-sand/35 px-4 py-3 text-sm font-semibold text-brand-navy">
                  {formatMeeting(meeting)}
                </div>
              )) : (
                <p className="text-sm text-brand-taupe">Schedule TBD</p>
              )}
            </div>
          </section>

          {(offering.minimumAge !== null || offering.maximumAge !== null || offering.ageExceptionNotes) && (
            <section>
              <h2 className="brand-title text-lg text-brand-navy">Age guidance</h2>
              <p className="mt-2 text-sm leading-6 text-brand-taupe">
                {ageText(offering)}
              </p>
              {offering.ageExceptionNotes && (
                <p className="mt-2 rounded-xl bg-brand-sky/10 p-3 text-sm font-semibold text-brand-navy">
                  {offering.ageExceptionNotes}
                </p>
              )}
            </section>
          )}

          {offering.prerequisites && (
            <section>
              <h2 className="brand-title text-lg text-brand-navy">Prerequisites</h2>
              <p className="mt-2 text-sm leading-6 text-brand-taupe">{offering.prerequisites}</p>
            </section>
          )}

          {(offering.syllabusUrl || offering.introVideoUrl) && (
            <section>
              <h2 className="brand-title text-lg text-brand-navy">Class resources</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {offering.syllabusUrl && (
                  <ResourceLink href={offering.syllabusUrl} icon={FileText}>View syllabus</ResourceLink>
                )}
                {offering.introVideoUrl && (
                  <ResourceLink href={offering.introVideoUrl} icon={PlayCircle}>Watch intro video</ResourceLink>
                )}
              </div>
            </section>
          )}

          <RegistrationPanel offering={offering} />
        </div>
      </aside>
    </div>
  )
}

function Pill({ children }) {
  return <span className="rounded-full bg-brand-sand/20 px-3 py-1 text-xs font-extrabold text-brand-navy">{children}</span>
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-taupe">{label}</p>
      <p className="mt-1 font-extrabold text-brand-navy">{value}</p>
    </div>
  )
}

function ResourceLink({ href, icon: Icon, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/50 px-3 py-2 text-sm font-extrabold text-brand-navy transition hover:bg-brand-sky/10"
    >
      <Icon size={16} />
      {children}
      <ExternalLink size={13} />
    </a>
  )
}

function availabilityText(offering) {
  if (offering.seatsRemaining === null) return 'Open'
  return `${offering.seatsRemaining} ${offering.seatsRemaining === 1 ? 'seat' : 'seats'} available`
}

function ageText(offering) {
  if (offering.minimumAge !== null && offering.maximumAge !== null) {
    return `Recommended ages ${offering.minimumAge}–${offering.maximumAge}.`
  }
  if (offering.minimumAge !== null) return `Recommended for ages ${offering.minimumAge} and up.`
  if (offering.maximumAge !== null) return `Recommended through age ${offering.maximumAge}.`
  return offering.catalogGroup || 'See catalog grouping for guidance.'
}
