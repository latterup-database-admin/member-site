import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Infinity,
  LockKeyhole,
} from 'lucide-react'
import DashboardCard from './DashboardCard'

function ProgramRow({ name, data = {}, accent }) {
  const eligible = Boolean(data?.eligible)
  const label = data?.label ?? 'Not available'
  const detail = data?.detail ?? ''

  const Icon = eligible
    ? label.toLowerCase().includes('unlimited')
      ? Infinity
      : CheckCircle2
    : LockKeyhole

  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <div
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${accent}`}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-extrabold text-brand-navy">{name}</p>

          <p className="text-sm font-bold text-brand-navy">
            {label}
          </p>
        </div>

        {detail && (
          <p className="mt-0.5 text-sm leading-relaxed text-brand-taupe">
            {detail}
          </p>
        )}
      </div>
    </div>
  )
}

export default function RegistrationOverview({
  registration = {},
  membership = {},
}) {
  const windowInfo = registration?.window ?? {
    isOpen: false,
    label: 'Registration status unavailable',
  }

  const junior = registration?.junior ?? {}
  const youth = registration?.youth ?? {}

  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-sand/25 p-5 sm:p-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-brand-junior">
            Registration
          </p>

          <h2 className="brand-title mt-1 text-2xl text-brand-navy">
            Ready for registration?
          </h2>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${
            windowInfo.isOpen
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-brand-sand/20 text-brand-navy'
          }`}
        >
          {windowInfo.isOpen ? (
            <CheckCircle2 size={14} />
          ) : (
            <Clock3 size={14} />
          )}

          {windowInfo.label}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-taupe">
              School year
            </p>

            <p className="mt-1 font-extrabold text-brand-navy">
              {membership?.schoolYear ?? 'Not set'}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-taupe">
              Membership
            </p>

            <p className="mt-1 font-extrabold text-brand-navy">
              {membership?.status ?? 'Unknown'}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-taupe">
              Dues
            </p>

            <p className="mt-1 font-extrabold text-brand-navy">
              {membership?.duesStatus ?? 'Unknown'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-brand-sand/25">
          <ProgramRow
            name="Junior"
            data={junior}
            accent="bg-brand-junior/15 text-brand-junior"
          />

          <ProgramRow
            name="Youth"
            data={youth}
            accent="bg-brand-sky/25 text-brand-navy"
          />
        </div>

        <a
          href="/registration"
          className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#00153a]"
        >
          <CalendarDays size={17} />
          Go to registration
        </a>
      </div>
    </DashboardCard>
  )
}