import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Plus, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";

import { usePermissions } from "../contexts/PermissionContext";
import {
  loadAdminContributionOptions,
  saveAdminContributionOption,
} from "../data/adminContributionSettings";

const CATEGORIES = [
  {
    key: "contribution_type",
    label: "Contribution Types",
    description: "Examples: Specialist, Committee, Youth Teacher, Junior Teacher.",
  },
  {
    key: "cycle",
    label: "Cycles",
    description: "Operational cycles used to organize opportunities.",
  },
  {
    key: "age_group",
    label: "Age Groups",
    description: "Audience or age-group labels used on contribution opportunities.",
  },
  {
    key: "oversight_group",
    label: "Oversight",
    description: "People or groups responsible for overseeing the contribution.",
  },
  {
    key: "committee",
    label: "Committees",
    description: "Committee assignments available in the contribution catalog.",
  },
];

export default function AdminContributionSettingsPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("admin.contributions.manage");
  const [rows, setRows] = useState([]);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [rowErrors, setRowErrors] = useState({});
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setRows(await loadAdminContributionOptions());
    } catch (err) {
      console.error("Failed to load contribution settings", err);
      setError(err?.message || "Contribution settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const visibleRows = useMemo(
    () => rows.filter((row) => row.category === activeCategory),
    [rows, activeCategory],
  );

  function patchRow(id, patch) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function saveRow(row) {
    if (!canManage || !row.value.trim()) return;

    setSavingIds((current) => new Set(current).add(row.id));
    setSavedIds((current) => {
      const next = new Set(current);
      next.delete(row.id);
      return next;
    });
    setRowErrors((current) => ({ ...current, [row.id]: "" }));

    try {
      await saveAdminContributionOption(row);
      setSavedIds((current) => new Set(current).add(row.id));
      window.setTimeout(() => {
        setSavedIds((current) => {
          const next = new Set(current);
          next.delete(row.id);
          return next;
        });
      }, 1600);
    } catch (err) {
      console.error("Failed to save contribution option", err);
      setRowErrors((current) => ({
        ...current,
        [row.id]: err?.message || "Save failed",
      }));
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  }

  function patchAndSave(row, patch) {
    const next = { ...row, ...patch };
    patchRow(row.id, patch);
    saveRow(next);
  }

  async function addOption(event) {
    event.preventDefault();
    if (!canManage || !newValue.trim()) return;

    const nextSort = visibleRows.length
      ? Math.max(...visibleRows.map((row) => Number(row.sort_order) || 0)) + 10
      : 10;

    setAdding(true);
    setError("");
    try {
      await saveAdminContributionOption({
        category: activeCategory,
        value: newValue.trim(),
        sort_order: nextSort,
        is_active: true,
      });
      setNewValue("");
      await refresh();
    } catch (err) {
      console.error("Failed to add contribution option", err);
      setError(err?.message || "The option could not be added.");
    } finally {
      setAdding(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-brand-sand/40 bg-white p-6 shadow-sm">
        <h1 className="brand-title text-2xl text-brand-navy">Contribution Settings</h1>
        <p className="mt-2 text-sm text-brand-taupe">
          You need Manage Contributions permission to edit contribution settings.
        </p>
      </div>
    );
  }

  const activeMeta = CATEGORIES.find((item) => item.key === activeCategory);

  return (
    <div className="space-y-6">
      <header>
        <Link
          to="/admin/contributions/opportunities"
          className="focus-ring mb-3 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-taupe hover:text-brand-navy"
        >
          <ArrowLeft size={14} />
          Return to Manage Opportunities
        </Link>

        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
            <Settings2 size={22} />
          </div>
          <div>
            <h1 className="brand-title text-3xl text-brand-navy">Contribution Settings</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-taupe">
              Manage the dropdown values used when admins create or edit contribution opportunities.
            </p>
          </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            type="button"
            onClick={() => setActiveCategory(category.key)}
            className={`focus-ring shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
              activeCategory === category.key
                ? "bg-brand-navy text-white"
                : "border border-brand-sand/40 bg-white text-brand-taupe hover:border-brand-sky hover:text-brand-navy"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-brand-junior/30 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-brand-sand/40 bg-white shadow-sm">
        <div className="border-b border-brand-sand/30 p-5">
          <h2 className="text-lg font-extrabold text-brand-navy">{activeMeta?.label}</h2>
          <p className="mt-1 text-sm text-brand-taupe">{activeMeta?.description}</p>
        </div>

        <form onSubmit={addOption} className="flex flex-col gap-2 border-b border-brand-sand/30 bg-brand-sand/5 p-4 sm:flex-row">
          <input
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            placeholder={`Add ${activeMeta?.label?.toLowerCase().replace(/s$/, "") || "option"}`}
            className="focus-ring min-w-0 flex-1 rounded-xl border border-brand-sand/45 bg-white px-3 py-2.5 text-sm text-brand-navy"
          />
          <button
            type="submit"
            disabled={adding || !newValue.trim()}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add option
          </button>
        </form>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 p-6 text-sm font-bold text-brand-taupe">
            <Loader2 size={18} className="animate-spin" />
            Loading settings…
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-6 text-sm text-brand-taupe">No options have been added yet.</div>
        ) : (
          <div>
            <div className="hidden border-b border-brand-sand/25 bg-brand-sand/5 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-brand-taupe sm:grid sm:grid-cols-[minmax(0,1fr)_90px_90px_92px] sm:items-center sm:gap-3">
              <div>Value</div>
              <div>Order</div>
              <div>Active</div>
              <div>Status</div>
            </div>

            <div className="divide-y divide-brand-sand/20">
              {visibleRows.map((row) => {
                const isSaving = savingIds.has(row.id);
                const isSaved = savedIds.has(row.id);
                const rowError = rowErrors[row.id];

                return (
                  <div
                    key={row.id}
                    className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_90px_90px_92px] sm:items-center sm:gap-3"
                  >
                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-brand-taupe sm:hidden">
                        Value
                      </label>
                      <input
                        value={row.value}
                        onChange={(event) => patchRow(row.id, { value: event.target.value })}
                        onBlur={() => saveRow(row)}
                        className="focus-ring w-full rounded-lg border border-brand-sand/45 bg-white px-2.5 py-1.5 text-sm text-brand-navy"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-brand-taupe sm:hidden">
                        Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={row.sort_order}
                        onChange={(event) => patchRow(row.id, { sort_order: event.target.value })}
                        onBlur={() => saveRow(row)}
                        className="focus-ring w-full rounded-lg border border-brand-sand/45 bg-white px-2.5 py-1.5 text-sm text-brand-navy"
                      />
                    </div>

                    <label className="flex min-h-8 items-center gap-2 text-sm font-bold text-brand-navy">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={(event) =>
                          patchAndSave(row, { is_active: event.target.checked })
                        }
                      />
                      <span className="sm:hidden">Active</span>
                    </label>

                    <div className="min-h-5 text-xs font-bold">
                      {isSaving ? (
                        <span className="inline-flex items-center gap-1 text-brand-taupe">
                          <Loader2 size={13} className="animate-spin" />
                          Saving…
                        </span>
                      ) : rowError ? (
                        <span className="text-[#9f3d39]" title={rowError}>Error</span>
                      ) : isSaved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Check size={13} />
                          Saved
                        </span>
                      ) : (
                        <span className="text-brand-taupe/55">Auto-save</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="rounded-xl border border-brand-sky/30 bg-brand-sky/10 p-4 text-xs leading-relaxed text-brand-taupe">
        <strong className="text-brand-navy">Retiring an option:</strong> turn off Active instead of deleting it. Existing contribution records keep their saved value, while new selections stop offering the retired option.
      </div>
    </div>
  );
}
