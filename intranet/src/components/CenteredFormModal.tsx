import {
  type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';

type MessageTone =
  | 'success'
  | 'error'
  | 'info';

type CenteredFormModalProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  message?: string | null;
  messageTone?: MessageTone;
  saving?: boolean;
  submitDisabled?: boolean;
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
  submitDisabled = false,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  maxWidthClassName = 'max-w-2xl',
  onClose,
  onSubmit,
}: CenteredFormModalProps) {
  const messageClass =
    messageTone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : messageTone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <AccessibleDialog
      open={open}
      eyebrow={eyebrow}
      title={title}
      description={description}
      onClose={onClose}
      preventClose={saving}
      closeOnEscape
      closeOnOverlay
      closeLabel="Cerrar formulario"
      maxWidthClassName={maxWidthClassName}
      bodyClassName="px-6 py-6"
      footerClassName="gap-3 px-6 py-5"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              inline-flex h-11
              items-center justify-center
              rounded-xl
              border border-slate-300
              bg-white px-5
              text-sm font-semibold
              text-slate-700
              transition-colors duration-150
              hover:border-slate-400
              hover:bg-slate-100
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-600
              focus-visible:ring-offset-2
              disabled:cursor-not-allowed
              disabled:opacity-50
              motion-reduce:transition-none
            "
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || submitDisabled}
            className="
              inline-flex h-11
              items-center justify-center
              gap-2 rounded-xl
              bg-blue-600 px-5
              text-sm font-bold text-white
              transition-colors duration-150
              hover:bg-blue-700
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-600
              focus-visible:ring-offset-2
              disabled:cursor-not-allowed
              disabled:bg-slate-300
              disabled:text-slate-600
              motion-reduce:transition-none
            "
          >
            {saving && (
              <Loader2
                size={16}
                aria-hidden="true"
                className="
                  animate-spin
                  motion-reduce:animate-none
                "
              />
            )}

            {submitLabel}
          </button>
        </>
      }
    >
      {children}

      {message && (
        <div
          role={
            messageTone === 'error'
              ? 'alert'
              : 'status'
          }
          aria-live={
            messageTone === 'error'
              ? 'assertive'
              : 'polite'
          }
          className={`
            mt-5 rounded-xl border
            px-4 py-3
            text-sm font-semibold
            leading-5
            ${messageClass}
          `}
        >
          {message}
        </div>
      )}
    </AccessibleDialog>
  );
}
