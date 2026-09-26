import { ArrowRight, Megaphone } from 'lucide-react'
import DashboardCard from './DashboardCard'

export default function AnnouncementsPanel({ announcements }) {
  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-brand-sand/25 p-5">
        <Megaphone size={19} className="text-brand-junior" />
        <h2 className="brand-title text-xl text-brand-navy">Announcements</h2>
      </div>
      <div className="divide-y divide-brand-sand/25">
        {announcements.map((announcement) => (
          <article key={announcement.id} className="p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-junior">{announcement.eyebrow}</p>
            <h3 className="mt-1 font-extrabold text-brand-navy">{announcement.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-taupe">{announcement.body}</p>
          </article>
        ))}
      </div>
      <button className="focus-ring flex w-full items-center justify-between bg-brand-sky/10 px-5 py-3 text-sm font-extrabold text-brand-navy hover:bg-brand-sky/20">
        View all announcements
        <ArrowRight size={16} />
      </button>
    </DashboardCard>
  )
}
