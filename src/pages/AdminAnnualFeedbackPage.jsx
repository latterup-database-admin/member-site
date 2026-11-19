import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadAdminSchoolYearOptions } from "../data/adminMembershipEnrollment";
import { loadAdminAnnualFeedback } from "../data/adminAnnualFeedback";
import FeedbackSummaryContent from "../components/admin/FeedbackSummaryContent";
import { ChevronDown } from "lucide-react";

const SOURCE_LABELS = {
  portal: "Portal",
  google_form: "Google Form",
};

function familyLabel(response) {
  if (response.anonymous) return "Anonymous";
  return [
    response.family_name,
    response.legacy_family_id && `(${response.legacy_family_id})`,
  ]
    .filter(Boolean)
    .join(" ");
}

function answerFor(response, key) {
  return (
    (response.answers ?? []).find((a) => a.question_key === key)?.answer ?? ""
  );
}

export default function AdminAnnualFeedbackPage() {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [data, setData] = useState(null);
  const [view, setView] = useState("question");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAdminSchoolYearOptions()
      .then((list) => {
        if (cancelled) return;
        setYears(list);
        const current = list.find((y) => y.is_current) ?? list[0];
        if (current) setYearId(current.id);
        else setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!yearId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAdminAnnualFeedback(yearId)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [yearId]);

  const responses = useMemo(() => data?.responses ?? [], [data]);

  // Current questions, plus any question found only in past answers
  // (for example, one deleted after families answered it).
  const questions = useMemo(() => {
    const list = [...(data?.questions ?? [])];
    const known = new Set(list.map((q) => q.question_key));
    for (const r of responses) {
      for (const a of r.answers ?? []) {
        if (!known.has(a.question_key)) {
          known.add(a.question_key);
          list.push({
            question_key: a.question_key,
            prompt: a.prompt,
            question_type: a.question_type,
            options: [],
          });
        }
      }
    }
    return list;
  }, [data, responses]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/membership-enrollment" className="text-sm font-semibold text-brand-navy underline">
          ← Back to Membership Enrollment Status
        </Link>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-brand-junior">
          Members &amp; Families
        </p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">
          Annual Feedback
        </h1>
      </div>

      <label className="block text-sm font-semibold text-brand-navy">
        School year
        <select
          value={yearId}
          onChange={(e) => setYearId(e.target.value)}
          className="mt-1 block rounded-lg border border-brand-sand/60 bg-white px-3 py-2 text-brand-navy"
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
              {y.is_current ? " (current)" : ""}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">{error}</p>
        </div>
      )}

      {loading && !error && (
        <p className="text-brand-taupe">Loading feedback…</p>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Households completed", summary?.completions ?? 0],
              ["Responses with answers", responses.length],
              [
                "Completed without linked answers",
                (summary?.completions ?? 0) - responses.length,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-brand-sand/45 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-brand-taupe">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-brand-navy">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {data.ai_summary && (
            <section className="rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-brand-navy">
                    Feedback Summary
                  </h2>
                  <p className="mt-1 text-xs text-brand-taupe">
                    AI-generated summary of {data.ai_summary.response_count}{" "}
                    responses ·{" "}
                    {new Date(data.ai_summary.generated_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                  {responses.length > data.ai_summary.response_count && (
                    <p className="mt-1 text-xs font-semibold text-brand-navy">
                      {responses.length - data.ai_summary.response_count} new
                      response
                      {responses.length - data.ai_summary.response_count === 1
                        ? ""
                        : "s"}{" "}
                      since this summary.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSummaryOpen((open) => !open)}
                    aria-expanded={summaryOpen}
                    className="btn-secondary"
                  >
                    {summaryOpen ? "Hide summary" : "Show summary"}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${summaryOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <Link
                    to={`/admin/annual-feedback/summary?schoolYearId=${encodeURIComponent(yearId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Print / Save as PDF
                  </Link>
                </div>
              </div>
              {summaryOpen && (
                <div className="mt-4 border-t border-brand-sand/30 pt-4">
                  <FeedbackSummaryContent
                    markdown={data.ai_summary.summary_markdown}
                  />
                </div>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("question")}
              className={view === "question" ? "btn-primary" : "btn-secondary"}
            >
              By question
            </button>
            <button
              type="button"
              onClick={() => setView("family")}
              className={view === "family" ? "btn-primary" : "btn-secondary"}
            >
              By family
            </button>
          </div>

          {responses.length === 0 ? (
            <p className="text-sm text-brand-taupe">
              No feedback answers for this school year.
            </p>
          ) : view === "question" ? (
            <div className="space-y-3">
              {questions.map((q, index) => {
                const answered = responses
                  .map((r) => ({ r, answer: answerFor(r, q.question_key) }))
                  .filter((x) => x.answer.trim() !== "");

                return (
                  <details
                    key={q.question_key}
                    open={index === 0}
                    className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm"
                  >
                    <summary className="cursor-pointer font-bold text-brand-navy">
                      {index + 1}. {q.prompt}
                      <span className="ml-2 text-sm font-semibold text-brand-taupe">
                        ({answered.length} answer
                        {answered.length === 1 ? "" : "s"})
                      </span>
                    </summary>

                    {q.question_type === "single_choice" ? (
                      <div className="mt-4 space-y-2">
                        {[
                          ...new Set([
                            ...(q.options ?? []),
                            ...answered.map((x) => x.answer),
                          ]),
                        ].map((option) => {
                          const count = answered.filter(
                            (x) => x.answer === option,
                          ).length;
                          const pct = answered.length
                            ? Math.round((count / answered.length) * 100)
                            : 0;
                          return (
                            <div
                              key={option}
                              className="text-sm text-brand-navy"
                            >
                              <div className="flex justify-between">
                                <span>{option}</span>
                                <span className="font-semibold">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-brand-sand/25">
                                <div
                                  className="h-2 rounded-full bg-brand-navy"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <ul className="mt-4 divide-y divide-brand-sand/25">
                        {answered.map(({ r, answer }) => (
                          <li key={r.response_id} className="py-3">
                            <p className="text-xs font-bold text-brand-taupe">
                              {familyLabel(r)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-brand-navy">
                              {answer}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((r) => (
                <article
                  key={r.response_id}
                  className="rounded-2xl border border-brand-sand/45 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-bold text-brand-navy">
                      {familyLabel(r)}
                    </h2>
                    <p className="text-xs text-brand-taupe">
                      {[r.respondent_name, SOURCE_LABELS[r.source] ?? r.source]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <dl className="mt-3 space-y-3">
                    {(r.answers ?? []).map((a) => (
                      <div key={a.question_key}>
                        <dt className="text-sm font-semibold text-brand-navy">
                          {a.prompt}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm text-brand-taupe">
                          {a.answer || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
