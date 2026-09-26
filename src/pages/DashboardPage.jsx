import { ArrowRight, BookOpen, CalendarDays, HandHeart, Megaphone, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import StatusRow from '../components/StatusRow'

const quickLinks = [
  { to: '/classes', label: 'Browse Classes', icon: BookOpen },
  { to: '/directory', label: 'Member Directory', icon: Users },
  { to: '/contributions', label: 'Contributions', icon: HandHeart },
  { to: '/registration', label: 'Registration', icon: CalendarDays },
]

export default function DashboardPage() {
  const { portalContext } = useAuth()
  const person = portalContext?.person
  const household = portalContext?.households?.[0]
  const firstName = person?.preferred_name || person?.first_name || 'Member'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-junior">Members Portal</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="brand-title text-3xl text-brand-navy sm:text-4xl">Welcome, {firstName}</h1>
            <p className="mt-1 font-medium text-brand-taupe">{household?.family_name ? `${household.family_name} household` : 'Your Latter UP dashboard'}</p>
          </div>
          <span className="rounded-full bg-brand-sky/20 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-navy">{person?.member_type || 'member'}</span>
        </div>
      </section>

      <section>
        <h2 className="brand-title mb-3 text-xl text-brand-navy">Important Links</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="focus-ring group rounded-xl bg-brand-navy p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <Icon size={26} className="text-brand-gold" />
              <span className="mt-5 flex items-end justify-between gap-2 font-bold">
                {label}
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-junior">Registration</p>
                <h2 className="brand-title mt-1 text-2xl text-brand-navy">Your registration status</h2>
              </div>
              <CalendarDays className="text-brand-sky" />
            </div>
            <div className="mt-4">
              <StatusRow label="Annual membership" value="Connect data next" ok={false} />
              <StatusRow label="Membership dues" value="Connect data next" ok={false} />
              <StatusRow label="Contribution" value="Connect data next" ok={false} />
              <StatusRow label="Registration window" value="Connect data next" ok={false} />
            </div>
          </section>

          <section className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-sky">Family</p>
                <h2 className="brand-title mt-1 text-2xl text-brand-navy">My students' schedule</h2>
              </div>
              <Users className="text-brand-gold" />
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-brand-sand bg-brand-sand/10 p-6 text-center">
              <p className="font-bold text-brand-navy">Household members are connected.</p>
              <p className="mt-1 text-sm">Student schedules will be the next live dashboard query.</p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Megaphone size={19} className="text-brand-junior" />
              <h2 className="brand-title text-xl text-brand-navy">Announcements</h2>
            </div>
            <div className="mt-4 rounded-xl bg-brand-sky/10 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-brand-junior">Coming next</p>
              <p className="mt-1 font-bold text-brand-navy">Board-editable portal content</p>
              <p className="mt-1 text-sm leading-relaxed">Announcements, events, links, and homepage cards will be managed without editing code.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm">
            <h2 className="brand-title text-xl text-brand-navy">Quick Links</h2>
            <div className="mt-3 divide-y divide-brand-sand/25">
              {['Important Dates', 'Members Handbook', 'Class Catalog', 'Support & FAQs'].map((item) => (
                <button key={item} className="focus-ring flex w-full items-center justify-between py-3 text-left text-sm font-bold text-brand-navy hover:text-brand-junior">
                  {item}
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
