import { CheckCircle2, CircleAlert } from 'lucide-react'

export default function StatusRow({ label, value, ok = true }) {
  const Icon = ok ? CheckCircle2 : CircleAlert
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brand-sand/25 py-3 last:border-0">
      <span className="font-semibold text-brand-taupe">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${ok ? 'text-brand-navy' : 'text-brand-junior'}`}>
        <Icon size={16} />
        {value}
      </span>
    </div>
  )
}
