import { Plus, Trash2 } from "lucide-react";

export default function TeacherListField({
  teachers,
  teacherOptions,
  onChange,
  disabled = false,
}) {
  function addTeacher() {
    onChange([...teachers, ""]);
  }

  function updateTeacher(index, personId) {
    const next = [...teachers];
    next[index] = personId;
    onChange(next);
  }

  function removeTeacher(index) {
    onChange(teachers.filter((_, itemIndex) => itemIndex !== index));
  }

  const selectedIds = new Set(teachers.filter(Boolean));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="text-sm font-bold text-brand-navy">
            Teachers
          </label>

          <p className="mt-0.5 text-xs text-brand-taupe">
            Add everyone who will teach this class.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {teachers.map((personId, index) => (
          <div
            key={`${index}-${personId}`}
            className="flex items-center gap-2"
          >
            <select
              value={personId}
              disabled={disabled}
              onChange={(event) =>
                updateTeacher(index, event.target.value)
              }
              className="min-w-0 flex-1 rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20 disabled:opacity-60"
            >
              <option value="">
                Select a teacher
              </option>

              {teacherOptions.map((person) => {
                const alreadySelected =
                  selectedIds.has(person.id) &&
                  person.id !== personId;

                return (
                  <option
                    key={person.id}
                    value={person.id}
                    disabled={alreadySelected}
                  >
                    {person.displayName}
                  </option>
                );
              })}
            </select>

            {teachers.length > 1 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeTeacher(index)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-sand/50 text-brand-taupe transition hover:border-brand-junior/50 hover:bg-brand-junior/10 hover:text-brand-junior disabled:opacity-50"
                aria-label="Remove teacher"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={addTeacher}
        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-brand-navy transition hover:text-brand-sky disabled:opacity-50"
      >
        <Plus size={16} />
        Add teacher
      </button>
    </div>
  );
}