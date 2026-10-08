import { supabase } from '../lib/supabase'

export const previewClassCatalog = {
  schoolYear: '2026–2027',
  offerings: [
    {
      id: 'preview-jr-history-f1',
      courseId: 'preview-jr-history',
      title: 'American History',
      description: 'Explore major people, events, ideas, and stories in American history through discussion, projects, and age-appropriate source material.',
      syllabusUrl: '#',
      introVideoUrl: null,
      prerequisites: null,
      category: 'Enrichment',
      program: 'junior',
      offeringPeriod: 'fall_session_1',
      startsOn: '2026-09-08',
      endsOn: '2026-10-20',
      maxEnrollment: 12,
      enrolledCount: 7,
      seatsRemaining: 5,
      isFull: false,
      fee: 35,
      catalogGroup: '9 through 11',
      minimumAge: 9,
      maximumAge: 11,
      ageExceptionNotes: null,
      status: 'registration_open',
      meetings: [{ dayOfWeek: 3, startTime: '10:00:00', durationMinutes: 60, timezone: 'America/New_York' }],
      instructors: [{ name: 'Taylor Morgan', role: 'primary_teacher' }],
    },
    {
      id: 'preview-jr-art-s1',
      courseId: 'preview-jr-art',
      title: 'Art Adventures',
      description: 'A hands-on creative class using drawing, painting, collage, and mixed media to explore technique and personal expression.',
      syllabusUrl: null,
      introVideoUrl: null,
      prerequisites: null,
      category: 'Enrichment',
      program: 'junior',
      offeringPeriod: 'spring_session_1',
      startsOn: '2027-01-12',
      endsOn: '2027-02-23',
      maxEnrollment: 10,
      enrolledCount: 10,
      seatsRemaining: 0,
      isFull: true,
      fee: 45,
      catalogGroup: 'JR All Ages',
      minimumAge: null,
      maximumAge: null,
      ageExceptionNotes: 'Younger Juniors may participate with parent discretion.',
      status: 'registration_open',
      meetings: [{ dayOfWeek: 2, startTime: '11:00:00', durationMinutes: 60, timezone: 'America/New_York' }],
      instructors: [{ name: 'Morgan Lee', role: 'primary_teacher' }],
    },
    {
      id: 'preview-youth-chemistry',
      courseId: 'preview-youth-chemistry-course',
      title: 'Chemistry',
      description: 'A year-long chemistry course combining conceptual instruction, problem solving, and laboratory demonstrations.',
      syllabusUrl: '#',
      introVideoUrl: '#',
      prerequisites: 'Comfort with basic algebra is recommended.',
      category: 'Core',
      program: 'youth',
      offeringPeriod: 'year_long',
      startsOn: '2026-09-03',
      endsOn: '2027-05-06',
      maxEnrollment: 18,
      enrolledCount: 14,
      seatsRemaining: 4,
      isFull: false,
      fee: 185,
      catalogGroup: 'High School',
      minimumAge: null,
      maximumAge: null,
      ageExceptionNotes: null,
      status: 'registration_open',
      meetings: [
        { dayOfWeek: 4, startTime: '12:00:00', durationMinutes: 60, timezone: 'America/New_York' },
      ],
      instructors: [{ name: 'Casey Adams', role: 'primary_teacher' }],
    },
    {
      id: 'preview-youth-lit',
      courseId: 'preview-youth-lit-course',
      title: 'American Literature',
      description: 'Read and discuss American literature across several periods with an emphasis on analysis, writing, and thoughtful conversation.',
      syllabusUrl: '#',
      introVideoUrl: null,
      prerequisites: null,
      category: 'Core',
      program: 'youth',
      offeringPeriod: 'fall',
      startsOn: '2026-09-01',
      endsOn: '2026-12-08',
      maxEnrollment: 16,
      enrolledCount: 12,
      seatsRemaining: 4,
      isFull: false,
      fee: 120,
      catalogGroup: 'All Youth',
      minimumAge: null,
      maximumAge: null,
      ageExceptionNotes: null,
      status: 'registration_open',
      meetings: [{ dayOfWeek: 4, startTime: '12:00:00', durationMinutes: 60, timezone: 'America/New_York' }],
      instructors: [{ name: 'Jordan Brooks', role: 'primary_teacher' }],
    },
    {
      id: 'preview-youth-web',
      courseId: 'preview-youth-web-course',
      title: 'Web Development',
      description: 'Build responsive websites while learning HTML, CSS, JavaScript, design principles, and practical development workflows.',
      syllabusUrl: null,
      introVideoUrl: null,
      prerequisites: 'Students should be comfortable using a computer and Google Workspace.',
      category: 'Elective',
      program: 'youth',
      offeringPeriod: 'spring',
      startsOn: '2027-01-14',
      endsOn: '2027-05-06',
      maxEnrollment: 14,
      enrolledCount: 6,
      seatsRemaining: 8,
      isFull: false,
      fee: 95,
      catalogGroup: 'Middle School',
      minimumAge: null,
      maximumAge: null,
      ageExceptionNotes: 'High school students are also welcome.',
      status: 'published',
      meetings: [{ dayOfWeek: 4, startTime: '14:00:00', durationMinutes: 75, timezone: 'America/New_York' }],
      instructors: [{ name: 'Alex Rivera', role: 'primary_teacher' }],
    },
  ],
}

export async function loadClassCatalog() {
  const { data, error } = await supabase.rpc('get_member_class_catalog')
  if (error) throw error

  return {
    schoolYear: data?.school_year?.name || '',
    offerings: (data?.offerings || []).map(normalizeOffering),
  }
}

function normalizeOffering(row) {
  const meetings = (row.meetings || []).map((meeting) => ({
    dayOfWeek: meeting.day_of_week,
    startTime: meeting.start_time,
    durationMinutes: meeting.duration_minutes,
    timezone: meeting.timezone,
  }))

  const scheduleMode =
    row.schedule_mode ||
    (row.offering_period === 'year_long' && meetings.length === 0
      ? 'flexible'
      : 'scheduled')

  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    syllabusUrl: row.syllabus_url,
    introVideoUrl: row.intro_video_url,
    prerequisites: row.prerequisites,
    category: row.category,
    program: row.program,
    offeringPeriod: row.offering_period,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    maxEnrollment: row.max_enrollment,
    enrolledCount: Number(row.enrolled_count || 0),
    seatsRemaining: row.seats_remaining === null ? null : Number(row.seats_remaining),
    isFull: Boolean(row.is_full),
    fee: Number(row.fee || 0),
    catalogGroup: row.catalog_group,
    minimumAge: row.minimum_age,
    maximumAge: row.maximum_age,
    ageExceptionNotes: row.age_exception_notes,
    status: row.status,
    scheduleMode,
    meetings,
    instructors: (row.instructors || []).map((instructor) => ({
      name: instructor.name,
      role: instructor.role,
    })),
  }
}

export function periodLabel(value) {
  const labels = {
    fall: 'Fall',
    spring: 'Spring',
    year_long: 'Year Long',
    fall_session_1: 'Fall Session 1',
    fall_session_2: 'Fall Session 2',
    spring_session_1: 'Spring Session 1',
    spring_session_2: 'Spring Session 2',
  }
  return labels[value] || titleCase(value || '')
}

export function formatMeeting(meeting) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const [hourText = '0', minute = '00'] = String(meeting?.startTime || '00:00').split(':')
  let hour = Number(hourText)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  const duration = meeting?.durationMinutes && meeting.durationMinutes !== 60
    ? ` · ${meeting.durationMinutes} min`
    : ''
  return `${days[meeting?.dayOfWeek] || ''} · ${hour}:${minute} ${suffix} ET${duration}`
}

export function titleCase(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
