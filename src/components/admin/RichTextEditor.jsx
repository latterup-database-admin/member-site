import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "@tiptap/markdown";
import { Bold, Italic, Heading3, List, ListOrdered, Link2 } from "lucide-react";
import { useRef, useState } from "react";

export default function RichTextEditor({ content = "", onChange }) {
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkSelectionRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        enableClickSelection: true,
      }),
      Markdown,
    ],
    content,
    contentType: "markdown",
    editorProps: {
      handleClickOn(view, pos, node, nodePos, event) {
        if (event.target.closest("a")) {
          event.preventDefault();
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getMarkdown());
    },
    immediatelyRender: false,
  });

  const formatting = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      heading: currentEditor?.isActive("heading", { level: 3 }) ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      link: currentEditor?.isActive("link") ?? false,
    }),
  });

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-brand-sand bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-brand-sand bg-brand-sand/10 p-2">
        {[
          {
            label: "Bold",
            icon: Bold,
            active: formatting.bold,
            action: () => editor.chain().focus().toggleBold().run(),
          },
          {
            label: "Italic",
            icon: Italic,
            active: formatting.italic,
            action: () => editor.chain().focus().toggleItalic().run(),
          },
          {
            label: "Heading",
            icon: Heading3,
            active: formatting.heading,
            action: () =>
              editor.chain().focus().toggleHeading({ level: 3 }).run(),
          },
          {
            label: "Bulleted list",
            icon: List,
            active: formatting.bulletList,
            action: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            label: "Numbered list",
            icon: ListOrdered,
            active: formatting.orderedList,
            action: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            label: "Insert or edit link",
            icon: Link2,
            active: formatting.link,
            action: () => {
              if (editor.isActive("link")) {
                editor.chain().extendMarkRange("link").run();
              }

              const { from, to } = editor.state.selection;

              linkSelectionRef.current = { from, to };

              setLinkUrl(editor.getAttributes("link").href || "");
              setLinkEditorOpen(true);
            },
          },
        ].map(({ label, icon: Icon, active, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-brand-navy text-white"
                : "text-brand-navy hover:bg-brand-sand/30"
            }`}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {linkEditorOpen && (
        <div className="border-b border-brand-sand bg-brand-sand/10 p-3">
          <label
            htmlFor="rich-text-link-url"
            className="mb-1 block text-sm font-semibold text-brand-navy"
          >
            Link URL
          </label>

          <input
            id="rich-text-link-url"
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-brand-sand bg-white px-3 py-2 text-sm text-brand-navy"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const url = linkUrl.trim();

                if (!url) return;

                try {
                  const parsed = new URL(url);

                  if (!["http:", "https:"].includes(parsed.protocol)) {
                    throw new Error("Invalid protocol");
                  }
                } catch {
                  window.alert(
                    "Please enter a valid URL beginning with https://",
                  );
                  return;
                }

                editor.chain().focus().setLink({ href: url }).run();
                setLinkEditorOpen(false);
              }}
              className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Apply Link
            </button>

            <button
              type="button"
              onClick={() => {
                const selection = linkSelectionRef.current;
                const chain = editor.chain().focus();

                if (selection) {
                  chain.setTextSelection(selection);
                }

                chain.unsetLink().run();

                linkSelectionRef.current = null;
                setLinkEditorOpen(false);
              }}
              className="rounded-lg border border-brand-navy px-3 py-2 text-sm font-semibold text-brand-navy"
            >
              Remove Link
            </button>

            <button
              type="button"
              onClick={() => setLinkEditorOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-sand/30"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="
    min-h-48 p-4 text-sm text-brand-navy
    [&_.tiptap]:min-h-40
    [&_.tiptap]:outline-none
    [&_.tiptap_p]:my-3
    [&_.tiptap_h1]:my-4
    [&_.tiptap_h1]:text-xl
    [&_.tiptap_h1]:font-bold
    [&_.tiptap_h2]:my-4
    [&_.tiptap_h2]:text-lg
    [&_.tiptap_h2]:font-bold
    [&_.tiptap_h3]:mb-2
    [&_.tiptap_h3]:mt-5
    [&_.tiptap_h3]:font-bold
    [&_.tiptap_ol]:my-3
    [&_.tiptap_ol]:list-decimal
    [&_.tiptap_ol]:pl-6
    [&_.tiptap_ul]:my-3
    [&_.tiptap_ul]:list-disc
    [&_.tiptap_ul]:pl-6
    [&_.tiptap_li]:my-1
    [&_.tiptap_a]:text-brand-sky
    [&_.tiptap_a]:underline
  "
      />
    </div>
  );
}
