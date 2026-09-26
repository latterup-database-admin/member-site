import { useEffect, useMemo, useState } from 'react'
import { BookOpen, GraduationCap, SearchX } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ClassCard from '../components/classes/ClassCard'
import ClassCatalogFilters from '../components/classes/ClassCatalogFilters'
import ClassDetailDrawer from '../components/classes/ClassDetailDrawer'
import { loadClassCatalog, periodLabel, previewClassCatalog } from '../data/classes'

const initialFilters = {
  search: '',
  program: 'all',
  period: 'all',
  catalogGroup: 'all',
  availability: 'all',
}

export default function ClassesPage() {
  const { isDevPreview } = useAuth()
  const [catalog, setCatalog] = useState(isDevPreview ? previewClassCatalog : null)
  const [filters, setFilters] = useState(initialFilters)
  const [selectedOffering, setSelectedOffering] = useState(null)
  const [loading, setLoading] = useState(!isDevPreview)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (isDevPreview) {
      setCatalog(previewClassCatalog)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    loadClassCatalog()
      .then((data) => {
        if (!active) return
        setCatalog(data)
        setLoadError(null)
      })
      .catch((error) => {
        if (!active) return
        console.error('Class catalog failed to load:', error)
        setLoadError(error.message)
        setCatalog({ schoolYear: '', offerings: [] })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isDevPreview])

  const offerings = catalog?.offerings ?? []

  const options = useMemo(() => ({
    periods: uniqueOptions(offerings.map((item) => item.offeringPeriod), periodLabel),
    catalogGroups: uniqueOptions(offerings.map((item) => item.catalogGroup).filter(Boolean), (value) => value),
  }), [offerings])

  const filteredOfferings = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return offerings.filter((offering) => {
      if (filters.program !== 'all' && offering.program !== filters.program) return false
      if (filters.period !== 'all' && offering.offeringPeriod !== filters.period) return false
      if (filters.catalogGroup !== 'all' && offering.catalogGroup !== filters.catalogGroup) return false
      if (filters.availability === 'open' && offering.isFull) return false
      if (filters.availability === 'waitlist' && !offering.isFull) return false

      if (search) {
        const haystack = [
          offering.title,
          offering.description,
          offering.category,
          offering.catalogGroup,
          ...(offering.instructors || []).map((item) => item.name),
        ].filter(Boolean).join(' ').toLowerCase()

        if (!haystack.includes(search)) return false
      }

      return true
    })
  }, [offerings, filters])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {isDevPreview && (
        <div className="rounded-xl border border-brand-gold/45 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          Local preview mode is on. The catalog is using sample classes until Google sign-in is configured.
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-brand-junior/40 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          The live class catalog could not load: {loadError}
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-brand-navy p-6 text-white shadow-sm sm:p-8">
        <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-brand-sky/15" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-gold">{catalog?.schoolYear || 'Current Year'}</p>
            <h1 className="brand-title mt-2 text-4xl leading-none sm:text-5xl">Class Catalog</h1>
            <p className="mt-3 max-w-2xl text-base font-medium text-white/75">
              Browse Junior and Youth classes, compare sessions and schedules, and review class details before registration.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <GraduationCap className="text-brand-gold" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">Showing</p>
              <p className="font-extrabold">{filteredOfferings.length} {filteredOfferings.length === 1 ? 'offering' : 'offerings'}</p>
            </div>
          </div>
        </div>
      </section>

      <ClassCatalogFilters
        filters={filters}
        options={options}
        onChange={updateFilter}
        onReset={() => setFilters(initialFilters)}
      />

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-brand-sand/40 bg-white">
          <div className="text-center">
            <BookOpen className="mx-auto text-brand-sky" />
            <p className="mt-2 font-extrabold text-brand-navy">Loading class catalog…</p>
          </div>
        </div>
      ) : filteredOfferings.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-brand-sand/40 bg-white p-6 text-center">
          <div>
            <SearchX className="mx-auto text-brand-sky" />
            <h2 className="brand-title mt-3 text-2xl text-brand-navy">No classes match those filters</h2>
            <p className="mt-1 text-sm text-brand-taupe">Try clearing a filter or searching for something broader.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredOfferings.map((offering) => (
            <ClassCard key={offering.id} offering={offering} onOpen={setSelectedOffering} />
          ))}
        </div>
      )}

      <ClassDetailDrawer offering={selectedOffering} onClose={() => setSelectedOffering(null)} />
    </div>
  )
}

function uniqueOptions(values, formatLabel) {
  return [...new Set(values)]
    .sort((a, b) => formatLabel(a).localeCompare(formatLabel(b)))
    .map((value) => [value, formatLabel(value)])
}
