import { supabase } from "../lib/supabase";
export async function submitClassProposal({
  title,
  program,
  teacherPersonId,
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

  const { data, error } = await supabase.rpc("submit_class_proposal", {
    p_title: title,
    p_program: program,
    p_teacher_person_ids: [teacherPersonId],
    p_offering_periods: offeringPeriods,
    p_meetings: normalizedMeetings,
    p_description: description || null,
    p_syllabus_url: syllabusUrl || null,
    p_intro_video_url: introVideoUrl || null,
    p_prerequisites: prerequisites || null,
    p_max_enrollment: maxEnrollment ?? null,
    p_proposed_fee: proposedFee ?? null,
  });

  if (error) throw error;
  return data;
}

export async function resubmitClassProposal({ proposalId, teacherPersonId, ...values }) {
  const { data, error } = await supabase.rpc("resubmit_class_proposal", {
    p_class_proposal_id: proposalId,
    p_title: values.title,
    p_program: values.program,
    p_teacher_person_ids: [teacherPersonId],
    p_offering_periods: values.offeringPeriods,
    p_meetings: values.meetings.map((meeting) => ({
      day_of_week: meeting.dayOfWeek,
      start_time: meeting.startTime,
      duration_minutes: meeting.durationMinutes,
    })),
    p_description: values.description || null,
    p_syllabus_url: values.syllabusUrl || null,
    p_intro_video_url: values.introVideoUrl || null,
    p_prerequisites: values.prerequisites || null,
    p_max_enrollment: values.maxEnrollment ?? null,
    p_proposed_fee: values.proposedFee ?? null,
  });
  if (error) throw error;
  return data;
}

export async function loadMyClassProposals() {
  const { data, error } = await supabase
    .from("class_proposals")
    .select("id, proposed_title, program, description, status, submitted_at, created_at, review_notes, responses, max_enrollment, proposed_fee, syllabus_url, intro_video_url, prerequisites")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
