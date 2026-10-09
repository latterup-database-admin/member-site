import { supabase } from "../lib/supabase";

export async function loadContributionCatalog() {
  const { data, error } = await supabase.rpc("get_member_contribution_catalog");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolYearId: row.school_year_id,
    schoolYearName: row.school_year_name,
    title: row.title,
    description: row.description,
    contributionType: row.contribution_type,
    slots: row.slots,
    reservedCount: Number(row.reserved_count ?? 0),
    spotsRemaining:
      row.spots_remaining === null || row.spots_remaining === undefined
        ? null
        : Number(row.spots_remaining),
    availabilityStatus: row.availability_status,
    oversightGroup: row.oversight_group,
    committee: row.committee,
    cycle: row.cycle,
    ageGroup: row.age_group,
    appliesToPrograms: row.applies_to_programs ?? [],
    requiresProgramChoice: row.requires_program_choice === true,
    coverageChoiceMode: row.coverage_choice_mode || "all",
    coverage: Array.isArray(row.coverage) ? row.coverage : [],
    publicInfoUrl: row.public_info_url,
    internalInfoUrl: row.internal_info_url,
    otherResourcesUrl: row.other_resources_url,
    isTeaching: row.is_teaching === true,
    myApplicationId: row.my_application_id,
    myApplicationStatus: row.my_application_status,
  }));
}

export async function submitContributionClaim({
  opportunityId,
  selectedProgram,
  selectedPeriod,
  notes,
}) {
  const { data, error } = await supabase.rpc("submit_contribution_claim", {
    p_contribution_opportunity_id: opportunityId,
    p_selected_program: selectedProgram || null,
    p_selected_period: selectedPeriod || null,
    p_notes: notes || null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function loadTeacherOptions() {
  const { data, error } = await supabase.rpc("get_teacher_picker_options");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.person_id,
    displayName: row.display_name,
  }));
}

export async function submitTeachingContributionClaim({
  program,
  subjectArea,
  notes,
}) {
  const { data, error } = await supabase.rpc(
    "submit_teaching_contribution_claim",
    {
      p_program: program,
      p_subject_area: subjectArea,
      p_notes: notes || null,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function submitClassContribution({
  title,
  program,
  teacherPersonIds,
  offeringPeriods,
  meetings,
  description,
  syllabusUrl,
  introVideoUrl,
  prerequisites,
  maxEnrollment,
  proposedFee,
}) {
  const normalizedMeetings = meetings.map((meeting) => ({
    day_of_week: meeting.dayOfWeek,
    start_time: meeting.startTime,
    duration_minutes: meeting.durationMinutes,
  }));

  const { data, error } = await supabase.rpc("submit_class_contribution", {
    p_title: title,
    p_program: program,
    p_teacher_person_ids: teacherPersonIds,
    p_offering_periods: offeringPeriods,
    p_meetings: normalizedMeetings,
    p_description: description || null,
    p_syllabus_url: syllabusUrl || null,
    p_intro_video_url: introVideoUrl || null,
    p_prerequisites: prerequisites || null,
    p_max_enrollment: maxEnrollment ?? null,
    p_proposed_fee: proposedFee ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}


export async function loadMyContributionApplications() {
  const { data, error } = await supabase.rpc("get_my_contribution_applications");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    schoolYearName: row.school_year_name,
    opportunityId: row.contribution_opportunity_id,
    opportunityTitle: row.opportunity_title,
    applicationType: row.application_type,
    status: row.status,
    responses: row.responses ?? {},
    submittedAt: row.submitted_at,
    reviewNotes: row.review_notes,
    linkedClassProposals: row.linked_class_proposals ?? [],
  }));
}
