
import { supabase } from "../lib/supabase";

export async function loadAdminAnnualAgreements(schoolYearId) {
  if (!schoolYearId) {
    throw new Error("A school year must be selected.");
  }

  const { data, error } = await supabase.rpc(
    "get_admin_annual_agreements",
    {
      p_school_year_id: schoolYearId,
    }
  );

  if (error) throw error;

  return Array.isArray(data)
  ? [...data].sort(
      (a, b) =>
        a.display_order - b.display_order ||
        a.version_number - b.version_number
    )
  : [];
}


export async function saveAdminAnnualAgreementDraft({
  id,
  schoolYearId,
  agreementKey,
  title,
  body,
  supportingUrl,
  supportingContent,
  displayOrder,
  requiresReacknowledgment,
}) {
  if (!schoolYearId || !agreementKey) {
    throw new Error("School year and agreement key are required.");
  }

  const { data, error } = await supabase.rpc(
    "save_admin_annual_agreement_draft",
    {
      p_id: id ?? null,
      p_school_year_id: schoolYearId,
      p_agreement_key: agreementKey,
      p_title: title,
      p_body: body,
      p_supporting_url: supportingUrl || null,
      p_supporting_content: supportingContent || null,
      p_display_order: displayOrder,
      p_requires_reacknowledgment: requiresReacknowledgment ?? false,
    },
  );

  if (error) throw error;

  return data;
}


export async function deleteAdminAnnualAgreementDraft(agreementVersionId) {
  if (!agreementVersionId) {
    throw new Error("An agreement ID is required.");
  }

  const { error } = await supabase.rpc(
    "delete_admin_annual_agreement_draft",
    {
      p_agreement_version_id: agreementVersionId,
    }
  );

  if (error) {
    throw error;
  }
}


export async function moveAdminAnnualAgreement(
  agreementVersionId,
  direction
) {
  if (!agreementVersionId) {
    throw new Error("An agreement ID is required.");
  }

  if (!["up", "down"].includes(direction)) {
    throw new Error("Direction must be up or down.");
  }

  const { error } = await supabase.rpc(
    "move_admin_annual_agreement",
    {
      p_agreement_version_id: agreementVersionId,
      p_direction: direction,
    }
  );

  if (error) {
    throw error;
  }
}


export async function publishAdminAnnualAgreement(agreementVersionId) {
  if (!agreementVersionId) {
    throw new Error("An agreement version ID is required.");
  }

  const { data, error } = await supabase.rpc(
    "publish_admin_annual_agreement",
    {
      p_agreement_version_id: agreementVersionId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


