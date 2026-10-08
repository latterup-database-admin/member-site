import { supabase } from "../lib/supabase";

export async function loadAdminContributionOptions() {
  const { data, error } = await supabase.rpc("get_admin_contribution_options");
  if (error) throw error;
  return data ?? [];
}

export async function saveAdminContributionOption(values) {
  const { data, error } = await supabase.rpc("save_admin_contribution_option", {
    p_id: values.id || null,
    p_category: values.category,
    p_value: values.value,
    p_sort_order: Number(values.sort_order ?? 100),
    p_is_active: Boolean(values.is_active),
  });

  if (error) throw error;
  return data;
}

export async function loadAdminContributionOpportunityAssignees(
  contributionOpportunityId,
) {
  const { data, error } = await supabase.rpc(
    "get_admin_contribution_opportunity_assignees",
    {
      p_contribution_opportunity_id: contributionOpportunityId,
    },
  );

  if (error) throw error;
  return data ?? [];
}