import { useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'neutral';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  eyebrow = 'Confirmación',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'neutral',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef =
    useRef<HTMLButtonElement>(null);

  const toneClass =
    tone === 'danger'
      ? 'bg-red-50 text-red-600 ring-red-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : 'bg-slate-50 text-slate-600 ring-slate-100';

  const buttonClass =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600'
      : tone === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600'
        : 'bg-slate-950 hover:bg-slate-800 focus-visible:ring-slate-950';

  return (
    <AccessibleDialog
      open={open}
      title={title}
      description={description}
      eyebrow={eyebrow}
      onClose={onCancel}
      preventClose={loading}
      closeOnEscape
      closeOnOverlay
      closeLabel="Cerrar confirmación"
      initialFocusRef={cancelButtonRef}
      maxWidthClassName="max-w-md"
      icon={
        <div
          className={`
            flex h-11 w-11
            items-center justify-center
            rounded-2xl ring-1
            ${toneClass}
          `}
        >
          <AlertCircle
            size={22}
            aria-hidden="true"
          />
        </div>
      }
      footer={
        <>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="
              inline-flex h-11
              items-center justify-center
              rounded-2xl
              border border-slate-200
              bg-white px-4
              text-sm font-black
              text-slate-700 shadow-sm
              transition-colors duration-150
              hover:border-slate-300
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
            onClick={onConfirm}
            disabled={loading}
            className={`
              inline-flex h-11
              items-center justify-center
              rounded-2xl px-4
              text-sm font-black
              text-white
              shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)]
              transition-[background-color,transform,box-shadow]
              duration-150
              hover:-translate-y-0.5
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-offset-2
              disabled:cursor-not-allowed
              disabled:opacity-60
              disabled:hover:translate-y-0
              motion-reduce:transition-none
              motion-reduce:transform-none
              ${buttonClass}
            `}
          >
            {loading
              ? 'Procesando...'
              : confirmLabel}
          </button>
        </>
      }
    />
  );
}
