export default function DashboardCard({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-brand-sand/45 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}