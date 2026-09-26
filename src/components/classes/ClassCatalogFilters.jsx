import { Search, SlidersHorizontal, X } from 'lucide-react'

export default function ClassCatalogFilters({ filters, options, onChange, onReset }) {
  return (
    <section className="rounded-2xl border border-brand-sand/45 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-brand-gold" />
          <h2 className="brand-title text-xl text-brand-navy">Filter classes</h2>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-extrabold text-brand-taupe transition hover:bg-brand-sand/15 hover:text-brand-navy"
        >
          <X size={14} />
          Clear filters
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="relative md:col-span-2 xl:col-span-2">
          <span className="sr-only">Search classes</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe/65" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            placeholder="Search title, teacher, description…"
            className="focus-ring w-full rounded-xl border border-brand-sand/55 bg-stone-50 py-2.5 pl-10 pr-3 text-sm font-semibold text-brand-navy outline-none placeholder:text-brand-taupe/55"
          />
        </label>

        <FilterSelect
          label="Program"
          value={filters.program}
          onChange={(value) => onChange('program', value)}
          options={[
            ['all', 'All programs'],
            ['junior', 'Junior'],
            ['youth', 'Youth'],
          ]}
        />

        <FilterSelect
          label="Term / Session"
          value={filters.period}
          onChange={(value) => onChange('period', value)}
          options={[['all', 'All terms'], ...options.periods]}
        />

        <FilterSelect
          label="Age group"
          value={filters.catalogGroup}
          onChange={(value) => onChange('catalogGroup', value)}
          options={[['all', 'All age groups'], ...options.catalogGroups]}
        />

        <FilterSelect
          label="Availability"
          value={filters.availability}
          onChange={(value) => onChange('availability', value)}
          options={[
            ['all', 'Any availability'],
            ['open', 'Seats available'],
            ['waitlist', 'Full / waitlist'],
          ]}
        />
      </div>
    </section>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label>
      <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-brand-taupe">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring w-full rounded-xl border border-brand-sand/55 bg-stone-50 px-3 py-2.5 text-sm font-bold text-brand-navy outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  )
}
