import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus } from "lucide-react";
import {
  loadAdminSchoolYearOptions,
  loadAdminMembershipEnrollmentStatus,
} from "../data/adminMembershipEnrollment";

const CURRENT_STATUSES = ["pending", "reenrolled", "active"];

const SOURCE_LABELS = {
  portal: "Portal",
  google_form: "Google Form",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "followup", label: "Needs agreements" },
  { key: "incomplete", label: "Enrollment incomplete" },
  { key: "inactive", label: "Inactive / withdrawn" },
];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Done({ value, label }) {
  return value ? (
    <Check
      size={16}
      className="text-emerald-700"
      aria-label={`${label}: complete`}
    />
  ) : (
    <Minus
      size={16}
      className="text-brand-sand"
      aria-label={`${label}: not complete`}
    />
  );
}

function needsAgreements(h) {
  return (
    CURRENT_STATUSES.includes(h.membership_status) &&
    h.agreements_accepted < h.agreements_total
  );
}

export default function AdminMembershipEnrollmentPage() {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadAdminSchoolYearOptions()
      .then((list) => {
        if (cancelled) return;
        setYears(list);
        const current = list.find((y) => y.is_current) ?? list[0];
        if (current) setYearId(current.id);
        else setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!yearId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    loadAdminMembershipEnrollmentStatus(yearId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [yearId]);

  const households = useMemo(() => data?.households ?? [], [data]);

  const counts = useMemo(() => {
    const current = households.filter((h) =>
      CURRENT_STATUSES.includes(h.membership_status),
    );
    return {
      total: households.length,
      current: current.length,
      agreementsDone: current.filter(
        (h) =>
          h.agreements_total > 0 &&
          h.agreements_accepted === h.agreements_total,
      ).length,
      needsAgreements: households.filter(needsAgreements).length,
      enrollmentComplete: current.filter((h) => h.reenrollment_complete).length,
    };
  }, [households]);

  const visible = useMemo(() => {
    switch (filter) {
      case "followup":
        return households.filter(needsAgreements);
      case "incomplete":
        return households.filter(
          (h) =>
            CURRENT_STATUSES.includes(h.membership_status) &&
            !h.reenrollment_complete,
        );
      case "inactive":
        return households.filter(
          (h) => !CURRENT_STATUSES.includes(h.membership_status),
        );
      default:
        return households;
    }
  }, [households, filter]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin"
          className="text-sm font-semibold text-brand-navy underline"
        >
          ← Back to Admin
        </Link>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-brand-junior">
          Members &amp; Families
        </p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">
          Membership Enrollment Status
        </h1>
        <Link
          to="/admin/annual-feedback"
          className="mt-2 inline-block text-sm font-semibold text-brand-navy underline"
        >
          Annual Feedback →
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold text-brand-navy">
          School year
          <select
            value={yearId}
            onChange={(event) => setYearId(event.target.value)}
            className="mt-1 block rounded-lg border border-brand-sand/60 bg-white px-3 py-2 text-brand-navy"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.is_current ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      )}

      {loading && !error && (
        <p className="text-brand-taupe">Loading enrollment status…</p>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Current households", `${counts.current} of ${counts.total}`],
              [
                "All agreements accepted",
                `${counts.agreementsDone} of ${counts.current}`,
              ],
              ["Need agreements", counts.needsAgreements],
              [
                "Enrollment complete",
                `${counts.enrollmentComplete} of ${counts.current}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-brand-sand/45 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-brand-taupe">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-brand-navy">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {data.published_agreements === 0 && (
            <p className="text-sm text-brand-navy">
              No agreements have been published for this school year.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
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

          <div className="overflow-x-auto rounded-2xl border border-brand-sand/45 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-brand-sand/40 text-xs uppercase tracking-wide text-brand-taupe">
                <tr>
                  <th className="px-4 py-3">Family</th>
                  <th className="px-4 py-3">Managers</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Agreements</th>
                  <th className="px-3 py-3 text-center">Profile</th>
                  <th className="px-3 py-3 text-center">Materials</th>
                  <th className="px-3 py-3 text-center">Dues</th>
                  <th className="px-3 py-3 text-center">Contrib. declared</th>
                  <th className="px-3 py-3 text-center">Contrib. approved</th>
                  <th className="px-3 py-3 text-center">Feedback</th>
                  <th className="px-3 py-3 text-center">Complete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-sand/25 text-brand-navy">
                {visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-6 text-center text-brand-taupe"
                    >
                      No households match this filter.
                    </td>
                  </tr>
                ) : (
                  visible.map((h) => (
                    <tr key={h.membership_year_id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{h.family_name || "—"}</p>
                        <p className="text-xs text-brand-taupe">
                          {h.legacy_family_id}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-brand-taupe">
                        {h.managers || "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {h.membership_status}
                      </td>
                      <td className="px-4 py-3">
                        <p
                          className={
                            h.agreements_total > 0 &&
                            h.agreements_accepted === h.agreements_total
                              ? "font-bold text-emerald-700"
                              : "font-semibold"
                          }
                        >
                          {h.agreements_accepted} / {h.agreements_total}
                        </p>
                        {h.agreement_sources.length > 0 && (
                          <p className="text-xs text-brand-taupe">
                            {h.agreement_sources
                              .map((s) => SOURCE_LABELS[s] ?? s)
                              .join(", ")}
                            {" · "}
                            {formatDate(h.agreements_last_accepted_at)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <Done
                            value={h.profile_review_complete}
                            label="Profile review"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <Done
                            value={h.materials_acknowledged}
                            label="Materials"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <Done value={h.dues_satisfied} label="Dues" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <Done
                            value={h.contribution_declared}
                            label="Contribution declared"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <Done
                            value={h.contribution_approved}
                            label="Contribution approved"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          {h.feedback_submitted || h.feedback_required ? (
                            <Done
                              value={h.feedback_submitted}
                              label="Feedback"
                            />
                          ) : (
                            <span className="text-xs text-brand-taupe">
                              n/a
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          <Done
                            value={h.reenrollment_complete}
                            label="Enrollment complete"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
