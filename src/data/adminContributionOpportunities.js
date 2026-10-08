import { supabase } from "../lib/supabase";

export async function loadAdminContributionOpportunities() {
  const { data, error } = await supabase.rpc(
    "get_admin_contribution_opportunities",
  );

  if (error) throw error;
  return data ?? [];
}

export async function saveAdminContributionOpportunity(values) {
  const { data, error } = await supabase.rpc(
    "update_admin_contribution_opportunity",
    {
      p_id: values.id,
      p_title: values.title,
      p_description: values.description || null,
      p_contribution_type: values.contribution_type || null,
      p_slots:
        values.slots === "" || values.slots === null || values.slots === undefined
          ? null
          : Number(values.slots),
      p_status: values.status,
      p_oversight_group: values.oversight_group || null,
      p_committee: values.committee || null,
      p_cycle: values.cycle || null,
      p_age_group: values.age_group || null,
      p_youth_periods: values.youth_periods ?? [],
      p_junior_sessions: values.junior_sessions ?? [],
      p_coverage_choice_mode: values.coverage_choice_mode || "all",
      p_public_info_url: values.public_info_url || null,
      p_internal_info_url: values.internal_info_url || null,
      p_other_resources_url: values.other_resources_url || null,
    },
  );

  if (error) throw error;
  return data;
}

export async function createAdminContributionOpportunity(values) {
  const { data, error } = await supabase.rpc(
    "create_admin_contribution_opportunity",
    {
      p_title: values.title,
      p_description: values.description || null,
      p_contribution_type: values.contribution_type || null,
      p_slots:
        values.slots === "" || values.slots === null || values.slots === undefined
          ? null
          : Number(values.slots),
      p_status: values.status || "draft",
      p_oversight_group: values.oversight_group || null,
      p_committee: values.committee || null,
      p_cycle: values.cycle || null,
      p_age_group: values.age_group || null,
      p_youth_periods: values.youth_periods ?? [],
      p_junior_sessions: values.junior_sessions ?? [],
      p_coverage_choice_mode: values.coverage_choice_mode || "all",
      p_public_info_url: values.public_info_url || null,
      p_internal_info_url: values.internal_info_url || null,
      p_other_resources_url: values.other_resources_url || null,
    },
  );

  if (error) throw error;
  return data;
}

export async function loadAdminContributionOpportunityCoverage() {
  const { data, error } = await supabase.rpc(
    "get_admin_contribution_opportunity_coverage",
  );

  if (error) throw error;
  return data ?? [];
}