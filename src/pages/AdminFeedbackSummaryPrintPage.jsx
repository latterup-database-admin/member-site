import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loadAdminAnnualFeedback } from "../data/adminAnnualFeedback";
import { loadAdminSchoolYearOptions } from "../data/adminMembershipEnrollment";
import FeedbackSummaryContent from "../components/admin/FeedbackSummaryContent";

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

export default function AdminFeedbackSummaryPrintPage() {
  const [searchParams] = useSearchParams();
  const yearId = searchParams.get("schoolYearId");
  const [summary, setSummary] = useState(null);
  const [yearName, setYearName] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAdminAnnualFeedback(yearId), loadAdminSchoolYearOptions()])
      .then(([data, years]) => {
        if (cancelled) return;
        setSummary(data.ai_summary);
        setYearName(years.find((y) => y.id === yearId)?.name ?? "");
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [yearId]);

  // Gives the saved PDF a sensible default file name.
  useEffect(() => {
    if (!yearName) return;
    const previous = document.title;
    document.title = `Latter UP Annual Feedback Summary ${yearName}`;
    return () => {
      document.title = previous;
    };
  }, [yearName]);

  if (error) return <p className="p-8 font-semibold text-red-700">{error}</p>;
  if (!summary) {
    return <p className="p-8 text-brand-taupe">Loading summary…</p>;
  }

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 print:max-w-none print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <button type="button" onClick={() => window.print()} className="btn-primary">
          Print / Save as PDF
        </button>
      </div>

      <p className="text-xs font-extrabold uppercase tracking-widest text-brand-junior">
        Latter UP
      </p>
      <h1 className="brand-title mt-1 text-3xl text-brand-navy">
        Annual Feedback Summary · {yearName}
      </h1>
      <p className="mt-1 text-xs text-brand-taupe">
        AI-generated summary of {summary.response_count} responses ·{" "}
        {formatDate(summary.generated_at)}
      </p>

      <div className="mt-4">
        <FeedbackSummaryContent markdown={summary.summary_markdown} />
      </div>
    </main>
  );
}