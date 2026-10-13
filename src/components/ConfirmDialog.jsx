import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";

export default function ConfirmDialog({ open, title, children, warning, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel, busy = false }) {
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    cancelRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busy) onCancel?.();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(panelRef.current?.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || []);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel?.(); }}>
      <div ref={panelRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="w-full max-w-lg rounded-2xl border border-brand-sand/40 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="confirm-dialog-title" className="text-xl font-extrabold text-brand-navy">{title}</h2>
          <button type="button" aria-label="Close confirmation" disabled={busy} onClick={onCancel} className="rounded-lg p-1 text-brand-taupe hover:bg-brand-sand/20 disabled:opacity-50"><X size={20} /></button>
        </div>
        <div id="confirm-dialog-description" className="mt-4 space-y-3 text-sm leading-relaxed text-brand-navy">{children}</div>
        {warning && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div>{warning}</div></div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-brand-sand/60 px-4 py-2 font-bold text-brand-navy disabled:opacity-50">{cancelLabel}</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 font-bold text-white disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? "Saving..." : confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
