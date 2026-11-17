import { useEffect, useState } from "react";
import {
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Send,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  loadAdminAnnualAgreements,
  saveAdminAnnualAgreementDraft,
  deleteAdminAnnualAgreementDraft,
  moveAdminAnnualAgreement,
  publishAdminAnnualAgreement,
} from "../../data/adminAnnualAgreements";
import RichTextEditor from "./RichTextEditor";
import AgreementEditorModal from "./AgreementEditorModal";

export default function AnnualAgreementsSettings({
  schoolYearId,
  canManage = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingAgreementId, setEditingAgreementId] = useState(null);
  const [creatingAgreement, setCreatingAgreement] = useState(false);
  const [agreementToDelete, setAgreementToDelete] = useState(null);
  const [agreementToPublish, setAgreementToPublish] = useState(null);
  const [publishReviewed, setPublishReviewed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [editedSupportingContent, setEditedSupportingContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedSupportingUrl, setEditedSupportingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");

  useEffect(() => {
    let active = true;

    setAgreements([]);
    setError("");
    setEditingAgreementId(null);
    setCreatingAgreement(false);
    setEditedSupportingContent("");
    setEditedTitle("");
    setEditedBody("");
    setEditedSupportingUrl("");
    setSaveError("");

    if (!schoolYearId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    loadAdminAnnualAgreements(schoolYearId)
      .then((result) => {
        if (active) setAgreements(result);
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Unable to load annual agreements.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [schoolYearId]);

  async function handleSaveAgreement(agreement) {
    if (saving) return;

    if (!editedTitle.trim() || !editedBody.trim()) {
      setSaveError("Agreement title and acknowledgment text are required.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const savedAgreement = await saveAdminAnnualAgreementDraft({
        id: agreement.id,
        schoolYearId,
        agreementKey: agreement.agreement_key,
        title: editedTitle.trim(),
        body: editedBody.trim(),
        supportingUrl: editedSupportingUrl.trim() || null,
        supportingContent: editedSupportingContent,
        displayOrder: agreement.display_order,
        requiresReacknowledgment: agreement.requires_reacknowledgment,
      });

      setAgreements((previous) =>
        previous.map((item) =>
          item.id === savedAgreement.id ? savedAgreement : item,
        ),
      );

      setEditingAgreementId(null);
    } catch (err) {
      setSaveError(err.message || "Unable to save agreement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAgreement() {
    if (saving) return;

    if (!editedTitle.trim() || !editedBody.trim()) {
      setSaveError("Agreement title and acknowledgment text are required.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const agreementKey = `custom_${crypto.randomUUID().replace(/-/g, "_")}`;

      const savedAgreement = await saveAdminAnnualAgreementDraft({
        id: null,
        schoolYearId,
        agreementKey,
        title: editedTitle.trim(),
        body: editedBody.trim(),
        supportingUrl: editedSupportingUrl.trim() || null,
        supportingContent: editedSupportingContent,
        displayOrder:
          Math.max(0, ...agreements.map((item) => item.display_order ?? 0)) + 1,
        requiresReacknowledgment: false,
      });

      setAgreements((previous) => [...previous, savedAgreement]);
      setCreatingAgreement(false);
    } catch (err) {
      setSaveError(err.message || "Unable to create agreement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAgreement() {
    if (!agreementToDelete || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteAdminAnnualAgreementDraft(agreementToDelete.id);

      setAgreements((previous) =>
        previous.filter((item) => item.id !== agreementToDelete.id),
      );

      setAgreementToDelete(null);
    } catch (err) {
      setDeleteError(err.message || "Unable to delete agreement.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleMoveAgreement(agreementId, direction) {
    if (reordering) return;

    setReordering(true);
    setReorderError("");

    try {
      await moveAdminAnnualAgreement(agreementId, direction);

      const updatedAgreements = await loadAdminAnnualAgreements(schoolYearId);

      setAgreements(updatedAgreements);
    } catch (err) {
      setReorderError(err.message || "Unable to reorder agreements.");
    } finally {
      setReordering(false);
    }
  }

  async function handlePublishAgreement() {
    if (!agreementToPublish || !publishReviewed || publishing) return;

    setPublishing(true);
    setPublishError("");

    try {
      await publishAdminAnnualAgreement(agreementToPublish.id);

      const updatedAgreements = await loadAdminAnnualAgreements(schoolYearId);
      setAgreements(updatedAgreements);

      setAgreementToPublish(null);
      setPublishReviewed(false);
    } catch (err) {
      setPublishError(err.message || "Failed to publish agreement.");
    } finally {
      setPublishing(false);
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
          Annual Agreements
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
              Review agreements for the selected school year. Draft agreements
              are not visible to families.
            </p>

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setEditedTitle("");
                  setEditedBody("");
                  setEditedSupportingUrl("");
                  setEditedSupportingContent("");
                  setSaveError("");
                  setCreatingAgreement(true);
                }}
                className="btn-primary"
              >
                <Plus size={16} />
                New Agreement
              </button>
            )}
          </div>

          {reorderError && (
            <p role="alert" className="text-sm text-red-700">
              {reorderError}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-brand-taupe">
              Loading annual agreements…
            </p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : agreements.length === 0 ? (
            <p className="text-sm text-brand-taupe">
              No agreements found for this school year.
            </p>
          ) : (
            <div className="space-y-3">
              {agreements.map((agreement, index) => (
                <article
                  key={agreement.id}
                  className="rounded-xl border border-brand-sand/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-brand-navy">
                      {agreement.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-brand-taupe">
                        Version {agreement.version_number} · {agreement.status}
                      </span>

                      {canManage && agreement.status === "draft" && (
                        <>
                          <button
                            type="button"
                            disabled={reordering || index === 0}
                            onClick={() =>
                              handleMoveAgreement(agreement.id, "up")
                            }
                            aria-label={`Move ${agreement.title} up`}
                            title="Move agreement up"
                            className="rounded-lg border border-brand-sand/60 p-2 text-brand-navy hover:bg-brand-sand/20 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ArrowUp size={16} />
                          </button>

                          <button
                            type="button"
                            disabled={
                              reordering || index === agreements.length - 1
                            }
                            onClick={() =>
                              handleMoveAgreement(agreement.id, "down")
                            }
                            aria-label={`Move ${agreement.title} down`}
                            title="Move agreement down"
                            className="rounded-lg border border-brand-sand/60 p-2 text-brand-navy hover:bg-brand-sand/20 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ArrowDown size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditedTitle(agreement.title);
                              setEditedBody(agreement.body);
                              setEditedSupportingUrl(
                                agreement.supporting_url || "",
                              );
                              setEditedSupportingContent(
                                agreement.supporting_content || "",
                              );
                              setSaveError("");
                              setEditingAgreementId(agreement.id);
                            }}
                            className="rounded-lg border border-brand-sand/60 p-2 text-brand-navy hover:bg-brand-sand/20"
                            aria-label={`Edit ${agreement.title}`}
                            title="Edit agreement"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAgreementToDelete(agreement)}
                            aria-label={`Delete ${agreement.title}`}
                            title="Delete draft agreement"
                            className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPublishReviewed(false);
                              setAgreementToPublish(agreement);
                            }}
                            aria-label={`Publish ${agreement.title}`}
                            title="Publish agreement"
                            className="rounded-lg border border-brand-sky/50 p-2 text-brand-navy hover:bg-brand-sky/10"
                          >
                            <Send size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-brand-navy">
                    {agreement.body}
                  </p>

                  {agreement.supporting_url && (
                    <a
                      href={agreement.supporting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-brand-sky underline"
                    >
                      View supporting document
                    </a>
                  )}

                  {agreement.supporting_content && (
                    <div className="mt-3 rounded-lg bg-brand-sand/10 p-4 text-sm text-brand-navy">
                      <ReactMarkdown
                        components={{
                          h3: ({ children }) => (
                            <h3 className="mb-2 mt-4 font-bold text-brand-navy">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="my-2">{children}</p>
                          ),
                          ol: ({ children }) => (
                            <ol className="my-2 list-decimal space-y-1 pl-6">
                              {children}
                            </ol>
                          ),
                          ul: ({ children }) => (
                            <ul className="my-2 list-disc space-y-1 pl-6">
                              {children}
                            </ul>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-brand-sky underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {agreement.supporting_content}
                      </ReactMarkdown>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {agreements
        .filter((agreement) => agreement.id === editingAgreementId)
        .map((agreement) => (
          <AgreementEditorModal
            key={agreement.id}
            open
            title={`Edit: ${agreement.title}`}
            onClose={() => setEditingAgreementId(null)}
            saving={saving}
          >
            <div className="mt-4 space-y-3 rounded-lg border border-brand-sand/40 bg-brand-sand/10 p-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-navy">
                  Agreement Title
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(event) => setEditedTitle(event.target.value)}
                  className="w-full rounded-lg border border-brand-sand px-3 py-2 text-sm text-brand-navy"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-navy">
                  Acknowledgment Text
                </label>
                <textarea
                  value={editedBody}
                  onChange={(event) => setEditedBody(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-brand-sand px-3 py-2 text-sm text-brand-navy"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-navy">
                  Supporting Document URL (optional)
                </label>
                <input
                  type="url"
                  value={editedSupportingUrl}
                  onChange={(event) =>
                    setEditedSupportingUrl(event.target.value)
                  }
                  placeholder="https://example.com/document"
                  className="w-full rounded-lg border border-brand-sand px-3 py-2 text-sm text-brand-navy"
                />
                <p className="mt-1 text-xs text-brand-taupe">
                  Link to an external document families should review before
                  accepting this agreement.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-navy">
                  Additional Supporting Content (optional)
                </label>

                <RichTextEditor
                  key={agreement.id}
                  content={agreement.supporting_content || ""}
                  onChange={setEditedSupportingContent}
                />

                <p className="mt-1 text-xs text-brand-taupe">
                  Use the formatting toolbar to add headings, lists, and
                  emphasis. Changes are not saved until you select Save.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-brand-sand/40 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingAgreementId(null)}
                  className="rounded-lg border border-brand-navy px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-sand/20"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAgreement(agreement)}
                  disabled={saving}
                  className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                {saveError && (
                  <p role="alert" className="text-sm text-red-700">
                    {saveError}
                  </p>
                )}
              </div>
            </div>
          </AgreementEditorModal>
        ))}
      <AgreementEditorModal
        open={creatingAgreement}
        title="New Annual Agreement"
        onClose={() => setCreatingAgreement(false)}
        saving={saving}
      >
        <div className="space-y-3">
          <div>
            <label
              htmlFor="new-agreement-title"
              className="mb-1 block text-sm font-semibold text-brand-navy"
            >
              Agreement Title
            </label>

            <input
              id="new-agreement-title"
              type="text"
              value={editedTitle}
              onChange={(event) => setEditedTitle(event.target.value)}
              placeholder="Enter agreement title"
              className="w-full rounded-lg border border-brand-sand px-3 py-2 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="new-agreement-body"
              className="mb-1 block text-sm font-semibold text-brand-navy"
            >
              Acknowledgment Text
            </label>

            <textarea
              id="new-agreement-body"
              value={editedBody}
              onChange={(event) => setEditedBody(event.target.value)}
              rows={5}
              placeholder="Enter the acknowledgment families must agree to"
              className="w-full rounded-lg border border-brand-sand px-3 py-2 text-sm text-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="new-agreement-supporting-url"
              className="mb-1 block text-sm font-semibold text-brand-navy"
            >
              Supporting Document URL (optional)
            </label>

            <input
              id="new-agreement-supporting-url"
              type="url"
              value={editedSupportingUrl}
              onChange={(event) => setEditedSupportingUrl(event.target.value)}
              placeholder="https://example.com/document"
              className="w-full rounded-lg border border-brand-sand px-3 py-2 text-sm text-brand-navy"
            />

            <p className="mt-1 text-xs text-brand-taupe">
              Link to an external document families should review before
              accepting this agreement.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-navy">
              Additional Supporting Content (optional)
            </label>

            <RichTextEditor
              key={creatingAgreement ? "new-agreement" : "new-agreement-closed"}
              content={editedSupportingContent}
              onChange={setEditedSupportingContent}
            />

            <p className="mt-1 text-xs text-brand-taupe">
              Use the formatting toolbar to add headings, lists, and emphasis.
              Changes are not saved until you select Save.
            </p>
          </div>

          {saveError && (
            <p role="alert" className="text-sm text-red-700">
              {saveError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-brand-sand/40 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => setCreatingAgreement(false)}
              className="rounded-lg border border-brand-navy px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-sand/20 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCreateAgreement}
              disabled={saving}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Agreement"}
            </button>
          </div>
        </div>
      </AgreementEditorModal>

      <AgreementEditorModal
        open={agreementToDelete !== null}
        title="Delete Draft Agreement"
        onClose={() => {
          setAgreementToDelete(null);
          setDeleteError("");
        }}
        saving={deleting}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-navy">
            Are you sure you want to delete{" "}
            <strong>{agreementToDelete?.title}</strong>?
          </p>

          <p className="text-sm text-red-700">This action cannot be undone.</p>

          {deleteError && (
            <p role="alert" className="text-sm text-red-700">
              {deleteError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-brand-sand/40 pt-4">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setAgreementToDelete(null)}
              className="rounded-lg border border-brand-navy px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-sand/20"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDeleteAgreement}
              disabled={deleting}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              {deleting ? "Deleting..." : "Delete Agreement"}
            </button>
          </div>
        </div>
      </AgreementEditorModal>

      <AgreementEditorModal
        open={agreementToPublish !== null}
        title="Publish Annual Agreement"
        saving={publishing}
        onClose={() => setAgreementToPublish(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-navy">
            Are you sure you want to publish{" "}
            <strong>{agreementToPublish?.title}</strong>?
          </p>

          <div className="rounded-lg border border-brand-sand/40 bg-brand-sand/10 p-4">
            <p className="mb-2 text-sm font-semibold text-brand-navy">
              Publishing this agreement will:
            </p>

            <ul className="list-disc space-y-2 pl-5 text-sm text-brand-navy">
              <li>Make this agreement available to families.</li>
              <li>Lock this version against further editing or deletion.</li>
              <li>
                Replace any previously published version of the same agreement,
                while preserving its historical record.
              </li>
            </ul>
          </div>

          <p className="text-sm font-semibold text-brand-navy">
            Please verify the agreement's content before publishing.
          </p>

          <div className="space-y-3 rounded-xl border border-brand-sand/40 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-taupe">
              Agreement Preview
            </p>

            <h3 className="text-lg font-bold text-brand-navy">
              {agreementToPublish?.title}
            </h3>

            <p className="whitespace-pre-wrap text-sm text-brand-navy">
              {agreementToPublish?.body}
            </p>

            {agreementToPublish?.supporting_url && (
              <div>
                <a
                  href={agreementToPublish.supporting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-sky underline"
                >
                  View supporting document
                </a>
              </div>
            )}

            {agreementToPublish?.supporting_content && (
              <div className="rounded-lg bg-brand-sand/10 p-4 text-sm text-brand-navy">
                <ReactMarkdown
                  components={{
                    h3: ({ children }) => (
                      <h3 className="mb-2 mt-4 font-bold text-brand-navy">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="my-2">{children}</p>,
                    ol: ({ children }) => (
                      <ol className="my-2 list-decimal space-y-1 pl-6">
                        {children}
                      </ol>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-2 list-disc space-y-1 pl-6">
                        {children}
                      </ul>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-sky underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {agreementToPublish.supporting_content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-sand/40 p-4">
            <input
              type="checkbox"
              checked={publishReviewed}
              onChange={(event) => setPublishReviewed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-brand-navy"
            />

            <span className="text-sm text-brand-navy">
              I have reviewed this agreement, including its supporting documents
              and content, and confirm that it is ready to be published for
              families.
            </span>
          </label>

          {publishError && (
            <p role="alert" className="text-sm text-red-600">
              {publishError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-brand-sand/40 pt-4">
            <button
              type="button"
              onClick={() => setAgreementToPublish(null)}
              className="rounded-lg border border-brand-navy px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-sand/20"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handlePublishAgreement}
              disabled={!publishReviewed || publishing}
              className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {publishing ? "Publishing..." : "Publish Agreement"}
            </button>
          </div>
        </div>
      </AgreementEditorModal>
    </section>
  );
}
