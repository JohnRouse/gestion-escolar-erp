import {
  useEffect,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';

type MessageTone = 'success' | 'error' | 'info';

type CenteredFormModalProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  message?: string | null;
  messageTone?: MessageTone;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  maxWidthClassName?: string;
  onClose: () => void;
  onSubmit: () => void;
};

export default function CenteredFormModal({
  open,
  eyebrow,
  title,
  description,
  children,
  message,
  messageTone = 'info',
  saving = false,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  maxWidthClassName = 'max-w-2xl',
  onClose,
  onSubmit,
}: CenteredFormModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, saving, onClose]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const messageClass =
    messageTone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : messageTone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-blue-200 bg-blue-50 text-blue-700';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto w-full ${maxWidthClassName} overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-blue-700">
                {eyebrow}
              </p>
            )}

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {title}
            </h3>

            {description && (
              <p className="mt-1 max-w-2xl text-sm font-normal leading-6 text-slate-600">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[68vh] overflow-y-auto p-6">
          {children}
        </div>

        {message && (
          <div
            className={`mx-6 mb-4 rounded-xl border px-4 py-3 text-sm font-semibold leading-5 ${messageClass}`}
          >
            {message}
          </div>
        )}

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {submitLabel}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
