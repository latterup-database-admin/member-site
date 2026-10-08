import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronRight, GraduationCap, Loader2, Users } from "lucide-react";
import { loadMyTeacherClasses } from "../data/teacherClasses";

export default function MyClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await loadMyTeacherClasses();
        if (active) setClasses(rows);
      } catch (err) {
        if (active) setError(err?.message || "Your classes could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-taupe">
          <Loader2 size={18} className="animate-spin" /> Loading your classes…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
          <GraduationCap size={22} />
        </div>
        <div>
          <h1 className="brand-title text-3xl text-brand-navy">My Classes</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-taupe">
            View rosters, waitlists, and eligibility exception requests for the classes you teach.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-brand-junior/30 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle size={19} className="mt-0.5 text-brand-junior" />
            <p className="text-sm text-brand-navy">{error}</p>
          </div>
        </div>
      )}

      {!error && classes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brand-sand/60 bg-brand-sand/5 p-6">
          <div className="flex items-start gap-3">
            <Users size={21} className="mt-0.5 text-brand-gold" />
            <div>
              <h2 className="font-extrabold text-brand-navy">No current classes assigned</h2>
              <p className="mt-1 text-sm text-brand-taupe">
                Classes will appear here when you are assigned as an instructor for a current-year offering.
              </p>
            </div>
          </div>
        </div>
      )}

      {classes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {classes.map((classItem) => (
            <Link
              key={classItem.class_offering_id}
              to={`/my-classes/${classItem.class_offering_id}`}
              className="focus-ring group rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky/60 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-brand-taupe">
                    {[titleCase(classItem.program), formatPeriod(classItem.offering_period)].filter(Boolean).join(" · ")}
                  </div>
                  <h2 className="mt-1 text-lg font-extrabold text-brand-navy">{classItem.title}</h2>
                  <div className="mt-2 text-xs leading-relaxed text-brand-taupe">
                    {formatMeetings(classItem.meetings ?? [])}
                  </div>
                </div>
                <ChevronRight size={20} className="mt-1 shrink-0 text-brand-taupe" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-sand/25 pt-4">
                <CountPill value={classItem.enrolled_count ?? 0} label="enrolled" />
                <CountPill value={classItem.waitlist_count ?? 0} label="waiting" />
                <CountPill
                  value={classItem.pending_exception_count ?? 0}
                  label={(classItem.pending_exception_count ?? 0) === 1 ? "exception" : "exceptions"}
                  emphasis={(classItem.pending_exception_count ?? 0) > 0}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CountPill({ value, label, emphasis = false }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${emphasis ? "bg-brand-gold/15 text-brand-navy" : "bg-brand-sand/10 text-brand-taupe"}`}>
      {value} {label}
    </span>
  );
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

function formatMeetings(meetings) {
  if (!meetings.length) return "Schedule TBD";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return meetings.map((meeting) => {
    const day = days[Number(meeting.day_of_week)] ?? "";
    const [hourText = "0", minute = "00"] = String(meeting.start_time || "").split(":");
    let hour = Number(hourText);
    if (Number.isNaN(hour)) return day;
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    const zone = meeting.timezone === "America/New_York" ? "ET" : "";
    return [day, `${hour}:${minute} ${suffix}`, zone].filter(Boolean).join(" ");
  }).join(" · ");
}

function titleCase(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
