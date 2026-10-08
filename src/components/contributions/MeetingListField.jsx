import { Plus, Trash2 } from "lucide-react";

const DAYS = [
  // { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  // { value: 5, label: "Friday" },
  // { value: 6, label: "Saturday" },
];

const DURATIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 75, label: "75 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "2 hours" },
];

function createMeeting() {
  return {
    dayOfWeek: 1,
    startTime: "",
    durationMinutes: 60,
    timezone: "America/New_York",
  };
}

export default function MeetingListField({
  meetings,
  onChange,
  disabled = false,
}) {
  function addMeeting() {
    onChange([...meetings, createMeeting()]);
  }

  function updateMeeting(index, changes) {
    onChange(
      meetings.map((meeting, meetingIndex) =>
        meetingIndex === index
          ? {
              ...meeting,
              ...changes,
            }
          : meeting,
      ),
    );
  }

  function removeMeeting(index) {
    onChange(meetings.filter((_, meetingIndex) => meetingIndex !== index));
  }

  return (
    <div>
      <div>
        <div className="text-sm font-bold text-brand-navy">Class schedule</div>
      </div>

      <div className="mt-4 space-y-3">
        {meetings.map((meeting, index) => (
          <div
            key={index}
            className="rounded-2xl border border-brand-sand/40 bg-brand-sand/5 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <div>
                <label
                  htmlFor={`meeting-day-${index}`}
                  className="text-xs font-bold text-brand-navy"
                >
                  Day
                </label>

                <select
                  id={`meeting-day-${index}`}
                  value={meeting.dayOfWeek}
                  disabled={disabled}
                  onChange={(event) =>
                    updateMeeting(index, {
                      dayOfWeek: Number(event.target.value),
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20 disabled:opacity-60"
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`meeting-time-${index}`}
                    className="text-xs font-bold text-brand-navy"
                  >
                    Start time
                  </label>

                  <div className="text-sm font-bold text-brand-junior">
                    Enter all class times in Eastern Time (ET).
                  </div>
                </div>

                <input
                  id={`meeting-time-${index}`}
                  type="time"
                  value={meeting.startTime}
                  disabled={disabled}
                  onChange={(event) =>
                    updateMeeting(index, {
                      startTime: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor={`meeting-duration-${index}`}
                  className="text-xs font-bold text-brand-navy"
                >
                  Duration
                </label>

                <select
                  id={`meeting-duration-${index}`}
                  value={meeting.durationMinutes}
                  disabled={disabled}
                  onChange={(event) =>
                    updateMeeting(index, {
                      durationMinutes: Number(event.target.value),
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20 disabled:opacity-60"
                >
                  {DURATIONS.map((duration) => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={disabled || meetings.length === 1}
                onClick={() => removeMeeting(index)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-sand/50 text-brand-taupe transition hover:border-brand-junior/50 hover:bg-brand-junior/10 hover:text-brand-junior disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Remove meeting time"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={addMeeting}
        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-brand-navy transition hover:text-brand-sky disabled:opacity-50"
      >
        <Plus size={16} />
        Add another meeting
      </button>
    </div>
  );
}
