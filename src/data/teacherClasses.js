import { supabase } from "../lib/supabase";

export async function loadMyTeacherClasses() {
  const { data, error } = await supabase.rpc("get_my_teacher_classes");
  if (error) throw error;
  return data ?? [];
}

export async function loadMyTeacherClassManagement(classOfferingId) {
  const { data, error } = await supabase.rpc(
    "get_my_teacher_class_management",
    { p_class_offering_id: classOfferingId },
  );
  if (error) throw error;
  return data ?? null;
}

export async function reviewMyTeacherClassException({
  exceptionRequestId,
  decision,
  reviewNotes = "",
}) {
  const { error } = await supabase.rpc(
    "review_class_eligibility_exception",
    {
      p_exception_request_id: exceptionRequestId,
      p_decision: decision,
      p_review_notes: reviewNotes.trim() || null,
    },
  );
  if (error) throw error;
}


export async function admitMyTeacherWaitlistedStudent({
  waitlistEntryId,
  allowOverCapacity = false,
  reason = "",
}) {
  const { data, error } = await supabase.rpc(
    "admit_waitlisted_student",
    {
      p_waitlist_entry_id: waitlistEntryId,
      p_allow_over_capacity: Boolean(allowOverCapacity),
      p_reason: reason.trim() || null,
    },
  );

  if (error) throw error;
  return data?.[0] ?? null;
}
