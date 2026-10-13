import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, ChevronLeft, CircleMinus, ChevronDown, Loader2 } from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { supabase } from "../lib/supabase";
import { usePermissions } from "../contexts/PermissionContext";
import { loadSchoolYearSettings, updateAdminProgramCalendarPeriod, updateAdminSchoolYearDates, loadSchoolCalendarClosures, saveAdminSchoolCalendarClosure, setAdminSchoolCalendarClosureActive, createAdminSchoolYear } from "../data/adminSchoolYearSettings";

async function loadKeyMeetings() {
  const { data, error } = await supabase.rpc("get_admin_school_year_key_meetings");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function displayMeetingTime(time) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

function meetingZone(date) {
  if (!date) return "ET";
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" })
    .formatToParts(new Date(`${date}T12:00:00Z`)).find((part) => part.type === "timeZoneName")?.value || "ET";
}

function displayDate(date) {
  if (!date) return "Not set";
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC" });
}


function shiftDays(value, days) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function shiftYear(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year + 1, month - 1, day, 12));
  return next.toISOString().slice(0, 10);
}
function nthWeekday(year, month, weekday, occurrence) {
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const day = 1 + (weekday - first.getUTCDay() + 7) % 7 + (occurrence - 1) * 7;
  return new Date(Date.UTC(year, month - 1, day, 12)).toISOString().slice(0, 10);
}
function suggestedClosureDates(item) {
  const name = (item.name || "").toLowerCase();
  const targetYear = Number(item.starts_on.slice(0, 4)) + 1;
  const rules = [
    [/labor day/, 9, 1, 1],
    [/martin luther king|mlk day|mlk jr/, 1, 1, 3],
    [/presidents.? day|washington.s birthday/, 2, 1, 3],
    [/memorial day/, 5, 1, -1],
    [/columbus day|indigenous peoples.? day/, 10, 1, 2],
    [/thanksgiving/, 11, 4, 4],
  ];
  const rule = rules.find(([pattern]) => pattern.test(name));
  if (rule) {
    const [, month, weekday, occurrence] = rule;
    const first = occurrence === -1
      ? new Date(Date.UTC(targetYear, month, 0, 12)).getUTCDate()
      : null;
    const nextStart = occurrence === -1
      ? new Date(Date.UTC(targetYear, month - 1, first - (new Date(Date.UTC(targetYear, month - 1, first, 12)).getUTCDay() - weekday + 7) % 7, 12)).toISOString().slice(0, 10)
      : nthWeekday(targetYear, month, weekday, occurrence);
    const duration = Math.round((Date.parse(item.ends_on + 'T12:00:00Z') - Date.parse(item.starts_on + 'T12:00:00Z')) / 86400000);
    return { starts_on: nextStart, ends_on: shiftDays(nextStart, duration), date_hint: 'Calculated holiday' };
  }
  if (item.closure_type === 'break') return { starts_on: shiftDays(item.starts_on, 364), ends_on: shiftDays(item.ends_on, 364), date_hint: 'Shifted 52 weeks' };
  return { starts_on: shiftYear(item.starts_on), ends_on: shiftYear(item.ends_on), date_hint: 'Same calendar date next year' };
}
function outsideYear(item, draft) {
  return !item.starts_on || !item.ends_on || item.ends_on < item.starts_on || item.starts_on < draft.starts_on || item.ends_on > draft.ends_on;
}

const fieldClass = "w-full rounded-lg border border-brand-sand/60 bg-white px-3 py-2 text-sm text-brand-navy";

function CreateSchoolYear({ years, periods, closures, meetings, onCreated }) {
  const [sourceId, setSourceId] = useState("");
  const [mode, setMode] = useState("copy");
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const source = years.find((year) => String(year.id) === sourceId);
  useEffect(() => {
    if (years.length && !sourceId) setSourceId(String(years.find((y) => y.is_current)?.id || years[0].id));
  }, [years, sourceId]);

  function begin() {
    if (mode === "blank") {
      setDraft({ source_id: null, name: "", starts_on: "", ends_on: "", copy_closures: false, copy_meetings: false, sessions: [], closures: [], meetings: [] });
      setError(""); setNotice(""); return;
    }
    if (!source) return;
    const matches = periods.filter((p) => String(p.school_year_id) === sourceId);
    if (!matches.length) { setError("The selected source year has no program sessions."); return; }
    const matchClosures = closures.filter((c) => String(c.school_year_id) === sourceId);
    const matchMeetings = meetings.filter((m) => String(m.school_year_id) === sourceId);
    const yearMatch = source.name.match(/^(\d{4})-(\d{4})$/);
    setDraft({
      source_id: sourceId,
      name: yearMatch ? `${Number(yearMatch[1]) + 1}-${Number(yearMatch[2]) + 1}` : "",
      starts_on: shiftDays(source.starts_on, 364),
      ends_on: shiftDays(source.ends_on, 364),
      copy_closures: true,
      copy_meetings: true,
      meetings: matchMeetings.map((m) => ({ ...m, meeting_date: shiftDays(m.meeting_date, 364) })),
      sessions: matches.map(({ id, program, period, label, starts_on, ends_on, display_order, is_active }) => ({
        id, program, period, label, starts_on: shiftDays(starts_on, 364), ends_on: shiftDays(ends_on, 364), display_order, is_active
      })),
      closures: matchClosures.map((item) => ({ ...item, ...suggestedClosureDates(item), notes: item.notes || "" }))
    });
    setError(""); setNotice("");
  }
  function patch(field, value) { setDraft((old) => ({ ...old, [field]: value })); setError(""); }
  function patchItem(group, index, field, value) {
    setDraft((old) => ({ ...old, [group]: old[group].map((item, i) => i === index ? { ...item, [field]: value } : item) }));
    setError("");
  }
  function review() {
    if (!draft.name.trim() || !draft.starts_on || !draft.ends_on || draft.ends_on < draft.starts_on) {
      setError("Enter a name and valid school-year dates."); return;
    }
    if (years.some((y) => y.name.trim().toLowerCase() === draft.name.trim().toLowerCase())) {
      setError("A school year with that name already exists."); return;
    }
    if (draft.source_id && (!draft.sessions.length || draft.sessions.some((s) => outsideYear(s, draft)))) {
      setError(`Every program session must fall within ${displayDate(draft.starts_on)} through ${displayDate(draft.ends_on)}.`); return;
    }
    if (draft.copy_closures && draft.closures.some((c) => !c.name.trim() || outsideYear(c, draft))) {
      setError(`Every copied break or holiday must fall within ${displayDate(draft.starts_on)} through ${displayDate(draft.ends_on)}.`); return;
    }
    if (draft.copy_meetings && draft.meetings.some((m) => !m.meeting_date || m.meeting_date < draft.starts_on || m.meeting_date > draft.ends_on || !m.start_time || (m.end_time && m.end_time <= m.start_time))) {
      setError("Every copied meeting must have a valid date within the new school year and a valid Eastern Time range."); return;
    }
    setError(""); setConfirm(true);
  }
  async function create() {
    if (busy || !draft) return;
    setBusy(true); setError("");
    try {
      const result = await createAdminSchoolYear(draft);
      await onCreated(result.id);
      setNotice(`Created ${result.name} with ${result.sessions_created} sessions and ${result.closures_created} breaks/holidays and ${result.meetings_created ?? 0} key meetings. The current school year was not changed.`);
      setDraft(null); setConfirm(false);
    } catch (cause) {
      setError(cause?.message || "Could not create school year."); setConfirm(false);
    } finally { setBusy(false); }
  }
  return (
    <div className="mt-4 space-y-4">
      {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {!draft ? (
        <div className="space-y-3">
          <fieldset className="flex flex-wrap gap-4 text-sm text-brand-navy">
            <legend className="mb-2 font-bold">Creation method</legend>
            <label className="flex items-center gap-2"><input type="radio" name="creation-mode" checked={mode === "copy"} onChange={() => setMode("copy")} /> Copy an existing year</label>
            <label className="flex items-center gap-2"><input type="radio" name="creation-mode" checked={mode === "blank"} onChange={() => setMode("blank")} /> Start blank</label>
          </fieldset>
          <div className="flex flex-wrap items-end gap-3">
            {mode === "copy" && <label className="flex min-w-56 flex-col gap-1 text-sm font-bold text-brand-navy">Copy from school year
              <select className={fieldClass} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_current ? " (Current)" : ""}</option>)}
              </select>
            </label>}
            <button type="button" disabled={mode === "copy" && !source} onClick={begin} className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Continue</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 rounded-xl border border-brand-sand/50 bg-brand-sand/10 p-4">
          <p className="text-sm text-brand-taupe">{draft.source_id ? `Copied from ${source?.name || years.find((y) => String(y.id) === draft.source_id)?.name}. Session dates shift 52 weeks; movable holidays are calculated, fixed holidays move one calendar year, and school breaks and key meetings shift 52 weeks. Review every date.` : "Start with an empty school year. You can add program sessions, breaks, and holidays afterward."}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-bold text-brand-navy">New year name<input className={fieldClass} value={draft.name} onChange={(e) => patch("name", e.target.value)} /></label>
            <label className="text-sm font-bold text-brand-navy">Start date<input type="date" className={fieldClass} value={draft.starts_on} onChange={(e) => patch("starts_on", e.target.value)} /></label>
            <label className="text-sm font-bold text-brand-navy">End date<input type="date" className={fieldClass} value={draft.ends_on} onChange={(e) => patch("ends_on", e.target.value)} /></label>
          </div>
          {draft.source_id && <div className="space-y-2">
            <h3 className="font-extrabold text-brand-navy">Program sessions ({draft.sessions.length})</h3>
            {draft.sessions.map((item, i) => <div key={`${item.program}-${item.period}`} className="grid items-end gap-2 rounded-lg border border-brand-sand/30 bg-white p-2 sm:grid-cols-3">
              <span className="text-sm font-semibold text-brand-navy">{item.label}</span>
              <label className="text-xs text-brand-taupe">Start<input aria-label={`${item.label} start`} type="date" className={fieldClass} value={item.starts_on} onChange={(e) => patchItem("sessions", i, "starts_on", e.target.value)} /></label>
              <label className="text-xs text-brand-taupe">End<input aria-label={`${item.label} end`} type="date" className={fieldClass} value={item.ends_on} onChange={(e) => patchItem("sessions", i, "ends_on", e.target.value)} /></label>
            </div>)}
          </div>}
          {draft.source_id && <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-brand-navy"><input type="checkbox" checked={draft.copy_closures} onChange={(e) => patch("copy_closures", e.target.checked)} /> Copy breaks & holidays ({draft.closures.length})</label>
            {draft.copy_closures && <>
              <p className="text-xs text-brand-taupe">Suggested dates are estimates; review all events. To omit breaks and holidays, uncheck Copy breaks & holidays.</p>
              {draft.closures.map((item, i) => <div key={item.id || i} className="grid items-end gap-2 rounded-lg border border-brand-sand/30 bg-white p-2 sm:grid-cols-3">
                <div className="flex flex-col gap-1 self-center">
                  <span className="text-sm font-semibold text-brand-navy">{item.name}</span>
                  {item.date_hint && <span className="text-xs text-brand-taupe">{item.date_hint}</span>}
                </div>
                <label className="text-xs text-brand-taupe">Start<input aria-label={`${item.name} start`} type="date" className={fieldClass} value={item.starts_on} onChange={(e) => patchItem("closures", i, "starts_on", e.target.value)} /></label>
                <label className="text-xs text-brand-taupe">End<input aria-label={`${item.name} end`} type="date" className={fieldClass} value={item.ends_on} onChange={(e) => patchItem("closures", i, "ends_on", e.target.value)} /></label>
              </div>)}
            </>}
          </div>}
          {draft.source_id && <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-brand-navy"><input type="checkbox" checked={draft.copy_meetings} onChange={(e) => patch("copy_meetings", e.target.checked)} /> Copy key meetings ({draft.meetings.length})</label>
            {draft.copy_meetings && <>
              <p className="text-xs text-brand-taupe">Meeting dates are shifted 52 weeks. Review each date and time; all times are Eastern Time (ET).</p>
              {draft.meetings.map((item, i) => <div key={item.id} className="grid items-end gap-2 rounded-lg border border-brand-sand/30 bg-white p-2 sm:grid-cols-4">
                <span className="text-sm font-semibold text-brand-navy">{item.name}{!item.is_active ? " (Inactive)" : ""}</span>
                <label className="text-xs text-brand-taupe">Date<input type="date" className={fieldClass} value={item.meeting_date} onChange={(e) => patchItem("meetings", i, "meeting_date", e.target.value)} /></label>
                <label className="text-xs text-brand-taupe">Start (ET)<input type="time" className={fieldClass} value={item.start_time?.slice(0, 5) || ""} onChange={(e) => patchItem("meetings", i, "start_time", e.target.value)} /></label>
                <label className="text-xs text-brand-taupe">End (ET, optional)<input type="time" className={fieldClass} value={item.end_time?.slice(0, 5) || ""} onChange={(e) => patchItem("meetings", i, "end_time", e.target.value || null)} /></label>
              </div>)}
            </>}
          </div>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={review} className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-bold text-white">Review & Confirm</button>
            <button type="button" disabled={busy} onClick={() => { setDraft(null); setError(""); }} className="rounded-lg border border-brand-sand/60 px-4 py-2 text-sm font-bold text-brand-navy">Cancel</button>
          </div>
        </div>
      )}
      {!draft && error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <ConfirmDialog open={confirm} title="Confirm New School Year" confirmLabel="Create School Year" busy={busy} onCancel={() => { if (!busy) setConfirm(false); }} onConfirm={create} warning="The new school year will NOT become current. Existing class offerings and registration windows will not be changed.">
        {draft && <div className="space-y-2 text-sm">
          <p><strong>{draft.name}</strong>: {displayDate(draft.starts_on)} – {displayDate(draft.ends_on)}</p>
          <p>{draft.sessions.length} program sessions; {draft.copy_closures ? draft.closures.length : 0} breaks and holidays; {draft.copy_meetings ? draft.meetings.length : 0} key meetings.</p>
          <p>Mode: {draft.source_id ? `Copy from ${years.find((y) => String(y.id) === draft.source_id)?.name}` : "Blank school year"}</p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-brand-sand/40 p-2">
            {draft.sessions.map((s) => <p key={`${s.program}-${s.period}`}>{s.label}: {displayDate(s.starts_on)} – {displayDate(s.ends_on)}</p>)}
            {draft.copy_closures && draft.closures.map((c, i) => <p key={i}>{c.name}: {displayDate(c.starts_on)} – {displayDate(c.ends_on)}</p>)}
            {draft.copy_meetings && draft.meetings.map((m) => <p key={m.id}>{m.name}: {displayDate(m.meeting_date)}, {m.start_time?.slice(0, 5)}{m.end_time ? `–${m.end_time.slice(0, 5)}` : ""} ET</p>)}
          </div>
        </div>}
      </ConfirmDialog>
    </div>
  );
}

export default function AdminSchoolYearSettingsPage() {
  const { hasPermission } = usePermissions();
  const allowed = hasPermission("admin.settings.view");
  const canManage = hasPermission("admin.settings.manage");
  const [years, setYears] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmPeriod, setConfirmPeriod] = useState(null);
  const [editingYear, setEditingYear] = useState(false);
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [yearError, setYearError] = useState("");
  const [yearNotice, setYearNotice] = useState("");
  const [confirmYear, setConfirmYear] = useState(null);
  const [closures, setClosures] = useState([]);
  const [closuresLoading, setClosuresLoading] = useState(allowed);
  const [closuresError, setClosuresError] = useState("");
  const [closureForm, setClosureForm] = useState(null);
  const [closureFormError, setClosureFormError] = useState("");
  const [closureNotice, setClosureNotice] = useState("");
  const [confirmClosure, setConfirmClosure] = useState(null);
  const [openSections, setOpenSections] = useState({ years: true, sessions: false, closures: false, meetings: false });
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(allowed);
  const [meetingsError, setMeetingsError] = useState("");
  const [meetingForm, setMeetingForm] = useState(null);
  const [meetingFormError, setMeetingFormError] = useState("");
  const [meetingNotice, setMeetingNotice] = useState("");
  const [confirmMeeting, setConfirmMeeting] = useState(null);
  const [meetingBusy, setMeetingBusy] = useState(false);
  const [showCreateYear, setShowCreateYear] = useState(false);
  const [confirmActivation, setConfirmActivation] = useState(null);
  const [activationBusy, setActivationBusy] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [activationNotice, setActivationNotice] = useState("");
  function toggleSection(name) { setOpenSections((old) => ({ ...old, [name]: !old[name] })); }
  async function refreshAfterCreate(id) {
    const [settings, nextClosures, nextMeetings] = await Promise.all([loadSchoolYearSettings(), loadSchoolCalendarClosures(), loadKeyMeetings()]);
    setYears(settings.years); setPeriods(settings.periods); setClosures(nextClosures); setMeetings(nextMeetings);
    setSelectedYearId(String(id));
    setOpenSections((old) => ({ ...old, years: true, create: true }));
  }

  async function activateSchoolYear() {
    if (!confirmActivation || activationBusy || !canManage) return;
    const target = confirmActivation;
    setActivationBusy(true);
    setActivationError("");
    setActivationNotice("");
    try {
      const { error: rpcError } = await supabase.rpc("set_admin_current_school_year", {
        p_school_year_id: target.id,
      });
      if (rpcError) throw rpcError;
      const refreshed = await loadSchoolYearSettings();
      setYears(refreshed.years);
      setPeriods(refreshed.periods);
      setConfirmActivation(null);
      setActivationNotice(`${target.name} is now the current school year. The member catalog will use this year when it next loads. Existing classes and registrations were not modified.`);
    } catch (cause) {
      setActivationError(cause?.message || "Could not change the current school year.");
      setConfirmActivation(null);
    } finally {
      setActivationBusy(false);
    }
  }

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    loadSchoolYearSettings().then(({ years: nextYears, periods: nextPeriods }) => {
      if (!active) return;
      setYears(nextYears);
      setPeriods(nextPeriods);
      setSelectedYearId((previous) => previous || String(nextYears.find((year) => year.is_current)?.id ?? nextYears[0]?.id ?? ""));
    }).catch((cause) => {
      if (active) setError(cause?.message || "Unable to load school year settings.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    loadSchoolCalendarClosures()
      .then((items) => { if (active) setClosures(items); })
      .catch((cause) => { if (active) setClosuresError(cause?.message || "Unable to load breaks and holidays."); })
      .finally(() => { if (active) setClosuresLoading(false); });
    return () => { active = false; };
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    loadKeyMeetings()
      .then((items) => { if (active) setMeetings(items); })
      .catch((cause) => { if (active) setMeetingsError(cause?.message || "Unable to load key meetings."); })
      .finally(() => { if (active) setMeetingsLoading(false); });
    return () => { active = false; };
  }, [allowed]);

  const visibleMeetings = useMemo(() => meetings
    .filter((item) => String(item.school_year_id) === selectedYearId)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date) || a.start_time.localeCompare(b.start_time) || a.name.localeCompare(b.name)), [meetings, selectedYearId]);

  function startMeetingForm(item = null) {
    if (!canManage || meetingBusy || !selectedYearId) return;
    setMeetingForm(item ? {
      id: item.id, school_year_id: item.school_year_id, name: item.name,
      meeting_date: item.meeting_date, start_time: item.start_time?.slice(0, 5) || "",
      end_time: item.end_time?.slice(0, 5) || "", notes: item.notes || "",
    } : {
      id: null, school_year_id: selectedYearId, name: "", meeting_date: "",
      start_time: "", end_time: "", notes: "",
    });
    setMeetingFormError(""); setMeetingNotice("");
  }

  function requestMeetingSave() {
    if (!meetingForm || !canManage) return;
    if (!meetingForm.name.trim() || !meetingForm.meeting_date || !meetingForm.start_time ||
        (meetingForm.end_time && meetingForm.end_time <= meetingForm.start_time)) {
      setMeetingFormError("Enter a name, date, and start time. End time must be later than start time."); return;
    }
    if (selectedYear && (meetingForm.meeting_date < selectedYear.starts_on || meetingForm.meeting_date > selectedYear.ends_on)) {
      setMeetingFormError(`Meeting date must fall within ${displayDate(selectedYear.starts_on)} through ${displayDate(selectedYear.ends_on)}.`); return;
    }
    setMeetingFormError("");
    setConfirmMeeting({ action: "save", item: { ...meetingForm } });
  }

  async function confirmMeetingAction() {
    if (!confirmMeeting || meetingBusy || !canManage) return;
    const { action, item } = confirmMeeting;
    setMeetingBusy(true); setMeetingFormError(""); setMeetingNotice("");
    try {
      const { error: rpcError } = action === "save"
        ? await supabase.rpc("save_admin_school_year_key_meeting", {
            p_id: item.id, p_school_year_id: item.school_year_id,
            p_name: item.name, p_meeting_date: item.meeting_date,
            p_start_time: item.start_time, p_end_time: item.end_time || null,
            p_notes: item.notes || null,
          })
        : await supabase.rpc("set_admin_school_year_key_meeting_active", {
            p_id: item.id, p_is_active: action === "restore",
          });
      if (rpcError) throw rpcError;
      setMeetings(await loadKeyMeetings());
      setMeetingForm(null); setConfirmMeeting(null);
      setMeetingNotice(action === "save" ? `${item.name} saved.` : `${item.name} ${action === "restore" ? "restored" : "deactivated"}.`);
    } catch (cause) {
      setMeetingFormError(cause?.message || "Could not update this key meeting.");
      setConfirmMeeting(null);
    } finally { setMeetingBusy(false); }
  }

  const selectedYear = years.find((year) => String(year.id) === selectedYearId);
  const visiblePeriods = useMemo(() => periods.filter((period) => String(period.school_year_id) === selectedYearId), [periods, selectedYearId]);

  const visibleClosures = useMemo(() => closures.filter((item) => String(item.school_year_id) === selectedYearId)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on) || a.name.localeCompare(b.name)), [closures, selectedYearId]);

  function startClosureForm(item = null) {
    if (saving || !selectedYearId) return;
    setClosureForm(item ? {
      id: item.id, school_year_id: item.school_year_id, name: item.name,
      closure_type: item.closure_type, starts_on: item.starts_on, ends_on: item.ends_on,
      program: item.program, notes: item.notes || "",
    } : {
      id: null, school_year_id: selectedYearId, name: "", closure_type: "break",
      starts_on: "", ends_on: "", program: "both", notes: "",
    });
    setClosureFormError("");
    setClosureNotice("");
  }

  function updateClosureField(field, value) {
    setClosureForm((previous) => previous ? { ...previous, [field]: value } : previous);
    setClosureFormError("");
  }

  function requestClosureSave() {
    if (!closureForm) return;
    if (!closureForm.name.trim() || !closureForm.starts_on || !closureForm.ends_on || closureForm.ends_on < closureForm.starts_on) {
      setClosureFormError("Enter a name and valid start/end dates.");
      return;
    }
    if (selectedYear && outsideYear(closureForm, selectedYear)) {
      setClosureFormError(`Dates must fall within ${displayDate(selectedYear.starts_on)} through ${displayDate(selectedYear.ends_on)}.`); return;
    }
    setClosureFormError("");
    setConfirmClosure({ action: "save", item: { ...closureForm } });
  }

  async function confirmClosureAction() {
    if (!confirmClosure || saving) return;
    const { action, item } = confirmClosure;
    setSaving(true);
    setClosureFormError("");
    setClosureNotice("");
    try {
      if (action === "save") await saveAdminSchoolCalendarClosure(item);
      else await setAdminSchoolCalendarClosureActive(item.id, action === "restore");
      const refreshed = await loadSchoolCalendarClosures();
      setClosures(refreshed);
      setClosureForm(null);
      setConfirmClosure(null);
      setClosureNotice(action === "save" ? `${item.name} saved.` : `${item.name} ${action === "restore" ? "restored" : "deactivated"}.`);
    } catch (cause) {
      setClosureFormError(cause?.message || "Could not update this break or holiday.");
      setConfirmClosure(null);
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(period) {
    setEditing(period.id);
    setStart(period.starts_on || "");
    setEnd(period.ends_on || "");
    setSaveError("");
    setNotice("");
  }

  function cancelEdit() {
    if (saving) return;
    setEditing(null);
    setSaveError("");
  }

  function requestSave(period) {
    if (!start || !end || end < start) {
      setSaveError("Enter a valid start and end date. The end must not precede the start.");
      return;
    }
    if (start === period.starts_on && end === period.ends_on) {
      cancelEdit();
      return;
    }
    if (selectedYear && outsideYear({ starts_on: start, ends_on: end }, selectedYear)) {
      setSaveError(`Session dates must fall within ${displayDate(selectedYear.starts_on)} through ${displayDate(selectedYear.ends_on)}.`); return;
    }
    setSaveError("");
    setConfirmPeriod({ ...period, proposedStart: start, proposedEnd: end });
  }

  async function savePeriod() {
    if (!confirmPeriod || saving) return;
    const period = confirmPeriod;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      const result = await updateAdminProgramCalendarPeriod(period.id, period.proposedStart, period.proposedEnd);
      const refreshed = await loadSchoolYearSettings();
      setYears(refreshed.years);
      setPeriods(refreshed.periods);
      setEditing(null);
      setConfirmPeriod(null);
      const count = result?.affected_class_offerings ?? 0;
      setNotice(`Saved ${period.label || period.period}. ${count} class offering${count === 1 ? "" : "s"} matched this session and were checked for date synchronization.`);
    } catch (cause) {
      setSaveError(cause?.message || "Could not save session dates. Please try again.");
      setConfirmPeriod(null);
    } finally {
      setSaving(false);
    }
  }

  function beginYearEdit() {
    if (!selectedYear || editing !== null || saving) return;
    setEditingYear(true);
    setYearStart(selectedYear.starts_on || "");
    setYearEnd(selectedYear.ends_on || "");
    setYearError("");
    setYearNotice("");
  }

  function cancelYearEdit() {
    if (saving) return;
    setEditingYear(false);
    setConfirmYear(null);
    setYearError("");
  }

  function requestYearSave() {
    if (!selectedYear) return;
    if (!yearStart || !yearEnd || yearEnd < yearStart) {
      setYearError("Enter valid school-year dates. The end must not precede the start.");
      return;
    }
    if (yearStart === selectedYear.starts_on && yearEnd === selectedYear.ends_on) {
      cancelYearEdit();
      return;
    }
    setYearError("");
    setConfirmYear({ ...selectedYear, proposedStart: yearStart, proposedEnd: yearEnd });
  }

  async function saveYear() {
    if (!confirmYear || saving) return;
    const year = confirmYear;
    setSaving(true);
    setYearError("");
    setYearNotice("");
    try {
      await updateAdminSchoolYearDates(year.id, year.proposedStart, year.proposedEnd);
      setYears((previous) => previous.map((item) =>
        item.id === year.id
          ? { ...item, starts_on: year.proposedStart, ends_on: year.proposedEnd }
          : item
      ));
      setEditingYear(false);
      setConfirmYear(null);
      setYearNotice(`Saved school-year dates for ${year.name}. Program sessions and registration windows were not changed.`);
    } catch (cause) {
      setYearError(cause?.message || "Could not save school-year dates. Please try again.");
      setConfirmYear(null);
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return <p className="text-sm text-brand-taupe">You do not have permission to view school year settings.</p>;

  return (
    <div className="space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-brand-sky hover:underline"><ChevronLeft size={16} /> Back to Admin</Link>
      <header className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold"><CalendarDays size={24} /></div>
        <div><h1 className="brand-title text-3xl text-brand-navy">School Year & Settings</h1><p className="mt-1 text-sm text-brand-taupe">Manage school-year dates, program sessions, breaks, holidays, and key meetings.</p></div>
      </header>
      <ConfirmDialog
        open={Boolean(confirmActivation)}
        title="Change Current School Year"
        confirmLabel="Make Current School Year"
        busy={activationBusy}
        onCancel={() => { if (!activationBusy) setConfirmActivation(null); }}
        onConfirm={activateSchoolYear}
        warning="This changes which school year's eligible classes appear in the member catalog when it reloads. It does not create, delete, publish, or modify classes, enrollments, or registration windows."
      >
        {confirmActivation && (
          <div className="space-y-2 text-sm">
            <p>Change the current school year from <strong>{years.find((year) => year.is_current)?.name || "None"}</strong> to <strong>{confirmActivation.name}</strong>?</p>
            <p>If {confirmActivation.name} has no eligible published offerings, the member catalog will show no classes for that year.</p>
          </div>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(confirmPeriod)}
        title="Confirm Session Date Changes"
        confirmLabel="Save Changes"
        busy={saving}
        onCancel={() => setConfirmPeriod(null)}
        onConfirm={savePeriod}
        warning="This will also update the dates of associated class offerings, including published classes. Registration windows will not change."
      >
        {confirmPeriod && (
          <>
            <p>Review the proposed dates for <strong>{confirmPeriod.label || confirmPeriod.period}</strong> ({confirmPeriod.program}).</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-brand-sand/15 p-3"><p className="text-xs font-bold text-brand-taupe">Current dates</p><p className="mt-1">{displayDate(confirmPeriod.starts_on)} – {displayDate(confirmPeriod.ends_on)}</p></div>
              <div className="rounded-xl bg-brand-sky/10 p-3"><p className="text-xs font-bold text-brand-taupe">Proposed dates</p><p className="mt-1">{displayDate(confirmPeriod.proposedStart)} – {displayDate(confirmPeriod.proposedEnd)}</p></div>
            </div>
          </>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(confirmYear)}
        title="Confirm School-Year Date Changes"
        confirmLabel="Save Changes"
        busy={saving}
        onCancel={() => { if (!saving) setConfirmYear(null); }}
        onConfirm={saveYear}
        warning="Only the overall school-year dates will change. Junior/Youth session dates, class offerings, and registration windows will not be updated."
      >
        {confirmYear && (
          <>
            <p>Review the proposed dates for <strong>{confirmYear.name}</strong>.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-brand-sand/15 p-3"><p className="text-xs font-bold text-brand-taupe">Current dates</p><p className="mt-1">{displayDate(confirmYear.starts_on)} – {displayDate(confirmYear.ends_on)}</p></div>
              <div className="rounded-xl bg-brand-sky/10 p-3"><p className="text-xs font-bold text-brand-taupe">Proposed dates</p><p className="mt-1">{displayDate(confirmYear.proposedStart)} – {displayDate(confirmYear.proposedEnd)}</p></div>
            </div>
          </>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(confirmClosure)}
        title={confirmClosure?.action === "save" ? (confirmClosure?.item?.id ? "Confirm Break or Holiday Changes" : "Add Break or Holiday") : confirmClosure?.action === "restore" ? "Restore Break or Holiday" : "Deactivate Break or Holiday"}
        confirmLabel={confirmClosure?.action === "save" ? "Save Changes" : confirmClosure?.action === "restore" ? "Restore" : "Deactivate"}
        busy={saving}
        onCancel={() => { if (!saving) setConfirmClosure(null); }}
        onConfirm={confirmClosureAction}
        warning="Existing class meetings will not be automatically changed. Review any scheduling conflicts separately."
      >
        {confirmClosure && (
          <div className="space-y-2 text-sm">
            <p><strong>{confirmClosure.item.name}</strong></p>
            {confirmClosure.action === "save" ? (
              <>
                <p>{confirmClosure.item.closure_type === "break" ? "Break" : "Holiday"} · {confirmClosure.item.program === "both" ? "Junior & Youth" : confirmClosure.item.program === "junior" ? "Junior only" : "Youth only"}</p>
                <p>Proposed: {displayDate(confirmClosure.item.starts_on)} – {displayDate(confirmClosure.item.ends_on)}</p>
                {confirmClosure.item.id && (() => {
                  const previous = closures.find((item) => item.id === confirmClosure.item.id);
                  return previous ? <p>Current: {displayDate(previous.starts_on)} – {displayDate(previous.ends_on)}</p> : null;
                })()}
              </>
            ) : <p>This event will be {confirmClosure.action === "restore" ? "active again" : "inactive"} for its selected program(s).</p>}
          </div>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(confirmMeeting)}
        title={confirmMeeting?.action === "save" ? (confirmMeeting?.item?.id ? "Confirm Key Meeting Changes" : "Add Key Meeting") : confirmMeeting?.action === "restore" ? "Restore Key Meeting" : "Deactivate Key Meeting"}
        confirmLabel={confirmMeeting?.action === "save" ? "Save Changes" : confirmMeeting?.action === "restore" ? "Restore" : "Deactivate"}
        busy={meetingBusy}
        onCancel={() => { if (!meetingBusy) setConfirmMeeting(null); }}
        onConfirm={confirmMeetingAction}
      >
        {confirmMeeting && <div className="space-y-2 text-sm">
          <p><strong>{confirmMeeting.item.name}</strong></p>
          {confirmMeeting.action === "save" ? <p>{displayDate(confirmMeeting.item.meeting_date)} at {displayMeetingTime(confirmMeeting.item.start_time)}{confirmMeeting.item.end_time ? ` – ${displayMeetingTime(confirmMeeting.item.end_time)}` : ""} {meetingZone(confirmMeeting.item.meeting_date)}</p> :
            <p>This meeting will be {confirmMeeting.action === "restore" ? "visible again" : "hidden"} on Important Dates once the member page is connected.</p>}
        </div>}
      </ConfirmDialog>
      {loading ? <p className="flex items-center gap-2 text-sm text-brand-taupe"><Loader2 className="animate-spin" size={18} /> Loading school calendar...</p> : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load calendar data: {error}</div>
      ) : (
        <>
          <section className="rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" aria-expanded={openSections.years} onClick={() => toggleSection("years")} className="flex min-w-0 flex-1 items-center text-left"><h2 className="text-lg font-extrabold text-brand-navy">School Years</h2></button>
              <div className="flex items-center gap-3">
                {canManage && <button type="button" aria-expanded={showCreateYear} onClick={() => { setOpenSections((old) => ({ ...old, years: true })); setShowCreateYear((previous) => !previous); }} className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white">{showCreateYear ? "Close Create School Year" : "+ Create New School Year"}</button>}
                <button type="button" aria-label={openSections.years ? "Collapse School Years" : "Expand School Years"} aria-expanded={openSections.years} onClick={() => toggleSection("years")} className="rounded-lg p-1 text-brand-navy hover:bg-brand-sand/20"><ChevronDown className={`transition-transform ${openSections.years ? "rotate-180" : ""}`} size={20} /></button>
              </div>
            </div>
            {openSections.years && <div className="mt-3 space-y-4 border-t border-brand-sand/40 pt-4">
              {canManage && showCreateYear && <div className="rounded-xl border border-brand-sand/40 bg-brand-sand/10 p-4"><h3 className="font-extrabold text-brand-navy">Create New School Year</h3><CreateSchoolYear years={years} periods={periods} closures={closures} meetings={meetings} onCreated={refreshAfterCreate} /></div>}
              {years.length === 0 ? <p className="mt-3 text-sm text-brand-taupe">No school years found.</p> : (
              <div className="mt-3 space-y-3">
                <label className="block text-sm font-bold text-brand-navy" htmlFor="school-year-select">View school year</label>
                <select id="school-year-select" className="w-full max-w-md rounded-xl border border-brand-sand/60 bg-white px-3 py-2 text-brand-navy" value={selectedYearId} disabled={saving || activationBusy} onChange={(event) => { setActivationError(""); setActivationNotice(""); setSelectedYearId(event.target.value); cancelEdit(); cancelYearEdit(); setNotice(""); setYearNotice(""); setClosureForm(null); setClosureFormError(""); setClosureNotice(""); setMeetingForm(null); setMeetingFormError(""); setMeetingNotice(""); }}>
                  {years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_current ? " (Current)" : ""}</option>)}
                </select>
                {selectedYear && (
                  <div className="space-y-3">
                    {editingYear ? (
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Start date
                          <input type="date" value={yearStart} disabled={saving} onChange={(event) => setYearStart(event.target.value)} className="rounded-lg border border-brand-sand/60 px-3 py-2 font-normal text-brand-navy" />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">End date
                          <input type="date" value={yearEnd} disabled={saving} onChange={(event) => setYearEnd(event.target.value)} className="rounded-lg border border-brand-sand/60 px-3 py-2 font-normal text-brand-navy" />
                        </label>
                        <button type="button" disabled={saving} onClick={requestYearSave} className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Save</button>
                        <button type="button" disabled={saving} onClick={cancelYearEdit} className="rounded-lg border border-brand-sand/60 px-3 py-2 text-sm font-bold text-brand-navy disabled:opacity-50">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-brand-taupe">{displayDate(selectedYear.starts_on)} – {displayDate(selectedYear.ends_on)}{selectedYear.is_current ? " · Current school year" : ""}</p>
                        <button type="button" disabled={saving || editing !== null} onClick={beginYearEdit} className="rounded-lg border border-brand-sand/60 px-3 py-1.5 text-sm font-bold text-brand-sky disabled:opacity-50">Edit Dates</button>
                         {canManage && !selectedYear.is_current && <button type="button" disabled={saving || activationBusy || editing !== null || editingYear || Boolean(closureForm)} onClick={() => { setActivationError(""); setActivationNotice(""); setConfirmActivation(selectedYear); }} className="rounded-lg bg-brand-navy px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">Make Current School Year</button>}
                      </div>
                    )}
                    {activationError && <p role="alert" className="text-sm text-red-700">{activationError}</p>}
                    {activationNotice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{activationNotice}</p>}
                    {yearError && <p role="alert" className="text-sm text-red-700">{yearError}</p>}
                    {yearNotice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{yearNotice}</p>}
                  </div>
                )}
              </div>
            )}
            </div>}
          </section>
          <section className="rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm">
            <button type="button" aria-expanded={openSections.sessions} onClick={() => toggleSection("sessions")} className="flex w-full items-center justify-between text-left"><h2 className="text-lg font-extrabold text-brand-navy">Program Sessions</h2><ChevronDown className={`transition-transform ${openSections.sessions ? "rotate-180" : ""}`} size={20} /></button>
            {openSections.sessions && <div><p className="mt-1 text-sm text-brand-taupe">Edit session start and end dates. Saving updates associated class offering dates automatically; registration windows are managed separately.</p>
            {notice && <div role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
            {visiblePeriods.length === 0 ? <p className="mt-4 text-sm text-brand-taupe">No program sessions found for this school year.</p> : (
              <div className="mt-4 space-y-6">
                {["junior", "youth"].map((program) => {
                  const rows = visiblePeriods.filter((period) => String(period.program).toLowerCase() === program).sort((a,b) => (a.display_order ?? 0) - (b.display_order ?? 0));
                  if (!rows.length) return null;
                  return <div key={program}><h3 className="mb-2 font-extrabold capitalize text-brand-navy">{program}</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-brand-sand/40 text-brand-taupe"><th className="py-2 pr-4">Session</th><th className="py-2 pr-4">Start</th><th className="py-2 pr-4">End</th><th className="py-2 pr-4">Status</th><th className="py-2 text-right">Action</th></tr></thead><tbody>{rows.map((period) => {
                    const isEditing = editing === period.id;
                    return <tr key={period.id} className="border-b border-brand-sand/25"><td className="py-3 pr-4 font-semibold text-brand-navy">{period.label || period.period}</td><td className="py-3 pr-4">{isEditing ? <input aria-label={`Start date for ${period.label || period.period}`} type="date" className="rounded-lg border border-brand-sand/60 px-2 py-1 text-brand-navy" value={start} disabled={saving} onChange={(event) => setStart(event.target.value)} /> : displayDate(period.starts_on)}</td><td className="py-3 pr-4">{isEditing ? <input aria-label={`End date for ${period.label || period.period}`} type="date" className="rounded-lg border border-brand-sand/60 px-2 py-1 text-brand-navy" value={end} disabled={saving} onChange={(event) => setEnd(event.target.value)} /> : displayDate(period.ends_on)}</td><td className="py-3 pr-4">{period.is_active ? "Active" : "Inactive"}</td><td className="py-3 text-right whitespace-nowrap">{isEditing ? <div className="flex justify-end gap-2"><button type="button" className="rounded-lg bg-brand-navy px-3 py-1.5 font-bold text-white disabled:opacity-50" disabled={saving} onClick={() => requestSave(period)}>{saving ? "Saving..." : "Save"}</button><button type="button" className="rounded-lg border border-brand-sand/60 px-3 py-1.5 text-brand-navy disabled:opacity-50" disabled={saving} onClick={cancelEdit}>Cancel</button></div> : <button type="button" className="rounded-lg border border-brand-sand/60 px-3 py-1.5 font-bold text-brand-sky disabled:opacity-50" disabled={saving || editing !== null || editingYear} onClick={() => beginEdit(period)}>Edit</button>}</td></tr>;
                  })}</tbody></table></div>{rows.some((period) => editing === period.id) && saveError && <p role="alert" className="mt-2 text-sm text-red-700">{saveError}</p>}</div>;
                })}
              </div>
            )}
            </div>}
          </section>
          <section className="rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm">
            <button type="button" aria-expanded={openSections.closures} onClick={() => toggleSection("closures")} className="flex w-full items-center justify-between text-left"><h2 className="text-lg font-extrabold text-brand-navy">Breaks & Holidays</h2><ChevronDown className={`transition-transform ${openSections.closures ? "rotate-180" : ""}`} size={20} /></button>
            {openSections.closures && <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mt-1 text-sm text-brand-taupe">No classes on these dates. Both programs by default; existing class meetings are not changed automatically.</p>
              </div>
              <button type="button" disabled={saving || !selectedYear || Boolean(closureForm)} onClick={() => startClosureForm()} className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Add Break or Holiday</button>
            </div>
            {closureNotice && <p role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{closureNotice}</p>}
            {closuresLoading && <p className="mt-3 flex items-center gap-2 text-sm text-brand-taupe"><Loader2 className="animate-spin" size={16} /> Loading breaks and holidays...</p>}
            {closuresError && <p role="alert" className="mt-3 text-sm text-red-700">{closuresError}</p>}
            {closureForm && (
              <div className="mt-4 space-y-4 rounded-xl border border-brand-sand/60 bg-brand-sand/10 p-4">
                <h3 className="font-bold text-brand-navy">{closureForm.id ? "Edit Break or Holiday" : "Add Break or Holiday"}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Name
                    <input className="rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal" value={closureForm.name} disabled={saving} onChange={(event) => updateClosureField("name", event.target.value)} placeholder="e.g. Fall Break" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Type
                    <select className="rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal" value={closureForm.closure_type} disabled={saving} onChange={(event) => updateClosureField("closure_type", event.target.value)}><option value="break">Break</option><option value="holiday">Holiday</option></select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Start date
                    <input type="date" className="rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal" value={closureForm.starts_on} disabled={saving} onChange={(event) => updateClosureField("starts_on", event.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">End date
                    <input type="date" className="rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal" value={closureForm.ends_on} disabled={saving} onChange={(event) => updateClosureField("ends_on", event.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Applies to
                    <select className="rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal" value={closureForm.program} disabled={saving} onChange={(event) => updateClosureField("program", event.target.value)}><option value="both">Junior & Youth</option><option value="junior">Junior only</option><option value="youth">Youth only</option></select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Notes (optional)
                    <input className="rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal" value={closureForm.notes} disabled={saving} onChange={(event) => updateClosureField("notes", event.target.value)} />
                  </label>
                </div>
                {closureFormError && <p role="alert" className="text-sm text-red-700">{closureFormError}</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={saving} onClick={requestClosureSave} className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Save</button>
                  <button type="button" disabled={saving} onClick={() => { setClosureForm(null); setClosureFormError(""); }} className="rounded-lg border border-brand-sand/60 px-3 py-2 text-sm font-bold text-brand-navy disabled:opacity-50">Cancel</button>
                </div>
              </div>
            )}
            {!closuresLoading && !closuresError && (visibleClosures.length === 0 ? (
              <p className="mt-4 text-sm text-brand-taupe">No breaks or holidays for this school year yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-brand-sand/40 text-brand-taupe"><th className="py-2 pr-3">Event</th><th className="py-2 pr-3">Dates</th><th className="py-2 pr-3">Programs</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Actions</th></tr></thead><tbody>
                {visibleClosures.map((item) => <tr key={item.id} className={`border-b border-brand-sand/25 ${item.is_active ? "" : "bg-slate-50/70"}`}><td className="py-3 pr-3"><span className={`font-semibold ${item.is_active ? "text-brand-navy" : "text-slate-500"}`}>{item.name}</span><span className="ml-2 text-xs capitalize text-brand-taupe">{item.closure_type}</span>{item.notes && <p className="mt-1 text-xs text-brand-taupe">{item.notes}</p>}</td><td className="py-3 pr-3 whitespace-nowrap">{displayDate(item.starts_on)}{item.ends_on !== item.starts_on ? ` – ${displayDate(item.ends_on)}` : ""}</td><td className="py-3 pr-3">{item.program === "both" ? "Junior & Youth" : item.program === "junior" ? "Junior" : "Youth"}</td><td className="py-3 pr-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${item.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{item.is_active ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleMinus size={14} aria-hidden="true" />}{item.is_active ? "Active" : "Inactive"}</span></td><td className="py-3 text-right whitespace-nowrap"><div className="flex justify-end gap-2"><button type="button" disabled={saving || Boolean(closureForm)} onClick={() => startClosureForm(item)} className="rounded-lg border border-brand-sand/60 px-3 py-1.5 font-bold text-brand-sky disabled:opacity-50">Edit</button><button type="button" disabled={saving || Boolean(closureForm)} onClick={() => { setClosureFormError(""); setClosureNotice(""); setConfirmClosure({ action: item.is_active ? "deactivate" : "restore", item }); }} className="rounded-lg border border-brand-sand/60 px-3 py-1.5 font-bold text-brand-navy disabled:opacity-50">{item.is_active ? "Deactivate" : "Restore"}</button></div></td></tr>)}
              </tbody></table></div>
            ))}
            {!closureForm && closureFormError && <p role="alert" className="mt-3 text-sm text-red-700">{closureFormError}</p>}
            </div>}
          </section>
          <section className="rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm">
            <button type="button" aria-expanded={openSections.meetings} onClick={() => toggleSection("meetings")} className="flex w-full items-center justify-between text-left"><h2 className="text-lg font-extrabold text-brand-navy">Key Meetings</h2><ChevronDown className={`transition-transform ${openSections.meetings ? "rotate-180" : ""}`} size={20} /></button>
            {openSections.meetings && <div className="mt-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-brand-taupe">School-year meetings. Enter all times in Eastern Time (ET); daylight saving time is handled automatically.</p>
                {canManage && <button type="button" disabled={meetingBusy || !selectedYear || Boolean(meetingForm)} onClick={() => startMeetingForm()} className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Add Key Meeting</button>}
              </div>
              {meetingNotice && <p role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{meetingNotice}</p>}
              {meetingsLoading && <p className="mt-3 flex items-center gap-2 text-sm text-brand-taupe"><Loader2 className="animate-spin" size={16} /> Loading key meetings...</p>}
              {meetingsError && <p role="alert" className="mt-3 text-sm text-red-700">{meetingsError}</p>}
              {meetingForm && canManage && <div className="mt-4 space-y-4 rounded-xl border border-brand-sand/60 bg-brand-sand/10 p-4">
                <h3 className="font-bold text-brand-navy">{meetingForm.id ? "Edit Key Meeting" : "Add Key Meeting"}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Meeting name<input className={fieldClass} value={meetingForm.name} disabled={meetingBusy} onChange={(e) => { setMeetingForm((old) => ({ ...old, name: e.target.value })); setMeetingFormError(""); }} placeholder="e.g. Annual Feedback Meeting" /></label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">Meeting date<input type="date" className={fieldClass} value={meetingForm.meeting_date} disabled={meetingBusy} onChange={(e) => { setMeetingForm((old) => ({ ...old, meeting_date: e.target.value })); setMeetingFormError(""); }} /></label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy"><span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span>Start time</span><span className="text-xs font-semibold text-red-400">Enter all meeting times in Eastern Time (ET).</span></span><input type="time" step="60" className={`${fieldClass} min-h-11 rounded-xl border-brand-sand/70 px-4 py-3 text-base font-normal`} value={meetingForm.start_time} disabled={meetingBusy} onChange={(e) => { setMeetingForm((old) => ({ ...old, start_time: e.target.value })); setMeetingFormError(""); }} /></label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy">End time (optional)<input type="time" step="60" className={`${fieldClass} min-h-11 rounded-xl border-brand-sand/70 px-4 py-3 text-base font-normal`} value={meetingForm.end_time} disabled={meetingBusy} onChange={(e) => { setMeetingForm((old) => ({ ...old, end_time: e.target.value })); setMeetingFormError(""); }} /></label>
                  <label className="flex flex-col gap-1 text-sm font-bold text-brand-navy sm:col-span-2">Notes (optional)<input className={fieldClass} value={meetingForm.notes} disabled={meetingBusy} onChange={(e) => { setMeetingForm((old) => ({ ...old, notes: e.target.value })); setMeetingFormError(""); }} /></label>
                </div>
                {meetingFormError && <p role="alert" className="text-sm text-red-700">{meetingFormError}</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={meetingBusy} onClick={requestMeetingSave} className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Save</button>
                  <button type="button" disabled={meetingBusy} onClick={() => { setMeetingForm(null); setMeetingFormError(""); }} className="rounded-lg border border-brand-sand/60 px-3 py-2 text-sm font-bold text-brand-navy disabled:opacity-50">Cancel</button>
                </div>
              </div>}
              {!meetingsLoading && !meetingsError && (visibleMeetings.length === 0 ? <p className="mt-4 text-sm text-brand-taupe">No key meetings for this school year yet.</p> :
                <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-brand-sand/40 text-brand-taupe"><th className="py-2 pr-3">Meeting</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Time (ET)</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Actions</th></tr></thead><tbody>
                  {visibleMeetings.map((item) => <tr key={item.id} className={`border-b border-brand-sand/25 ${item.is_active ? "" : "bg-slate-50/70"}`}>
                    <td className="py-3 pr-3"><span className={`font-semibold ${item.is_active ? "text-brand-navy" : "text-slate-500"}`}>{item.name}</span>{item.notes && <p className="mt-1 text-xs text-brand-taupe">{item.notes}</p>}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{displayDate(item.meeting_date)}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{displayMeetingTime(item.start_time)}{item.end_time ? ` – ${displayMeetingTime(item.end_time)}` : ""} {meetingZone(item.meeting_date)}</td>
                    <td className="py-3 pr-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${item.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{item.is_active ? <CheckCircle2 size={14} aria-hidden="true" /> : <CircleMinus size={14} aria-hidden="true" />}{item.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="py-3 text-right whitespace-nowrap">{canManage && <div className="flex justify-end gap-2"><button type="button" disabled={meetingBusy || Boolean(meetingForm)} onClick={() => startMeetingForm(item)} className="rounded-lg border border-brand-sand/60 px-3 py-1.5 font-bold text-brand-sky disabled:opacity-50">Edit</button><button type="button" disabled={meetingBusy || Boolean(meetingForm)} onClick={() => { setMeetingFormError(""); setMeetingNotice(""); setConfirmMeeting({ action: item.is_active ? "deactivate" : "restore", item }); }} className="rounded-lg border border-brand-sand/60 px-3 py-1.5 font-bold text-brand-navy disabled:opacity-50">{item.is_active ? "Deactivate" : "Restore"}</button></div>}</td>
                  </tr>)}
                </tbody></table></div>)}
              {!meetingForm && meetingFormError && <p role="alert" className="mt-3 text-sm text-red-700">{meetingFormError}</p>}
            </div>}
          </section>
        </>
      )}
    </div>
  );
}
