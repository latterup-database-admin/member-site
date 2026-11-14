import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  loadMyHouseholdAnnualAgreements,
  submitMyHouseholdAnnualAgreements,
} from "../data/annualAgreements";
import AgreementContent from "../components/agreements/AgreementContent";

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

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function acceptedLabel(agreement) {
  if (agreement.accepted_source === "google_form") {
    return `Accepted via Family Enrollment Form on ${formatDate(agreement.accepted_at)}`;
  }
  return `Accepted ${formatDateTime(agreement.accepted_at)}`;
}

function signingUnavailableMessage(data) {
  if (!data.household_membership_year_id) {
    return "Begin membership enrollment before signing the agreements.";
  }
  if (!data.eligible_signer) {
    return "Only a parent or guardian who manages this household can sign the agreements.";
  }
  if (!data.enrollment_open) {
    return "Signing is available while membership enrollment is open.";
  }
  return "The agreements can't be signed for this membership right now.";
}

export default function AnnualAgreementsPage() {
  const { portalContext } = useAuth();
  const householdId = portalContext?.households?.[0]?.id;
  const [searchParams] = useSearchParams();
  const schoolYearId = searchParams.get("schoolYearId");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [acknowledged, setAcknowledged] = useState({});
  const [consent, setConsent] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [justSigned, setJustSigned] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!householdId) {
          throw new Error("No household was found for your account.");
        }
        if (!schoolYearId) {
          throw new Error("No school year was selected.");
        }

        const result = await loadMyHouseholdAnnualAgreements({
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
    return <p className="text-brand-taupe">Loading agreements…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  const agreements = data?.agreements ?? [];
  const outstanding = agreements.filter((a) => !a.accepted);
  const canSign = data?.can_sign === true;
  const allAcknowledged =
    outstanding.length > 0 && outstanding.every((a) => acknowledged[a.id]);
  const readyToSubmit =
    canSign && allAcknowledged && consent && signature.trim() !== "" && !submitting;

  async function handleSubmit() {
    if (!readyToSubmit) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitMyHouseholdAnnualAgreements({
        householdId,
        schoolYearId,
        agreementVersionIds: outstanding.map((a) => a.id),
        electronicSignature: signature,
        signatureConsentConfirmed: consent,
      });

      setAcknowledged({});
      setConsent(false);
      setSignature("");
      setJustSigned(true);
      setReloadKey((key) => key + 1);
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
          Agreements &amp; Acknowledgments
        </h1>
        <p className="mt-2 text-sm text-brand-taupe">
          {data?.all_accepted
            ? "All agreements for this school year have been accepted."
            : "Please review each agreement below."}
        </p>
      </div>

      {justSigned && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <p className="font-semibold text-emerald-700">
            Thank you. Your signature has been recorded.
          </p>
        </div>
      )}

      {!canSign && outstanding.length > 0 && (
        <div className="rounded-xl border border-brand-sand/45 bg-white p-4">
          <p className="text-sm text-brand-navy">
            {signingUnavailableMessage(data)}
          </p>
        </div>
      )}

      {agreements.length === 0 ? (
        <p className="text-sm text-brand-taupe">
          No agreements have been published for this school year yet.
        </p>
      ) : (
        agreements.map((agreement) => (
          <article
            key={agreement.id}
            className="rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-brand-navy">
                {agreement.display_order}. {agreement.title}
              </h2>
              <span
                className={
                  agreement.accepted
                    ? "text-sm font-bold text-emerald-700"
                    : "text-sm font-semibold text-brand-taupe"
                }
              >
                {agreement.accepted
                  ? acceptedLabel(agreement)
                  : "Not yet accepted"}
              </span>
            </div>

            <div className="mt-3">
              <AgreementContent agreement={agreement} />
            </div>

            {canSign && !agreement.accepted && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-brand-sand/40 p-4">
                <input
                  type="checkbox"
                  checked={acknowledged[agreement.id] === true}
                  onChange={(event) =>
                    setAcknowledged((prev) => ({
                      ...prev,
                      [agreement.id]: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-brand-navy"
                />
                <span className="text-sm text-brand-navy">
                  I have read and agree to the {agreement.title} agreement.
                </span>
              </label>
            )}
          </article>
        ))
      )}

      {canSign && (
        <section className="space-y-4 rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-brand-navy">
            Electronic Signature
          </h2>

          <p className="text-sm text-brand-taupe">
            {allAcknowledged
              ? "All agreements acknowledged."
              : `Acknowledge each agreement above (${
                  outstanding.filter((a) => acknowledged[a.id]).length
                } of ${outstanding.length} done).`}
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-sand/40 p-4">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 accent-brand-navy"
            />
            <span className="text-sm text-brand-navy">{data.consent_text}</span>
          </label>

          <div>
            <label
              htmlFor="electronic-signature"
              className="block text-sm font-semibold text-brand-navy"
            >
              Type your full legal name
            </label>
            <input
              id="electronic-signature"
              type="text"
              value={signature}
              maxLength={200}
              autoComplete="name"
              onChange={(event) => setSignature(event.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-brand-sand/60 px-3 py-2 text-brand-navy"
            />
          </div>

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
            {submitting ? "Signing…" : "Sign and Submit"}
          </button>
        </section>
      )}

      {data?.submissions?.length > 0 && (
        <section className="rounded-2xl border border-brand-sand/45 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-brand-navy">Signature History</h2>
          <ul className="mt-3 space-y-2 text-sm text-brand-navy">
            {data.submissions.map((s) => (
              <li key={s.id}>
                Signed by {s.signed_by_name} on {formatDateTime(s.submitted_at)} (
                {s.agreement_version_ids.length} agreement
                {s.agreement_version_ids.length === 1 ? "" : "s"})
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}