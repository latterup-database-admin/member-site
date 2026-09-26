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
      unlimited: false,
      classLimit: 2,
      label: '2 classes per student',
      detail: 'A qualifying Junior contribution removes this limit.',
    },
    youth: {
      eligible: true,
      contributionApproved: true,
      label: 'Unlocked',
      detail: 'Your approved contribution includes Youth registration.',
    },
    window: {
      isOpen: false,
      label: 'Registration is currently closed',
      nextOpensAt: null,
    },
  },
  household: {
    familyName: 'Sample Family',
    students: [
      {
        id: 'preview-junior',
        name: 'Avery',
        memberType: 'Junior',
        classes: [
          {
            enrollmentId: 'preview-enrollment-1',
            name: 'American History',
            period: 'fall_session_2',
            meetings: [
              {
                dayOfWeek: 3,
                startTime: '10:00:00',
                durationMinutes: 60,
                timezone: 'America/New_York',
              },
            ],
          },
          {
            enrollmentId: 'preview-enrollment-2',
            name: 'Build With Me',
            period: 'spring_session_1',
            meetings: [
              {
                dayOfWeek: 2,
                startTime: '11:00:00',
                durationMinutes: 60,
                timezone: 'America/New_York',
              },
            ],
          },
        ],
      },
      {
        id: 'preview-youth',
        name: 'Jordan',
        memberType: 'Youth',
        classes: [
          {
            enrollmentId: 'preview-enrollment-3',
            name: 'American Literature',
            period: 'year_long',
            meetings: [
              {
                dayOfWeek: 4,
                startTime: '12:00:00',
                durationMinutes: 60,
                timezone: 'America/New_York',
              },
            ],
          },
          {
            enrollmentId: 'preview-enrollment-4',
            name: 'ASL Immersion',
            period: 'year_long',
            meetings: [
              {
                dayOfWeek: 1,
                startTime: '09:00:00',
                durationMinutes: 60,
                timezone: 'America/New_York',
              },
            ],
          },
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

export const emptyDashboardData = {
  membership: {
    schoolYear: 'Not set',
    status: 'Unknown',
    duesStatus: 'Unknown',
  },
  registration: {
    junior: {
      eligible: false,
      label: 'Unavailable',
      detail: '',
    },
    youth: {
      eligible: false,
      label: 'Unavailable',
      detail: '',
    },
    window: {
      isOpen: false,
      label: 'Registration status unavailable',
    },
  },
  household: {
    familyName: 'Your Family',
    students: [],
  },
  finance: {
    balance: 0,
    dueItems: 0,
  },
  announcements: [],
}

export async function loadDashboardData(portalContext) {
  const householdId = portalContext?.households?.[0]?.id ?? null

  const { data, error } = await supabase.rpc('get_my_dashboard', {
    p_household_id: householdId,
  })

  if (error) throw error
  if (!data) return emptyDashboardData

  return normalizeDashboardData(data)
}

function normalizeDashboardData(data) {
  const students = Array.isArray(data?.household?.students)
    ? data.household.students.map(normalizeStudent)
    : []

  return {
    membership: {
      schoolYear: data?.membership?.schoolYear ?? 'Not set',
      status: titleCase(data?.membership?.status ?? 'unknown'),
      duesStatus: titleCase(data?.membership?.duesStatus ?? 'unknown'),
    },
    registration: {
      junior: {
        eligible: Boolean(data?.registration?.junior?.eligible),
        unlimited: Boolean(data?.registration?.junior?.unlimited),
        classLimit: data?.registration?.junior?.classLimit ?? null,
        label: data?.registration?.junior?.label ?? 'Unavailable',
        detail: data?.registration?.junior?.detail ?? '',
      },
      youth: {
        eligible: Boolean(data?.registration?.youth?.eligible),
        contributionApproved: Boolean(
          data?.registration?.youth?.contributionApproved,
        ),
        label: data?.registration?.youth?.label ?? 'Unavailable',
        detail: data?.registration?.youth?.detail ?? '',
      },
      window: {
        isOpen: Boolean(data?.registration?.window?.isOpen),
        label: formatRegistrationWindow(data?.registration?.window),
        nextOpensAt: data?.registration?.window?.nextOpensAt ?? null,
      },
    },
    household: {
      id: data?.household?.id ?? null,
      familyName: data?.household?.familyName ?? 'Your Family',
      students,
    },
    finance: {
      balance: Number(data?.finance?.balance ?? 0),
      dueItems: Number(data?.finance?.dueItems ?? 0),
    },
    announcements: Array.isArray(data?.announcements)
      ? data.announcements
      : [],
  }
}

function normalizeStudent(student) {
  const classes = Array.isArray(student?.classes)
    ? student.classes.map(normalizeClass)
    : []

  return {
    id: student?.id,
    name: student?.name ?? 'Student',
    memberType: student?.memberType ?? 'Student',
    classSummary: `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`,
    classes,
  }
}

function normalizeClass(classItem) {
  const meetings = Array.isArray(classItem?.meetings)
    ? classItem.meetings
    : []

  return {
    enrollmentId: classItem?.enrollmentId,
    offeringId: classItem?.offeringId,
    name: classItem?.name ?? 'Class',
    period: formatPeriod(classItem?.period),
    schedule: formatMeetings(meetings),
    startsOn: classItem?.startsOn ?? null,
    endsOn: classItem?.endsOn ?? null,
  }
}

function formatRegistrationWindow(windowInfo) {
  if (windowInfo?.isOpen) return 'Registration is open'

  if (windowInfo?.nextOpensAt) {
    const date = new Date(windowInfo.nextOpensAt)

    if (!Number.isNaN(date.getTime())) {
      return `Opens ${new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)}`
    }
  }

  return windowInfo?.label ?? 'Registration is currently closed'
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

  return labels[value] ?? titleCase(value)
}

function formatMeetings(meetings) {
  if (!meetings.length) return 'Schedule TBD'

  return meetings
    .map(formatMeeting)
    .filter(Boolean)
    .join(' · ')
}

function formatMeeting(meeting) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[Number(meeting?.dayOfWeek)] ?? ''
  const time = formatTime(meeting?.startTime)
  const zone = meeting?.timezone === 'America/New_York' ? 'ET' : ''

  return [day, time, zone].filter(Boolean).join(' ')
}

function formatTime(value) {
  if (!value) return ''

  const [hourText = '0', minute = '00'] = String(value).split(':')
  let hour = Number(hourText)

  if (Number.isNaN(hour)) return value

  const suffix = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12

  return `${hour}:${minute} ${suffix}`
}

function titleCase(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
