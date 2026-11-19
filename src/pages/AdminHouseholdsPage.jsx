import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Info, Search, X } from "lucide-react";
import {
  loadAdminHouseholds,
  loadAdminHouseholdDetail,
  loadAdminSchoolYearOptions,
} from "../data/adminMembershipEnrollment";

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "all", label: "All" },
];

const REJOIN_LABELS = {
  eligible: "Eligible to rejoin",
  review_required: "Review required to rejoin",
  blocked: "Do not rejoin (DNR)",
  not_assessed: "Rejoin not assessed",
};

export function StatusPill({ value }) {
  if (!value) return <span className="text-xs text-brand-taupe">—</span>;
  const tone =
    value === "active" || value === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : value === "pending" || value === "submitted" || value === "under_review"
        ? "bg-brand-gold/15 text-brand-navy"
        : "bg-brand-sand/20 text-brand-taupe";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${tone}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function ColumnHeading({ label, help, className = "" }) {
  return (
    <th className={`px-4 py-3 ${className}`}>
      <span className="inline-flex items-center gap-1" title={help}>
        {label}
        <Info size={12} aria-hidden="true" className="text-brand-taupe/70" />
        <span className="sr-only">: {help}</span>
      </span>
    </th>
  );
}

export default function AdminHouseholdsPage() {
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [selectedId, setSelectedId] = useState(null);
    const [years, setYears] = useState([]);

   useEffect(() => {
    Promise.all([loadAdminHouseholds(), loadAdminSchoolYearOptions()])
      .then(([list, yearList]) => {
        setHouseholds(list);
        setYears(yearList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const currentYear = years.find((y) => y.is_current);
  const enrollmentYear = years.find((y) => y.is_enrollment_year) ?? currentYear;
  const showEnrollmentColumn = enrollmentYear && enrollmentYear.id !== currentYear?.id;

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return households.filter((h) => {
      if (filter !== "all" && h.status !== filter) return false;
      if (!needle) return true;
      return [h.family_name, h.legacy_family_id, h.member_names]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [households, search, filter]);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="text-sm font-semibold text-brand-navy underline">
          ← Back to Admin
        </Link>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-brand-junior">
          Members &amp; Families
        </p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">Households</h1>
        <Link
          to="/admin/membership-enrollment"
          className="mt-2 inline-block text-sm font-semibold text-brand-navy underline"
        >
          Membership Enrollment Status →
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search family, Family ID, or person"
            className="w-full rounded-xl border border-brand-sand/60 bg-white py-2.5 pl-10 pr-3 text-sm text-brand-navy"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "btn-primary" : "btn-secondary"}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-brand-taupe">Loading households…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-sand/45 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand-sand/40 text-xs uppercase tracking-wide text-brand-taupe">
                           <tr>
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">Managers</th>
                <ColumnHeading
                  label="Household"
                  help="The family's overall record, kept across all years. Active means a current member family; inactive means a past family."
                />
                <ColumnHeading
                  label="Active people"
                  className="text-center"
                  help="Active people in the household, out of everyone ever recorded in it."
                />
                <ColumnHeading
                  label={currentYear?.name ?? "This year"}
                  help={`Membership for ${currentYear?.name ?? "the current school year"}, the year running now.`}
                />
                {showEnrollmentColumn && (
                  <ColumnHeading
                    label={enrollmentYear.name}
                    help={`Membership for ${enrollmentYear.name}, the year families are enrolling into. "Not started" means the family hasn't begun enrolling yet.`}
                  />
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-sand/25 text-brand-navy">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={showEnrollmentColumn ? 6 : 5} className="px-4 py-6 text-center text-brand-taupe">
                    No households match.
                  </td>
                </tr>
              ) : (
                visible.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => setSelectedId(h.id)}
                    className="cursor-pointer hover:bg-brand-sky/10"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-semibold underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(h.id);
                        }}
                      >
                        {h.family_name || "—"}
                      </button>
                      <p className="text-xs text-brand-taupe">
                        {h.legacy_family_id || "no Family ID"}
                        {h.rejoin_eligibility === "blocked" && " · DNR"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-brand-taupe">{h.managers || "—"}</td>
                    <td className="px-4 py-3"><StatusPill value={h.status} /></td>
                    <td className="px-4 py-3 text-center">
                      {h.active_people} / {h.total_people}
                    </td>
                    <td className="px-4 py-3"><StatusPill value={h.current_membership} /></td>
                                        {showEnrollmentColumn && (
                      <td className="px-4 py-3">
                        {h.enrollment_membership ? (
                          <StatusPill value={h.enrollment_membership} />
                        ) : h.status === "active" ? (
                          <span className="text-xs font-semibold text-brand-taupe">Not started</span>
                        ) : (
                          <span className="text-xs text-brand-taupe">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <HouseholdPanel householdId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

export function HouseholdPanel({ householdId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    loadAdminHouseholdDetail(householdId)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const contributionsByYear = useMemo(() => {
    const groups = new Map();
    (detail?.contributions ?? []).forEach((c) => {
      if (!groups.has(c.school_year)) groups.set(c.school_year, []);
      groups.get(c.school_year).push(c);
    });
    return [...groups];
  }, [detail]);

  const h = detail?.household;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-brand-navy/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={h ? `${h.family_name} details` : "Household details"}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-navy">
              {h?.family_name ?? "Loading…"}
            </h2>
            {h && (
              <p className="mt-1 text-sm text-brand-taupe">
                {h.legacy_family_id || "no Family ID"}
                {[h.city, h.state].filter(Boolean).length > 0 &&
                  ` · ${[h.city, h.state].filter(Boolean).join(", ")}`}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

        {h && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <StatusPill value={h.status} />
              <span className="rounded-full bg-brand-sand/20 px-2 py-0.5 text-xs font-bold text-brand-navy">
                {REJOIN_LABELS[h.rejoin_eligibility] ?? h.rejoin_eligibility}
              </span>
            </div>

            <section>
              <h3 className="font-extrabold text-brand-navy">Members</h3>
              <ul className="mt-2 divide-y divide-brand-sand/25">
                {detail.members.map((m) => (
                  <li key={m.person_id} className="py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-brand-navy">{m.name}</span>
                      <StatusPill value={m.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-brand-taupe">
                      {[
                        m.member_type,
                        m.is_guardian && "guardian",
                        m.can_manage_household && "manager",
                        m.legacy_profile_id && `profile ${m.legacy_profile_id}`,
                        m.predates_profile_numbers &&
                          !m.legacy_profile_id &&
                          "pre-profile number (needs one to rejoin)",
                        m.email,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="font-extrabold text-brand-navy">Memberships</h3>
              {detail.memberships.length === 0 ? (
                <p className="mt-2 text-sm text-brand-taupe">No membership years recorded.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {detail.memberships.map((ms) => (
                    <li key={ms.school_year} className="flex flex-wrap items-center gap-2">
                      <span className="w-24 font-semibold text-brand-navy">{ms.school_year}</span>
                      <StatusPill value={ms.status} />
                      <span className="text-xs text-brand-taupe">dues {ms.dues_status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="font-extrabold text-brand-navy">Contributions</h3>
              {contributionsByYear.length === 0 ? (
                <p className="mt-2 text-sm text-brand-taupe">No contributions recorded.</p>
              ) : (
                contributionsByYear.map(([year, items]) => (
                  <div key={year} className="mt-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
                      {year} · {items.length}
                    </p>
                    <ul className="mt-1 divide-y divide-brand-sand/25">
                      {items.map((c, i) => (
                        <li key={`${c.title}-${i}`} className="py-2 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-brand-navy">
                              {c.code && <span className="text-brand-taupe">{c.code} · </span>}
                              {c.title}
                            </span>
                            <StatusPill value={c.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-brand-taupe">
                            {[
                              c.contribution_type,
                              c.person,
                              c.coverage?.length > 0 && c.coverage.join(", ").replaceAll("_", " "),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}