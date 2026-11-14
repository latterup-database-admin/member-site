import { supabase } from "../lib/supabase";

export async function loadMyHouseholdAnnualAgreements({
  householdId,
  schoolYearId,
}) {
  if (!householdId || !schoolYearId) {
    throw new Error("Household and school year are required.");
  }

  const { data, error } = await supabase.rpc(
    "get_my_household_annual_agreements",
    {
      p_household_id: householdId,
      p_school_year_id: schoolYearId,
    },
  );

  if (error) throw error;

  return data;
}

export async function submitMyHouseholdAnnualAgreements({
  householdId,
  schoolYearId,
  agreementVersionIds,
  electronicSignature,
  signatureConsentConfirmed,
}) {
  if (!householdId || !schoolYearId) {
    throw new Error("Household and school year are required.");
  }

  const { data, error } = await supabase.rpc(
    "submit_my_household_annual_agreements",
    {
      p_household_id: householdId,
      p_school_year_id: schoolYearId,
      p_agreement_version_ids: agreementVersionIds,
      p_electronic_signature: electronicSignature,
      p_signature_consent_confirmed: signatureConsentConfirmed === true,
    },
  );

  if (error) throw error;

  return data;
}