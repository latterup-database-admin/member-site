import { supabase } from "../lib/supabase";

export async function loadAdminContributionApplications() {
  const { data, error } = await supabase.rpc(
    "get_admin_contribution_applications",
  );

  if (error) throw error;
  return data ?? [];
}

export async function reviewAdminContributionApplication({
  applicationId,
  action,
  reviewNotes = "",
}) {
  const { data, error } = await supabase.rpc(
    "review_admin_contribution_application",
    {
      p_application_id: applicationId,
      p_action: action,
      p_review_notes: reviewNotes.trim() || null,
    },
  );

  if (error) throw error;
  return data;
}
