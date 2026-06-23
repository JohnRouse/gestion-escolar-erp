import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

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
  if (!open) return null;

  const toneClass =
    tone === 'danger'
      ? 'bg-red-50 text-red-600 ring-red-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-600 ring-amber-100'
        : 'bg-slate-50 text-slate-600 ring-slate-100';

  const buttonClass = tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-950 hover:bg-slate-800';

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm animate-in fade-in duration-200" onClick={loading ? undefined : onCancel} />

      <section className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.75)] ring-1 ring-slate-200/70 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${toneClass}`}>
            <AlertCircle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
            <h3 className="mt-1 text-lg font-black tracking-[-0.02em] text-slate-950">{title}</h3>
            {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}>
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
