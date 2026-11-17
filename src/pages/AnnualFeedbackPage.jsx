import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  loadMyHouseholdAnnualFeedback,
  submitMyHouseholdAnnualFeedback,
} from "../data/annualFeedback";

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function unavailableMessage(data) {
  if (!data.household_membership_year_id) {
    return "Begin membership enrollment before submitting feedback.";
  }
  if (!data.enrollment_open) {
    return "Feedback can be submitted while membership enrollment is open.";
  }
  if (data.questions.length === 0) {
    return "Feedback questions for this school year aren't available yet.";
  }
  return "Feedback can't be submitted for this membership right now.";
}

const inputClass =
  "mt-2 w-full rounded-lg border border-brand-sand/60 px-3 py-2 text-brand-navy";

export default function AnnualFeedbackPage() {
  const { portalContext } = useAuth();
  const householdId = portalContext?.households?.[0]?.id;
  const [searchParams] = useSearchParams();
  const schoolYearId = searchParams.get("schoolYearId");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [answers, setAnswers] = useState({});
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!householdId)
          throw new Error("No household was found for your account.");
        if (!schoolYearId) throw new Error("No school year was selected.");

        const result = await loadMyHouseholdAnnualFeedback({
          householdId,
          schoolYearId,
        });
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [householdId, schoolYearId, reloadKey]);

  if (loading && !data) {
    return <p className="text-brand-taupe">Loading feedback…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  const questions = data?.questions ?? [];
  const canSubmit = data?.can_submit === true && data?.required === true;
  const missingRequired = questions.filter(
    (q) => q.is_required && !(answers[q.question_key] ?? "").trim(),
  );
  const readyToSubmit =
    canSubmit && missingRequired.length === 0 && !submitting;

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!readyToSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitMyHouseholdAnnualFeedback({
        householdId,
        schoolYearId,
        answers,
        anonymous,
      });
      setAnswers({});
      setAnonymous(false);
      setJustSubmitted(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/membership-enrollment"
          className="text-sm font-semibold text-brand-navy underline"
        >
          ← Back to Membership Enrollment
        </Link>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-brand-junior">
          Annual Membership
        </p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">
          Annual Feedback
        </h1>
        <p className="mt-2 text-sm text-brand-taupe">
          Your feedback about the past year helps us plan classes, events and
          programs.
        </p>
      </div>

      {justSubmitted && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <p className="font-semibold text-emerald-700">
            Thank you for your feedback!
          </p>
        </div>
      )}

      {data.completed ? (
        <section className="space-y-4 rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-emerald-700">
            Submitted {formatDateTime(data.submitted_at)}
            {data.is_anonymous && " · Recorded anonymously"}
          </p>

          {data.is_anonymous ? (
            <p className="text-sm text-brand-taupe">
              Because your feedback was submitted anonymously, it isn't linked
              to your family and can't be shown here.
            </p>
          ) : (
            <dl className="space-y-4">
              {(data.answers ?? []).map((a) => (
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
          )}
        </section>
      ) : !data.required ? (
        <div className="rounded-xl border border-brand-sand/45 bg-white p-4">
          <p className="text-sm text-brand-navy">
            Annual feedback is for returning families. There's nothing you need
            to do here this year.
          </p>
        </div>
      ) : !canSubmit ? (
        <div className="rounded-xl border border-brand-sand/45 bg-white p-4">
          <p className="text-sm text-brand-navy">{unavailableMessage(data)}</p>
        </div>
      ) : (
        <>
          {questions.map((q, index) => {
            const id = `feedback-${q.question_key}`;
            const value = answers[q.question_key] ?? "";

            return (
              <section
                key={q.question_key}
                className="rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm"
              >
                {q.question_type === "single_choice" ? (
                  <fieldset>
                    <legend className="font-bold text-brand-navy">
                      {index + 1}. {q.prompt}
                      {q.is_required && (
                        <span className="ml-1 text-brand-junior">*</span>
                      )}
                    </legend>
                    {q.help_text && (
                      <p className="mt-1 text-sm text-brand-taupe">
                        {q.help_text}
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      {q.options.map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 text-sm text-brand-navy"
                        >
                          <input
                            type="radio"
                            name={id}
                            value={option}
                            checked={value === option}
                            onChange={() => setAnswer(q.question_key, option)}
                            className="h-4 w-4 accent-brand-navy"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <>
                    <label htmlFor={id} className="font-bold text-brand-navy">
                      {index + 1}. {q.prompt}
                      {q.is_required && (
                        <span className="ml-1 text-brand-junior">*</span>
                      )}
                    </label>
                    {q.help_text && (
                      <p className="mt-1 text-sm text-brand-taupe">
                        {q.help_text}
                      </p>
                    )}
                    {q.question_type === "long_text" ? (
                      <textarea
                        id={id}
                        rows={4}
                        maxLength={5000}
                        value={value}
                        onChange={(e) =>
                          setAnswer(q.question_key, e.target.value)
                        }
                        className={inputClass}
                      />
                    ) : (
                      <input
                        id={id}
                        type="text"
                        maxLength={500}
                        value={value}
                        onChange={(e) =>
                          setAnswer(q.question_key, e.target.value)
                        }
                        className={inputClass}
                      />
                    )}
                  </>
                )}
              </section>
            );
          })}

          <section className="space-y-4 rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-sand/40 p-4">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-navy"
              />
              <span className="text-sm text-brand-navy">
                <strong>Submit anonymously.</strong> Your answers won't be
                linked to your family in the portal. We'll only record that your
                household completed this step. If you leave this unchecked,
                admins will see your family's name with your feedback.
              </span>
            </label>

            <p className="text-sm text-brand-taupe">
              {missingRequired.length > 0
                ? `${missingRequired.length} required question${
                    missingRequired.length === 1 ? "" : "s"
                  } still need an answer.`
                : "Ready to submit. Feedback can't be changed after it's submitted."}
            </p>

            {submitError && (
              <p role="alert" className="text-sm text-red-700">
                {submitError}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!readyToSubmit}
              className="btn-primary"
            >
              {submitting ? "Submitting…" : "Submit Feedback"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
