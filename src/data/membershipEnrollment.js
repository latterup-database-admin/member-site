import { supabase } from "../lib/supabase";

export async function loadMembershipEnrollment({ householdId, schoolYearId }) {
  if (!householdId || !schoolYearId) {
    throw new Error("Household and school year are required.");
  }

  const [membershipResult, availabilityResult] = await Promise.all([
    supabase
      .from("household_membership_years")
      .select("*")
      .eq("household_id", householdId)
      .eq("school_year_id", schoolYearId)
      .maybeSingle(),

    supabase.rpc("is_membership_enrollment_open", {
      p_household_id: householdId,
      p_school_year_id: schoolYearId,
    }),
  ]);

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  if (availabilityResult.error) {
    throw availabilityResult.error;
  }

  const membership = membershipResult.data;

  let progress = null;
  let annualReviewComplete = false;

  if (membership) {
    const { data: reviewData, error: reviewError } = await supabase.rpc(
      "check_my_household_annual_review",
      {
        p_school_year_id: schoolYearId,
      },
    );

    if (reviewError) throw reviewError;

    annualReviewComplete = reviewData?.household_review_complete === true;
  }

  if (membership) {
    const { data, error } = await supabase.rpc(
      "get_household_reenrollment_status",
      {
        p_household_id: householdId,
        p_school_year_id: schoolYearId,
      },
    );

    if (error) throw error;

    progress = Array.isArray(data) ? (data[0] ?? null) : data;
  }

  return {
    householdId,
    schoolYearId,
    membership,
    enrollmentOpen: availabilityResult.data === true,
    hasStarted: Boolean(membership),
    progress: progress
      ? {
          annualReviewComplete,
          agreementsAccepted: progress.agreements_accepted === true,
          feedbackRequired: progress.feedback_required === true,
          feedbackComplete: progress.feedback_complete === true,
          materialsAcknowledged: progress.meeting_acknowledged === true,
          duesSatisfied: progress.dues_satisfied === true,
          contributionDeclared: progress.contribution_declared === true,
          contributionApproved: progress.contribution_approved === true,
          enrollmentComplete: progress.reenrollment_complete === true,
        }
      : null,
  };
}

export async function loadMembershipEnrollmentWindow() {
  const { data, error } = await supabase
    .from("membership_enrollment_windows")
    .select(
      `
      school_year_id,
      opens_at,
      closes_at,
      school_years (
        id,
        name
      )
    `,
    )
    .order("opens_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function beginMembershipReenrollment({
  householdId,
  schoolYearId,
}) {
  if (!householdId || !schoolYearId) {
    throw new Error("Household and school year are required.");
  }

  const { data, error } = await supabase.rpc(
    "begin_household_membership_enrollment",
    {
      p_household_id: householdId,
      p_school_year_id: schoolYearId,
    },
  );

  if (error) throw error;

  return data;
}
