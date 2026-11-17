import ReactMarkdown from "react-markdown";

const components = {
  h2: ({ children }) => (
    <h2 className="mb-2 mt-6 break-after-avoid text-lg font-extrabold text-brand-navy">
      {children}
    </h2>
  ),
  p: ({ children }) => <p className="my-2">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
  strong: ({ children }) => (
    <strong className="font-bold text-brand-navy">{children}</strong>
  ),
};

export default function FeedbackSummaryContent({ markdown }) {
  return (
    <div className="text-sm leading-relaxed text-brand-taupe">
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
    </div>
  );
}