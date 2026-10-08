import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  HandHeart,
  Loader2,
  RefreshCw,
  Clock3,
  XCircle,
  X,
} from "lucide-react";

import { usePermissions } from "../contexts/PermissionContext";
import {
  loadAdminContributionApplications,
  reviewAdminContributionApplication,
} from "../data/adminContributionApplications";

const STATUS_FILTERS = [
  { value: "needs_review", label: "Needs review" },
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function AdminContributionApplicationsPage() {
  const { hasPermission } = usePermissions();

  if (!hasPermission("admin.contributions.view")) {
    return (
      <div className="rounded-2xl border border-brand-sand/40 bg-white p-6 shadow-sm">
        <h1 className="brand-title text-2xl text-brand-navy">Contribution Approvals</h1>
        <p className="mt-2 text-sm text-brand-taupe">
          You do not have permission to view the Contribution Approvals admin workspace.
        </p>
        <Link
          to="/admin"
          className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-extrabold text-brand-sky hover:text-brand-navy"
        >
          <ArrowLeft size={15} />
          Back to Admin
        </Link>
      </div>
    );
  }

  const canApprove = hasPermission("admin.contributions.approve");

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin"
            className="focus-ring inline-flex items-center gap-2 rounded-lg text-xs font-extrabold text-brand-sky hover:text-brand-navy"
          >
            <ArrowLeft size={15} />
            Admin overview
          </Link>

        </div>


        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
            <HandHeart size={22} />
          </div>
          <div>
            <h1 className="brand-title text-3xl text-brand-navy">Contribution Approvals</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-taupe">
              Review contribution claims, including initial teaching claims. Full class proposals remain a separate later workflow.
            </p>
          </div>
        </div>
      </header>

      <ContributionApplicationsSection canApprove={canApprove} />
    </div>
  );
}

function ContributionApplicationsSection({ canApprove }) {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("needs_review");
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const rows = await loadAdminContributionApplications();
      setApplications(rows);
    } catch (err) {
      console.error("Failed to load admin contribution applications", err);
      setError(err?.message || "Contribution applications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const needsReviewCount = useMemo(
    () =>
      applications.filter((application) =>
        ["submitted", "under_review"].includes(application.status),
      ).length,
    [applications],
  );

  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applications;
    if (statusFilter === "needs_review") {
      return applications.filter((application) =>
        ["submitted", "under_review"].includes(application.status),
      );
    }
    return applications.filter((application) => application.status === statusFilter);
  }, [applications, statusFilter]);

  const selectedApplication =
    applications.find((application) => application.id === selectedId) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-brand-navy">Contribution applications</h2>
            {!loading && (
              <span className="rounded-full bg-brand-gold/15 px-2.5 py-1 text-xs font-extrabold text-brand-navy">
                {needsReviewCount} need review
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-brand-taupe">
            Initial teaching claims and non-teaching contribution claims are reviewed here. Full class proposals are reviewed separately.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-xs font-extrabold text-brand-navy shadow-sm transition hover:border-brand-sky disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`focus-ring shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                active
                  ? "bg-brand-navy text-white"
                  : "border border-brand-sand/40 bg-white text-brand-taupe hover:border-brand-sky hover:text-brand-navy"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl border border-brand-junior/35 bg-brand-junior/5 p-4 text-sm text-brand-navy">
          <div className="font-extrabold">Contribution applications could not be loaded.</div>
          <div className="mt-1 text-xs text-brand-taupe">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-brand-sand/35 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-taupe">
            <Loader2 size={18} className="animate-spin" />
            Loading contribution applications…
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-sand/40 bg-white shadow-sm">
          <div className="border-b border-brand-sand/25 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
            {filteredApplications.length} application{filteredApplications.length === 1 ? "" : "s"}
          </div>

          {filteredApplications.length ? (
            <div className="divide-y divide-brand-sand/20">
              {filteredApplications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(application.id);
                    setDrawerOpen(true);
                  }}
                  className="focus-ring group flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-brand-sand/5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-extrabold text-brand-navy">
                        {application.opportunity_title || "Contribution application"}
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    <div className="mt-1 text-xs text-brand-taupe">
                      {application.submitted_by_name || "Unknown applicant"}
                      {application.household_name ? ` · ${application.household_name}` : ""}
                      {application.school_year_name ? ` · ${application.school_year_name}` : ""}
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-brand-sand group-hover:text-brand-sky" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <CheckCircle2 size={28} className="mx-auto text-brand-gold" />
              <div className="mt-3 font-extrabold text-brand-navy">Nothing in this queue</div>
              <p className="mt-1 text-sm text-brand-taupe">No contribution applications match this filter.</p>
            </div>
          )}
        </div>
      )}

      {drawerOpen && selectedApplication && (
        <ContributionDrawer
          application={selectedApplication}
          canApprove={canApprove}
          onClose={() => setDrawerOpen(false)}
          onChanged={async () => {
            await refresh();
          }}
        />
      )}
    </section>
  );
}

function ContributionDrawer({ application, canApprove, onClose, onChanged }) {
  const [reviewNotes, setReviewNotes] = useState(application.review_notes || "");
  const [actionLoading, setActionLoading] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const benefits = Array.isArray(application.registration_benefits)
    ? application.registration_benefits
    : [];
  const sessions = Array.isArray(application.junior_session_coverage)
    ? application.junior_session_coverage
    : [];
  const linkedProposals = Array.isArray(application.linked_class_proposals)
    ? application.linked_class_proposals
    : [];
  const structuredCoverage = Array.isArray(application.structured_coverage)
    ? application.structured_coverage
    : [];
  const selectedProgram = application.responses?.selected_program || "";
  const selectedPeriod = application.responses?.selected_period || "";
  const canAct = canApprove && ["submitted", "under_review"].includes(application.status);

  async function runReviewAction(action) {
    try {
      setActionLoading(action);
      setActionError("");
      setActionMessage("");
      await reviewAdminContributionApplication({
        applicationId: application.id,
        action,
        reviewNotes,
      });
      setActionMessage(
        action === "approve"
          ? "Contribution approved and assignment created."
          : action === "deny"
            ? "Contribution claim denied."
            : "Contribution claim marked Under Review.",
      );
      await onChanged();
      if (action !== "under_review") onClose();
    } catch (error) {
      console.error("Contribution review action failed", error);
      setActionError(error?.message || "The contribution review action could not be completed.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close contribution details"
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/30"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-sand/30 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="brand-title text-2xl text-brand-navy">
                {application.opportunity_title || "Contribution application"}
              </h2>
              <StatusBadge status={application.status} />
            </div>
            <p className="mt-1 text-xs text-brand-taupe">
              {application.submitted_by_name || "Unknown applicant"}
              {application.household_name ? ` · ${application.household_name}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-xl border border-brand-sand/40 p-2 text-brand-taupe hover:border-brand-sky hover:text-brand-navy"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="School year" value={application.school_year_name} />
            <Detail label="Application type" value={formatValue(application.application_type)} />
            <Detail label="Contribution type" value={application.contribution_type} />
            <Detail label="Program / age group" value={application.age_group} />
            <Detail label="Cycle" value={application.cycle} />
            <Detail label="Committee" value={application.committee} />
            <Detail label="Oversight group" value={application.oversight_group} />
            <Detail label="Assignment status" value={formatValue(application.assignment_status)} />
          </div>

          {application.opportunity_description && (
            <Section title="Opportunity">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-navy">
                {application.opportunity_description}
              </p>
            </Section>
          )}

          <Section title="Coverage">
            <div className="rounded-xl border border-brand-sand/35 bg-brand-sand/5 p-3">
              <div className="text-sm font-extrabold text-brand-navy">
                {coverageSummary(structuredCoverage, application.coverage_choice_mode)}
              </div>
              {application.coverage_choice_mode === "choose_program" && (
                <div className="mt-2 text-sm text-brand-taupe">
                  Member selected: <strong className="text-brand-navy">{formatValue(selectedProgram)}</strong>
                </div>
              )}
              {application.coverage_choice_mode === "choose_period" && (
                <div className="mt-2 text-sm text-brand-taupe">
                  Member selected: <strong className="text-brand-navy">{coverageChoiceLabel(selectedProgram, selectedPeriod)}</strong>
                </div>
              )}
              {application.coverage_choice_mode === "all" && (
                <div className="mt-2 text-xs text-brand-taupe">All listed coverage applies automatically.</div>
              )}
            </div>
          </Section>

          <Section title="Registration benefits">
            {benefits.length ? (
              <div className="flex flex-wrap gap-2">
                {benefits.map((benefit, index) => (
                  <span key={`${benefit.program}-${benefit.benefit_type}-${index}`} className="rounded-full bg-brand-sky/10 px-2.5 py-1 text-xs font-bold text-brand-navy">
                    {formatValue(benefit.program)} · {formatValue(benefit.benefit_type)}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyValue />
            )}
          </Section>

          <Section title="Junior session coverage">
            {sessions.length ? (
              <div className="flex flex-wrap gap-2">
                {sessions.map((session) => (
                  <span key={session} className="rounded-full bg-brand-gold/12 px-2.5 py-1 text-xs font-bold text-brand-navy">
                    {formatValue(session)}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyValue />
            )}
          </Section>

          <Section title="Application responses">
            {application.responses && Object.keys(application.responses).length ? (
              <dl className="space-y-2">
                {Object.entries(application.responses).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-brand-sand/5 p-3">
                    <dt className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">{formatValue(key)}</dt>
                    <dd className="mt-1 text-sm text-brand-navy">{displayResponse(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <EmptyValue />
            )}
          </Section>

          {linkedProposals.length > 0 && (
            <Section title="Linked class proposals">
              <div className="space-y-2">
                {linkedProposals.map((proposal) => (
                  <Link
                    key={proposal.id}
                    to="/admin/classes/proposals"
                    className="focus-ring flex items-center justify-between gap-3 rounded-xl border border-brand-sand/35 p-3 transition hover:border-brand-sky"
                  >
                    <div>
                      <div className="text-sm font-extrabold text-brand-navy">{proposal.title}</div>
                      <div className="mt-0.5 text-xs text-brand-taupe">{formatValue(proposal.program)} · {formatValue(proposal.status)}</div>
                    </div>
                    <ExternalLink size={15} className="text-brand-sky" />
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <Section title="Review">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Reviewed by" value={application.reviewed_by_name} />
              <Detail label="Reviewed at" value={formatDateTime(application.reviewed_at)} />
            </div>
            {application.review_notes && (
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-brand-sand/5 p-3 text-sm text-brand-navy">
                {application.review_notes}
              </p>
            )}
          </Section>
        </div>

        <div className="border-t border-brand-sand/30 bg-brand-sand/5 px-5 py-4">
          {canApprove ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">Review notes</span>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  disabled={Boolean(actionLoading) || !canAct}
                  rows={3}
                  placeholder="Optional internal notes"
                  className="mt-1.5 w-full rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20 disabled:bg-brand-sand/10"
                />
              </label>

              {actionError && (
                <div className="rounded-xl border border-brand-junior/35 bg-brand-junior/5 p-3 text-sm text-brand-navy">{actionError}</div>
              )}
              {actionMessage && (
                <div className="rounded-xl border border-brand-sky/35 bg-brand-sky/10 p-3 text-sm font-bold text-brand-navy">{actionMessage}</div>
              )}

              {canAct ? (
                <div className="flex flex-wrap gap-2">
                  {application.status === "submitted" && (
                    <button
                      type="button"
                      onClick={() => runReviewAction("under_review")}
                      disabled={Boolean(actionLoading)}
                      className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/50 bg-white px-3 py-2 text-sm font-extrabold text-brand-navy hover:border-brand-sky disabled:opacity-50"
                    >
                      {actionLoading === "under_review" ? <Loader2 size={16} className="animate-spin" /> : <Clock3 size={16} />}
                      Under review
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => runReviewAction("approve")}
                    disabled={Boolean(actionLoading)}
                    className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-navy/90 disabled:opacity-50"
                  >
                    {actionLoading === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => runReviewAction("deny")}
                    disabled={Boolean(actionLoading)}
                    className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-junior/35 bg-white px-4 py-2 text-sm font-extrabold text-[#9f3d39] hover:bg-brand-junior/5 disabled:opacity-50"
                  >
                    {actionLoading === "deny" ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Deny
                  </button>
                </div>
              ) : (
                <p className="text-xs text-brand-taupe">This claim has already been finalized.</p>
              )}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-brand-taupe">You have view access only. Approve Contributions permission is required to review claims.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-6 border-t border-brand-sand/25 pt-5">
      <h3 className="text-sm font-extrabold text-brand-navy">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">{label}</div>
      <div className="mt-1 text-sm font-bold text-brand-navy">{value || "—"}</div>
    </div>
  );
}

function EmptyValue() {
  return <p className="text-sm text-brand-taupe">None configured.</p>;
}

function StatusBadge({ status }) {
  const normalized = status || "unknown";
  const classes =
    normalized === "approved"
      ? "bg-brand-sky/15 text-brand-navy"
      : ["submitted", "under_review"].includes(normalized)
        ? "bg-brand-gold/15 text-brand-navy"
        : "bg-brand-sand/20 text-brand-taupe";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${classes}`}>
      {formatValue(normalized)}
    </span>
  );
}


function coverageSummary(rows, choiceMode) {
  if (!rows.length) return "Coverage not configured";
  const youth = rows.filter((row) => row.program === "youth").map((row) => row.period);
  const junior = rows.filter((row) => row.program === "junior").map((row) => row.period);
  const parts = [];
  if (youth.length) {
    const full = youth.includes("fall") && youth.includes("spring");
    parts.push(full ? "Youth · Full Year" : `Youth · ${youth.map(periodLabel).join(" + ")}`);
  }
  if (junior.length) {
    const full = ["fall_session_1", "fall_session_2", "spring_session_1", "spring_session_2"]
      .every((period) => junior.includes(period));
    parts.push(full ? "Junior · Full Year" : `Junior · ${junior.map(periodLabel).join(" + ")}`);
  }
  let value = parts.join(" | ");
  if (choiceMode === "choose_program") value += " | Choose Junior or Youth";
  if (choiceMode === "choose_period") value += " | Choose one period/session";
  return value;
}

function coverageChoiceLabel(program, period) {
  return [formatValue(program), periodLabel(period)].filter(Boolean).join(" · ") || "—";
}

function periodLabel(value) {
  const labels = {
    fall: "Fall",
    spring: "Spring",
    fall_session_1: "Fall 1",
    fall_session_2: "Fall 2",
    spring_session_1: "Spring 1",
    spring_session_2: "Spring 2",
  };
  return labels[value] || formatValue(value);
}

function formatValue(value) {
  if (!value) return "";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayResponse(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((item) => (typeof item === "object" ? JSON.stringify(item) : formatValue(item))).join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
