import ReactMarkdown from "react-markdown";

const markdownComponents = {
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 font-bold text-brand-navy">{children}</h3>
  ),
  p: ({ children }) => <p className="my-2">{children}</p>,
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-brand-navy underline"
    >
      {children}
    </a>
  ),
};

export default function AgreementContent({ agreement }) {
  if (!agreement) return null;

  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap text-sm text-brand-navy">
        {agreement.body}
      </p>

      {agreement.supporting_url && (
        <a
          href={agreement.supporting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold text-brand-navy underline"
        >
          View supporting document
        </a>
      )}

      {agreement.supporting_content && (
        <div className="rounded-lg bg-brand-sand/10 p-4 text-sm text-brand-navy">
          <ReactMarkdown components={markdownComponents}>
            {agreement.supporting_content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}