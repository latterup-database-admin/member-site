import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  HandHeart,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings2,
  X,
} from "lucide-react";

import { Link } from "react-router-dom";

import { usePermissions } from "../contexts/PermissionContext";
import {
  createAdminContributionOpportunity,
  loadAdminContributionOpportunities,
  loadAdminContributionOpportunityCoverage,
  saveAdminContributionOpportunity,
} from "../data/adminContributionOpportunities";
import {
  loadAdminContributionOptions,
  loadAdminContributionOpportunityAssignees,
} from "../data/adminContributionSettings";

const STATUS_FILTERS = ["all", "open", "filled", "draft", "closed", "archived"];
const STATUS_OPTIONS = ["draft", "open", "filled", "closed", "archived"];

const EMPTY_FORM = {
  id: null,
  title: "",
  description: "",
  contribution_type: "",
  slots: "",
  status: "draft",
  oversight_group: "",
  committee: "",
  cycle: "",
  age_group: "",
  applies_to_programs: [],
  requires_program_choice: false,
  public_info_url: "",
  internal_info_url: "",
  other_resources_url: "",
  youth_periods: [],
  junior_sessions: [],
  coverage_choice_mode: "all",
};

const NEW_FORM = {
  ...EMPTY_FORM,
};

const YOUTH_PERIODS = [
  ["fall", "Fall"],
  ["spring", "Spring"],
];

const JUNIOR_SESSIONS = [
  ["fall_session_1", "Fall Session 1"],
  ["fall_session_2", "Fall Session 2"],
  ["spring_session_1", "Spring Session 1"],
  ["spring_session_2", "Spring Session 2"],
];

export default function AdminContributionOpportunitiesPage() {
  const { hasPermission } = usePermissions();
  const canView = hasPermission("admin.contributions.view");
  const canManage = hasPermission("admin.contributions.manage");

  if (!canView) {
    return (
      <div className="rounded-2xl border border-brand-sand/40 bg-white p-6 shadow-sm">
        <h1 className="brand-title text-2xl text-brand-navy">
          Manage Contributions
        </h1>
        <p className="mt-2 text-sm text-brand-taupe">
          You do not have permission to view contribution opportunities.
        </p>
      </div>
    );
  }

  return <OpportunityWorkspace canManage={canManage} />;
}

function OpportunityWorkspace({ canManage }) {
  const [rows, setRows] = useState([]);
  const [coverageRows, setCoverageRows] = useState([]);
  const [optionRows, setOptionRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [opportunities, coverage, options] = await Promise.all([
        loadAdminContributionOpportunities(),
        loadAdminContributionOpportunityCoverage(),
        loadAdminContributionOptions(),
      ]);
      setRows(opportunities);
      setCoverageRows(coverage);
      setOptionRows(options);
    } catch (err) {
      console.error("Failed to load contribution opportunities", err);
      setError(
        err?.message || "Contribution opportunities could not be loaded.",
      );
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
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen, saving]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!needle) return true;
      return [
        row.title,
        row.description,
        row.contribution_type,
        row.oversight_group,
        row.committee,
        row.age_group,
        row.cycle,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rows, query, statusFilter]);

  const lookupOptions = useMemo(() => {
    const categories = {
      contribution_type: [],
      cycle: [],
      age_group: [],
      oversight_group: [],
      committee: [],
    };

    for (const row of optionRows) {
      if (row.is_active && categories[row.category]) {
        categories[row.category].push(row.value);
      }
    }

    return categories;
  }, [optionRows]);

  const coverageByOpportunity = useMemo(() => {
    const map = new Map();
    for (const item of coverageRows) {
      const current = map.get(item.contribution_opportunity_id) ?? {
        youth: [],
        junior: [],
        choiceMode: item.coverage_choice_mode || "all",
      };
      if (item.program === "youth") current.youth.push(item.period);
      if (item.program === "junior") current.junior.push(item.period);
      current.choiceMode = item.coverage_choice_mode || current.choiceMode;
      map.set(item.contribution_opportunity_id, current);
    }
    return map;
  }, [coverageRows]);

  async function openExisting(row) {
    const coverage = coverageByOpportunity.get(row.id) ?? {
      youth: [],
      junior: [],
      choiceMode: "all",
    };

    setSelectedId(row.id);
    setForm({
      ...EMPTY_FORM,
      ...row,
      slots: row.slots ?? "",
      applies_to_programs: row.applies_to_programs ?? [],
      requires_program_choice: Boolean(row.requires_program_choice),
      structured_coverage: coverage,
      youth_periods: [...(coverage.youth ?? [])],
      junior_sessions: [...(coverage.junior ?? [])],
      coverage_choice_mode: coverage.choiceMode || "all",
    });
    setSaveError("");
    setSavedMessage("");
    setAssignees([]);
    setAssigneesError("");
    setDrawerOpen(true);

    setAssigneesLoading(true);
    try {
      const people = await loadAdminContributionOpportunityAssignees(row.id);
      setAssignees(people);
    } catch (err) {
      console.error("Failed to load contribution assignees", err);
      setAssigneesError(
        err?.message || "Assigned contributors could not be loaded.",
      );
    } finally {
      setAssigneesLoading(false);
    }
  }

  function openNew() {
    setSelectedId(null);
    setForm(NEW_FORM);
    setSaveError("");
    setSavedMessage("");
    setAssignees([]);
    setAssigneesError("");
    setAssigneesLoading(false);
    setDrawerOpen(true);
  }

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleCoverage(field, value) {
    setForm((current) => {
      const currentValues = current[field] ?? [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...current, [field]: nextValues };
    });
  }

  function toggleCoverageProgram(program, enabled) {
    setForm((current) => {
      if (program === "youth") {
        return {
          ...current,
          youth_periods: enabled ? ["fall", "spring"] : [],
          coverage_choice_mode:
            !enabled && current.coverage_choice_mode === "choose_program"
              ? "all"
              : current.coverage_choice_mode,
        };
      }

      return {
        ...current,
        junior_sessions: enabled
          ? [
              "fall_session_1",
              "fall_session_2",
              "spring_session_1",
              "spring_session_2",
            ]
          : [],
        coverage_choice_mode:
          !enabled && current.coverage_choice_mode === "choose_program"
            ? "all"
            : current.coverage_choice_mode,
      };
    });
  }

  function toggleProgram(program) {
    setForm((current) => {
      const exists = current.applies_to_programs.includes(program);
      const next = exists
        ? current.applies_to_programs.filter((value) => value !== program)
        : [...current.applies_to_programs, program];
      return {
        ...current,
        applies_to_programs: next,
        requires_program_choice:
          next.length < 2 ? false : current.requires_program_choice,
      };
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setSaveError("");
    setSavedMessage("");
    try {
      if (!selectedId) {
        await createAdminContributionOpportunity(form);
        await refresh();
        setDrawerOpen(false);
        return;
      }

      const id = await saveAdminContributionOpportunity(form);
      await refresh();
      setSelectedId(id);
      setForm((current) => ({ ...current, id }));
      setSavedMessage("Contribution opportunity saved.");
    } catch (err) {
      console.error("Failed to save contribution opportunity", err);
      setSaveError(
        err?.message || "Contribution opportunity could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="print:hidden space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/admin"
              className="focus-ring mb-3 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-taupe hover:text-brand-navy"
            >
              <ArrowLeft size={14} />
              Return to Admin Overview
            </Link>
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
                <HandHeart size={22} />
              </div>
              <div>
                <h1 className="brand-title text-3xl text-brand-navy">
                  Manage Contribution Opportunities
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-taupe">
                  Maintain the contribution catalog members browse and claim.
                  Availability is calculated from claims and assignments.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Link
                to="/admin/contributions/settings"
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/45 bg-white px-4 py-2.5 text-sm font-extrabold text-brand-navy shadow-sm hover:border-brand-sky"
              >
                <Settings2 size={17} />
                Contribution settings
              </Link>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || filtered.length === 0}
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/45 bg-white px-4 py-2.5 text-sm font-extrabold text-brand-navy shadow-sm hover:border-brand-sky disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={17} />
              Print summary
            </button>

            {canManage && (
              <button
                type="button"
                onClick={openNew}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-navy/90"
              >
                <Plus size={17} />
                New opportunity
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-64 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contributions…"
              className="focus-ring w-full rounded-xl border border-brand-sand/45 bg-white py-2.5 pl-10 pr-3 text-sm text-brand-navy shadow-sm"
            />
          </label>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/45 bg-white px-3 py-2.5 text-xs font-extrabold text-brand-navy shadow-sm hover:border-brand-sky disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`focus-ring shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold capitalize transition ${
                statusFilter === status
                  ? "bg-brand-navy text-white"
                  : "border border-brand-sand/40 bg-white text-brand-taupe hover:border-brand-sky hover:text-brand-navy"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-brand-junior/35 bg-brand-junior/5 p-4 text-sm text-brand-navy">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-brand-sand/35 bg-white shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-brand-taupe">
              <Loader2 size={18} className="animate-spin" />
              Loading contribution opportunities…
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
              {filtered.length} opportunit{filtered.length === 1 ? "y" : "ies"}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openExisting(row)}
                  className="focus-ring group overflow-hidden rounded-2xl border border-brand-sand/40 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky hover:shadow-md"
                >
                  <div
                    className={`h-1.5 ${programAccentClass(row.applies_to_programs)}`}
                  />

                  <div className="flex min-h-36 flex-col p-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ProgramBadge
                        coverage={coverageByOpportunity.get(row.id)}
                        programs={row.applies_to_programs}
                        requiresChoice={row.requires_program_choice}
                      />
                      <ContributionKindBadge
                        contributionType={row.contribution_type}
                      />
                      <StatusBadge status={row.status} />
                    </div>

                    <div className="mt-2.5 line-clamp-2 text-base font-extrabold leading-snug text-brand-navy">
                      {row.title}
                    </div>

                    <div className="mt-1 text-[11px] font-semibold leading-snug text-brand-taupe">
                      {coverageDisplayLabel(coverageByOpportunity.get(row.id))}
                    </div>

                    {row.contribution_type && (
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-brand-taupe/80">
                        {row.contribution_type}
                      </div>
                    )}

                    <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                      <div className="text-xs leading-relaxed text-brand-taupe">
                        {row.slots == null
                          ? "No fixed slot limit"
                          : `${row.spots_remaining} of ${row.slots} spots remaining`}
                        {row.pending_claim_count > 0
                          ? ` · ${row.pending_claim_count} pending`
                          : ""}
                      </div>
                      <ChevronRight
                        size={17}
                        className="shrink-0 text-brand-sand group-hover:text-brand-sky"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {drawerOpen && (
          <>
            <button
              type="button"
              aria-label="Close contribution editor"
              onClick={() => !saving && setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-brand-navy/35"
            />
            <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
              <form onSubmit={handleSave} className="min-h-full">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-sand/30 bg-white/95 px-5 py-4 backdrop-blur">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
                      {selectedId ? "Edit opportunity" : "New opportunity"}
                    </div>
                    <h2 className="mt-1 text-xl font-extrabold text-brand-navy">
                      {form.title || "Contribution opportunity"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => !saving && setDrawerOpen(false)}
                    className="focus-ring rounded-lg p-2 text-brand-taupe hover:bg-brand-sand/10 hover:text-brand-navy"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-5 p-5">
                  {!canManage && (
                    <div className="rounded-xl border border-brand-sand/40 bg-brand-sand/10 p-3 text-sm text-brand-taupe">
                      You have view access only. A user with Manage
                      Contributions permission can edit this catalog.
                    </div>
                  )}

                  <Field label="Title" required>
                    <input
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      disabled={!canManage}
                      className="input"
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      value={form.description || ""}
                      onChange={(e) => setField("description", e.target.value)}
                      disabled={!canManage}
                      rows={5}
                      className="input resize-y"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contribution type">
                      <LookupSelect
                        value={form.contribution_type}
                        onChange={(value) =>
                          setField("contribution_type", value)
                        }
                        options={lookupOptions.contribution_type}
                        disabled={!canManage}
                        placeholder="Select a contribution type"
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        value={form.status}
                        onChange={(e) => setField("status", e.target.value)}
                        disabled={!canManage}
                        className="input"
                      >
                        {STATUS_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {capitalize(value)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Slots">
                      <input
                        type="number"
                        min="0"
                        value={form.slots}
                        onChange={(e) => setField("slots", e.target.value)}
                        disabled={!canManage}
                        placeholder="Blank = no fixed limit"
                        className="input"
                      />
                    </Field>
                    <Field label="Cycle">
                      <LookupSelect
                        value={form.cycle}
                        onChange={(value) => setField("cycle", value)}
                        options={lookupOptions.cycle}
                        disabled={!canManage}
                        placeholder="Select a cycle"
                        allowBlank
                      />
                    </Field>
                    <Field label="Age group">
                      <LookupSelect
                        value={form.age_group}
                        onChange={(value) => setField("age_group", value)}
                        options={lookupOptions.age_group}
                        disabled={!canManage}
                        placeholder="Select an age group"
                        allowBlank
                      />
                    </Field>
                    <Field label="Oversight">
                      <LookupSelect
                        value={form.oversight_group}
                        onChange={(value) => setField("oversight_group", value)}
                        options={lookupOptions.oversight_group}
                        disabled={!canManage}
                        placeholder="Select oversight"
                        allowBlank
                      />
                    </Field>
                    <Field label="Committee">
                      <LookupSelect
                        value={form.committee}
                        onChange={(value) => setField("committee", value)}
                        options={lookupOptions.committee}
                        disabled={!canManage}
                        placeholder="Select a committee"
                        allowBlank
                      />
                    </Field>
                  </div>

                  <NewCoverageEditor
                    form={form}
                    canManage={canManage}
                    setField={setField}
                    toggleCoverage={toggleCoverage}
                    toggleCoverageProgram={toggleCoverageProgram}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Public information URL">
                      <input
                        value={form.public_info_url || ""}
                        onChange={(e) =>
                          setField("public_info_url", e.target.value)
                        }
                        disabled={!canManage}
                        className="input"
                      />
                    </Field>
                    <Field label="Other resources URL">
                      <input
                        value={form.other_resources_url || ""}
                        onChange={(e) =>
                          setField("other_resources_url", e.target.value)
                        }
                        disabled={!canManage}
                        className="input"
                      />
                    </Field>
                  </div>

                  <Field label="Internal information URL">
                    <input
                      value={form.internal_info_url || ""}
                      onChange={(e) =>
                        setField("internal_info_url", e.target.value)
                      }
                      disabled={!canManage}
                      className="input"
                    />
                  </Field>

                  {selectedId && (
                    <div className="grid grid-cols-3 gap-3 rounded-xl border border-brand-sand/35 bg-brand-sand/5 p-3 text-center">
                      <Metric
                        label="Pending"
                        value={form.pending_claim_count ?? 0}
                      />
                      <Metric
                        label="Assigned"
                        value={form.assignment_count ?? 0}
                      />
                      <Metric
                        label="Remaining"
                        value={form.spots_remaining ?? "—"}
                      />
                    </div>
                  )}

                  {selectedId && (
                    <div className="rounded-xl border border-brand-sand/35 bg-brand-sand/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
                            Assigned to
                          </div>
                          <div className="mt-0.5 text-xs text-brand-taupe">
                            Approved, active, and completed assignments
                          </div>
                        </div>

                        {!assigneesLoading && (
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-brand-navy ring-1 ring-brand-sand/35">
                            {assignees.length}
                          </span>
                        )}
                      </div>

                      {assigneesLoading ? (
                        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-brand-taupe">
                          <Loader2 size={15} className="animate-spin" />
                          Loading assignments…
                        </div>
                      ) : assigneesError ? (
                        <div className="mt-3 rounded-lg border border-brand-junior/25 bg-white p-2.5 text-sm text-brand-navy">
                          {assigneesError}
                        </div>
                      ) : assignees.length === 0 ? (
                        <div className="mt-3 text-sm text-brand-taupe">
                          No one is currently assigned to this opportunity.
                        </div>
                      ) : (
                        <div className="mt-3 divide-y divide-brand-sand/25 overflow-hidden rounded-lg border border-brand-sand/30 bg-white">
                          {assignees.map((person) => (
                            <div
                              key={person.assignment_id}
                              className="flex items-center justify-between gap-3 px-3 py-2"
                            >
                              <div className="min-w-0 text-sm font-bold text-brand-navy">
                                {person.person_name || "Household assignment"}
                              </div>
                              <span className="shrink-0 rounded-full bg-brand-sand/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-taupe">
                                {person.assignment_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {saveError && (
                    <div className="rounded-xl border border-brand-junior/35 bg-brand-junior/5 p-3 text-sm text-brand-navy">
                      {saveError}
                    </div>
                  )}
                  {savedMessage && (
                    <div className="rounded-xl border border-brand-sky/35 bg-brand-sky/10 p-3 text-sm font-bold text-brand-navy">
                      {savedMessage}
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="sticky bottom-0 border-t border-brand-sand/30 bg-white/95 px-5 py-4 backdrop-blur">
                    <button
                      type="submit"
                      disabled={
                        saving ||
                        !form.title.trim() ||
                        (!selectedId &&
                          form.youth_periods.length +
                            form.junior_sessions.length ===
                            0)
                      }
                      className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-extrabold text-white hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {saving ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Save size={17} />
                      )}
                      {saving ? "Saving…" : "Save opportunity"}
                    </button>
                  </div>
                )}
              </form>
            </aside>
          </>
        )}

        <style>{`.input{width:100%;border:1px solid rgb(199 178 153 / .45);border-radius:.75rem;background:white;padding:.625rem .75rem;font-size:.875rem;color:#001f55;outline:none}.input:focus{box-shadow:0 0 0 3px rgb(157 196 203 / .25);border-color:#9dc4cb}.input:disabled{background:rgb(199 178 153 / .08);color:#736357}`}</style>
      </div>

      <PrintSummary
        rows={filtered}
        coverageByOpportunity={coverageByOpportunity}
      />
    </>
  );
}

function PrintSummary({ rows, coverageByOpportunity }) {
  return (
    <div className="hidden print:block print:text-black">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">
          Latter UP Contribution Opportunities
        </h1>
        <p className="mt-1 text-sm">Admin quick-reference summary</p>
      </div>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-2 pr-4">Position</th>
            <th className="py-2 pr-4">Counts for</th>
            <th className="py-2 text-right">Total spots</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-black/20 break-inside-avoid"
            >
              <td className="py-2 pr-4 font-semibold">{row.title}</td>
              <td className="py-2 pr-4">
                {coverageDisplayLabel(coverageByOpportunity.get(row.id))}
              </td>
              <td className="py-2 text-right">
                {row.slots == null ? "No fixed limit" : row.slots}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        @media print {
          @page { margin: 0.5in; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function NewCoverageEditor({
  form,
  canManage,
  setField,
  toggleCoverage,
  toggleCoverageProgram,
}) {
  const youthEnabled = form.youth_periods.length > 0;
  const juniorEnabled = form.junior_sessions.length > 0;
  const totalPeriods = form.youth_periods.length + form.junior_sessions.length;

  return (
    <div className="space-y-4 rounded-2xl border border-brand-sky/35 bg-brand-sky/5 p-4">
      <div>
        <div className="text-sm font-extrabold text-brand-navy">
          What does this contribution count toward?
        </div>
        <p className="mt-1 text-xs leading-relaxed text-brand-taupe">
          Select the program coverage and the exact term/session periods this
          opportunity satisfies.
        </p>
      </div>

      <CoverageProgramSection
        label="Youth"
        enabled={youthEnabled}
        onEnabledChange={(enabled) => toggleCoverageProgram("youth", enabled)}
        options={YOUTH_PERIODS}
        selected={form.youth_periods}
        onToggle={(value) => toggleCoverage("youth_periods", value)}
        onFullYear={() => setField("youth_periods", ["fall", "spring"])}
        canManage={canManage}
      />

      <CoverageProgramSection
        label="Junior"
        enabled={juniorEnabled}
        onEnabledChange={(enabled) => toggleCoverageProgram("junior", enabled)}
        options={JUNIOR_SESSIONS}
        selected={form.junior_sessions}
        onToggle={(value) => toggleCoverage("junior_sessions", value)}
        onFullYear={() =>
          setField("junior_sessions", [
            "fall_session_1",
            "fall_session_2",
            "spring_session_1",
            "spring_session_2",
          ])
        }
        canManage={canManage}
      />

      <Field label="Coverage rule">
        <select
          value={form.coverage_choice_mode}
          onChange={(event) =>
            setField("coverage_choice_mode", event.target.value)
          }
          disabled={!canManage}
          className="input"
        >
          <option value="all">
            All selected coverage applies automatically
          </option>
          <option
            value="choose_program"
            disabled={!youthEnabled || !juniorEnabled}
          >
            Member chooses Junior or Youth
          </option>
          <option value="choose_period" disabled={totalPeriods < 2}>
            Member chooses one eligible term/session
          </option>
        </select>
      </Field>

      <div className="rounded-xl bg-white/70 p-3 text-xs leading-relaxed text-brand-taupe">
        <span className="font-extrabold text-brand-navy">Preview: </span>
        {coveragePreview(form)}
      </div>
    </div>
  );
}

function CoverageProgramSection({
  label,
  enabled,
  onEnabledChange,
  options,
  selected,
  onToggle,
  onFullYear,
  canManage,
}) {
  return (
    <div className="rounded-xl border border-brand-sand/35 bg-white p-3">
      <label className="flex items-center gap-2 text-sm font-extrabold text-brand-navy">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!canManage}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        Counts toward {label}
      </label>

      {enabled && (
        <div className="mt-3">
          <button
            type="button"
            disabled={!canManage}
            onClick={onFullYear}
            className="focus-ring mb-2 rounded-lg border border-brand-sand/40 bg-brand-sand/10 px-2.5 py-1 text-[11px] font-extrabold text-brand-navy hover:border-brand-sky"
          >
            Select full year
          </button>
          {label === "Junior" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [
                  "Fall",
                  options.filter(([value]) => value.startsWith("fall_")),
                ],
                [
                  "Spring",
                  options.filter(([value]) => value.startsWith("spring_")),
                ],
              ].map(([season, seasonOptions]) => (
                <div
                  key={season}
                  className="rounded-lg border border-brand-sand/25 bg-brand-sand/5 p-2.5"
                >
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-brand-taupe">
                    {season}
                  </div>
                  <div className="space-y-2">
                    {seasonOptions.map(([value, optionLabel]) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 text-xs font-bold text-brand-taupe"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(value)}
                          disabled={!canManage}
                          onChange={() => onToggle(value)}
                        />
                        {optionLabel}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map(([value, optionLabel]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-xs font-bold text-brand-taupe"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(value)}
                    disabled={!canManage}
                    onChange={() => onToggle(value)}
                  />
                  {optionLabel}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LookupSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  allowBlank = false,
}) {
  const available =
    value && !options.includes(value) ? [value, ...options] : options;

  return (
    <select
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="input"
    >
      <option value="">{allowBlank ? "None" : placeholder}</option>
      {available.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function coveragePreview(form) {
  const parts = [];
  if (form.youth_periods.length) {
    const youth =
      form.youth_periods.length === 2
        ? "Youth full year"
        : `Youth ${form.youth_periods.map(capitalize).join(" + ")}`;
    parts.push(youth);
  }
  if (form.junior_sessions.length) {
    const junior =
      form.junior_sessions.length === 4
        ? "Junior full year"
        : `Junior ${form.junior_sessions.map(formatPeriod).join(" + ")}`;
    parts.push(junior);
  }

  if (!parts.length) return "Select at least one coverage period.";

  const base = parts.join(" | ");
  if (form.coverage_choice_mode === "choose_program")
    return `${base} | Choose Junior or Youth`;
  if (form.coverage_choice_mode === "choose_period")
    return `${base} | Choose one eligible period/session`;
  return base;
}

function formatPeriod(value) {
  const labels = {
    fall_session_1: "Fall Session 1",
    fall_session_2: "Fall Session 2",
    spring_session_1: "Spring Session 1",
    spring_session_2: "Spring Session 2",
  };
  return labels[value] || value;
}

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-lg font-extrabold text-brand-navy">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-brand-taupe">
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    open: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    filled: "bg-brand-junior/10 text-[#9f3d39] ring-1 ring-brand-junior/25",
    draft: "bg-brand-sand/20 text-brand-taupe ring-1 ring-brand-sand/40",
    closed: "bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/15",
    archived: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${classes[status] || classes.draft}`}
    >
      {status}
    </span>
  );
}

function coverageProgramLabel(coverage) {
  if (!coverage) return "Not configured";
  const hasJunior = coverage.junior?.length > 0;
  const hasYouth = coverage.youth?.length > 0;
  if (hasJunior && hasYouth) {
    return coverage.choiceMode === "choose_program"
      ? "Junior or Youth"
      : "Junior + Youth";
  }
  if (hasJunior) return "Junior";
  if (hasYouth) return "Youth";
  return "Not configured";
}

function coverageDisplayLabel(coverage) {
  if (!coverage) return "Coverage not configured";
  const youth = coverage.youth ?? [];
  const junior = coverage.junior ?? [];
  const parts = [];

  if (youth.length) {
    const full = youth.includes("fall") && youth.includes("spring");
    parts.push(
      full
        ? "Youth · Full Year"
        : `Youth · ${youth.map(periodLabel).join(" + ")}`,
    );
  }

  if (junior.length) {
    const allJunior = JUNIOR_SESSIONS.map(([value]) => value).every((value) =>
      junior.includes(value),
    );
    parts.push(
      allJunior
        ? "Junior · Full Year"
        : `Junior · ${junior.map(periodLabel).join(" + ")}`,
    );
  }

  let base = parts.join(" | ") || "Coverage not configured";
  if (coverage.choiceMode === "choose_program")
    base += " | Choose Junior or Youth";
  if (coverage.choiceMode === "choose_period")
    base += " | Choose one period/session";
  return base;
}

function CoverageDetails({ coverage }) {
  if (!coverage)
    return (
      <div className="mt-1 text-xs text-brand-taupe">
        No structured coverage found.
      </div>
    );
  return (
    <div className="mt-2 space-y-1 text-xs leading-relaxed text-brand-taupe">
      {coverage.youth?.length > 0 && (
        <div>
          <strong>Youth:</strong> {coverage.youth.map(periodLabel).join(", ")}
        </div>
      )}
      {coverage.junior?.length > 0 && (
        <div>
          <strong>Junior:</strong> {coverage.junior.map(periodLabel).join(", ")}
        </div>
      )}
      {coverage.choiceMode === "choose_program" && (
        <div>
          <strong>Member choice:</strong> Junior or Youth
        </div>
      )}
      {coverage.choiceMode === "choose_period" && (
        <div>
          <strong>Member choice:</strong> one eligible period/session
        </div>
      )}
      {coverage.choiceMode === "all" && (
        <div>
          <strong>Member choice:</strong> none — all listed coverage applies
        </div>
      )}
    </div>
  );
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
  return labels[value] || value;
}

function ProgramBadge({ coverage, programs = [], requiresChoice }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${programBadgeClass(programs)}`}
    >
      {coverage
        ? coverageProgramLabel(coverage)
        : programLabel(programs, requiresChoice)}
    </span>
  );
}

function ContributionKindBadge({ contributionType }) {
  const teaching = isTeachingContribution(contributionType);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
        teaching
          ? "bg-brand-gold/20 text-brand-navy ring-1 ring-brand-gold/40"
          : "bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/20"
      }`}
    >
      {teaching ? "Teaching" : "Service"}
    </span>
  );
}

function isTeachingContribution(contributionType = "") {
  return String(contributionType).toLowerCase().includes("teacher");
}

function programBadgeClass(programs = []) {
  if (programs.length === 1 && programs[0] === "junior") {
    return "bg-brand-junior/15 text-[#9f3d39] ring-1 ring-brand-junior/35";
  }

  if (programs.length === 1 && programs[0] === "youth") {
    return "bg-brand-sand/20 text-brand-navy ring-1 ring-brand-sand/50";
  }

  return "bg-brand-sky/20 text-brand-navy ring-1 ring-brand-sky/45";
}

function programAccentClass(programs = []) {
  if (programs.length === 1 && programs[0] === "junior")
    return "bg-brand-junior";
  if (programs.length === 1 && programs[0] === "youth") return "bg-brand-sand";
  return "bg-brand-sky";
}

function programLabel(programs = [], requiresChoice = false) {
  if (programs.length === 1) return capitalize(programs[0]);
  if (programs.length === 2)
    return requiresChoice ? "Junior or Youth" : "Junior & Youth";
  return "No scope";
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
