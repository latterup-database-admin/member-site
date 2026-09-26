import { ArrowUpRight, BookOpen, CalendarDays, CircleHelp, FileText } from 'lucide-react'
import DashboardCard from './DashboardCard'

const links = [
  { label: 'Important Dates', icon: CalendarDays, href: '#' },
  { label: 'Members Handbook', icon: FileText, href: '#' },
  { label: 'Class Catalog', icon: BookOpen, href: '/classes' },
  { label: 'Support & FAQs', icon: CircleHelp, href: '#' },
]

export default function QuickLinksPanel() {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="border-b border-brand-sand/25 p-5">
        <h2 className="brand-title text-xl text-brand-navy">Quick Links</h2>
      </div>

      <div className="divide-y divide-brand-sand/25">
        {links.map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            className="focus-ring flex items-center justify-between gap-3 px-5 py-3.5 font-bold text-brand-navy transition hover:bg-brand-sky/10"
          >
            <span className="flex items-center gap-3">
              <Icon size={17} className="text-brand-sky" />
              {label}
            </span>
            <ArrowUpRight size={14} className="text-brand-taupe" />
          </a>
        ))}
      </div>
    </DashboardCard>
  )
}
