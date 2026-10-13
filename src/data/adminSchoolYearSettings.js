import { supabase } from "../lib/supabase";

export async function loadSchoolYearSettings() {
  const { data, error } = await supabase.rpc("get_admin_school_year_settings");
  if (error) throw error;
  return {
    years: data?.school_years ?? [],
    periods: data?.program_calendar_periods ?? [],
  };
}

export async function updateAdminProgramCalendarPeriod(periodId, startsOn, endsOn) {
  const { data, error } = await supabase.rpc("update_admin_program_calendar_period", {
    p_period_id: periodId,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
  });
  if (error) throw error;
  return data;
}

export async function updateAdminSchoolYearDates(schoolYearId, startsOn, endsOn) {
  const { data, error } = await supabase.rpc("update_admin_school_year_dates", {
    p_school_year_id: schoolYearId,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
  });
  if (error) throw error;
  return data;
}

export async function loadSchoolCalendarClosures() {
  const { data, error } = await supabase.rpc("get_admin_school_calendar_closures");
  if (error) throw error;
  return data ?? [];
}

export async function saveAdminSchoolCalendarClosure(values) {
  const { data, error } = await supabase.rpc("save_admin_school_calendar_closure", {
    p_id: values.id ?? null,
    p_school_year_id: values.school_year_id,
    p_name: values.name.trim(),
    p_closure_type: values.closure_type,
    p_starts_on: values.starts_on,
    p_ends_on: values.ends_on,
    p_program: values.program,
    p_notes: values.notes || null,
  });
  if (error) throw error;
  return data;
}

export async function setAdminSchoolCalendarClosureActive(id, isActive) {
  const { data, error } = await supabase.rpc("set_admin_school_calendar_closure_active", {
    p_id: id,
    p_is_active: isActive,
  });
  if (error) throw error;
  return data;
}

export async function createAdminSchoolYear(values) {
  const { data, error } = await supabase.rpc("create_admin_school_year", {
    p_name: values.name.trim(),
    p_starts_on: values.starts_on,
    p_ends_on: values.ends_on,
    p_source_school_year_id: values.source_id || null,
    p_sessions: values.sessions ?? [],
    p_copy_closures: Boolean(values.source_id && values.copy_closures),
    p_closures: values.source_id && values.copy_closures ? values.closures ?? [] : [],
    p_copy_meetings: Boolean(values.source_id && values.copy_meetings),
    p_meetings: values.source_id && values.copy_meetings ? values.meetings ?? [] : [],
  });
  if (error) throw error;
  return data;
}

export async function setAdminCurrentSchoolYear(schoolYearId) {
  const { data, error } = await supabase.rpc("set_admin_current_school_year", {
    p_school_year_id: schoolYearId,
  });
  if (error) throw error;
  return data;
}
