import { Clock3 } from "lucide-react";
import { periodLabel } from "../../data/classes";

export default function ClassCatalogCalendar({ offerings, onOpen }) {
  const flexible = offerings.filter(
    (course) => course.scheduleMode === "flexible",
  );

  const entries = buildCalendarEntries(
    offerings.filter((course) => course.scheduleMode !== "flexible"),
  );

  const days = [
    ...new Set(entries.map(({ meeting }) => meeting.dayOfWeek)),
  ].sort((a, b) => dayOrder(a) - dayOrder(b));

  const startHours = entries.map(({ meeting }) =>
    Number(String(meeting.startTime).split(":")[0]),
  );

  const firstHour = startHours.length ? Math.min(...startHours) : 8;

  const lastHour = startHours.length ? Math.max(...startHours) : 17;

  const hours = [];

  for (let hour = firstHour; hour <= lastHour; hour += 1) {
    hours.push(hour);
  }

  return (
    <div className="space-y-5">
      {flexible.length > 0 && (
        <section className="rounded-2xl border border-brand-sky/40 bg-brand-sky/10 p-4">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-brand-navy" />

            <div>
              <h2 className="brand-title text-xl text-brand-navy">
                Flexible / anytime
              </h2>

              <p className="text-xs font-semibold text-brand-taupe">
                Year-long classes without a fixed weekly meeting time
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {flexible.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => onOpen(course)}
                className="focus-ring rounded-xl border border-brand-sky/40 bg-white px-3 py-2 text-left text-sm font-extrabold text-brand-navy transition hover:border-brand-navy"
              >
                {course.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {entries.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-brand-sand/45 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div
              className="min-w-[850px]"
              style={{
                display: "grid",
                gridTemplateColumns: `90px repeat(${days.length}, minmax(160px, 1fr))`,
              }}
            >
              <div className="border-b border-r border-brand-sand/35 bg-stone-50" />

              {days.map((day) => (
                <div
                  key={day}
                  className="border-b border-r border-brand-sand/35 bg-stone-50 px-3 py-3 text-center text-sm font-extrabold text-brand-navy last:border-r-0"
                >
                  {dayLabel(day)}
                </div>
              ))}

              {hours.flatMap((hour) => [
                <div
                  key={`label-${hour}`}
                  className="border-b border-r border-brand-sand/30 bg-stone-50 px-2 py-3 text-right text-xs font-bold text-brand-taupe"
                >
                  {formatHour(hour)}
                </div>,

                ...days.map((day) => {
                  const classes = entries
                    .filter(({ meeting }) => {
                      const meetingHour = Number(
                        String(meeting.startTime).split(":")[0],
                      );

                      return meeting.dayOfWeek === day && meetingHour === hour;
                    })
                    .sort((a, b) =>
                      String(a.meeting.startTime).localeCompare(
                        String(b.meeting.startTime),
                      ),
                    );

                  return (
                    <div
                      key={`${hour}-${day}`}
                      className="min-h-24 space-y-2 border-b border-r border-brand-sand/30 p-2 last:border-r-0"
                    >
                      {classes.map(({ course, meeting, periods }) => (
                        <button
                          key={`${course.id}-${day}-${meeting.startTime}`}
                          type="button"
                          onClick={() => onOpen(course)}
                          className={`focus-ring w-full rounded-lg border-l-4 bg-stone-50 p-2 text-left transition hover:bg-brand-sky/10 ${calendarAudienceBorder(
                            course,
                          )}`}
                        >
                          <p className="text-[11px] font-bold text-brand-taupe">
                            {formatTime(meeting.startTime)}
                          </p>

                          <p className="mt-0.5 text-xs font-extrabold leading-tight text-brand-navy">
                            {course.title}
                          </p>

                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <CalendarAudienceBadge course={course} />
                            <CalendarTypeBadge category={course.category} />
                          </div>

                          {periods.length > 0 && (
                            <p className="mt-1 text-[10px] font-bold leading-tight text-brand-taupe">
                              {periods.map(periodLabel).join(" · ")}s
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                }),
              ])}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function buildCalendarEntries(courses) {
  const entries = [];

  for (const course of courses) {
    const groups = new Map();

    for (const offering of course.offerings || [course]) {
      for (const meeting of offering.meetings || []) {
        const key = [
          meeting.dayOfWeek,
          meeting.startTime,
          meeting.durationMinutes,
          meeting.timezone,
        ].join("|");

        if (!groups.has(key)) {
          groups.set(key, {
            course,
            meeting,
            periods: [],
          });
        }

        const group = groups.get(key);

        if (
          offering.offeringPeriod &&
          !group.periods.includes(offering.offeringPeriod)
        ) {
          group.periods.push(offering.offeringPeriod);
        }
      }
    }

    for (const group of groups.values()) {
      group.periods.sort((a, b) => periodOrder(a) - periodOrder(b));

      entries.push(group);
    }
  }

  return entries;
}

function formatHour(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 || 12;

  return `${displayHour}:00 ${suffix}`;
}

function formatTime(value) {
  const [hourText = "0", minute = "00"] = String(value).split(":");

  let hour = Number(hourText);

  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}

function dayLabel(value) {
  return (
    [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][value] || ""
  );
}

function dayOrder(value) {
  return value === 0 ? 7 : value;
}

function periodOrder(value) {
  const order = {
    fall_session_1: 1,
    fall_session_2: 2,
    fall: 3,
    spring_session_1: 4,
    spring_session_2: 5,
    spring: 6,
    year_long: 7,
  };

  return order[value] ?? 99;
}

function calendarAudienceLabel(course) {
  if (course.program === "junior") {
    return "Junior";
  }

  if (course.catalogGroup === "Middle School") {
    return "Middle School";
  }

  if (course.catalogGroup === "High School") {
    return "High School";
  }

  return "Youth";
}

function calendarAudienceBorder(course) {
  const label = calendarAudienceLabel(course);

  const styles = {
    Junior: "border-brand-junior",
    "Middle School": "border-brand-sky",
    "High School": "border-brand-gold",
    Youth: "border-brand-sand",
  };

  return styles[label] ?? styles.Youth;
}

function CalendarAudienceBadge({ course }) {
  const label = calendarAudienceLabel(course);

  const styles = {
    Junior: "bg-brand-junior/15 text-[#9f3d39]",
    "Middle School": "bg-brand-sky/20 text-brand-navy",
    "High School": "bg-brand-gold/20 text-brand-navy",
    Youth: "bg-brand-sand/25 text-brand-navy",
  };

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
        styles[label] ?? styles.Youth
      }`}
    >
      {label}
    </span>
  );
}

function CalendarTypeBadge({ category }) {
  const type = normalizeClassType(category);

  if (!type) return null;

  const styles = {
    Core: "bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/20",

    Elective: "bg-brand-sky/20 text-brand-navy ring-1 ring-brand-sky/35",

    Enrichment: "bg-brand-gold/20 text-brand-navy ring-1 ring-brand-gold/35",
  };

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${styles[type]}`}
    >
      {type}
    </span>
  );
}

function normalizeClassType(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized.includes("core")) {
    return "Core";
  }

  if (normalized.includes("elective")) {
    return "Elective";
  }

  if (normalized.includes("enrichment")) {
    return "Enrichment";
  }

  return null;
}
