import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  RotateCcw,
  Ban,
  X,
} from "lucide-react";

import { usePermissions } from "../contexts/PermissionContext";
import {
  approveAdminClassProposal,
  loadAdminClassProposals,
  loadClassProposalReviewHistory,
  reviewAdminClassProposal,
} from "../data/adminClassProposals";

const STATUS_FILTERS = [
  { value: "needs_review", label: "Needs review" },
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "draft", label: "Draft" },
];

const PERIOD_LABELS = {
  fall: "Fall",
  spring: "Spring",
  year_long: "Year Long",
  fall_session_1: "Fall Session 1",
  fall_session_2: "Fall Session 2",
  spring_session_1: "Spring Session 1",
  spring_session_2: "Spring Session 2",
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function AdminClassProposalsPage() {
  const { hasPermission } = usePermissions();

  if (!hasPermission("admin.classes.view")) {
    return (
      <div className="rounded-2xl border border-brand-sand/40 bg-white p-6 shadow-sm">
        <h1 className="brand-title text-2xl text-brand-navy">Class Proposals</h1>
        <p className="mt-2 text-sm text-brand-taupe">
          You do not have permission to view the Class Proposals admin workspace.
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

  return (
    <div className="space-y-6">
      <header>
        <Link
          to="/admin"
          className="focus-ring inline-flex items-center gap-2 rounded-lg text-xs font-extrabold text-brand-sky hover:text-brand-navy"
        >
          <ArrowLeft size={15} />
          Admin overview
        </Link>

        <h1 className="brand-title mt-3 text-3xl text-brand-navy">
          Class Proposals
        </h1>

        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-taupe">
          Review teaching class proposals. Approval confirms the teaching contribution; catalog submission remains a separate workflow.
        </p>
      </header>

      <ClassProposalsSection />
    </div>
  );
}

function ClassProposalsSection() {
  const { hasPermission } = usePermissions();
  const [proposals, setProposals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("needs_review");
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const rows = await loadAdminClassProposals();
      setProposals(rows);

      setSelectedId((current) => {
        if (current && rows.some((row) => row.id === current)) {
          return current;
        }

        return current ?? null;
      });
    } catch (err) {
      console.error("Failed to load admin class proposals", err);
      setError(
        err?.message || "Class proposals could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const needsReviewCount = useMemo(
    () =>
      proposals.filter((proposal) =>
        ["submitted", "under_review"].includes(proposal.status),
      ).length,
    [proposals],
  );

  const filteredProposals = useMemo(() => {
    if (statusFilter === "all") {
      return proposals;
    }

    if (statusFilter === "needs_review") {
      return proposals.filter((proposal) =>
        ["submitted", "under_review"].includes(proposal.status),
      );
    }

    return proposals.filter(
      (proposal) => proposal.status === statusFilter,
    );
  }, [proposals, statusFilter]);

  const selectedProposal =
    proposals.find((proposal) => proposal.id === selectedId) ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-brand-navy">
              Class proposals
            </h2>

            {!loading && (
              <span className="rounded-full bg-brand-gold/15 px-2.5 py-1 text-xs font-extrabold text-brand-navy">
                {needsReviewCount} need review
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-brand-taupe">
            Review submitted teaching/class proposals before they
            become live catalog records.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-xs font-extrabold text-brand-navy shadow-sm transition hover:border-brand-sky disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
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
          <div className="font-extrabold">
            Class proposals could not be loaded.
          </div>
          <div className="mt-1 text-xs text-brand-taupe">
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-brand-sand/35 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-taupe">
            <Loader2 size={18} className="animate-spin" />
            Loading class proposals…
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-sand/40 bg-white shadow-sm">
          <div className="border-b border-brand-sand/25 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
            {filteredProposals.length} proposal
            {filteredProposals.length === 1 ? "" : "s"}
          </div>

          {filteredProposals.length > 0 ? (
            <div className="divide-y divide-brand-sand/20">
              {filteredProposals.map((proposal) => (
                <ProposalListItem
                  key={proposal.id}
                  proposal={proposal}
                  onSelect={() => {
                    setSelectedId(proposal.id);
                    setDrawerOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <CheckCircle2
                size={28}
                className="mx-auto text-brand-sky"
              />
              <div className="mt-3 text-sm font-extrabold text-brand-navy">
                Nothing in this view
              </div>
              <p className="mt-1 text-xs text-brand-taupe">
                No class proposals match the selected status.
              </p>
            </div>
          )}
        </div>
      )}

      {drawerOpen && selectedProposal && (
        <ProposalDetailDrawer
          proposal={selectedProposal}
          onClose={() => {
            setDrawerOpen(false);
            setActionError("");
          }}
          canApprove={hasPermission("admin.classes.approve")}
          acting={actionId === selectedProposal.id}
          actionError={actionError}
          onDecision={async (action, reviewNotes) => {
            setActionError("");
            setActionId(selectedProposal.id);

            try {
              if (action === "approved") {
                await approveAdminClassProposal(
                  selectedProposal.id,
                  reviewNotes,
                );
              } else {
                await reviewAdminClassProposal(
                  selectedProposal.id,
                  action,
                  reviewNotes,
                );
              }
              await refresh();
            } catch (err) {
              console.error("Failed to review class proposal", err);
              setActionError(
                err?.message || "This proposal could not be reviewed.",
              );
            } finally {
              setActionId(null);
            }
          }}
        />
      )}
    </section>
  );
}

function ProposalListItem({ proposal, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="focus-ring flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-brand-sand/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={proposal.status} />
          <span className="text-[11px] font-bold uppercase tracking-wide text-brand-taupe">
            {formatProgram(proposal.program)}
          </span>
        </div>

        <div className="mt-2 truncate text-sm font-extrabold text-brand-navy">
          {proposal.proposed_title}
        </div>

        <div className="mt-1 text-xs text-brand-taupe">
          {proposal.submitted_by_name || "Unknown submitter"}
          {proposal.school_year_name
            ? ` · ${proposal.school_year_name}`
            : ""}
        </div>

        <div className="mt-1 text-[11px] text-brand-taupe/80">
          {formatSubmittedDate(proposal)}
        </div>
      </div>

      <ChevronRight
        size={17}
        className="mt-1 shrink-0 text-brand-sand"
      />
    </button>
  );
}

function ProposalDetailDrawer({
  proposal,
  onClose,
  canApprove,
  acting,
  actionError,
  onDecision,
}) {
  const [reviewNotes, setReviewNotes] = useState(proposal.review_notes || "");
  const [pendingAction, setPendingAction] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const teachers = Array.isArray(proposal.teachers)
    ? proposal.teachers
    : [];
  const periods = Array.isArray(proposal.responses?.offering_periods)
    ? proposal.responses.offering_periods
    : [];
  const meetings = Array.isArray(proposal.responses?.meetings)
    ? proposal.responses.meetings
    : [];

  useEffect(() => {
    setReviewNotes(proposal.review_notes || "");
    setPendingAction(null);
  }, [proposal.id, proposal.review_notes]);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    setHistoryError("");

    loadClassProposalReviewHistory(proposal.id)
      .then((rows) => {
        if (active) setReviewHistory(rows);
      })
      .catch((err) => {
        console.error("Failed to load proposal review history", err);
        if (active) setHistoryError(err?.message || "Review history could not be loaded.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => { active = false; };
  }, [proposal.id, proposal.status, proposal.reviewed_at]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/45"
        aria-label="Close proposal details"
      />

      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className={`h-2 ${proposal.program === "junior" ? "bg-brand-junior" : "bg-brand-sky"}`} />

        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-sand/35 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-taupe">
              Class proposal
            </p>
            <p className="brand-title mt-1 truncate text-xl text-brand-navy">
              {proposal.proposed_title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="focus-ring shrink-0 rounded-lg p-2 text-brand-navy transition hover:bg-brand-sand/15"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <div>
      <div className="border-b border-brand-sand/25 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={proposal.status} />
          <span className="text-xs font-bold text-brand-taupe">
            {formatProgram(proposal.program)}
          </span>
          {proposal.school_year_name && (
            <span className="text-xs font-bold text-brand-taupe">
              · {proposal.school_year_name}
            </span>
          )}
        </div>

        <h3 className="brand-title mt-3 text-2xl text-brand-navy">
          {proposal.proposed_title}
        </h3>

        <p className="mt-1 text-xs text-brand-taupe">
          Submitted by{" "}
          <span className="font-bold text-brand-navy">
            {proposal.submitted_by_name || "Unknown submitter"}
          </span>
          {proposal.submitted_at
            ? ` on ${formatDateTime(proposal.submitted_at)}`
            : ""}
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <DetailGroup title="Teachers">
          {teachers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teachers.map((teacher) => (
                <span
                  key={`${teacher.person_id}-${teacher.sequence}`}
                  className="rounded-full bg-brand-sky/15 px-3 py-1.5 text-xs font-bold text-brand-navy"
                >
                  {teacher.display_name ||
                    [teacher.preferred_name || teacher.first_name, teacher.last_name]
                      .filter(Boolean)
                      .join(" ")}
                </span>
              ))}
            </div>
          ) : (
            <EmptyValue>No teachers are attached.</EmptyValue>
          )}
        </DetailGroup>

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryBox
            label="Offering periods"
            value={
              periods.length > 0
                ? periods.map(formatPeriod).join(" · ")
                : "Not specified"
            }
          />
          <SummaryBox
            label="Maximum enrollment"
            value={proposal.max_enrollment ?? "Not specified"}
          />
          <SummaryBox
            label="Fee"
            value={formatFee(proposal.proposed_fee)}
          />
          <SummaryBox
            label="Contribution-linked"
            value={
              proposal.contribution_application_id ? "Yes" : "No"
            }
          />
        </div>

        <DetailGroup title="Schedule">
          {meetings.length > 0 ? (
            <div className="space-y-2">
              {meetings.map((meeting, index) => (
                <div
                  key={`${meeting.sequence ?? index}-${meeting.day_of_week}-${meeting.start_time}`}
                  className="flex items-start gap-3 rounded-xl border border-brand-sand/30 bg-brand-sand/5 p-3"
                >
                  <Clock3
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-sky"
                  />
                  <div>
                    <div className="text-sm font-extrabold text-brand-navy">
                      {formatMeeting(meeting)}
                    </div>
                    <div className="mt-0.5 text-xs text-brand-taupe">
                      {meeting.timezone || "America/New_York"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyValue>No structured meetings were supplied.</EmptyValue>
          )}
        </DetailGroup>

        <DetailGroup title="Description">
          <BodyText value={proposal.description} />
        </DetailGroup>

        <DetailGroup title="Prerequisites">
          <BodyText value={proposal.prerequisites} />
        </DetailGroup>

        {(proposal.syllabus_url || proposal.intro_video_url) && (
          <DetailGroup title="Links">
            <div className="flex flex-wrap gap-3 text-sm font-bold text-brand-sky">
              {proposal.syllabus_url && (
                <a
                  href={proposal.syllabus_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded-lg underline decoration-brand-sky/40 underline-offset-4"
                >
                  Syllabus
                </a>
              )}
              {proposal.intro_video_url && (
                <a
                  href={proposal.intro_video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded-lg underline decoration-brand-sky/40 underline-offset-4"
                >
                  Intro video
                </a>
              )}
            </div>
          </DetailGroup>
        )}

        <DetailGroup title="Review history">
          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-brand-taupe">
              <Loader2 size={15} className="animate-spin" />
              Loading review history…
            </div>
          ) : historyError ? (
            <div className="rounded-xl border border-brand-junior/30 bg-brand-junior/5 p-3 text-xs text-brand-navy">
              {historyError}
            </div>
          ) : reviewHistory.length === 0 ? (
            <EmptyValue>No review activity yet.</EmptyValue>
          ) : (
            <div className="space-y-2">
              {reviewHistory.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-brand-sand/30 bg-brand-sand/5 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-extrabold text-brand-navy">
                      {reviewActionLabel(event.action)}
                    </div>
                    <div className="text-[11px] text-brand-taupe">
                      {formatDateTime(event.created_at)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-brand-taupe">
                    {event.actor_name || "System"}
                    {event.from_status && event.to_status
                      ? ` · ${titleCase(event.from_status)} → ${titleCase(event.to_status)}`
                      : ""}
                  </div>
                  {event.notes && (
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-navy">
                      {event.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DetailGroup>

        {['submitted', 'under_review'].includes(proposal.status) && (
          <DetailGroup title="Review decision">
            <div className="space-y-3 rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-4">
              <div>
                <label
                  htmlFor={`review-notes-${proposal.id}`}
                  className="text-xs font-extrabold text-brand-navy"
                >
                  Review note
                  <span className="ml-1 font-normal text-brand-taupe">
                    Required for revision requests and denials
                  </span>
                </label>

                <textarea
                  id={`review-notes-${proposal.id}`}
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  rows={3}
                  disabled={acting}
                  placeholder="Add context for the teacher and proposal history…"
                  className="focus-ring mt-2 w-full rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-sm text-brand-navy shadow-sm placeholder:text-brand-taupe/55 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {actionError && (
                <div className="rounded-lg border border-brand-junior/35 bg-brand-junior/10 px-3 py-2 text-xs font-bold text-brand-navy">
                  {actionError}
                </div>
              )}

              {pendingAction ? (
                <div className="rounded-xl border border-brand-navy/20 bg-white p-4">
                  <div className="text-sm font-extrabold text-brand-navy">
                    {confirmationTitle(pendingAction)}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-brand-taupe">
                    {confirmationDescription(pendingAction)}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingAction(null)}
                      disabled={acting}
                      className="focus-ring rounded-xl border border-brand-sand/50 bg-white px-3 py-2 text-xs font-extrabold text-brand-navy disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecision(pendingAction, reviewNotes)}
                      disabled={acting}
                      className={`focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50 ${
                        pendingAction === 'denied'
                          ? 'bg-[#9f3d39]'
                          : pendingAction === 'revision_requested'
                            ? 'bg-brand-gold text-brand-navy'
                            : 'bg-brand-navy'
                      }`}
                    >
                      {acting && <Loader2 size={14} className="animate-spin" />}
                      Confirm {decisionButtonLabel(pendingAction)}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingAction('approved')}
                    disabled={!canApprove || acting}
                    className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction('revision_requested')}
                    disabled={!canApprove || acting || !reviewNotes.trim()}
                    className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-gold/60 bg-white px-4 py-2.5 text-sm font-extrabold text-brand-navy disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw size={16} />
                    Return for revision
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction('denied')}
                    disabled={!canApprove || acting || !reviewNotes.trim()}
                    className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-junior/45 bg-white px-4 py-2.5 text-sm font-extrabold text-[#9f3d39] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Ban size={16} />
                    Deny
                  </button>
                </div>
              )}

              <p className="text-xs leading-relaxed text-brand-taupe">
                Approval advances the existing approval workflow. Returning for revision keeps this proposal open so the teacher can edit and resubmit the same record. Denial closes the proposal.
              </p>

              {!canApprove && (
                <p className="text-xs font-bold text-brand-taupe">
                  Your current role can view proposals but cannot review them.
                </p>
              )}
            </div>
          </DetailGroup>
        )}

        {proposal.status === 'revision_requested' && (
          <div className="rounded-xl border border-brand-gold/45 bg-brand-gold/10 p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-brand-navy">
              <RotateCcw size={17} />
              Waiting for teacher revision
            </div>
            <p className="mt-1 text-xs leading-relaxed text-brand-taupe">
              The teacher can revise and resubmit this same proposal. It will return to the review queue when resubmitted.
            </p>
            {proposal.review_notes && (
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-sm text-brand-navy">
                {proposal.review_notes}
              </div>
            )}
          </div>
        )}

        {proposal.status === 'denied' && (
          <div className="rounded-xl border border-brand-junior/35 bg-brand-junior/5 p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#9f3d39]">
              <Ban size={17} />
              Proposal denied
            </div>
            {proposal.review_notes && (
              <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-brand-navy">
                {proposal.review_notes}
              </div>
            )}
          </div>
        )}

        {proposal.status === 'approved' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
              <CheckCircle2 size={17} />
              Proposal approved
            </div>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
              The linked teaching contribution is approved. Catalog submission remains a separate workflow.
            </p>
          </div>
        )}
      </div>
        </div>
      </aside>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    submitted: "bg-brand-gold/15 text-brand-navy",
    under_review: "bg-brand-sky/20 text-brand-navy",
    revision_requested: "bg-brand-gold/20 text-brand-navy",
    approved: "bg-emerald-100 text-emerald-800",
    denied: "bg-brand-junior/15 text-brand-navy",
    withdrawn: "bg-brand-sand/20 text-brand-taupe",
    draft: "bg-brand-sand/20 text-brand-taupe",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
        styles[status] || "bg-brand-sand/20 text-brand-taupe"
      }`}
    >
      {titleCase(status || "unknown")}
    </span>
  );
}

function reviewActionLabel(action) {
  const labels = {
    submitted: "Submitted",
    resubmitted: "Resubmitted",
    under_review: "Marked under review",
    revision_requested: "Revision requested",
    approved: "Approved",
    denied: "Denied",
    withdrawn: "Withdrawn",
  };
  return labels[action] || titleCase(action);
}

function decisionButtonLabel(action) {
  if (action === "approved") return "approval";
  if (action === "revision_requested") return "revision request";
  if (action === "denied") return "denial";
  return "decision";
}

function confirmationTitle(action) {
  if (action === "approved") return "Approve this proposal?";
  if (action === "revision_requested") return "Return this proposal for revision?";
  if (action === "denied") return "Deny this proposal?";
  return "Confirm review decision";
}

function confirmationDescription(action) {
  if (action === "approved") {
    return "This will run the existing class-proposal approval workflow.";
  }
  if (action === "revision_requested") {
    return "The proposal will stay open and the teacher will be able to edit and resubmit the same proposal. Your review note will be preserved in history.";
  }
  if (action === "denied") {
    return "This closes the proposal as denied. The review note will be preserved in history.";
  }
  return "Confirm this action.";
}

function DetailGroup({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
        {title}
      </div>
      {children}
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="rounded-xl border border-brand-sand/30 bg-brand-sand/5 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-taupe">
        {label}
      </div>
      <div className="mt-1 text-sm font-extrabold text-brand-navy">
        {value}
      </div>
    </div>
  );
}

function BodyText({ value }) {
  if (!value) {
    return <EmptyValue>Not provided.</EmptyValue>;
  }

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-taupe">
      {value}
    </p>
  );
}

function EmptyValue({ children }) {
  return (
    <span className="text-sm italic text-brand-taupe/70">
      {children}
    </span>
  );
}

function formatProgram(program) {
  return program === "junior"
    ? "Junior"
    : program === "youth"
      ? "Youth"
      : titleCase(program || "");
}

function formatPeriod(period) {
  return PERIOD_LABELS[period] || titleCase(period);
}

function formatFee(value) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatMeeting(meeting) {
  const day = DAY_LABELS[Number(meeting.day_of_week)] || "Day not set";
  const time = formatTime(meeting.start_time);
  const duration = Number(meeting.duration_minutes);

  return [
    `${day} at ${time}`,
    Number.isFinite(duration) ? `${duration} minutes` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatTime(value) {
  if (!value) return "Time not set";

  const [hourText, minuteText = "00"] = String(value).split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }

  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSubmittedDate(proposal) {
  const value = proposal.submitted_at || proposal.created_at;
  return value ? `Submitted ${formatDateTime(value)}` : "Submission date unavailable";
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
