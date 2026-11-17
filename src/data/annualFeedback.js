import { supabase } from "../lib/supabase";

export async function loadMyHouseholdAnnualFeedback({ householdId, schoolYearId }) {
  if (!householdId || !schoolYearId) {
    throw new Error("Household and school year are required.");
  }

  const { data, error } = await supabase.rpc("get_my_household_annual_feedback", {
    p_household_id: householdId,
    p_school_year_id: schoolYearId,
  });

  if (error) throw error;
  return data;
}

export async function submitMyHouseholdAnnualFeedback({
  householdId,
  schoolYearId,
  answers,
  anonymous,
}) {
  const { data, error } = await supabase.rpc("submit_my_household_annual_feedback", {
    p_household_id: householdId,
    p_school_year_id: schoolYearId,
    p_answers: answers,
    p_anonymous: anonymous,
  });

  if (error) throw error;
  return data;
}