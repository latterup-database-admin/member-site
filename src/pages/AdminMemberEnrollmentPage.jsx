import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus } from "lucide-react";
import AgreementEditorModal from "../components/admin/AgreementEditorModal";
import { HouseholdPanel } from "./AdminHouseholdsPage";
import {
  loadAdminSchoolYearOptions,
  loadAdminMembershipEnrollmentStatus,
  recordAnnualMeeting,
} from "../data/adminMembershipEnrollment";

const PROGRESS = {
  not_started: { label: "Not started", tone: "bg-brand-sand/20 text-brand-taupe" },
  in_progress: { label: "In progress", tone: "bg-brand-gold/15 text-brand-navy" },
  complete: { label: "Complete", tone: "bg-emerald-50 text-emerald-700" },
  inactive: { label: "Inactive", tone: "bg-brand-sand/20 text-brand-taupe" },
};

const REQUIREMENTS = [
  ["profile", "Profile review", (h) => h.profile_complete],
  ["agreements", "Agreements", (h) => h.agreements_complete],
  ["meeting", "Annual meeting", (h) => h.meeting_complete],
  ["feedback", "Feedback", (h) => h.feedback_complete],
  ["contribution", "Contribution", (h) => h.contribution_approved],
  ["dues", "Dues", (h) => h.dues_satisfied],
];

const MEETING_METHODS = [
  ["one_on_one", "One-on-one meeting with the Board"],
  ["watched_recording", "Watched the meeting recording"],
  ["admin_other", "Other (explain in a note)"],
];

function Done({ value, label }) {
  return value ? (
    <Check size={16} className="text-emerald-700" aria-label={`${label}: complete`} />
  ) : (
    <Minus size={16} className="text-brand-sand" aria-label={`${label}: not complete`} />
  );
}

function Cell({ children }) {
  return (
    <td className="px-3 py-3">
      <div className="flex justify-center">{children}</div>
    </td>
  );
}

export default function AdminMembershipEnrollmentPage() {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [progressFilter, setProgressFilter] = useState("all");
  const [missing, setMissing] = useState("");
  const [search, setSearch] = useState("");
  const [panelId, setPanelId] = useState(null);

  const [marking, setMarking] = useState(null);
  const [markMethod, setMarkMethod] = useState("one_on_one");
  const [markNotes, setMarkNotes] = useState("");
  const [markSaving, setMarkSaving] = useState(false);
  const [markError, setMarkError] = useState("");

  useEffect(() => {
    loadAdminSchoolYearOptions()
      .then((list) => {
        setYears(list);
        const preferred =
          list.find((y) => y.is_enrollment_year) ?? list.find((y) => y.is_current) ?? list[0];
        if (preferred) setYearId(preferred.id);
        else setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!yearId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAdminMembershipEnrollmentStatus(yearId)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [yearId, reloadKey]);

  const households = useMemo(() => data?.households ?? [], [data]);
  const current = useMemo(() => households.filter((h) => h.progress !== "inactive"), [households]);

  const progressCounts = useMemo(() => {
    const counts = { not_started: 0, in_progress: 0, complete: 0, inactive: 0 };
    households.forEach((h) => (counts[h.progress] += 1));
    return counts;
  }, [households]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const requirement = REQUIREMENTS.find(([key]) => key === missing);
    return households.filter((h) => {
      if (progressFilter !== "all" && h.progress !== progressFilter) return false;
      if (requirement && (h.progress === "inactive" || requirement[2](h))) return false;
      if (missing === "feedback" && !h.feedback_required) return false;
      if (!needle) return true;
      return [h.family_name, h.legacy_family_id, h.managers]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [households, progressFilter, missing, search]);

  async function handleMark() {
    if (!marking || markSaving) return;
    setMarkSaving(true);
    setMarkError("");
    try {
      await recordAnnualMeeting({
        householdId: marking.household_id,
        schoolYearId: yearId,
        method: markMethod,
        notes: markNotes,
      });
      setMarking(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setMarkError(err.message);
    } finally {
      setMarkSaving(false);
    }
  }

  const feedbackRequiredCount = current.filter((h) => h.feedback_required).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="text-sm font-semibold text-brand-navy underline">
          ← Back to Admin
        </Link>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-brand-junior">
          Members &amp; Families
        </p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">Membership Enrollment Status</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-brand-navy">
          <Link to="/admin/households" className="underline">Households →</Link>
          <Link to="/admin/annual-meeting" className="underline">Annual Meeting Attendance →</Link>
          <Link to="/admin/annual-feedback" className="underline">Annual Feedback →</Link>
        </div>
      </div>

      <label className="block text-sm font-semibold text-brand-navy">
        School year
        <select
          value={yearId}
          onChange={(e) => setYearId(e.target.value)}
          className="mt-1 block rounded-lg border border-brand-sand/60 bg-white px-3 py-2 text-brand-navy"
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
              {y.is_current ? " (current)" : ""}
              {y.is_enrollment_year && !y.is_current ? " (enrollment)" : ""}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      )}

      {loading && !error && <p className="text-brand-taupe">Loading enrollment status…</p>}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["not_started", "in_progress", "complete", "inactive"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setProgressFilter(progressFilter === key ? "all" : key)}
                aria-pressed={progressFilter === key}
                className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                  progressFilter === key ? "border-brand-navy ring-2 ring-brand-navy/20" : "border-brand-sand/45"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-brand-taupe">
                  {PROGRESS[key].label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-brand-navy">{progressCounts[key]}</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-brand-sand/45 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-taupe">
              Requirements completed (of {current.length} current households)
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-brand-navy">
              {REQUIREMENTS.map(([key, label, isDone]) => {
                const pool = key === "feedback" ? current.filter((h) => h.feedback_required) : current;
                return (
                  <span key={key}>
                    {label}:{" "}
                    <strong>
                      {pool.filter(isDone).length} / {key === "feedback" ? feedbackRequiredCount : current.length}
                    </strong>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search family, Family ID, or manager"
              className="w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy sm:max-w-sm"
            />
            <label className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
              Missing
              <select
                value={missing}
                onChange={(e) => setMissing(e.target.value)}
                className="rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal text-brand-navy"
              >
                <option value="">Any requirement</option>
                {REQUIREMENTS.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <p className="text-sm text-brand-taupe">
              Showing {visible.length} of {households.length}
            </p>
          </div>

          {data.published_agreements === 0 && (
            <p className="text-sm text-brand-navy">
              No agreements have been published for this school year.
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-brand-sand/45 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-brand-sand/40 text-xs uppercase tracking-wide text-brand-taupe">
                <tr>
                  <th className="px-4 py-3">Family</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-3 py-3 text-center">Profile</th>
                  <th className="px-3 py-3 text-center">Agreements</th>
                  <th className="px-3 py-3 text-center">Meeting</th>
                  <th className="px-3 py-3 text-center">Feedback</th>
                  <th className="px-3 py-3 text-center">Contribution</th>
                  <th className="px-3 py-3 text-center">Dues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-sand/25 text-brand-navy">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-brand-taupe">
                      No households match.
                    </td>
                  </tr>
                ) : (
                  visible.map((h) => (
                    <tr key={h.household_id}>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setPanelId(h.household_id)}
                          className="text-left font-semibold underline-offset-2 hover:underline"
                        >
                          {h.family_name || "—"}
                        </button>
                        <p className="text-xs text-brand-taupe">
                          {h.legacy_family_id}
                          {h.managers && ` · ${h.managers}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PROGRESS[h.progress].tone}`}>
                          {PROGRESS[h.progress].label}
                        </span>
                      </td>
                      <Cell><Done value={h.profile_complete} label="Profile review" /></Cell>
                      <Cell>
                        <span
                          className={h.agreements_complete ? "font-bold text-emerald-700" : "text-brand-taupe"}
                          title={(h.agreement_sources ?? []).join(", ").replace("google_form", "Google Form")}
                        >
                          {h.agreements_accepted} / {h.agreements_total}
                        </span>
                      </Cell>
                      <Cell>
                        {h.meeting_complete ? (
                          <Done value label="Annual meeting" />
                        ) : h.progress === "inactive" ? (
                          <Done value={false} label="Annual meeting" />
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border border-brand-sand/60 px-2 py-1 text-xs font-bold text-brand-navy hover:bg-brand-sand/20"
                            onClick={() => {
                              setMarkMethod("one_on_one");
                              setMarkNotes("");
                              setMarkError("");
                              setMarking(h);
                            }}
                          >
                            Mark
                          </button>
                        )}
                      </Cell>
                      <Cell>
                        {h.feedback_submitted || h.feedback_required ? (
                          <Done value={h.feedback_submitted} label="Feedback" />
                        ) : (
                          <span className="text-xs text-brand-taupe">n/a</span>
                        )}
                      </Cell>
                      <Cell>
                        {h.contribution_approved ? (
                          <span className="text-xs font-bold text-emerald-700">Approved</span>
                        ) : h.contribution_declared ? (
                          <span className="text-xs font-bold text-brand-navy">Submitted</span>
                        ) : (
                          <Done value={false} label="Contribution" />
                        )}
                      </Cell>
                      <Cell><Done value={h.dues_satisfied} label="Dues" /></Cell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {panelId && <HouseholdPanel householdId={panelId} onClose={() => setPanelId(null)} />}

      <AgreementEditorModal
        open={marking !== null}
        title="Record Annual Meeting"
        onClose={() => !markSaving && setMarking(null)}
        saving={markSaving}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-navy">
            How did <strong>{marking?.family_name}</strong> complete the annual meeting?
          </p>
          <fieldset className="space-y-2">
            {MEETING_METHODS.map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-3 text-sm text-brand-navy">
                <input
                  type="radio"
                  name="meeting-method"
                  checked={markMethod === value}
                  onChange={() => setMarkMethod(value)}
                  className="h-4 w-4 accent-brand-navy"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="block text-sm font-semibold text-brand-navy">
            Notes {markMethod === "admin_other" ? "(required)" : "(optional)"}
            <textarea
              rows={2}
              value={markNotes}
              onChange={(e) => setMarkNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-sand/60 px-3 py-2 font-normal text-brand-navy"
            />
          </label>
          {markError && <p role="alert" className="text-sm text-red-700">{markError}</p>}
          <div className="flex justify-end gap-3 border-t border-brand-sand/40 pt-4">
            <button type="button" className="btn-secondary" disabled={markSaving} onClick={() => setMarking(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={markSaving || (markMethod === "admin_other" && markNotes.trim() === "")}
              onClick={handleMark}
            >
              {markSaving ? "Saving…" : "Record Meeting"}
            </button>
          </div>
        </div>
      </AgreementEditorModal>
    </div>
  );
}