
import { supabase } from "../lib/supabase";

export async function loadAdminMembershipEnrollmentWindow(
  schoolYearId
) {
  if (!schoolYearId) {
    throw new Error("A school year must be selected.");
  }

  const { data, error } = await supabase
    .from("membership_enrollment_windows")
    .select("*")
    .eq("school_year_id", schoolYearId)
    .maybeSingle();

  if (error) throw error;

  return data;
}


export async function saveAdminMembershipEnrollmentWindow({
  schoolYearId,
  opensAt,
  closesAt,
}) {
  if (!schoolYearId || !opensAt || !closesAt) {
    throw new Error("School year, opening date, and closing date are required.");
  }

  if (new Date(closesAt) <= new Date(opensAt)) {
    throw new Error("Closing date must be after opening date.");
  }

  const { data, error } = await supabase
    .from("membership_enrollment_windows")
    .upsert(
      {
        school_year_id: schoolYearId,
        opens_at: opensAt,
        closes_at: closesAt,
      },
      { onConflict: "school_year_id" }
    )
    .select()
    .single();

  if (error) throw error;

  return data;
}
