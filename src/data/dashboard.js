import { supabase } from '../lib/supabase'

export const previewDashboardData = {
  membership: {
    schoolYear: '2026–2027',
    status: 'Active',
    duesStatus: 'Paid',
  },
  registration: {
    junior: {
      eligible: true,
      label: '2 classes per student',
      detail: 'A qualifying Junior contribution removes this limit.',
    },
    youth: {
      eligible: true,
      label: 'Unlocked',
      detail: 'Your approved contribution includes Youth registration.',
    },
    window: {
      isOpen: false,
      label: 'Opens October 3 at 9:00 AM ET',
    },
  },
  household: {
    familyName: 'Sample Family',
    students: [
      {
        id: 'preview-junior',
        name: 'Avery',
        memberType: 'Junior',
        classSummary: '2 classes',
        classes: [
          { name: 'American History', schedule: 'Wed · 10:00 AM ET', period: 'Fall Session 2' },
          { name: 'Build With Me', schedule: 'Tue · 11:00 AM ET', period: 'Spring Session 1' },
        ],
      },
      {
        id: 'preview-youth',
        name: 'Jordan',
        memberType: 'Youth',
        classSummary: '3 classes',
        classes: [
          { name: 'American Literature', schedule: 'Thu · 12:00 PM ET', period: 'Year Long' },
          { name: 'ASL Immersion', schedule: 'Mon · 9:00 AM ET', period: 'Year Long' },
          { name: 'Earth Science', schedule: 'Fri · 11:00 AM ET', period: 'Fall' },
        ],
      },
    ],
  },
  finance: {
    balance: 120,
    dueItems: 1,
  },
  announcements: [
    {
      id: 'preview-announcement-1',
      eyebrow: 'Community',
      title: 'Fall registration opens soon',
      body: 'Review your family membership, contribution status, and class choices before registration day.',
    },
    {
      id: 'preview-announcement-2',
      eyebrow: 'Reminder',
      title: 'Check the Members Handbook',
      body: 'Updated resources and current-year information will be linked here for quick access.',
    },
  ],
}

function money(value) {
  return Number(value || 0)
}

export async function loadDashboardData(portalContext) {
  const householdId = portalContext?.households?.[0]?.id
  if (!householdId) return null

  const { data: year, error: yearError } = await supabase
    .from('school_years')
    .select('id,name')
    .eq('is_current', true)
    .maybeSingle()

  if (yearError) throw yearError
  if (!year) return null

  const [membershipResult, membersResult, enrollmentResult, chargesResult, juniorStatusResult, youthStatusResult] = await Promise.all([
    supabase
      .from('household_membership_years')
      .select('status,dues_status')
      .eq('household_id', householdId)
      .eq('school_year_id', year.id)
      .maybeSingle(),

    supabase
      .from('household_members')
      .select('person_id, relationship_type, people(id,preferred_name,first_name,last_name,member_type)')
      .eq('household_id', householdId),

    supabase
      .from('enrollments')
      .select(`
        id,
        student_person_id,
        status,
        class_offerings!inner(
          id,
          school_year_id,
          offering_period,
          courses!inner(title),
          class_meetings(day_of_week,start_time,duration_minutes,timezone)
        )
      `)
      .eq('household_id', householdId)
      .eq('status', 'enrolled')
      .eq('class_offerings.school_year_id', year.id),

    supabase
      .from('charges')
      .select('id,amount,status,charge_type,description')
      .eq('household_id', householdId)
      .not('status', 'in', '(paid,waived,cancelled)'),

    supabase.rpc('get_household_registration_status', {
      p_household_id: householdId,
      p_school_year_id: year.id,
      p_program: 'junior',
    }),

    supabase.rpc('get_household_registration_status', {
      p_household_id: householdId,
      p_school_year_id: year.id,
      p_program: 'youth',
    }),
  ])

  for (const result of [membershipResult, membersResult, enrollmentResult, chargesResult]) {
    if (result.error) throw result.error
  }

  const membership = membershipResult.data
  const members = membersResult.data || []
  const enrollments = enrollmentResult.data || []
  const charges = chargesResult.data || []

  const students = members
    .map((row) => row.people)
    .filter((person) => person && ['junior', 'youth'].includes(person.member_type))
    .map((student) => {
      const studentEnrollments = enrollments.filter((enrollment) => enrollment.student_person_id === student.id)
      return {
        id: student.id,
        name: student.preferred_name || student.first_name,
        memberType: student.member_type === 'junior' ? 'Junior' : 'Youth',
        classSummary: `${studentEnrollments.length} ${studentEnrollments.length === 1 ? 'class' : 'classes'}`,
        classes: studentEnrollments.map((enrollment) => {
          const offering = enrollment.class_offerings
          const meeting = Array.isArray(offering?.class_meetings) ? offering.class_meetings[0] : null
          return {
            name: offering?.courses?.title || 'Class',
            schedule: meeting ? formatMeeting(meeting) : 'Schedule TBD',
            period: formatPeriod(offering?.offering_period),
          }
        }),
      }
    })

  const juniorStatus = Array.isArray(juniorStatusResult.data) ? juniorStatusResult.data[0] : null
  const youthStatus = Array.isArray(youthStatusResult.data) ? youthStatusResult.data[0] : null

  return {
    membership: {
      schoolYear: year.name,
      status: membership?.status ? titleCase(membership.status) : 'Not reenrolled',
      duesStatus: membership?.dues_status ? titleCase(membership.dues_status) : 'Unpaid',
    },
    registration: {
      junior: {
        eligible: Boolean(juniorStatus?.eligible),
        label: juniorStatus?.unlimited_classes ? 'Unlimited classes' : `${juniorStatus?.effective_class_limit ?? 2} classes per student`,
        detail: juniorStatus?.blocking_reason || (juniorStatus?.unlimited_classes
          ? 'Your approved contribution includes unlimited Junior registration.'
          : 'A qualifying Junior contribution removes this limit.'),
      },
      youth: {
        eligible: Boolean(youthStatus?.eligible),
        label: youthStatus?.eligible ? 'Unlocked' : 'Not yet available',
        detail: youthStatus?.blocking_reason || 'Your approved contribution includes Youth registration.',
      },
      window: {
        isOpen: Boolean(juniorStatus?.registration_window_open || youthStatus?.registration_window_open),
        label: (juniorStatus?.registration_window_open || youthStatus?.registration_window_open)
          ? 'Registration is open'
          : 'Registration is currently closed',
      },
    },
    household: {
      familyName: portalContext?.households?.[0]?.family_name || 'Your Family',
      students,
    },
    finance: {
      balance: charges.reduce((sum, charge) => sum + money(charge.amount), 0),
      dueItems: charges.length,
    },
    announcements: previewDashboardData.announcements,
  }
}

function titleCase(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPeriod(value) {
  if (!value) return ''
  const labels = {
    fall: 'Fall',
    spring: 'Spring',
    year_long: 'Year Long',
    fall_session_1: 'Fall Session 1',
    fall_session_2: 'Fall Session 2',
    spring_session_1: 'Spring Session 1',
    spring_session_2: 'Spring Session 2',
  }
  return labels[value] || titleCase(value)
}

function formatMeeting(meeting) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const [hourText, minute] = String(meeting.start_time || '00:00').split(':')
  let hour = Number(hourText)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${days[meeting.day_of_week] || ''} · ${hour}:${minute} ${suffix} ET`
}
