import { Search } from "lucide-react";

export default function DirectoryFilters({
  search,
  onSearchChange,
  audience,
  onAudienceChange,
  state,
  onStateChange,
  stateOptions,
}) {
  return (
    <div className="rounded-2xl border border-brand-sand/50 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search families, members, or location..."
            className="focus-ring w-full rounded-xl border border-brand-sand/60 bg-white py-2.5 pl-10 pr-3 text-sm text-brand-navy placeholder:text-brand-taupe/60"
          />
        </label>

        <select
          value={audience}
          onChange={(event) =>
            onAudienceChange(event.target.value)
          }
          className="focus-ring rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm font-semibold text-brand-navy"
        >
          <option value="all">All families</option>
          <option value="junior">Junior families</option>
          <option value="youth">Youth families</option>
          <option value="both">
            Junior + Youth families
          </option>
        </select>

        <select
          value={state}
          onChange={(event) =>
            onStateChange(event.target.value)
          }
          className="focus-ring rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm font-semibold text-brand-navy"
        >
          <option value="all">All states</option>

          {stateOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}