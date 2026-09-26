import { supabase } from '../lib/supabase'

const DEV_PREVIEW =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEV_PREVIEW === 'true'

const previewStudents = [
  {
    id: 'preview-junior',
    household_id: 'preview-household',
    name: 'Sample Junior',
    first_name: 'Sample',
    last_name: 'Junior',
    member_type: 'junior',
  },
  {
    id: 'preview-youth',
    household_id: 'preview-household',
    name: 'Sample Youth',
    first_name: 'Sample',
    last_name: 'Youth',
    member_type: 'youth',
  },
]

function offeringId(offering) {
  return (
    offering?.id ??
    offering?.class_offering_id ??
    offering?.classOfferingId
  )
}

function normalizeProgram(value) {
  return String(value ?? '').toLowerCase()
}

export async function getRegistrationContext() {
  if (DEV_PREVIEW) {
    return {
      students: previewStudents,
    }
  }

  const { data, error } = await supabase.rpc(
    'get_my_registration_context'
  )

  if (error) throw error

  return data ?? { students: [] }
}

export async function getRegistrationPreview(
  studentId,
  offering
) {
  if (DEV_PREVIEW) {
    const program = normalizeProgram(offering?.program)

    const isFull = Boolean(
      offering?.isFull ??
      offering?.is_full ??
      false
    )

    return {
      eligible: true,
      blocking_reason: null,
      program,
      already_enrolled: false,
      already_waitlisted: false,
      max_enrollment:
        offering?.maxEnrollment ??
        offering?.max_enrollment ??
        12,
      enrolled_count:
        offering?.enrolledCount ??
        offering?.enrolled_count ??
        (isFull ? 12 : 7),
      is_full: isFull,
      unlimited_classes: false,
      class_limit:
        program === 'junior'
          ? 2
          : null,
      current_junior_class_count:
        program === 'junior'
          ? 1
          : 0,
      schedule_conflicts: [],
      fee: offering?.fee ?? 0,
    }
  }

  const id = offeringId(offering)

  const { data, error } = await supabase.rpc(
    'get_my_registration_preview',
    {
      p_student_person_id: studentId,
      p_class_offering_id: id,
    }
  )

  if (error) throw error

  return data
}

export async function registerStudentForOffering({
  studentId,
  offering,
  joinWaitlistIfFull = false,
}) {
  if (DEV_PREVIEW) {
    const isFull = Boolean(
      offering?.isFull ??
      offering?.is_full ??
      false
    )

    if (isFull && !joinWaitlistIfFull) {
      return {
        result: 'full',
        message:
          'Class is full. Offer the user the option to join the waitlist.',
      }
    }

    if (isFull && joinWaitlistIfFull) {
      return {
        result: 'waitlisted',
        waitlist_position: 2,
        message:
          'Student was added to the waitlist.',
      }
    }

    return {
      result: 'enrolled',
      enrollment_id: 'preview-enrollment',
      charge_id: 'preview-charge',
      fee_amount: offering?.fee ?? 0,
      schedule_conflicts: [],
      message: 'Enrollment secured.',
    }
  }

  const id = offeringId(offering)

  const { data, error } = await supabase.rpc(
    'register_my_student_for_offering',
    {
      p_student_person_id: studentId,
      p_class_offering_id: id,
      p_join_waitlist_if_full:
        joinWaitlistIfFull,
    }
  )

  if (error) throw error

  return data
}