import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

const SCHOOL_YEAR_NAME = "2026-2027";

function formatPhone(value) {
  if (!value) return "Not provided";

  const digits = String(value).replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return value;
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMemberType(value) {
  if (!value) return "Not classified";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStatusLabel(status) {
  switch (status) {
    case "complete":
      return "Complete";
    case "review_required":
      return "Review required";
    case "transition_required":
      return "Program transition required";
    case "classification_mismatch":
      return "Classification review required";
    case "dob_required":
      return "Birth date required";
    default:
      return "Pending";
  }
}

function StatusBadge({ status }) {
  let classes = "bg-sky-50 text-sky-700 ring-sky-200";

  if (status === "complete") {
    classes = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "dob_required" || status === "classification_mismatch") {
    classes = "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "transition_required") {
    classes = "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${classes}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-xl border border-brand-sand/40 bg-white shadow-sm">
      <div className="border-b border-brand-sand/30 px-5 py-4">
        <h2 className="text-lg font-bold text-brand-navy">{title}</h2>

        {description ? (
          <p className="mt-1 text-sm text-brand-taupe">{description}</p>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children, helpText }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-brand-navy">{label}</span>

      <div className="mt-1.5">{children}</div>

      {helpText ? (
        <p className="mt-1 text-xs text-brand-taupe">{helpText}</p>
      ) : null}
    </label>
  );
}

const inputClass =
  "focus-ring w-full rounded-lg border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition placeholder:text-brand-taupe/50 focus:border-brand-sky";

const readOnlyClass =
  "w-full rounded-lg border border-brand-sand/30 bg-stone-50 px-3 py-2.5 text-sm text-brand-taupe";

function StudentEditor({ child, onSaved }) {
  const [form, setForm] = useState({
    preferred_name: child.preferred_name ?? "",
    birth_date: child.birth_date ?? "",
    use_family_address: child.use_family_address !== false,
    street_address: child.custom_address?.street_address ?? "",
    address_line_2: child.custom_address?.address_line_2 ?? "",
    city: child.custom_address?.city ?? "",
    state: child.custom_address?.state ?? "",
    postal_code: child.custom_address?.postal_code ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const recommendedType =
    child.system_recommended_member_type || child.current_member_type;

  async function saveStudent(event) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.rpc("update_managed_student_profile", {
      p_student_person_id: child.person_id,
      p_preferred_name: form.preferred_name || null,
      p_birth_date: form.birth_date || null,
      p_use_family_address: form.use_family_address,

      p_street_address: form.use_family_address ? null : form.street_address,

      p_address_line_2: form.use_family_address
        ? null
        : form.address_line_2 || null,

      p_city: form.use_family_address ? null : form.city,

      p_state: form.use_family_address ? null : form.state,

      p_postal_code: form.use_family_address ? null : form.postal_code,
    });

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });

      setSaving(false);
      return;
    }

    setMessage({
      type: "success",
      text: `${child.first_name}'s profile was saved.`,
    });

    await onSaved();

    setSaving(false);
  }

  return (
    <form onSubmit={saveStudent}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-brand-navy">
            {child.first_name} {child.last_name}
          </h3>

          <p className="mt-1 text-sm text-brand-taupe">
            {child.workspace_email || "No Workspace email"}
          </p>
        </div>

        <StatusBadge status={child.annual_review?.action_status} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="First name">
          <div className={readOnlyClass}>{child.first_name}</div>
        </Field>

        <Field label="Last name">
          <div className={readOnlyClass}>{child.last_name}</div>
        </Field>

        <Field label="Preferred name">
          <input
            className={inputClass}
            value={form.preferred_name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                preferred_name: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Latter UP email">
          <div className={readOnlyClass}>
            {child.workspace_email || "Not provided"}
          </div>
        </Field>

        <Field
          label="Birth date"
          helpText="Used to determine the student's program for this school year."
        >
          <input
            type="date"
            className={inputClass}
            value={form.birth_date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                birth_date: event.target.value,
              }))
            }
            required
          />
        </Field>

        <Field
          label="Program"
          helpText="Calculated automatically from birth date."
        >
          <div className={readOnlyClass}>
            {formatMemberType(recommendedType)}
          </div>
        </Field>
      </div>

      <div className="mt-6 border-t border-brand-sand/30 pt-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.use_family_address}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                use_family_address: event.target.checked,
              }))
            }
            className="mt-1 h-4 w-4 rounded border-brand-sand text-brand-navy"
          />

          <span>
            <span className="block text-sm font-bold text-brand-navy">
              Use family address
            </span>

            <span className="mt-0.5 block text-xs text-brand-taupe">
              Turn this off only if this student has a different address.
            </span>
          </span>
        </label>

        {!form.use_family_address ? (
          <div className="mt-4 rounded-xl border border-brand-sand/40 bg-stone-50 p-4">
            <p className="mb-4 text-sm font-bold text-brand-navy">
              {child.first_name}&apos;s address
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Street address">
                  <input
                    className={inputClass}
                    value={form.street_address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        street_address: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Address line 2" helpText="Optional">
                  <input
                    className={inputClass}
                    value={form.address_line_2}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address_line_2: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="City">
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <div className="grid grid-cols-[120px_1fr] gap-3">
                <Field label="State">
                  <input
                    className={inputClass}
                    value={form.state}
                    maxLength={2}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        state: event.target.value.toUpperCase(),
                      }))
                    }
                    required
                  />
                </Field>

                <Field label="ZIP code">
                  <input
                    className={inputClass}
                    value={form.postal_code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        postal_code: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="focus-ring rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${child.first_name}'s profile`}
        </button>

        {message ? (
          <p
            className={
              message.type === "error"
                ? "text-sm font-semibold text-red-700"
                : "text-sm font-semibold text-emerald-700"
            }
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export default function AnnualProfileReviewPage() {
  const { isDevPreview } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [schoolYearId, setSchoolYearId] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [validation, setValidation] = useState(null);

  const [householdForm, setHouseholdForm] = useState({
    street_address: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const [adultForm, setAdultForm] = useState({
    preferred_name: "",
    birthday_month: "",
    birthday_day: "",
    personal_email: "",
    personal_phone: "",
  });

  const [savingHousehold, setSavingHousehold] = useState(false);
  const [savingAdult, setSavingAdult] = useState(false);

  const [householdMessage, setHouseholdMessage] = useState(null);
  const [adultMessage, setAdultMessage] = useState(null);

  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDevPreview) {
      setError(
        "Annual profile editing is disabled in local preview mode. Sign in with a real member account to test database writes.",
      );
      setLoading(false);
      return;
    }

    const { data: years, error: yearError } = await supabase
      .from("school_years")
      .select("id, name")
      .eq("name", SCHOOL_YEAR_NAME)
      .limit(1);

    if (yearError) {
      setError(yearError.message);
      setLoading(false);
      return;
    }

    const schoolYear = years?.[0];

    if (!schoolYear) {
      setError(`School year ${SCHOOL_YEAR_NAME} was not found.`);
      setLoading(false);
      return;
    }

    setSchoolYearId(schoolYear.id);

    const [
      { data: profileData, error: profileError },
      { data: validationData, error: validationError },
    ] = await Promise.all([
      supabase.rpc("get_my_annual_profile_review", {
        p_school_year_id: schoolYear.id,
      }),

      supabase.rpc("check_my_household_annual_review", {
        p_school_year_id: schoolYear.id,
      }),
    ]);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (validationError) {
      setError(validationError.message);
      setLoading(false);
      return;
    }

    setReviewData(profileData);
    setValidation(validationData);

    const address = profileData?.household?.address ?? {};

    setHouseholdForm({
      street_address: address.street_address ?? "",
      address_line_2: address.address_line_2 ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      postal_code: address.postal_code ?? "",
    });

    const adult = profileData?.adult ?? {};

    setAdultForm({
      preferred_name: adult.preferred_name ?? "",
      birthday_month: adult.birthday_month ?? "",
      birthday_day: adult.birthday_day ?? "",
      personal_email: adult.personal_email ?? "",
      personal_phone: adult.personal_phone ?? "",
    });

    setLoading(false);
  }, [isDevPreview]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  async function saveHousehold(event) {
    event.preventDefault();

    setSavingHousehold(true);
    setHouseholdMessage(null);

    const { error: saveError } = await supabase.rpc(
      "update_my_household_profile",
      {
        p_street_address: householdForm.street_address,
        p_address_line_2: householdForm.address_line_2 || null,
        p_city: householdForm.city,
        p_state: householdForm.state,
        p_postal_code: householdForm.postal_code,
      },
    );

    if (saveError) {
      setHouseholdMessage({
        type: "error",
        text: saveError.message,
      });

      setSavingHousehold(false);
      return;
    }

    setHouseholdMessage({
      type: "success",
      text: "Family address saved.",
    });

    await loadReview();

    setSavingHousehold(false);
  }

  async function saveAdult(event) {
    event.preventDefault();

    setSavingAdult(true);
    setAdultMessage(null);

    const month =
      adultForm.birthday_month === "" ? null : Number(adultForm.birthday_month);

    const day =
      adultForm.birthday_day === "" ? null : Number(adultForm.birthday_day);

    const { error: saveError } = await supabase.rpc("update_my_adult_profile", {
      p_preferred_name: adultForm.preferred_name || null,
      p_birthday_month: month,
      p_birthday_day: day,
      p_personal_email: adultForm.personal_email || null,
      p_personal_phone: adultForm.personal_phone || null,
    });

    if (saveError) {
      setAdultMessage({
        type: "error",
        text: saveError.message,
      });

      setSavingAdult(false);
      return;
    }

    setAdultMessage({
      type: "success",
      text: "Your profile was saved.",
    });

    await loadReview();

    setSavingAdult(false);
  }

  async function submitAnnualReview() {
    if (!schoolYearId) return;

    setSubmitting(true);
    setSubmitMessage(null);

    // Re-check immediately before submission so we are not relying
    // on potentially stale validation data from the page load.
    const { data: validationData, error: validationError } = await supabase.rpc(
      "check_my_household_annual_review",
      {
        p_school_year_id: schoolYearId,
      },
    );

    if (validationError) {
      setSubmitMessage({
        type: "error",
        text: validationError.message,
      });

      setSubmitting(false);
      return;
    }

    setValidation(validationData);

    if (!validationData?.can_submit) {
      setSubmitMessage({
        type: "error",
        text: "Some required information still needs attention before you can submit.",
      });

      setSubmitting(false);
      return;
    }

    const { data: completionData, error: completionError } = await supabase.rpc(
      "complete_my_household_annual_review",
      {
        p_school_year_id: schoolYearId,
        p_notes: null,
      },
    );

    if (completionError) {
      setSubmitMessage({
        type: "error",
        text: completionError.message,
      });

      setSubmitting(false);
      return;
    }

    setSubmitMessage({
      type: "success",
      text: "Your annual profile review is complete.",
    });

    setConfirmationChecked(false);

    await loadReview();

    console.log("Annual review completed:", completionData);

    setSubmitting(false);
  }

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        <h1 className="text-lg font-bold">Unable to load annual review</h1>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!reviewData) return null;

  const {
    household,
    adult,
    children = [],
    school_year: schoolYear,
  } = reviewData;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-brand-junior">
          {schoolYear?.name || SCHOOL_YEAR_NAME}
        </p>

        <h1 className="brand-title mt-1 text-3xl text-brand-navy">
          Annual Profile Review
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-taupe">
          Review your family information before registration. Names and Latter
          UP email addresses are managed by the organization and cannot be
          changed here.
        </p>
      </header>

      <SectionCard
        title="Family Information"
        description="This address is used as the default family address."
      >
        <form onSubmit={saveHousehold}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Family">
                <div className={readOnlyClass}>
                  {household.family_name || "Not provided"}
                </div>
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Street address">
                <input
                  className={inputClass}
                  value={householdForm.street_address}
                  onChange={(event) =>
                    setHouseholdForm((current) => ({
                      ...current,
                      street_address: event.target.value,
                    }))
                  }
                  autoComplete="street-address"
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Address line 2" helpText="Optional">
                <input
                  className={inputClass}
                  value={householdForm.address_line_2}
                  onChange={(event) =>
                    setHouseholdForm((current) => ({
                      ...current,
                      address_line_2: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <Field label="City">
              <input
                className={inputClass}
                value={householdForm.city}
                onChange={(event) =>
                  setHouseholdForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                autoComplete="address-level2"
              />
            </Field>

            <div className="grid grid-cols-[120px_1fr] gap-3">
              <Field label="State">
                <input
                  className={inputClass}
                  value={householdForm.state}
                  maxLength={2}
                  onChange={(event) =>
                    setHouseholdForm((current) => ({
                      ...current,
                      state: event.target.value.toUpperCase(),
                    }))
                  }
                  autoComplete="address-level1"
                />
              </Field>

              <Field label="ZIP code">
                <input
                  className={inputClass}
                  value={householdForm.postal_code}
                  onChange={(event) =>
                    setHouseholdForm((current) => ({
                      ...current,
                      postal_code: event.target.value,
                    }))
                  }
                  autoComplete="postal-code"
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingHousehold}
              className="focus-ring rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingHousehold ? "Saving…" : "Save family address"}
            </button>

            {householdMessage ? (
              <p
                className={
                  householdMessage.type === "error"
                    ? "text-sm font-semibold text-red-700"
                    : "text-sm font-semibold text-emerald-700"
                }
              >
                {householdMessage.text}
              </p>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Your Profile"
        description="Review your personal contact information."
      >
        <form onSubmit={saveAdult}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name">
              <div className={readOnlyClass}>{adult.first_name}</div>
            </Field>

            <Field label="Last name">
              <div className={readOnlyClass}>{adult.last_name}</div>
            </Field>

            <Field label="Preferred name">
              <input
                className={inputClass}
                value={adultForm.preferred_name}
                onChange={(event) =>
                  setAdultForm((current) => ({
                    ...current,
                    preferred_name: event.target.value,
                  }))
                }
                autoComplete="nickname"
              />
            </Field>

            <Field label="Latter UP email">
              <div className={readOnlyClass}>
                {adult.workspace_email || "Not provided"}
              </div>
            </Field>

            <Field label="Personal email" helpText="Optional">
              <input
                type="email"
                className={inputClass}
                value={adultForm.personal_email}
                onChange={(event) =>
                  setAdultForm((current) => ({
                    ...current,
                    personal_email: event.target.value,
                  }))
                }
                autoComplete="email"
              />
            </Field>

            <Field label="Primary phone">
              <input
                type="tel"
                className={inputClass}
                value={adultForm.personal_phone}
                onChange={(event) =>
                  setAdultForm((current) => ({
                    ...current,
                    personal_phone: event.target.value,
                  }))
                }
                placeholder="(555) 555-5555"
                autoComplete="tel"
              />

              {adult.personal_phone ? (
                <p className="mt-1 text-xs text-brand-taupe">
                  Currently displayed as {formatPhone(adult.personal_phone)}
                </p>
              ) : null}
            </Field>

            <Field
              label="Birthday month"
              helpText="Optional; year is not collected"
            >
              <select
                className={inputClass}
                value={adultForm.birthday_month}
                onChange={(event) =>
                  setAdultForm((current) => ({
                    ...current,
                    birthday_month: event.target.value,
                  }))
                }
              >
                <option value="">Month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </Field>

            <Field label="Birthday day">
              <input
                type="number"
                min="1"
                max="31"
                className={inputClass}
                value={adultForm.birthday_day}
                onChange={(event) =>
                  setAdultForm((current) => ({
                    ...current,
                    birthday_day: event.target.value,
                  }))
                }
                placeholder="Day"
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingAdult}
              className="focus-ring rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingAdult ? "Saving…" : "Save your profile"}
            </button>

            {adultMessage ? (
              <p
                className={
                  adultMessage.type === "error"
                    ? "text-sm font-semibold text-red-700"
                    : "text-sm font-semibold text-emerald-700"
                }
              >
                {adultMessage.text}
              </p>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Children"
        description="Review each student's information. Program placement is calculated automatically from birth date."
      >
        {children.length === 0 ? (
          <div className="rounded-lg bg-stone-50 p-4 text-sm text-brand-taupe">
            No managed student profiles are currently available.
          </div>
        ) : (
          <div className="divide-y divide-brand-sand/40">
            {children.map((child) => (
              <div key={child.person_id} className="py-7 first:pt-0 last:pb-0">
                <StudentEditor child={child} onSaved={loadReview} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Review & Submit"
        description="Confirm that you have reviewed the information for your family."
      >
        {validation?.blockers?.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">
              Some information still needs attention.
            </p>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {validation.blockers.map((blocker, index) => (
                <li key={`${blocker.code}-${blocker.person_id || index}`}>
                  {blocker.message}
                </li>
              ))}
            </ul>
          </div>
        ) : validation?.household_review_complete ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-bold text-emerald-900">
              Annual profile review complete
            </p>

            <p className="mt-1 text-sm text-emerald-800">
              Your family information has been reviewed for{" "}
              {reviewData.school_year?.name}.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-bold text-emerald-900">Ready to submit</p>

              <p className="mt-1 text-sm text-emerald-800">
                No required information is missing.
              </p>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-brand-sand/40 p-4">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(event) =>
                  setConfirmationChecked(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-brand-sand text-brand-navy"
              />

              <span>
                <span className="block text-sm font-bold text-brand-navy">
                  I have reviewed this information
                </span>

                <span className="mt-1 block text-sm leading-relaxed text-brand-taupe">
                  I confirm that the household and profile information shown
                  above is accurate to the best of my knowledge.
                </span>
              </span>
            </label>

            <div className="mt-5">
              <button
                type="button"
                disabled={!confirmationChecked || submitting}
                onClick={submitAnnualReview}
                className="focus-ring rounded-lg bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit Annual Profile Review"}
              </button>
            </div>
          </>
        )}

        {submitMessage ? (
          <div
            className={[
              "mt-4 rounded-lg border p-4 text-sm font-semibold",
              submitMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            ].join(" ")}
          >
            {submitMessage.text}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StatusBadge
            status={reviewData.adult?.annual_review?.action_status}
          />

          <span className="text-sm text-brand-taupe">
            {validation?.managed_children ?? 0} managed student
            {(validation?.managed_children ?? 0) === 1 ? "" : "s"}
          </span>
        </div>
      </SectionCard>
    </div>
  );
}
