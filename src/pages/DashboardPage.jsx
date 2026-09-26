import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CreditCard,
  HandHeart,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AnnouncementsPanel from '../components/dashboard/AnnouncementsPanel'
import QuickLinksPanel from '../components/dashboard/QuickLinksPanel'
import RegistrationOverview from '../components/dashboard/RegistrationOverview'
import StudentSchedules from '../components/dashboard/StudentSchedules'
import {
  emptyDashboardData,
  loadDashboardData,
  previewDashboardData,
} from '../data/dashboard'

const quickLinks = [
  {
    to: '/classes',
    label: 'Browse Classes',
    detail: 'Search the current catalog',
    icon: BookOpen,
    accent: 'text-brand-gold',
  },
  {
    to: '/registration',
    label: 'Registration',
    detail: 'Enroll students & waitlists',
    icon: CalendarDays,
    accent: 'text-brand-sky',
  },
  {
    to: '/contributions',
    label: 'Contributions',
    detail: 'Opportunities & approvals',
    icon: HandHeart,
    accent: 'text-brand-junior',
  },
  {
    to: '/directory',
    label: 'Directory',
    detail: 'Find Latter UP families',
    icon: Users,
    accent: 'text-brand-sky',
  },
]

export default function DashboardPage() {
  const { portalContext, isDevPreview } = useAuth()
  const person = portalContext?.person
  const firstName = person?.preferred_name || person?.first_name || 'Member'

  const [dashboardData, setDashboardData] = useState(
    isDevPreview ? previewDashboardData : emptyDashboardData,
  )
  const [loading, setLoading] = useState(!isDevPreview)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (isDevPreview) {
      setDashboardData(previewDashboardData)
      setLoadError(null)
      setLoading(false)
      return
    }

    let active = true

    setLoading(true)
    setLoadError(null)

    loadDashboardData(portalContext)
      .then((data) => {
        if (!active) return
        setDashboardData(data ?? emptyDashboardData)
      })
      .catch((error) => {
        if (!active) return
        console.error('Dashboard data failed to load:', error)
        setLoadError(error.message)
        setDashboardData(emptyDashboardData)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [portalContext, isDevPreview])

  const data = dashboardData ?? emptyDashboardData

  return (
    <div className="space-y-6">
      {isDevPreview && (
        <div className="rounded-xl border border-brand-gold/45 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          Local preview mode is on. This dashboard is using sample family data until Google sign-in is configured.
        </div>
      )}

      {loadError && !isDevPreview && (
        <div className="rounded-xl border border-brand-junior/40 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          We couldn't load your dashboard data. No sample member data is being shown. {loadError}
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-brand-navy p-6 text-white shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-sky/15" />
        <div className="absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-brand-gold/10" />

        <div className="relative">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-gold">
            Latter UP Members Portal
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="brand-title text-4xl leading-none sm:text-5xl">
                Welcome, {firstName}
              </h1>

              <p className="mt-3 max-w-xl text-base font-medium text-white/75">
                {data?.household?.familyName ?? 'Your Family'} · Everything your family needs for the current Latter UP year.
              </p>
            </div>

            <div className="flex gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider">
                {person?.member_type || 'Parent'}
              </span>

              {loading && (
                <span className="rounded-full bg-brand-sky/20 px-3 py-1.5 text-xs font-bold">
                  Updating…
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-junior">
              Start here
            </p>
            <h2 className="brand-title text-2xl text-brand-navy">
              Important Links
            </h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ to, label, detail, icon: Icon, accent }) => (
            <Link
              key={to}
              to={to}
              className="focus-ring group rounded-2xl border border-brand-sand/45 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-navy">
                  <Icon size={20} className={accent} />
                </div>

                <ArrowRight
                  size={17}
                  className="mt-1 text-brand-taupe transition group-hover:translate-x-1 group-hover:text-brand-navy"
                />
              </div>

              <p className="mt-4 font-extrabold text-brand-navy">{label}</p>
              <p className="mt-0.5 text-sm text-brand-taupe">{detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(290px,.75fr)]">
        <div className="space-y-6">
          <RegistrationOverview
            registration={data?.registration ?? {}}
            membership={data?.membership ?? {}}
          />

          <StudentSchedules
            students={data?.household?.students ?? []}
          />
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-gold">
              Account balance
            </p>

            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className="brand-title text-4xl text-brand-navy">
                  ${Number(data?.finance?.balance ?? 0).toFixed(2)}
                </p>

                <p className="mt-1 text-sm text-brand-taupe">
                  {data?.finance?.dueItems ?? 0}{' '}
                  {(data?.finance?.dueItems ?? 0) === 1 ? 'item' : 'items'} due
                </p>
              </div>

              <CreditCard className="mb-1 text-brand-sky" />
            </div>

            <Link
              to="/payments"
              className="focus-ring mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-brand-navy hover:text-brand-junior"
            >
              View payments <ArrowRight size={15} />
            </Link>
          </div>

          <AnnouncementsPanel
            announcements={data?.announcements ?? []}
          />

          <QuickLinksPanel />
        </aside>
      </div>
    </div>
  )
}
