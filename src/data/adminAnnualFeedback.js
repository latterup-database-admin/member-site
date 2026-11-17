import { supabase } from "../lib/supabase";

export async function loadAdminAnnualFeedbackQuestions(schoolYearId) {
  if (!schoolYearId) throw new Error("A school year must be selected.");

  const { data, error } = await supabase.rpc(
    "get_admin_annual_feedback_questions",
    { p_school_year_id: schoolYearId },
  );

  if (error) throw error;
  return data ?? [];
}

export async function saveAdminAnnualFeedbackQuestion({
  id,
  schoolYearId,
  prompt,
  helpText,
  questionType,
  options,
  isRequired,
}) {
  const { data, error } = await supabase.rpc(
    "save_admin_annual_feedback_question",
    {
      p_id: id ?? null,
      p_school_year_id: schoolYearId,
      p_prompt: prompt,
      p_help_text: helpText || null,
      p_question_type: questionType,
      p_options: options ?? [],
      p_is_required: isRequired === true,
    },
  );

  if (error) throw error;
  return data;
}

export async function moveAdminAnnualFeedbackQuestion(id, direction) {
  const { error } = await supabase.rpc("move_admin_annual_feedback_question", {
    p_id: id,
    p_direction: direction,
  });
  if (error) throw error;
}

export async function deleteAdminAnnualFeedbackQuestion(id) {
  const { error } = await supabase.rpc("delete_admin_annual_feedback_question", {
    p_id: id,
  });
  if (error) throw error;
}

export async function copyAnnualFeedbackQuestionsToSchoolYear(schoolYearId) {
  const { data, error } = await supabase.rpc(
    "copy_annual_feedback_questions_to_school_year",
    { p_target_school_year_id: schoolYearId },
  );
  if (error) throw error;
  return data ?? 0;
}

export async function loadAdminAnnualFeedback(schoolYearId) {
  if (!schoolYearId) throw new Error("A school year must be selected.");

  const { data, error } = await supabase.rpc("get_admin_annual_feedback", {
    p_school_year_id: schoolYearId,
  });

  if (error) throw error;
  return data;
}