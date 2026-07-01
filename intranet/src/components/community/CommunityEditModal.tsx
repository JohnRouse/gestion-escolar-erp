import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';

type CommunityEditModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  message?: string | null;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  maxWidthClassName?: string;
  onClose: () => void;
  onSubmit: () => void;
};

export default function CommunityEditModal({
  open,
  title,
  description,
  children,
  message,
  saving = false,
  submitLabel = 'Guardar cambios',
  cancelLabel = 'Cancelar',
  maxWidthClassName = 'max-w-5xl',
  onClose,
  onSubmit,
}: CommunityEditModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <section
        className={`my-auto w-full ${maxWidthClassName} overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200/80 erp-detail-enter`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
          <div>
            <h3 className="text-lg font-black text-slate-950">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-slate-400">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <X size={15} />
          </button>
        </header>

        <div className="max-h-[72vh] overflow-y-auto p-6">
          {children}
        </div>

        {message && (
          <div className="mx-6 mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
            {message}
          </div>
        )}

        <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 text-sm font-bold text-white transition hover:bg-accent-600 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {submitLabel}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
