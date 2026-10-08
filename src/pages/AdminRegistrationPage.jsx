import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { usePermissions } from "../contexts/PermissionContext";
import {
  createAdminRegistrationWindow,
  deleteAdminRegistrationWindow,
  loadAdminRegistrationExceptions,
  loadAdminRegistrationOverview,
  loadAdminRegistrationWaitlists,
  reviewAdminRegistrationException,
  admitAdminWaitlistedStudent,
  updateAdminRegistrationWindow,
} from "../data/adminRegistration";

const EMPTY_WINDOW = {
  program: "junior",
  opens_at: "",
  closes_at: "",
  label: "",
};

export default function AdminRegistrationPage() {
  const { hasPermission } = usePermissions();
  const canView = hasPermission("admin.registration.view");
  const canManage = hasPermission("admin.registration.manage");
  const canApproveExceptions =
    hasPermission("admin.registration.approve") ||
    hasPermission("admin.classes.approve");
  const canManageWaitlist =
    canManage || hasPermission("admin.classes.approve");

  if (!canView) {
    return (
      <div className="rounded-2xl border border-brand-sand/40 bg-white p-6 shadow-sm">
        <h1 className="brand-title text-2xl text-brand-navy">Registration</h1>
        <p className="mt-2 text-sm text-brand-taupe">
          You do not have permission to view registration administration.
        </p>
      </div>
    );
  }

  return (
    <RegistrationWorkspace
      canManage={canManage}
      canApproveExceptions={canApproveExceptions}
      canManageWaitlist={canManageWaitlist}
    />
  );
}

function RegistrationWorkspace({ canManage, canApproveExceptions, canManageWaitlist }) {
  const [overview, setOverview] = useState(null);
  const [exceptions, setExceptions] = useState([]);
  const [waitlists, setWaitlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_WINDOW);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [exceptionActionId, setExceptionActionId] = useState(null);
  const [exceptionActionError, setExceptionActionError] = useState("");
  const [waitlistActionId, setWaitlistActionId] = useState(null);
  const [waitlistActionError, setWaitlistActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      const [data, exceptionRows, waitlistRows] = await Promise.all([
        loadAdminRegistrationOverview(),
        loadAdminRegistrationExceptions(),
        loadAdminRegistrationWaitlists(),
      ]);
      setOverview(data);
      setExceptions(exceptionRows);
      setWaitlists(waitlistRows);
    } catch (err) {
      console.error("Failed to load registration admin overview", err);
      setError(
        err?.message || "Registration administration could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [data, exceptionRows, waitlistRows] = await Promise.all([
          loadAdminRegistrationOverview(),
          loadAdminRegistrationExceptions(),
          loadAdminRegistrationWaitlists(),
        ]);
        if (active) {
          setOverview(data);
          setExceptions(exceptionRows);
          setWaitlists(waitlistRows);
        }
      } catch (err) {
        console.error("Failed to load registration admin overview", err);
        if (active) {
          setError(
            err?.message || "Registration administration could not be loaded.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const rulesByProgram = useMemo(() => {
    const map = new Map();
    for (const rule of overview?.program_rules ?? []) {
      map.set(rule.program, rule);
    }
    return map;
  }, [overview]);

  const sharedWindow = useMemo(() => {
    const rows = overview?.registration_windows ?? [];
    return (
      rows.find((row) => row.program === "junior") ||
      rows.find((row) => row.program === "youth") ||
      null
    );
  }, [overview]);

  function openNewWindow() {
    if (!canManage) return;

    setEditingId(null);
    setForm(EMPTY_WINDOW);
    setSaveError("");
    setDrawerOpen(true);
  }

  function openEditWindow(row) {
    if (!canManage || !row) return;

    setEditingId(row.id);
    setForm({
      program: "junior",
      opens_at: toDateTimeLocal(row.opens_at),
      closes_at: toDateTimeLocal(row.closes_at),
      label: row.label || "",
    });
    setSaveError("");
    setDrawerOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canManage) return;

    if (!form.opens_at) {
      setSaveError("Opening date and time are required.");
      return;
    }

    if (form.closes_at) {
      const opens = new Date(form.opens_at);
      const closes = new Date(form.closes_at);

      if (closes <= opens) {
        setSaveError("Closing date and time must be after opening.");
        return;
      }
    }

    setSaving(true);
    setSaveError("");

    try {
      if (editingId) {
        await updateAdminRegistrationWindow(editingId, form);
      } else {
        await createAdminRegistrationWindow(form);
      }

      await refresh();
      setDrawerOpen(false);
      setEditingId(null);
      setForm(EMPTY_WINDOW);
    } catch (err) {
      console.error("Failed to save registration window", err);
      setSaveError(err?.message || "Registration window could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row) {
    if (!canManage || !row) return;
    setDeleteTarget(row);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteSaving) return;

    setDeleteSaving(true);
    try {
      await deleteAdminRegistrationWindow(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      console.error("Failed to delete registration window", err);
      setError(err?.message || "Registration window could not be deleted.");
    } finally {
      setDeleteSaving(false);
    }
  }


  async function handleExceptionReview(request, decision, reviewNotes) {
    if (!canApproveExceptions || request.status !== "pending") return;

    setExceptionActionId(request.id);
    setExceptionActionError("");

    try {
      await reviewAdminRegistrationException(
        request.id,
        decision,
        reviewNotes,
      );

      const [data, exceptionRows, waitlistRows] = await Promise.all([
        loadAdminRegistrationOverview(),
        loadAdminRegistrationExceptions(),
        loadAdminRegistrationWaitlists(),
      ]);

      setOverview(data);
      setExceptions(exceptionRows);
      setWaitlists(waitlistRows);
    } catch (err) {
      console.error("Failed to review registration exception", err);
      setExceptionActionError(
        err?.message || "Exception request could not be reviewed.",
      );
    } finally {
      setExceptionActionId(null);
    }
  }

  async function handleWaitlistAdmission(row, allowOverCapacity, reason) {
    if (!canManageWaitlist) return;

    setWaitlistActionId(row.waitlist_entry_id);
    setWaitlistActionError("");

    try {
      await admitAdminWaitlistedStudent({
        waitlistEntryId: row.waitlist_entry_id,
        allowOverCapacity,
        reason,
      });

      const [data, exceptionRows, waitlistRows] = await Promise.all([
        loadAdminRegistrationOverview(),
        loadAdminRegistrationExceptions(),
        loadAdminRegistrationWaitlists(),
      ]);

      setOverview(data);
      setExceptions(exceptionRows);
      setWaitlists(waitlistRows);
    } catch (err) {
      console.error("Failed to admit waitlisted student", err);
      setWaitlistActionError(
        err?.message || "The waitlisted student could not be admitted.",
      );
    } finally {
      setWaitlistActionId(null);
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-taupe">
          <Loader2 size={18} className="animate-spin" />
          Loading registration administration…
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="space-y-4">
        <ReturnLink />
        <div className="rounded-2xl border border-brand-junior/30 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-brand-junior" />
            <div>
              <h1 className="brand-title text-2xl text-brand-navy">
                Registration
              </h1>
              <p className="mt-2 text-sm text-brand-taupe">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const exceptionCounts = overview?.exception_counts ?? {};
  const pendingExceptions = exceptionCounts.pending ?? 0;

  return (
    <>
      <div className="space-y-6">
        <header>
          <ReturnLink />

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
                <ClipboardCheck size={22} />
              </div>

              <div>
                <h1 className="brand-title text-3xl text-brand-navy">
                  Registration
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-taupe">
                  Review the shared registration window, eligibility exceptions, and
                  active class waitlists for{" "}
                  <span className="font-bold text-brand-navy">
                    {overview?.school_year?.name || "the current school year"}
                  </span>
                  .
                </p>
              </div>
            </div>

            {canManage && !sharedWindow && (
              <button
                type="button"
                onClick={openNewWindow}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus size={16} />
                Add Registration Window
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-brand-junior/30 bg-white px-4 py-3 text-sm text-brand-navy">
            {error}
          </div>
        )}

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-extrabold text-brand-navy">
              Registration window
            </h2>
            <p className="mt-1 text-sm text-brand-taupe">
              One shared window applies to both Junior and Youth registration.
            </p>
          </div>

          {sharedWindow ? (
            <div className="rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-extrabold text-brand-navy">
                    {sharedWindow.label || "Registration"}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-brand-taupe">
                    Opens {formatDateTime(sharedWindow.opens_at)}
                    {" · "}
                    {sharedWindow.closes_at
                      ? `Closes ${formatDateTime(sharedWindow.closes_at)}`
                      : "No automatic close"}
                  </div>
                  <div className="mt-2 text-xs text-brand-taupe">
                    Applies to Junior and Youth.
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditWindow(sharedWindow)}
                      className="focus-ring rounded-lg p-2 text-brand-taupe hover:bg-brand-sand/10 hover:text-brand-navy"
                      aria-label="Edit registration window"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sharedWindow)}
                      className="focus-ring rounded-lg p-2 text-brand-taupe hover:bg-brand-sand/10 hover:text-brand-junior"
                      aria-label="Delete registration window"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-brand-sand/60 bg-brand-sand/5 p-6">
              <div className="flex items-start gap-3">
                <CalendarClock
                  size={22}
                  className="mt-0.5 shrink-0 text-brand-gold"
                />
                <div>
                  <h3 className="font-extrabold text-brand-navy">
                    No registration window configured
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-taupe">
                    A single registration window can be set for the current school year
                    and will apply to both Junior and Youth.
                  </p>

                  {canManage && (
                    <button
                      type="button"
                      onClick={openNewWindow}
                      className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg border border-brand-sand/50 bg-white px-3 py-2 text-sm font-extrabold text-brand-navy shadow-sm hover:border-brand-sky/60"
                    >
                      <Plus size={15} />
                      Add registration window
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-extrabold text-brand-navy">
              Eligibility exceptions
            </h2>
            <p className="mt-1 text-sm text-brand-taupe">
              Age and class eligibility exceptions are reviewed by the teacher for
              the affected class. Admin can use this area for visibility and oversight.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Pending"
              value={pendingExceptions}
              emphasis={pendingExceptions > 0}
            />
            <MetricCard
              label="Approved"
              value={exceptionCounts.approved ?? 0}
            />
            <MetricCard
              label="Denied"
              value={exceptionCounts.denied ?? 0}
            />
            <MetricCard
              label="Withdrawn"
              value={exceptionCounts.withdrawn ?? 0}
            />
          </div>

          {exceptions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-brand-sand/35 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-brand-gold"
                />
                <div>
                  <h3 className="font-extrabold text-brand-navy">
                    No exception requests need attention
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-brand-taupe">
                    When families request age or class eligibility exceptions, they
                    will appear here for admin visibility. Teachers remain responsible
                    for approving or denying requests for their classes.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {exceptionActionError && (
                <div className="rounded-xl border border-brand-junior/30 bg-brand-junior/5 px-4 py-3 text-sm text-brand-navy">
                  {exceptionActionError}
                </div>
              )}

              {exceptions.map((request) => (
                <ExceptionCard
                  key={request.id}
                  request={request}
                  canApprove={canApproveExceptions}
                  actionLoading={exceptionActionId === request.id}
                  onReview={handleExceptionReview}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-brand-navy">Waitlists</h2>
              <p className="mt-1 text-sm text-brand-taupe">
                Active waiting and offered entries for the current school year. Admin can admit a student on a teacher's behalf.
              </p>
            </div>
            <span className="rounded-full bg-brand-sand/10 px-3 py-1 text-xs font-extrabold text-brand-taupe">
              {waitlists.length} active
            </span>
          </div>

          {waitlistActionError && (
            <div className="mb-3 rounded-xl border border-brand-junior/30 bg-brand-junior/5 px-4 py-3 text-sm text-brand-navy">
              {waitlistActionError}
            </div>
          )}

          {waitlists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-sand/60 bg-brand-sand/5 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={19} className="mt-0.5 text-brand-gold" />
                <div>
                  <div className="font-extrabold text-brand-navy">No active waitlist entries</div>
                  <div className="mt-1 text-sm text-brand-taupe">Students who join a class waitlist will appear here automatically.</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {waitlists.map((row) => (
                <AdminWaitlistRow
                  key={row.waitlist_entry_id}
                  row={row}
                  canManage={canManageWaitlist}
                  loading={waitlistActionId === row.waitlist_entry_id}
                  onAdmit={handleWaitlistAdmission}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/25 px-4 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Cancel delete registration window"
            className="absolute inset-0"
            onClick={() => !deleteSaving && setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-2xl">
            <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
              Confirm deletion
            </div>
            <h3 className="brand-title mt-1 text-xl text-brand-navy">
              Delete registration window?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-brand-taupe">
              Delete <span className="font-bold text-brand-navy">{deleteTarget.label || "this registration window"}</span>? This removes the configured window but does not change contribution eligibility or existing enrollments.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteSaving}
                className="focus-ring rounded-xl border border-brand-sand/45 bg-white px-4 py-2 text-sm font-extrabold text-brand-navy disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteSaving}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#9f3d39] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {deleteSaving && <Loader2 size={15} className="animate-spin" />}
                Delete window
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <WindowDrawer
          editing={Boolean(editingId)}
          form={form}
          setForm={setForm}
          onClose={() => {
            if (!saving) setDrawerOpen(false);
          }}
          onSubmit={handleSave}
          saving={saving}
          error={saveError}
        />
      )}
    </>
  );
}

function WindowDrawer({
  editing,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
  error,
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-brand-navy/20 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Close registration window editor"
        onClick={onClose}
        className="absolute inset-0"
      />

      <aside className="relative z-10 h-full w-full max-w-lg overflow-y-auto border-l border-brand-sand/40 bg-white shadow-2xl">
        <form onSubmit={onSubmit} className="flex min-h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-brand-sand/30 px-6 py-5">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
                Registration Window
              </div>
              <h2 className="brand-title mt-1 text-2xl text-brand-navy">
                {editing ? "Edit Window" : "Add Window"}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-lg p-2 text-brand-taupe hover:bg-brand-sand/10 hover:text-brand-navy"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 space-y-5 px-6 py-6">
            <Field label="Label" hint="Optional">
              <input
                type="text"
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Example: Fall Registration"
                className="focus-ring w-full rounded-xl border border-brand-sand/50 px-3 py-2.5 text-sm text-brand-navy"
              />
            </Field>

            <Field
              label="Opens"
              hint="Required · Eastern Time (ET)"
            >
              <input
                type="datetime-local"
                required
                value={form.opens_at}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    opens_at: event.target.value,
                  }))
                }
                className="focus-ring w-full rounded-xl border border-brand-sand/50 px-3 py-2.5 text-sm text-brand-navy"
              />
            </Field>

            <Field
              label="Closes"
              hint="Optional · Eastern Time (ET)"
            >
              <input
                type="datetime-local"
                value={form.closes_at}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    closes_at: event.target.value,
                  }))
                }
                className="focus-ring w-full rounded-xl border border-brand-sand/50 px-3 py-2.5 text-sm text-brand-navy"
              />
            </Field>

            {error && (
              <div className="rounded-xl border border-brand-junior/30 bg-brand-junior/5 px-4 py-3 text-sm text-brand-navy">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-brand-sand/30 bg-brand-sand/5 p-4 text-xs leading-relaxed text-brand-taupe">
              This window applies to both Junior and Youth registration. Saving it
              does not change contribution eligibility or program rules.
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-brand-sand/30 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="focus-ring rounded-xl border border-brand-sand/50 bg-white px-4 py-2.5 text-sm font-extrabold text-brand-navy disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white shadow-sm disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {editing ? "Save Changes" : "Add Window"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-extrabold uppercase tracking-wide text-brand-navy">
          {label}
        </span>
        {hint && <span className="text-[11px] text-brand-taupe">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function ReturnLink() {
  return (
    <Link
      to="/admin"
      className="focus-ring inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-taupe hover:text-brand-navy"
    >
      <ArrowLeft size={14} />
      Return to Admin Overview
    </Link>
  );
}

function AdminWaitlistRow({ row, canManage, loading, onAdmit }) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFull = Boolean(row.is_full);

  function prepareAdmission() {
    if (!canManage) return;
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
    <div className="overflow-hidden rounded-2xl border border-brand-sand/35 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-brand-navy">{row.student_name}</span>
            <span className="text-xs text-brand-taupe">#{row.position}</span>
            {isFull && (
              <span className="rounded-full bg-brand-gold/12 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-navy">
                Class full
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-brand-taupe">
            {row.course_title} · {formatPeriod(row.offering_period)} · {row.enrolled_count}{row.max_enrollment != null ? `/${row.max_enrollment}` : ""} enrolled
          </div>
          <div className="mt-0.5 text-[11px] text-brand-taupe">
            {row.household_name || "Household unavailable"}{row.teacher_names ? ` · Teacher: ${row.teacher_names}` : ""}
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            disabled={loading}
            className="focus-ring shrink-0 rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-xs font-extrabold text-brand-navy hover:bg-brand-sand/5 disabled:opacity-50"
          >
            {expanded ? "Cancel" : isFull ? "Override & admit" : "Admit"}
          </button>
        )}
      </div>

      {expanded && canManage && (
        <div className="border-t border-brand-sand/20 bg-brand-sand/5 px-4 py-4">
          {isFull ? (
            <>
              <div className="rounded-xl border border-brand-gold/35 bg-white px-3 py-2.5 text-xs leading-relaxed text-brand-navy">
                This offering currently has {row.enrolled_count} enrolled students with a maximum of {row.max_enrollment}. The override will not change the class maximum.
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
              Admitting this student will create the enrollment, generate the normal class charge if applicable, and mark the waitlist entry promoted.
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={prepareAdmission}
              disabled={loading || (isFull && !reason.trim())}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {isFull ? "Admit over capacity" : "Admit student"}
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/25 px-4 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Cancel waitlist admission"
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
              {isFull
                ? `${row.course_title} currently has ${row.enrolled_count} enrolled students with a maximum of ${row.max_enrollment}. The class maximum will remain ${row.max_enrollment}.`
                : `${row.student_name} will be moved from the waitlist into the enrolled roster for ${row.course_title}.`}
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

function ExceptionCard({
  request,
  canApprove,
  actionLoading,
  onReview,
}) {
  const teachers = request.teachers ?? [];
  const teacherNames = teachers.map((teacher) => teacher.name).filter(Boolean);
  const [reviewNotes, setReviewNotes] = useState("");
  const [expanded, setExpanded] = useState(request.status === "pending");

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-sand/35 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-brand-sand/5"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-extrabold text-brand-navy">
              {request.student_name || "Student"}
            </span>
            <StatusPill status={request.status} />
          </div>

          <div className="mt-0.5 truncate text-xs text-brand-taupe">
            {request.course_title || "Class"}
          </div>
        </div>

        <ChevronDown
          size={18}
          className={`shrink-0 text-brand-taupe transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-brand-sand/25 px-5 pb-5 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-brand-navy">
                {request.course_title || "Class"}
              </div>
              <div className="mt-1 text-xs text-brand-taupe">
                {[titleCase(request.program), formatPeriod(request.offering_period)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>

            <div className="text-right text-xs text-brand-taupe">
              Requested {formatDate(request.created_at)}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Detail label="Household" value={request.household_name} />
            <Detail label="Requested by" value={request.requested_by_name} />
            <Detail
              label="Teacher"
              value={teacherNames.length ? teacherNames.join(", ") : "Not assigned"}
            />
            <Detail
              label="Normal age range"
              value={formatAgeRange(request.minimum_age, request.maximum_age)}
            />
          </div>

          <div className="mt-4 rounded-xl border border-brand-sand/25 bg-brand-sand/5 p-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-taupe">
              Request reason
            </div>
            <p className="mt-1 text-sm leading-relaxed text-brand-navy">
              {request.reason}
            </p>
          </div>

          {request.age_exception_notes && (
            <div className="mt-3 text-xs leading-relaxed text-brand-taupe">
              <span className="font-extrabold text-brand-navy">Class note:</span>{" "}
              {request.age_exception_notes}
            </div>
          )}

          {request.status === "pending" && canApprove && (
            <div className="mt-4 border-t border-brand-sand/25 pt-4">
              <label className="block">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-taupe">
                  Review notes
                </div>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  disabled={actionLoading}
                  placeholder="Optional internal notes"
                  className="focus-ring mt-1.5 w-full rounded-xl border border-brand-sand/45 bg-white px-3 py-2 text-sm text-brand-navy disabled:bg-brand-sand/10"
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onReview(request, "approved", reviewNotes)}
                  disabled={actionLoading}
                  className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  {actionLoading && <Loader2 size={15} className="animate-spin" />}
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => onReview(request, "denied", reviewNotes)}
                  disabled={actionLoading}
                  className="focus-ring rounded-xl border border-brand-junior/35 bg-white px-4 py-2 text-sm font-extrabold text-[#9f3d39] hover:bg-brand-junior/5 disabled:opacity-50"
                >
                  Deny
                </button>
              </div>
            </div>
          )}

          {request.status !== "pending" && (
            <div className="mt-4 border-t border-brand-sand/25 pt-3 text-xs text-brand-taupe">
              <div>
                Reviewed by{" "}
                <span className="font-bold text-brand-navy">
                  {request.reviewed_by_name || "Unknown reviewer"}
                </span>
                {request.reviewed_at
                  ? ` · ${formatDate(request.reviewed_at)}`
                  : ""}
              </div>

              {request.review_notes && (
                <div className="mt-1">
                  <span className="font-extrabold text-brand-navy">
                    Review notes:
                  </span>{" "}
                  {request.review_notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const label = titleCase(status || "pending");

  return (
    <span className="rounded-full bg-brand-sand/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-brand-taupe">
      {label}
    </span>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-brand-taupe">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-brand-navy">
        {value || "—"}
      </div>
    </div>
  );
}

function formatAgeRange(minimumAge, maximumAge) {
  if (minimumAge == null && maximumAge == null) return "No age limit";
  if (minimumAge != null && maximumAge != null) {
    return `${minimumAge}–${maximumAge}`;
  }
  if (minimumAge != null) return `${minimumAge}+`;
  return `Up to ${maximumAge}`;
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

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function titleCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({ label, value, emphasis = false }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        emphasis ? "border-brand-gold/60" : "border-brand-sand/35"
      }`}
    >
      <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold text-brand-navy">{value}</div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
