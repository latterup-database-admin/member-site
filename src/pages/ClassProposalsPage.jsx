import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Plus, RefreshCw, Pencil } from "lucide-react";
import MeetingListField from "../components/contributions/MeetingListField";
import { loadMyClassProposals, submitClassProposal, resubmitClassProposal } from "../data/classProposals";
import { useAuth } from "../contexts/AuthContext";

const YOUTH = [["fall", "Fall"], ["spring", "Spring"], ["year_long", "Year Long"]];
const JUNIOR = [["fall_session_1", "Fall Session 1"], ["fall_session_2", "Fall Session 2"], ["spring_session_1", "Spring Session 1"], ["spring_session_2", "Spring Session 2"]];
const initialForm = () => ({ title: "", program: "youth", offeringPeriods: [], meetings: [{ dayOfWeek: 1, startTime: "", durationMinutes: 60 }], description: "", syllabusUrl: "", introVideoUrl: "", prerequisites: "", maxEnrollment: "", proposedFee: "" });
const fieldClass = "mt-1.5 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20";
const labelClass = "block text-sm font-bold text-brand-navy";
const statusLabel = (status) => ({ revision_requested: "Revision requested", under_review: "Under review" }[status] || status?.replaceAll("_", " ") || "Unknown");

export default function ClassProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const { portalContext } = useAuth();
  const teacher = portalContext?.person;
  const teacherName = teacher ? ([teacher.preferred_name || teacher.first_name, teacher.last_name].filter(Boolean).join(" ") || "Signed-in member") : "Loading member…";
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try { setProposals(await loadMyClassProposals()); }
    catch (error) { setLoadError(error.message || "Could not load your proposals."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    refresh();
  }, []);
  function set(name, value) { setForm((previous) => ({ ...previous, [name]: value })); }
  function togglePeriod(period) {
    setForm((previous) => ({ ...previous, offeringPeriods: previous.offeringPeriods.includes(period) ? previous.offeringPeriods.filter((p) => p !== period) : [...previous.offeringPeriods, period] }));
  }
  function startNew() {
    setEditingId(null); setForm(initialForm()); setSubmitError(""); setOpen(true);
  }
  function startRevision(proposal) {
    const responses = proposal.responses || {};
    setEditingId(proposal.id);
    setForm({
      title: proposal.proposed_title || "",
      program: proposal.program || "youth",
      offeringPeriods: Array.isArray(responses.offering_periods) ? responses.offering_periods : [],
      meetings: Array.isArray(responses.meetings) && responses.meetings.length
        ? responses.meetings.map((m) => ({ dayOfWeek: m.day_of_week, startTime: m.start_time || "", durationMinutes: m.duration_minutes || 60 }))
        : [{ dayOfWeek: 1, startTime: "", durationMinutes: 60 }],
      description: proposal.description || "",
      syllabusUrl: proposal.syllabus_url || "",
      introVideoUrl: proposal.intro_video_url || "",
      prerequisites: proposal.prerequisites || "",
      maxEnrollment: proposal.max_enrollment ?? "",
      proposedFee: proposal.proposed_fee ?? "",
    });
    setSubmitError(""); setNotice(""); setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event) {
    event.preventDefault();
    setSubmitError(""); setNotice("");
    if (!teacher?.id) { setSubmitError("Your member profile is not available. Please refresh the page."); return; }
    if (!form.offeringPeriods.length) { setSubmitError("Select at least one term or session."); return; }
    if (form.meetings.length === 0 || form.meetings.some((m) => !m.startTime)) { setSubmitError("Add at least one complete meeting time."); return; }
    setSaving(true);
    try {
      const payload = { ...form, teacherPersonId: teacher.id, maxEnrollment: form.maxEnrollment === "" ? null : Number(form.maxEnrollment), proposedFee: form.proposedFee === "" ? null : Number(form.proposedFee) };
      if (editingId) await resubmitClassProposal({ ...payload, proposalId: editingId });
      else await submitClassProposal(payload);
      setForm(initialForm()); setOpen(false); setEditingId(null);
      setNotice(editingId ? "Your revised class proposal was resubmitted for review." : "Your class proposal was submitted for review.");
      await refresh();
    } catch (error) { setSubmitError(error.message || "Could not submit the proposal."); }
    finally { setSaving(false); }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-3"><ClipboardList className="text-brand-sky" /><h1 className="brand-title text-3xl text-brand-navy">Class Proposals</h1></div><p className="mt-2 max-w-2xl text-sm text-brand-taupe">Propose a specific Junior or Youth class and track its review status. This is separate from the class catalog and registration.</p></div>
        <button type="button" onClick={() => { if (open) { setOpen(false); setEditingId(null); } else startNew(); }} className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />{open ? "Close form" : "Propose a class"}</button>
      </header>
      {notice && <p role="status" className="rounded-xl border border-brand-sky/30 bg-white p-3 text-sm text-brand-navy">{notice}</p>}
      {open && <section className="rounded-3xl border border-brand-sand/40 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-extrabold text-brand-navy">{editingId ? "Edit & Resubmit class proposal" : "New class proposal"}</h2>
        <p className="mt-1 mb-5 text-sm text-brand-taupe">Class proposals are reviewed separately from teaching contribution applications. Submitting a class proposal does not request or approve a teaching contribution.</p>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Class title *<input className={fieldClass} required maxLength={250} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g., American Literature" /></label>
            <label className={labelClass}>Program *<select className={fieldClass} value={form.program} onChange={(e) => setForm((v) => ({ ...v, program: e.target.value, offeringPeriods: [] }))}><option value="youth">Youth</option><option value="junior">Junior</option></select></label>
          </div>
          <fieldset><legend className={labelClass}>Term or session *</legend><p className="mb-2 text-xs text-brand-taupe">Youth: select one term. Junior: select one or more sessions.</p><div className="flex flex-wrap gap-4">{(form.program === "youth" ? YOUTH : JUNIOR).map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-brand-navy"><input type={form.program === "youth" ? "radio" : "checkbox"} name="offeringPeriods" checked={form.offeringPeriods.includes(value)} onChange={() => form.program === "youth" ? set("offeringPeriods", [value]) : togglePeriod(value)} />{label}</label>)}</div></fieldset>
          <div><label className={labelClass} htmlFor="proposal-teacher">Teacher</label><input id="proposal-teacher" className={`${fieldClass} bg-brand-sand/10`} value={teacherName} readOnly aria-readonly="true" /><p className="mt-1 text-xs text-brand-taupe">You are automatically assigned as the primary teacher. Only an admin can add co-teachers.</p></div>
          <MeetingListField meetings={form.meetings} onChange={(value) => set("meetings", value)} disabled={saving} />
          <label className={labelClass}>Description<textarea className={fieldClass} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label className={labelClass}>Prerequisites<textarea className={fieldClass} rows={2} value={form.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Syllabus URL<input className={fieldClass} type="url" value={form.syllabusUrl} onChange={(e) => set("syllabusUrl", e.target.value)} /></label><label className={labelClass}>Intro video URL<input className={fieldClass} type="url" value={form.introVideoUrl} onChange={(e) => set("introVideoUrl", e.target.value)} /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Maximum enrollment<input className={fieldClass} type="number" min="1" step="1" value={form.maxEnrollment} onChange={(e) => set("maxEnrollment", e.target.value)} /></label><label className={labelClass}>Proposed class fee ($)<input className={fieldClass} type="number" min="0" step="0.01" value={form.proposedFee} onChange={(e) => set("proposedFee", e.target.value)} /></label></div>
          {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
          <button type="submit" disabled={saving || !teacher?.id} className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Saving…" : editingId ? "Resubmit class proposal" : "Submit class proposal"}</button>
        </form>
      </section>}
      <section className="rounded-3xl border border-brand-sand/40 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold text-brand-navy">My Class Proposals</h2><p className="mt-1 text-sm text-brand-taupe">Previously submitted proposals and review notes.</p></div><button type="button" onClick={refresh} disabled={loading} className="rounded-lg p-2 text-brand-navy" aria-label="Refresh proposals"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button></div>
        {loadError && <p role="alert" className="mt-4 text-sm text-red-700">{loadError}</p>}
        {loading ? <p className="mt-4 text-sm text-brand-taupe">Loading proposals…</p> : proposals.length === 0 ? <p className="mt-4 text-sm text-brand-taupe">No class proposals found.</p> : <div className="mt-4 space-y-3">{proposals.map((proposal) => <article key={proposal.id} className="rounded-xl border border-brand-sand/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-brand-navy">{proposal.proposed_title}</h3><span className="rounded-full bg-brand-sand/20 px-3 py-1 text-xs font-bold capitalize text-brand-navy">{statusLabel(proposal.status)}</span></div><p className="mt-1 text-xs text-brand-taupe">{proposal.program === "junior" ? "Junior" : "Youth"} · {proposal.submitted_at ? new Date(proposal.submitted_at).toLocaleDateString() : "Draft"}</p>{proposal.description && <p className="mt-2 whitespace-pre-wrap text-sm text-brand-taupe">{proposal.description}</p>}{proposal.status === "approved" && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Your class proposal has been approved and published in the course catalog. It also appears in My Classes. Registration opens separately according to the registration schedule.</p>}{proposal.review_notes && <p className="mt-3 rounded-lg bg-brand-sand/10 p-3 text-sm text-brand-navy"><strong>Admin review notes:</strong> {proposal.review_notes}</p>}{proposal.status === "revision_requested" && <button type="button" onClick={() => startRevision(proposal)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand-navy px-3 py-2 text-sm font-bold text-brand-navy"><Pencil size={15} />Edit &amp; Resubmit</button>}</article>)}</div>}
      </section>
    </div>
  );
}
