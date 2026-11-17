import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import AgreementEditorModal from "./AgreementEditorModal";
import {
  loadAdminAnnualFeedbackQuestions,
  saveAdminAnnualFeedbackQuestion,
  moveAdminAnnualFeedbackQuestion,
  deleteAdminAnnualFeedbackQuestion,
  copyAnnualFeedbackQuestionsToSchoolYear,
} from "../../data/adminAnnualFeedback";

const TYPE_LABELS = {
  long_text: "Long answer",
  short_text: "Short answer",
  single_choice: "Multiple choice",
};

const NEW_QUESTION = {
  id: null,
  prompt: "",
  helpText: "",
  questionType: "long_text",
  optionsText: "",
  isRequired: true,
};

export default function AnnualFeedbackSettings({ schoolYearId, canManage = false }) {
  const [expanded, setExpanded] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!expanded || !schoolYearId) return;
    let active = true;

    setLoading(true);
    setError("");

    loadAdminAnnualFeedbackQuestions(schoolYearId)
      .then((data) => active && setQuestions(data))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [expanded, schoolYearId, reloadKey]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function openEditor(question) {
    setSaveError("");
    setEditing(
      question
        ? {
            id: question.id,
            prompt: question.prompt,
            helpText: question.help_text ?? "",
            questionType: question.question_type,
            optionsText: (question.options ?? []).join("\n"),
            isRequired: question.is_required,
          }
        : { ...NEW_QUESTION },
    );
  }

  async function handleSave() {
    if (!editing || saving) return;
    setSaving(true);
    setSaveError("");

    try {
      await saveAdminAnnualFeedbackQuestion({
        id: editing.id,
        schoolYearId,
        prompt: editing.prompt,
        helpText: editing.helpText,
        questionType: editing.questionType,
        options:
          editing.questionType === "single_choice"
            ? editing.optionsText.split("\n")
            : [],
        isRequired: editing.isRequired,
      });
      setNotice(editing.id ? "Question updated." : "Question added.");
      setEditing(null);
      reload();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete || deleting) return;
    setDeleting(true);
    setDeleteError("");

    try {
      await deleteAdminAnnualFeedbackQuestion(toDelete.id);
      setToDelete(null);
      setNotice("Question deleted.");
      reload();
    } catch (err) {
      setDeleteError(err.message || "Unable to delete question.");
    } finally {
      setDeleting(false);
    }
  }

  async function runAction(action, successMessage) {
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const result = await action();
      if (successMessage) setNotice(successMessage(result));
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <h2 className="text-lg font-extrabold text-brand-navy">
          Annual Feedback Questions
        </h2>
        <ChevronDown
          size={20}
          className={`shrink-0 text-brand-navy transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-brand-taupe">
              Questions returning families answer during enrollment for the
              selected school year. Editing a question doesn't change answers
              already submitted.
            </p>

            {canManage && (
              <div className="flex flex-wrap gap-2">
                {questions.length === 0 && !loading && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        () => copyAnnualFeedbackQuestionsToSchoolYear(schoolYearId),
                        (n) =>
                          n > 0
                            ? `Copied ${n} questions from the previous school year.`
                            : "The previous school year has no questions to copy.",
                      )
                    }
                    className="btn-secondary"
                  >
                    Copy from previous year
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditor(null)}
                  className="btn-primary"
                >
                  <Plus size={16} />
                  New Question
                </button>
              </div>
            )}
          </div>

          {notice && (
            <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {notice}
            </p>
          )}

          {actionError && (
            <p role="alert" className="text-sm text-red-700">{actionError}</p>
          )}

          {loading ? (
            <p className="text-sm text-brand-taupe">Loading questions…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-700">{error}</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-brand-taupe">
              No feedback questions for this school year.
            </p>
          ) : (
            <ol className="space-y-3">
              {questions.map((q, index) => (
                <li key={q.id} className="rounded-xl border border-brand-sand/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-brand-navy">
                        {index + 1}. {q.prompt}
                        {q.is_required && (
                          <span className="ml-1 text-brand-junior" aria-label="required">*</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-brand-taupe">
                        {TYPE_LABELS[q.question_type] ?? q.question_type}
                        {q.question_type === "single_choice" &&
                          `: ${(q.options ?? []).join(" · ")}`}
                        {q.is_required ? " · Required" : " · Optional"}
                      </p>
                      {q.help_text && (
                        <p className="mt-1 text-sm text-brand-taupe">{q.help_text}</p>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-icon"
                          disabled={busy || index === 0}
                          onClick={() => runAction(() => moveAdminAnnualFeedbackQuestion(q.id, "up"))}
                          aria-label={`Move "${q.prompt}" up`}
                          title="Move question up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          disabled={busy || index === questions.length - 1}
                          onClick={() => runAction(() => moveAdminAnnualFeedbackQuestion(q.id, "down"))}
                          aria-label={`Move "${q.prompt}" down`}
                          title="Move question down"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          disabled={busy}
                          onClick={() => openEditor(q)}
                          aria-label={`Edit "${q.prompt}"`}
                          title="Edit question"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon-danger"
                          disabled={busy}
                          onClick={() => {
                            setDeleteError("");
                            setToDelete(q);
                          }}
                          aria-label={`Delete "${q.prompt}"`}
                          title="Delete question"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <AgreementEditorModal
        open={editing !== null}
        title={editing?.id ? "Edit Question" : "New Question"}
        onClose={() => !saving && setEditing(null)}
        saving={saving}
      >
        {editing && (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-brand-navy">
              Question
              <textarea
                value={editing.prompt}
                onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-brand-sand/60 px-3 py-2 font-normal text-brand-navy"
              />
            </label>

            <label className="block text-sm font-semibold text-brand-navy">
              Help text (optional)
              <input
                type="text"
                value={editing.helpText}
                onChange={(e) => setEditing({ ...editing, helpText: e.target.value })}
                className="mt-1 w-full rounded-lg border border-brand-sand/60 px-3 py-2 font-normal text-brand-navy"
              />
            </label>

            <label className="block text-sm font-semibold text-brand-navy">
              Answer type
              <select
                value={editing.questionType}
                onChange={(e) => setEditing({ ...editing, questionType: e.target.value })}
                className="mt-1 block rounded-lg border border-brand-sand/60 bg-white px-3 py-2 font-normal text-brand-navy"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {editing.questionType === "single_choice" && (
              <label className="block text-sm font-semibold text-brand-navy">
                Choices (one per line, at least two)
                <textarea
                  value={editing.optionsText}
                  onChange={(e) => setEditing({ ...editing, optionsText: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-brand-sand/60 px-3 py-2 font-normal text-brand-navy"
                />
              </label>
            )}

            <label className="flex cursor-pointer items-center gap-3 text-sm text-brand-navy">
              <input
                type="checkbox"
                checked={editing.isRequired}
                onChange={(e) => setEditing({ ...editing, isRequired: e.target.checked })}
                className="h-4 w-4 accent-brand-navy"
              />
              Families must answer this question
            </label>

            {saveError && (
              <p role="alert" className="text-sm text-red-700">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 border-t border-brand-sand/40 pt-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving || editing.prompt.trim() === ""}
                onClick={handleSave}
              >
                {saving ? "Saving…" : "Save Question"}
              </button>
            </div>
          </div>
        )}
      </AgreementEditorModal>

      <AgreementEditorModal
        open={toDelete !== null}
        title="Delete Question"
        onClose={() => {
          if (deleting) return;
          setToDelete(null);
          setDeleteError("");
        }}
        saving={deleting}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-navy">
            Are you sure you want to delete <strong>{toDelete?.prompt}</strong>?
          </p>

          <p className="text-sm text-red-700">
            This action cannot be undone. Answers families have already
            submitted are not affected.
          </p>

          {deleteError && (
            <p role="alert" className="text-sm text-red-700">{deleteError}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-brand-sand/40 pt-4">
            <button
              type="button"
              className="btn-secondary"
              disabled={deleting}
              onClick={() => setToDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete Question"}
            </button>
          </div>
        </div>
      </AgreementEditorModal>
    </section>
  );
}