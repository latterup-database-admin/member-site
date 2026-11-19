import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  loadMembershipEnrollment,
  loadMembershipEnrollmentWindow,
  beginMembershipReenrollment,
} from "../data/membershipEnrollment";
import { Link } from "react-router-dom";

export default function MembershipEnrollmentPage() {
  const { portalContext, isDevPreview } = useAuth();
  const householdId = portalContext?.households?.[0]?.id;

  const [schoolYear, setSchoolYear] = useState(null);
  const [enrollmentWindow, setEnrollmentWindow] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDevPreview) {
          throw new Error(
            "Live enrollment data is unavailable in preview mode.",
          );
        }

        if (!householdId) {
          throw new Error("No household was found for your account.");
        }

        const enrollmentWindow = await loadMembershipEnrollmentWindow();

        if (!enrollmentWindow) {
          throw new Error(
            "No membership enrollment window has been configured.",
          );
        }

        const schoolYear = enrollmentWindow.school_years;

        const result = await loadMembershipEnrollment({
          householdId,
          schoolYearId: schoolYear.id,
        });

        if (!cancelled) {
          setSchoolYear(schoolYear);
          setEnrollmentWindow(enrollmentWindow);
          setEnrollment(result);
        }
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
  }, [householdId, isDevPreview]);

  async function handleBeginReenrollment() {
    if (!householdId || !schoolYear?.id || starting) return;

    setStarting(true);
    setActionError(null);

    try {
      await beginMembershipReenrollment({
        householdId,
        schoolYearId: schoolYear.id,
      });

      const result = await loadMembershipEnrollment({
        householdId,
        schoolYearId: schoolYear.id,
      });

      setEnrollment(result);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <p className="text-brand-taupe">Loading enrollment…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  const membership = enrollment?.membership;
  const progress = enrollment?.progress;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-brand-junior">
          Annual Membership
        </p>
        <h1 className="brand-title mt-2 text-3xl text-brand-navy">
          Membership Enrollment
        </h1>
        <p className="mt-2 text-brand-taupe">School year: {schoolYear?.name}</p>
      </div>

      <section className="rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-brand-navy">Your Enrollment</h2>

        <p className="mt-3 text-sm text-brand-taupe">
          Status: {membership?.status ?? "Not started"}
        </p>

        <div className="mt-3 space-y-1 text-sm text-brand-taupe">
          <p>
            Enrollment window: {enrollment?.enrollmentOpen ? "Open" : "Closed"}
          </p>

          <p>
            Opens:{" "}
            {new Date(enrollmentWindow.opens_at).toLocaleDateString("en-US", {
              timeZone: "America/New_York",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <p>
            Closes:{" "}
            {new Date(
              new Date(enrollmentWindow.closes_at).getTime() - 1000,
            ).toLocaleDateString("en-US", {
              timeZone: "America/New_York",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {!enrollment?.hasStarted && enrollment?.enrollmentOpen && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-brand-navy">
              Your family is eligible to begin reenrollment.
            </p>

            <button
              type="button"
              onClick={handleBeginReenrollment}
              disabled={starting}
              className="btn-primary"
            >
              {starting ? "Starting…" : "Begin Reenrollment"}
            </button>
          </div>
        )}

        {actionError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {progress && (
          <div className="mt-6 space-y-3">
            <h3 className="font-bold text-brand-navy">
              Enrollment Requirements
            </h3>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand/30 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  Annual Profile Review
                </p>
                <span
                  className={
                    progress.annualReviewComplete
                      ? "text-sm font-bold text-emerald-700"
                      : "text-sm font-semibold text-brand-taupe"
                  }
                >
                  {progress.annualReviewComplete ? "Complete" : "Pending"}
                </span>
                <p className="mt-1 text-xs text-brand-taupe">
                  Review and confirm your family's information for{" "}
                  {schoolYear?.name}.
                </p>
              </div>

              {enrollment?.enrollmentOpen ? (
                <Link
                  to={`/annual-profile-review?schoolYear=${encodeURIComponent(schoolYear.name)}`}
                  className="btn-primary"
                >
                  Review Family Information
                </Link>
              ) : (
                <span className="text-sm text-brand-taupe">
                  Enrollment closed
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand/30 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  Agreements &amp; Acknowledgments
                </p>
                <span
                  className={
                    progress.agreementsAccepted
                      ? "text-sm font-bold text-emerald-700"
                      : "text-sm font-semibold text-brand-taupe"
                  }
                >
                  {progress.agreementsAccepted ? "Complete" : "Pending"}
                </span>
                <p className="mt-1 text-xs text-brand-taupe">
                  Review and sign the annual member agreements for{" "}
                  {schoolYear?.name}.
                </p>
              </div>

              <Link
                to={`/annual-agreements?schoolYearId=${encodeURIComponent(schoolYear.id)}`}
                className="btn-primary"
              >
                Review Agreements
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand/30 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  Annual Feedback
                </p>
                {progress.feedbackRequired ? (
                  <span
                    className={
                      progress.feedbackComplete
                        ? "text-sm font-bold text-emerald-700"
                        : "text-sm font-semibold text-brand-taupe"
                    }
                  >
                    {progress.feedbackComplete ? "Complete" : "Pending"}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-brand-taupe">
                    Not required for new families
                  </span>
                )}
                <p className="mt-1 text-xs text-brand-taupe">
                  Share your thoughts on the past year's classes and programs.
                </p>
              </div>

              {progress.feedbackRequired && (
                <Link
                  to={`/annual-feedback?schoolYearId=${encodeURIComponent(schoolYear.id)}`}
                  className={
                    progress.feedbackComplete ? "btn-secondary" : "btn-primary"
                  }
                >
                  {progress.feedbackComplete
                    ? "View Feedback"
                    : "Give Feedback"}
                </Link>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand/30 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  Contribution
                </p>
                <span
                  className={
                    progress.contributionApproved
                      ? "text-sm font-bold text-emerald-700"
                      : "text-sm font-semibold text-brand-taupe"
                  }
                >
                  {progress.contributionApproved
                    ? "Approved"
                    : progress.contributionDeclared
                      ? "Submitted, awaiting approval"
                      : "Pending"}
                </span>
                <p className="mt-1 text-xs text-brand-taupe">
                  Choose how your family will contribute for {schoolYear?.name}.
                </p>
              </div>

              <Link
                to="/contributions"
                className={
                  progress.contributionApproved
                    ? "btn-secondary"
                    : "btn-primary"
                }
              >
                {progress.contributionApproved
                  ? "View Contributions"
                  : "Choose a Contribution"}
              </Link>
            </div>

            {[
              ["Annual Meeting", progress.materialsAcknowledged],
              ["Membership dues", progress.duesSatisfied],
              // ["Contribution declared", progress.contributionDeclared],
              // ["Contribution approved", progress.contributionApproved],
            ].map(([label, complete]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-brand-sand/30 py-2"
              >
                <span className="text-sm text-brand-navy">{label}</span>
                <span
                  className={
                    complete
                      ? "text-sm font-bold text-emerald-700"
                      : "text-sm font-semibold text-brand-taupe"
                  }
                >
                  {complete ? "Complete" : "Pending"}
                </span>
              </div>
            ))}

            {progress.enrollmentComplete && (
              <p className="mt-4 font-bold text-emerald-700">
                All enrollment requirements are complete!
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
