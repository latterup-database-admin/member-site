import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Loader2, UserCheck, UserPlus, Users } from "lucide-react";
import {
  admitMyTeacherWaitlistedStudent,
  loadMyTeacherClassManagement,
  reviewMyTeacherClassException,
} from "../data/teacherClasses";

export default function TeacherClassManagementPage() {
  const { classOfferingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [actionError, setActionError] = useState("");

  async function refresh() {
    setData(await loadMyTeacherClassManagement(classOfferingId));
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const next = await loadMyTeacherClassManagement(classOfferingId);
        if (active) setData(next);
      } catch (err) {
        if (active) setError(err?.message || "This class could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [classOfferingId]);

  async function handleReview(request, decision, notes) {
    setActionId(request.exception_request_id);
    setActionError("");
    try {
      await reviewMyTeacherClassException({
        exceptionRequestId: request.exception_request_id,
        decision,
        reviewNotes: notes,
      });
      await refresh();
    } catch (err) {
      setActionError(err?.message || "The exception request could not be reviewed.");
    } finally {
      setActionId(null);
    }
  }

  async function handleWaitlistAdmission(row, allowOverCapacity, reason = "") {
    setActionId(row.waitlist_entry_id);
    setActionError("");

    try {
      await admitMyTeacherWaitlistedStudent({
        waitlistEntryId: row.waitlist_entry_id,
        allowOverCapacity,
        reason,
      });
      await refresh();
    } catch (err) {
      setActionError(err?.message || "The student could not be admitted from the waitlist.");
    } finally {
      setActionId(null);
    }
  }

  const classInfo = data?.class ?? null;
  const enrollments = data?.enrollments ?? [];
  const waitlist = data?.waitlist ?? [];
  const exceptions = data?.exceptions ?? [];
  const pendingExceptions = useMemo(
    () => exceptions.filter((item) => item.status === "pending"),
    [exceptions],
  );

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-taupe">
          <Loader2 size={18} className="animate-spin" /> Loading class roster…
        </div>
      </div>
    );
  }

  if (error || !classInfo) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-2xl border border-brand-junior/30 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 text-brand-junior" />
            <p className="text-sm text-brand-navy">{error || "Class management information is unavailable."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <BackLink />
        <div className="mt-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
            {[titleCase(classInfo.program), formatPeriod(classInfo.offering_period)].filter(Boolean).join(" · ")}
          </div>
          <h1 className="brand-title mt-1 text-3xl text-brand-navy">{classInfo.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <SummaryPill value={classInfo.enrolled_count ?? enrollments.length} label="enrolled" />
            <SummaryPill value={classInfo.waitlist_count ?? waitlist.length} label="waiting" />
            <SummaryPill
              value={pendingExceptions.length}
              label={pendingExceptions.length === 1 ? "pending exception" : "pending exceptions"}
              emphasis={pendingExceptions.length > 0}
            />
            {classInfo.max_enrollment != null && (
              <SummaryPill
                value={`${classInfo.enrolled_count ?? enrollments.length}/${classInfo.max_enrollment}`}
                label="spots filled"
              />
            )}
          </div>
        </div>
      </header>

      {actionError && (
        <div className="rounded-xl border border-brand-junior/30 bg-brand-junior/5 px-4 py-3 text-sm text-brand-navy">
          {actionError}
        </div>
      )}

      <section>
        <SectionHeading
          title="Eligibility exceptions"
          description="Requests may be denied at any time. Approval becomes available after normal registration closes and only while the class has room."
        />
        {exceptions.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No eligibility exception requests" description="Any requests for this offering will appear here automatically." />
        ) : (
          <div className="space-y-3">
            {exceptions.map((request) => (
              <ExceptionRow
                key={request.exception_request_id}
                request={request}
                classInfo={classInfo}
                loading={actionId === request.exception_request_id}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Enrolled students" description="Students currently holding a seat in this offering." />
        {enrollments.length === 0 ? (
          <EmptyState icon={Users} title="No enrolled students yet" description="Confirmed registrations will appear here." />
        ) : (
          <div className="grid overflow-hidden rounded-2xl border border-brand-sand/35 bg-white shadow-sm md:grid-cols-2">
            {enrollments.map((row, index) => (
              <div
                key={row.enrollment_id}
                className={`flex items-center gap-2.5 px-4 py-2.5 ${
                  index >= 2 ? "border-t border-brand-sand/25" : ""
                } ${index % 2 === 1 ? "md:border-l md:border-brand-sand/25" : ""}`}
              >
                <UserCheck size={15} className="shrink-0 text-brand-gold" />
                <span className="text-sm font-bold text-brand-navy">{row.student_name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Waitlist" description="Active waiting and offered entries, in current waitlist order." />
        {waitlist.length === 0 ? (
          <EmptyState icon={Clock3} title="No students waiting" description="The active waitlist is currently empty." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-sand/35 bg-white shadow-sm">
            {waitlist.map((row, index) => (
              <WaitlistRow
                key={row.waitlist_entry_id}
                row={row}
                index={index}
                classInfo={classInfo}
                enrolledCount={classInfo.enrolled_count ?? enrollments.length}
                loading={actionId === row.waitlist_entry_id}
                onAdmit={handleWaitlistAdmission}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


function WaitlistRow({
  row,
  index,
  classInfo,
  enrolledCount,
  loading,
  onAdmit,
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const maxEnrollment = classInfo.max_enrollment;
  const isFull =
    maxEnrollment != null && Number(enrolledCount) >= Number(maxEnrollment);

  function handleAdmit() {
    if (isFull && !reason.trim()) return;
    setConfirmOpen(true);
  }

  async function confirmAdmission() {
    await onAdmit(row, isFull, reason.trim());
    setConfirmOpen(false);
    setExpanded(false);
    setReason("");
  }

  return (
    <div className={index ? "border-t border-brand-sand/25" : ""}>
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <div className="font-bold text-brand-navy">{row.student_name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-brand-taupe">
            <span>{titleCase(row.status)}</span>
            {isFull && (
              <span className="rounded-full bg-brand-gold/12 px-2 py-0.5 font-bold text-brand-navy">
                Class full
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-sm font-extrabold text-brand-navy">
            #{row.position ?? index + 1}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            disabled={loading}
            className="focus-ring rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-xs font-extrabold text-brand-navy hover:bg-brand-sand/5 disabled:opacity-50"
          >
            {expanded ? "Cancel" : isFull ? "Override & admit" : "Admit"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-brand-sand/20 bg-brand-sand/5 px-5 py-4">
          {isFull ? (
            <>
              <div className="rounded-xl border border-brand-gold/35 bg-white px-3 py-2.5 text-xs leading-relaxed text-brand-navy">
                This class currently has {enrolledCount} enrolled student{Number(enrolledCount) === 1 ? "" : "s"}
                {maxEnrollment != null ? ` with a maximum of ${maxEnrollment}` : ""}. This action will enroll the student without changing the class maximum.
              </div>

              <label className="mt-3 block">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-taupe">
                  Override reason · required
                </div>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={loading}
                  placeholder="Why are you admitting this student over capacity?"
                  className="focus-ring mt-1.5 w-full rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-sm text-brand-navy disabled:bg-brand-sand/10"
                />
              </label>
            </>
          ) : (
            <p className="text-sm text-brand-navy">
              This class currently has room. Admitting this student will create the enrollment, generate the normal class charge if applicable, and mark the waitlist entry promoted.
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAdmit}
              disabled={loading || (isFull && !reason.trim())}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <UserPlus size={15} />
              )}
              {isFull ? "Admit over capacity" : "Admit student"}
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/25 px-4 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Cancel admission"
            className="absolute inset-0"
            onClick={() => !loading && setConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-2xl">
            <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
              Confirm admission
            </div>
            <h3 className="brand-title mt-1 text-xl text-brand-navy">
              Admit {row.student_name}{isFull ? " over capacity" : " from the waitlist"}?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-brand-taupe">
              {isFull ? (
                <>
                  This class currently has <span className="font-bold text-brand-navy">{enrolledCount}</span> enrolled students with a maximum of <span className="font-bold text-brand-navy">{maxEnrollment}</span>. {row.student_name} will become student <span className="font-bold text-brand-navy">{Number(enrolledCount) + 1}</span>. The class maximum will remain {maxEnrollment}.
                </>
              ) : (
                <>
                  {row.student_name} will be moved from the waitlist into the enrolled roster.
                </>
              )}
            </p>
            {isFull && reason.trim() && (
              <div className="mt-3 rounded-xl border border-brand-sand/30 bg-brand-sand/5 px-3 py-2.5 text-xs text-brand-navy">
                <span className="font-extrabold">Override reason:</span> {reason.trim()}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
                className="focus-ring rounded-xl border border-brand-sand/45 bg-white px-4 py-2 text-sm font-extrabold text-brand-navy disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAdmission}
                disabled={loading}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Confirm admission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExceptionRow({ request, classInfo, loading, onReview }) {
  const [expanded, setExpanded] = useState(request.status === "pending");
  const [notes, setNotes] = useState("");

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-sand/35 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-brand-sand/5"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-brand-navy">{request.student_name}</span>
            <StatusPill status={request.status} />
          </div>
          {request.status === "pending" && !request.can_approve_now && (
            <div className="mt-1 text-xs text-brand-taupe">{request.approval_block_reason}</div>
          )}
        </div>
        <span className="text-xs font-bold text-brand-taupe">{expanded ? "Hide" : "Review"}</span>
      </button>

      {expanded && (
        <div className="border-t border-brand-sand/25 px-5 pb-5 pt-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-taupe">Request reason</div>
          <p className="mt-1 text-sm leading-relaxed text-brand-navy">{request.reason}</p>

          {request.status === "pending" && (
            <>
              <label className="mt-4 block">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-taupe">Review notes</div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={loading}
                  placeholder="Optional internal notes"
                  className="focus-ring mt-1.5 w-full rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-sm text-brand-navy disabled:bg-brand-sand/10"
                />
              </label>

              {!request.can_approve_now && (
                <div className="mt-3 rounded-xl border border-brand-gold/35 bg-brand-gold/5 px-3 py-2.5 text-xs leading-relaxed text-brand-navy">
                  {request.approval_block_reason}
                  {classInfo.registration_closes_at && !classInfo.registration_is_closed && (
                    <> Registration closes {formatEasternDateTime(classInfo.registration_closes_at)}.</>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onReview(request, "approved", notes)}
                  disabled={loading || !request.can_approve_now}
                  className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onReview(request, "denied", notes)}
                  disabled={loading}
                  className="focus-ring rounded-xl border border-brand-junior/35 bg-white px-4 py-2 text-sm font-extrabold text-[#9f3d39] hover:bg-brand-junior/5 disabled:opacity-50"
                >
                  Deny
                </button>
              </div>
            </>
          )}

          {request.status !== "pending" && (
            <div className="mt-4 border-t border-brand-sand/25 pt-3 text-xs text-brand-taupe">
              <div>
                Reviewed by <span className="font-bold text-brand-navy">{request.reviewed_by_name || "Unknown reviewer"}</span>
                {request.reviewed_at ? ` · ${formatEasternDateTime(request.reviewed_at)}` : ""}
              </div>
              {request.review_notes && (
                <div className="mt-1">
                  <span className="font-extrabold text-brand-navy">Review notes:</span>{" "}{request.review_notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, description }) {
  return <div className="mb-3"><h2 className="text-lg font-extrabold text-brand-navy">{title}</h2><p className="mt-1 text-sm text-brand-taupe">{description}</p></div>;
}

function EmptyState({ icon: Icon, title, description }) {
  return <div className="rounded-2xl border border-dashed border-brand-sand/60 bg-brand-sand/5 p-5"><div className="flex items-start gap-3"><Icon size={19} className="mt-0.5 text-brand-gold" /><div><div className="font-extrabold text-brand-navy">{title}</div><div className="mt-1 text-sm text-brand-taupe">{description}</div></div></div></div>;
}

function SummaryPill({ value, label, emphasis = false }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${emphasis ? "bg-brand-gold/15 text-brand-navy" : "bg-brand-sand/10 text-brand-taupe"}`}>{value} {label}</span>;
}

function StatusPill({ status }) {
  return <span className="rounded-full bg-brand-sand/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-brand-taupe">{titleCase(status)}</span>;
}

function BackLink() {
  return <Link to="/my-classes" className="focus-ring inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-taupe hover:text-brand-navy"><ArrowLeft size={14} />Back to My Classes</Link>;
}

function formatEasternDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = new Intl.DateTimeFormat(undefined, {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${formatted} ET`;
}

function formatPeriod(value) {
  const labels = {
    fall: "Fall",
    spring: "Spring",
    year_long: "Year Long",
    fall_session_1: "Fall Session 1",
    fall_session_2: "Fall Session 2",
    spring_session_1: "Spring Session 1",
    spring_session_2: "Spring Session 2",
  };
  return labels[value] || titleCase(value);
}

function titleCase(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
