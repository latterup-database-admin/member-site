export default function PlaceholderPage({ title, description }) {
  return (
    <div className="rounded-2xl border border-brand-sand/45 bg-white p-7 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-junior">Members Portal</p>
      <h1 className="brand-title mt-2 text-3xl text-brand-navy">{title}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-brand-taupe">{description}</p>
    </div>
  )
}
