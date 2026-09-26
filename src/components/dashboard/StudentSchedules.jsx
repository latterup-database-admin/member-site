import { BookOpen, CalendarClock } from 'lucide-react'
import DashboardCard from './DashboardCard'

export default function StudentSchedules({ students = [] }) {
  return (
    <DashboardCard>
      <div className="flex items-center justify-between gap-3 border-b border-brand-sand/25 p-5 sm:p-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-brand-sky">
            My family
          </p>

          <h2 className="brand-title mt-1 text-2xl text-brand-navy">
            Student schedules
          </h2>
        </div>

        <CalendarClock className="text-brand-gold" />
      </div>

      <div className="divide-y divide-brand-sand/25">
        {students.length === 0 ? (
          <div className="p-6 text-sm text-brand-taupe">
            No student enrollments are showing for the current school year yet.
          </div>
        ) : (
          students.map((student) => {
            const classes = student?.classes ?? []

            return (
              <div key={student.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="brand-title text-xl text-brand-navy">
                      {student.name}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                        student.memberType === 'Junior'
                          ? 'bg-brand-junior/15 text-[#aa413e]'
                          : 'bg-brand-sky/25 text-brand-navy'
                      }`}
                    >
                      {student.memberType}
                    </span>
                  </div>

                  <span className="text-sm font-bold text-brand-taupe">
                    {student.classSummary}
                  </span>
                </div>

                {classes.length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {classes.map((classItem, index) => (
                      <div
                        key={`${student.id}-${index}`}
                        className="rounded-xl border border-brand-sand/35 bg-stone-50 p-3"
                      >
                        <div className="flex gap-2">
                          <BookOpen
                            size={16}
                            className="mt-0.5 shrink-0 text-brand-sky"
                          />

                          <div>
                            <p className="font-extrabold text-brand-navy">
                              {classItem.name}
                            </p>

                            <p className="mt-0.5 text-xs font-semibold text-brand-taupe">
                              {classItem.period}
                            </p>

                            <p className="mt-1 text-sm text-brand-taupe">
                              {classItem.schedule}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </DashboardCard>
  )
}