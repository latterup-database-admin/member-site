import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  LockKeyhole,
  Users,
} from 'lucide-react'

import {
  getRegistrationContext,
  getRegistrationPreview,
  registerStudentForOffering,
} from '../../data/registration'

function normalizeProgram(value) {
  return String(value ?? '').toLowerCase()
}

function formatProgram(value) {
  const program = normalizeProgram(value)

  if (program === 'junior') return 'Junior'
  if (program === 'youth') return 'Youth'

  return value ?? ''
}

function formatTime(value) {
  if (!value) return ''

  const [hours, minutes] = String(value).split(':')
  const date = new Date()

  date.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  )

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function RegistrationPanel({
  offering,
  onRegistrationComplete,
}) {
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] =
    useState('')

  const [loadingStudents, setLoadingStudents] =
    useState(true)

  const [loadingPreview, setLoadingPreview] =
    useState(false)

  const [submitting, setSubmitting] =
    useState(false)

  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const program = normalizeProgram(
    offering?.program
  )

  const eligibleStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          normalizeProgram(student.member_type) ===
          program
      ),
    [students, program]
  )

  useEffect(() => {
    let active = true

    async function loadStudents() {
      try {
        setLoadingStudents(true)
        setError('')

        const context =
          await getRegistrationContext()

        if (!active) return

        setStudents(
          context?.students ?? []
        )
      } catch (err) {
        if (!active) return

        setError(
          err?.message ??
            'Unable to load students.'
        )
      } finally {
        if (active) {
          setLoadingStudents(false)
        }
      }
    }

    loadStudents()

    return () => {
      active = false
    }
  }, [])


  useEffect(() => {
    if (!selectedStudentId) {
      setPreview(null)
      setResult(null)
      return
    }

    let active = true

    async function loadPreview() {
      try {
        setLoadingPreview(true)
        setError('')
        setResult(null)

        const nextPreview =
          await getRegistrationPreview(
            selectedStudentId,
            offering
          )

        if (!active) return

        setPreview(nextPreview)
      } catch (err) {
        if (!active) return

        setError(
          err?.message ??
            'Unable to check registration eligibility.'
        )
      } finally {
        if (active) {
          setLoadingPreview(false)
        }
      }
    }

    loadPreview()

    return () => {
      active = false
    }
  }, [
    selectedStudentId,
    offering,
  ])


  async function submit({
    joinWaitlist = false,
  } = {}) {
    if (!selectedStudentId) return

    try {
      setSubmitting(true)
      setError('')

      const response =
        await registerStudentForOffering({
          studentId:
            selectedStudentId,

          offering,

          joinWaitlistIfFull:
            joinWaitlist,
        })

      setResult(response)

      if (
        response?.result === 'enrolled' ||
        response?.result === 'waitlisted'
      ) {
        onRegistrationComplete?.(
          response
        )

        const refreshed =
          await getRegistrationPreview(
            selectedStudentId,
            offering
          )

        setPreview(refreshed)
      }
    } catch (err) {
      setError(
        err?.message ??
          'Registration could not be completed.'
      )
    } finally {
      setSubmitting(false)
    }
  }


  const conflicts =
    preview?.schedule_conflicts ?? []

  const blocked =
    preview &&
    !preview.eligible

  const alreadyEnrolled =
    preview?.already_enrolled

  const alreadyWaitlisted =
    preview?.already_waitlisted

  const isFull =
    preview?.is_full

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-brand-sand/45 bg-stone-50">
      <div className="border-b border-brand-sand/30 bg-white p-4 sm:p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-junior">
          Registration
        </p>

        <h3 className="brand-title mt-1 text-xl text-brand-navy">
          Register a student
        </h3>

        <p className="mt-1 text-sm text-brand-taupe">
          Select a {formatProgram(program)} student
          to check eligibility, capacity, and
          schedule conflicts.
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {loadingStudents ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-taupe">
            <Loader2
              size={16}
              className="animate-spin"
            />
            Loading your students…
          </div>
        ) : eligibleStudents.length === 0 ? (
          <div className="rounded-xl bg-white p-4 text-sm text-brand-taupe">
            No {formatProgram(program)} students are
            available in your household.
          </div>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-brand-taupe">
              Student
            </span>

            <select
              value={selectedStudentId}
              onChange={(event) =>
                setSelectedStudentId(
                  event.target.value
                )
              }
              className="focus-ring w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 font-semibold text-brand-navy"
            >
              <option value="">
                Choose a student…
              </option>

              {eligibleStudents.map(
                (student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.name}
                  </option>
                )
              )}
            </select>
          </label>
        )}


        {loadingPreview && (
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-taupe">
            <Loader2
              size={16}
              className="animate-spin"
            />
            Checking registration…
          </div>
        )}


        {preview && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-brand-sand/35 bg-white p-3">
                <div className="flex items-center gap-2 text-brand-navy">
                  <Users size={16} />

                  <span className="text-sm font-extrabold">
                    Availability
                  </span>
                </div>

                <p className="mt-1 text-sm text-brand-taupe">
                  {preview.is_full
                    ? 'Class is currently full.'
                    : preview.max_enrollment == null
                      ? 'Space available.'
                      : `${Math.max(
                          preview.max_enrollment -
                            preview.enrolled_count,
                          0
                        )} seats remaining`}
                </p>
              </div>

              <div className="rounded-xl border border-brand-sand/35 bg-white p-3">
                <div className="flex items-center gap-2 text-brand-navy">
                  <CircleDollarSign size={16} />

                  <span className="text-sm font-extrabold">
                    Class fee
                  </span>
                </div>

                <p className="mt-1 text-sm text-brand-taupe">
                  {Number(
                    preview.fee ?? 0
                  ) === 0
                    ? 'No class fee'
                    : `$${Number(
                        preview.fee
                      ).toFixed(2)}`}
                </p>
              </div>
            </div>


            {program === 'junior' && (
              <div className="rounded-xl border border-brand-sky/40 bg-brand-sky/10 p-3 text-sm">
                <strong className="text-brand-navy">
                  Junior class allowance:
                </strong>{' '}

                <span className="text-brand-taupe">
                  {preview.unlimited_classes
                    ? 'Unlimited through your approved contribution.'
                    : `${preview.current_junior_class_count ?? 0} of ${preview.class_limit ?? 2} classes currently registered.`}
                </span>
              </div>
            )}


            {blocked && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <LockKeyhole
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <p className="font-extrabold text-amber-900">
                    Registration unavailable
                  </p>

                  <p className="mt-0.5 text-sm text-amber-800">
                    {preview.blocking_reason}
                  </p>
                </div>
              </div>
            )}


            {conflicts.length > 0 && (
              <div className="rounded-xl border border-brand-gold/45 bg-brand-gold/10 p-3">
                <div className="flex gap-2">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-brand-gold"
                  />

                  <div>
                    <p className="font-extrabold text-brand-navy">
                      Schedule conflict
                    </p>

                    <p className="mt-0.5 text-sm text-brand-taupe">
                      You may still register, but this class
                      overlaps with:
                    </p>

                    <ul className="mt-2 space-y-1 text-sm font-semibold text-brand-navy">
                      {conflicts.map(
                        (conflict, index) => (
                          <li key={index}>
                            {conflict.course_title}{' '}
                            —{' '}
                            {formatTime(
                              conflict.conflicting_start_time
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}


            {alreadyEnrolled && (
              <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                <CheckCircle2 size={18} />
                This student is already enrolled.
              </div>
            )}


            {alreadyWaitlisted && (
              <div className="rounded-xl border border-brand-sand bg-white p-3 text-sm font-bold text-brand-navy">
                This student is already on the waitlist.
              </div>
            )}


            {result?.result ===
              'enrolled' && (
              <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <CheckCircle2
                  size={18}
                  className="shrink-0 text-emerald-700"
                />

                <div>
                  <p className="font-extrabold text-emerald-900">
                    Registration complete
                  </p>

                  <p className="text-sm text-emerald-800">
                    The seat has been secured.
                    {Number(
                      result.fee_amount ?? 0
                    ) > 0 &&
                      ' The class fee has been added to your account.'}
                  </p>
                </div>
              </div>
            )}


            {result?.result ===
              'waitlisted' && (
              <div className="rounded-xl border border-brand-sky bg-brand-sky/10 p-3">
                <p className="font-extrabold text-brand-navy">
                  Added to waitlist
                </p>

                <p className="text-sm text-brand-taupe">
                  Current position:{' '}
                  {result.waitlist_position}
                </p>
              </div>
            )}


            {!blocked &&
              !alreadyEnrolled &&
              !alreadyWaitlisted && (
                <div>
                  {isFull ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        submit({
                          joinWaitlist: true,
                        })
                      }
                      className="focus-ring inline-flex items-center justify-center rounded-lg bg-brand-sky px-4 py-2.5 text-sm font-extrabold text-brand-navy transition hover:brightness-95 disabled:opacity-60"
                    >
                      {submitting
                        ? 'Joining…'
                        : 'Join waitlist'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        submit()
                      }
                      className="focus-ring inline-flex items-center justify-center rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#00153a] disabled:opacity-60"
                    >
                      {submitting
                        ? 'Registering…'
                        : conflicts.length > 0
                          ? 'Register anyway'
                          : 'Register for this class'}
                    </button>
                  )}
                </div>
              )}
          </div>
        )}


        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}
      </div>
    </section>
  )
}