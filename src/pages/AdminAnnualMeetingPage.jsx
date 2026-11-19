import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  loadAnnualMeetingOptions,
  importAnnualMeetingAttendance,
} from "../data/adminMembershipEnrollment";

// "1 hr 1 min", "58 min", "1 hr", "45 sec" → minutes
function parseDurationMinutes(text) {
  const t = String(text ?? "").toLowerCase();
  const hours = Number(t.match(/(\d+)\s*(?:hr|hour)/)?.[1] ?? 0);
  const minutes = Number(t.match(/(\d+)\s*min/)?.[1] ?? 0);
  const seconds = Number(t.match(/(\d+)\s*s(?:ec)?\b/)?.[1] ?? 0);
  return hours * 60 + minutes + seconds / 60;
}

function findColumn(fields, name) {
  return fields.find((f) => f.trim().toLowerCase() === name);
}

const OUTCOMES = [
  ["matched", "Credited or already recorded"],
  ["not_a_guardian", "Not a guardian (students and others)"],
  ["no_account", "No matching portal account"],
  ["too_short", "Below the minimum time"],
];

export default function AdminAnnualMeetingPage() {
  const [options, setOptions] = useState(null);
  const [meetingId, setMeetingId] = useState("");
  const [yearId, setYearId] = useState("");
  const [minMinutes, setMinMinutes] = useState(45);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadAnnualMeetingOptions()
      .then(setOptions)
      .catch((err) => setError(err.message));
  }, []);

  // Default the enrollment year to the year after the meeting's school year.
  useEffect(() => {
    if (!options || !meetingId) return;
    const meeting = options.meetings.find((m) => m.id === meetingId);
    const ascending = [...options.school_years].sort((a, b) =>
      a.starts_on.localeCompare(b.starts_on),
    );
    const index = ascending.findIndex((y) => y.id === meeting?.school_year_id);
    setYearId(ascending[index + 1]?.id ?? ascending[index]?.id ?? "");
  }, [options, meetingId]);

  const summary = useMemo(() => {
    if (!result) return null;
    const households = result.results.flatMap((r) => r.households);
    return {
      credited: households.filter((h) => h.result === "credited").length,
      already: households.filter((h) => h.result === "already_recorded").length,
    };
  }, [result]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    setRows([]);
    setResult(null);
    setParseError("");
    setFileName(file?.name ?? "");
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const fields = meta.fields ?? [];
        const email = findColumn(fields, "email");
        const duration = findColumn(fields, "duration");
        const first = findColumn(fields, "first name");
        const last = findColumn(fields, "last name");

        if (!email || !duration) {
          setParseError(
            "This file doesn't look like a Google Meet attendance report. It needs Email and Duration columns.",
          );
          return;
        }

        setRows(
          data
            .filter((row) => (row[email] ?? "").trim() !== "")
            .map((row) => ({
              first_name: first ? row[first] : "",
              last_name: last ? row[last] : "",
              email: row[email].trim(),
              duration_minutes: parseDurationMinutes(row[duration]),
            })),
        );
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    try {
      setResult(
        await importAnnualMeetingAttendance({
          meetingId,
          schoolYearId: yearId,
          rows,
          minMinutes: Number(minMinutes),
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  const ready = meetingId && yearId && rows.length > 0 && Number(minMinutes) >= 0 && !importing;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/membership-enrollment" className="text-sm font-semibold text-brand-navy underline">
          ← Back to Membership Enrollment Status
        </Link>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-brand-junior">
          Members &amp; Families
        </p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">Annual Meeting Attendance</h1>
        <p className="mt-2 text-sm text-brand-taupe">
          Upload a Google Meet attendance report to credit households. In the report's Google
          Sheet, choose File → Download → Comma-separated values (.csv).
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      )}

      {options && (
        <section className="space-y-4 rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-brand-navy">
              Meeting
              <select
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal text-brand-navy"
              >
                <option value="">Choose a meeting…</option>
                {options.meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.meeting_date}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-brand-navy">
              Counts toward enrollment for
              <select
                value={yearId}
                onChange={(e) => setYearId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal text-brand-navy"
              >
                <option value="">Choose a school year…</option>
                {options.school_years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-brand-navy">
              Minimum minutes attended
              <input
                type="number"
                min="0"
                value={minMinutes}
                onChange={(e) => setMinMinutes(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-brand-sand/60 px-3 py-2 font-normal text-brand-navy"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-brand-navy">
            Attendance report (.csv)
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="mt-1 block text-sm font-normal text-brand-navy"
            />
          </label>

          {parseError && <p role="alert" className="text-sm text-red-700">{parseError}</p>}
          {rows.length > 0 && (
            <p className="text-sm text-brand-taupe">
              {fileName}: {rows.length} rows ready to import.
            </p>
          )}

          <button type="button" className="btn-primary" disabled={!ready} onClick={handleImport}>
            {importing ? "Importing…" : "Import Attendance"}
          </button>
        </section>
      )}

      {result && (
        <section className="space-y-4 rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
          <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {summary.credited} household{summary.credited === 1 ? "" : "s"} credited
            {summary.already > 0 && `, ${summary.already} already recorded`} from {result.attendees}{" "}
            attendees.
          </p>

          {OUTCOMES.map(([key, label]) => {
            const group = result.results.filter((r) => r.outcome === key);
            if (group.length === 0) return null;
            return (
              <div key={key}>
                <h2 className="font-bold text-brand-navy">
                  {label} ({group.length})
                </h2>
                <ul className="mt-2 divide-y divide-brand-sand/25 text-sm">
                  {group.map((r) => (
                    <li key={r.email} className="flex flex-wrap justify-between gap-2 py-2">
                      <span className="text-brand-navy">
                        {r.name || r.email}{" "}
                        <span className="text-brand-taupe">({r.email})</span>
                      </span>
                      <span className="text-brand-taupe">
                        {r.minutes} min
                        {r.households.length > 0 &&
                          ` · ${r.households
                            .map((h) =>
                              `${h.family_name} ${h.result === "credited" ? "✓ credited" : "already recorded"}`,
                            )
                            .join(", ")}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}