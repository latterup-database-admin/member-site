import { useEffect, useState } from "react";
import { CalendarDays, Clock3, BookOpen, Printer } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const periodNames = {
  fall_session_1: "Fall Session 1",
  fall_session_2: "Fall Session 2",
  spring_session_1: "Spring Session 1",
  spring_session_2: "Spring Session 2",
  fall: "Fall",
  spring: "Spring",
  year_long: "Year Long",
};

function dateLabel(value) {
  if (!value) return "Date not set";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function dateRange(start, end) {
  return start === end ? dateLabel(start) : `${dateLabel(start)} – ${dateLabel(end)}`;
}

function shortDate(value) {
  if (!value) return "TBD";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function shortDateRange(start, end) {
  return start === end ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}`;
}

function meetingTime(value) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function meetingTimeRange(meeting) {
  const start = meetingTime(meeting.start_time);
  const end = meetingTime(meeting.end_time);
  return `${start}${end ? ` – ${end}` : ""} ET`;
}

function programName(value) {
  if (value === "junior") return "Junior";
  if (value === "youth") return "Youth";
  return value ? value : "All programs";
}

const seasons = [
  { key: "fall", title: "Fall", periods: ["fall", "fall_session_1", "fall_session_2"] },
  { key: "spring", title: "Spring", periods: ["spring", "spring_session_1", "spring_session_2"] },
];

function closureSeason(closure, schoolYear) {
  // The fall/spring boundary is January 1 in the second calendar year.
  // A closure spanning that boundary is grouped by its start date.
  const boundaryYear = Number(schoolYear.starts_on.slice(0, 4)) + 1;
  return closure.starts_on < `${boundaryYear}-01-01` ? "fall" : "spring";
}

export default function ImportantDatesPage() {
  const { isDevPreview } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!isDevPreview);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDevPreview) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    supabase.rpc("get_member_important_dates")
      .then(({ data: result, error: rpcError }) => {
        if (rpcError) throw rpcError;
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) {
          console.error("Important dates failed to load:", err);
          setError(err.message);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isDevPreview]);

  const sessions = data?.program_sessions ?? [];
  const closures = data?.closures ?? [];
  const meetings = data?.key_meetings ?? [];
  const schoolYear = data?.school_year;

  return (
    <div id="important-dates-print-root" className="space-y-6">
      <style>{`
        .important-dates-paper { display: none; }
        @media print {
          @page { size: letter portrait; margin: 0.55in; }
          body * { visibility: hidden !important; }
          #important-dates-print-root .important-dates-screen { display: none !important; }
          #important-dates-print-root { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          #important-dates-print-root .important-dates-paper,
          #important-dates-print-root .important-dates-paper * { visibility: visible !important; }
          #important-dates-print-root .important-dates-paper { display: block !important; color: #172044 !important; font-family: Arial, sans-serif !important; font-size: 10pt !important; line-height: 1.3 !important; }
          #important-dates-print-root .paper-title { font-size: 19pt !important; font-weight: 800 !important; margin: 0 0 4pt !important; color: #101e55 !important; }
          #important-dates-print-root .paper-subtitle { margin: 0 0 16pt !important; font-size: 10pt !important; }
          #important-dates-print-root .paper-section { margin-top: 15pt !important; break-inside: avoid; }
          #important-dates-print-root .paper-section h2 { font-size: 13pt !important; font-weight: 800 !important; margin: 0 0 7pt !important; color: #101e55 !important; }
          #important-dates-print-root .paper-grid { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; gap: 24pt !important; }
          #important-dates-print-root .paper-col { min-width: 0 !important; }
          #important-dates-print-root .paper-col h3 { font-size: 10pt !important; font-weight: 700 !important; padding: 0 0 5pt !important; margin: 0 !important; border-bottom: 1px solid #a8adbc !important; }
          #important-dates-print-root .paper-row { display: flex !important; justify-content: space-between !important; gap: 10pt !important; padding: 6pt 0 !important; border-bottom: 1px solid #d9dce3 !important; break-inside: avoid; }
          #important-dates-print-root .paper-row span:first-child { font-weight: 600 !important; }
          #important-dates-print-root .paper-row span:last-child { text-align: right !important; }
          #important-dates-print-root .paper-notes { font-size: 8pt !important; margin: 2pt 0 4pt !important; color: #40485b !important; }
          #important-dates-print-root .paper-empty { font-style: italic !important; padding: 8pt 0 !important; }
          #important-dates-print-root .paper-footer { font-size: 8pt !important; margin-top: 20pt !important; color: #555e70 !important; }
        }
      `}</style>
      <div className="important-dates-paper" aria-hidden="true">
        {schoolYear && (
          <>
            <h1 className="paper-title">Important Dates</h1>
            <p className="paper-subtitle"><strong>{schoolYear.name}</strong> · {dateRange(schoolYear.starts_on, schoolYear.ends_on)}</p>
            <section className="paper-section">
              <h2>Junior Session Information</h2>
              <div className="paper-grid">
                {seasons.map((season) => (
                  <div className="paper-col" key={season.key}>
                    <h3>{season.title} {season.key === "fall" ? schoolYear.starts_on.slice(0, 4) : schoolYear.ends_on.slice(0, 4)}</h3>
                    {sessions.filter((session) => session.program === "junior" && season.periods.includes(session.period)).map((session) => (
                      <div className="paper-row" key={session.id}>
                        <span>{periodNames[session.period] || session.label || session.period}</span>
                        <span>{shortDateRange(session.starts_on, session.ends_on)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
            <section className="paper-section">
              <h2>Semester Dates</h2>
              <div className="paper-grid">
                {seasons.map((season) => (
                  <div className="paper-col" key={season.key}>
                    <h3>{season.title} {season.key === "fall" ? schoolYear.starts_on.slice(0, 4) : schoolYear.ends_on.slice(0, 4)}</h3>
                    {[
                      ...sessions.filter((session) => session.program === "youth" && session.period === season.key).map((session) => ({
                        id: `session-${session.id}`, name: season.key === "fall" ? "Youth Classes" : "Youth Classes", starts_on: session.starts_on, ends_on: session.ends_on, isSession: true,
                      })),
                      ...closures.filter((closure) => closureSeason(closure, schoolYear) === season.key).map((closure) => ({ ...closure, isSession: false })),
                    ].sort((a, b) => a.starts_on.localeCompare(b.starts_on)).map((entry) => (
                      <div key={entry.id}>
                        <div className="paper-row">
                          <span>{entry.name}</span>
                          <span>{shortDateRange(entry.starts_on, entry.ends_on)}</span>
                        </div>
                        {!entry.isSession && entry.notes && <p className="paper-notes">{entry.notes}</p>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
            {meetings.length > 0 && (
              <section className="paper-section">
                <h2>Key Meetings</h2>
                {meetings.map((meeting) => (
                  <div key={meeting.id}>
                    <div className="paper-row">
                      <span>{meeting.name}</span>
                      <span>{shortDate(meeting.meeting_date)} · {meetingTimeRange(meeting)}</span>
                    </div>
                    {meeting.notes && <p className="paper-notes">{meeting.notes}</p>}
                  </div>
                ))}
              </section>
            )}
            <p className="paper-footer">Dates are subject to change. Please check the Latter UP Members Portal for the latest information.</p>
          </>
        )}
      </div>
      <div className="important-dates-screen space-y-6">
      <section className="print-header relative overflow-hidden rounded-2xl bg-brand-navy p-6 text-white shadow-sm sm:p-8">
        <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-brand-sky/15" />
        <div className="relative">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-gold">
            {schoolYear?.name || "Current School Year"}
          </p>
          <h1 className="brand-title mt-2 text-4xl leading-none sm:text-5xl">Important Dates</h1>
          <p className="mt-3 max-w-2xl text-base font-medium text-white/75">
            School year dates, program sessions, breaks, holidays, and key meetings.
          </p>
          {schoolYear && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-bold">
              <CalendarDays size={18} className="text-brand-gold" />
              {dateRange(schoolYear.starts_on, schoolYear.ends_on)}
            </p>
          )}
        </div>
      </section>

      <div className="print-hide flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          disabled={loading || Boolean(error) || !schoolYear || isDevPreview}
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer size={17} />
          Print Important Dates
        </button>
      </div>

      {isDevPreview && (
        <div className="rounded-xl border border-brand-gold/45 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          Local preview mode is on. Sign in to view live important dates.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-brand-junior/40 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          Important dates could not load: {error}
        </div>
      )}
      {loading && (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-brand-sand/40 bg-white">
          <p className="font-extrabold text-brand-navy">Loading important dates…</p>
        </div>
      )}
      {!loading && !error && !isDevPreview && !schoolYear && (
        <div className="rounded-2xl border border-brand-sand/40 bg-white p-6 text-brand-taupe">
          No current school year is available.
        </div>
      )}

      {!loading && !error && schoolYear && (
        <>
          <section className="space-y-3">
            <h2 className="brand-title text-2xl text-brand-navy">Junior Session Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {seasons.map((season) => (
                <div key={season.key} className="overflow-hidden rounded-xl border border-brand-sand/45 bg-white shadow-sm">
                  <h3 className="border-b border-brand-sand/40 bg-brand-sky/10 px-4 py-3 font-extrabold text-brand-navy">
                    {season.title} {season.key === "fall" ? schoolYear.starts_on.slice(0, 4) : schoolYear.ends_on.slice(0, 4)}
                  </h3>
                  <div className="divide-y divide-brand-sand/30 px-4">
                    {sessions.filter((session) => session.program === "junior" && season.periods.includes(session.period)).map((session) => (
                      <div key={session.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm">
                        <span className="font-extrabold text-brand-navy">{periodNames[session.period] || session.label || session.period}</span>
                        <span className="text-brand-taupe">{dateRange(session.starts_on, session.ends_on)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="brand-title text-2xl text-brand-navy">Semester Dates</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {seasons.map((season) => {
                const entries = [
                  ...sessions.filter((session) => session.program === "youth" && session.period === season.key).map((session) => ({
                    id: `session-${session.id}`,
                    name: "Youth Classes",
                    starts_on: session.starts_on,
                    ends_on: session.ends_on,
                    isSession: true,
                  })),
                  ...closures.filter((closure) => closureSeason(closure, schoolYear) === season.key).map((closure) => ({ ...closure, isSession: false })),
                ].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
                return (
                  <div key={season.key} className="overflow-hidden rounded-xl border border-brand-sand/45 bg-white shadow-sm">
                    <h3 className="border-b border-brand-sand/40 bg-brand-sky/10 px-4 py-3 font-extrabold text-brand-navy">
                      {season.title} {season.key === "fall" ? schoolYear.starts_on.slice(0, 4) : schoolYear.ends_on.slice(0, 4)}
                    </h3>
                    <div className="divide-y divide-brand-sand/30 px-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className="py-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                            <span className="font-extrabold text-brand-navy">{entry.name}</span>
                            <span className="text-brand-taupe">{dateRange(entry.starts_on, entry.ends_on)}</span>
                          </div>
                          {!entry.isSession && entry.notes && (
                            <p className="mt-1 text-xs text-brand-taupe">{entry.notes}</p>
                          )}
                        </div>
                      ))}
                      {entries.length === 0 && <p className="py-3 text-sm text-brand-taupe">No dates listed.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          {meetings.length > 0 && (
            <section className="space-y-3">
              <h2 className="brand-title text-2xl text-brand-navy">Key Meetings</h2>
              <div className="overflow-hidden rounded-xl border border-brand-sand/45 bg-white px-4 shadow-sm">
                <div className="divide-y divide-brand-sand/30">
                  {meetings.map((meeting) => (
                    <div key={meeting.id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                        <span className="font-extrabold text-brand-navy">{meeting.name}</span>
                        <span className="text-brand-taupe">{dateLabel(meeting.meeting_date)} · {meetingTimeRange(meeting)}</span>
                      </div>
                      {meeting.notes && <p className="mt-1 text-xs text-brand-taupe">{meeting.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
      </div>
    </div>
  );
}
