import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';

type CommunityDetailModalProps = {
  open: boolean;
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  leadingSlot?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  maxWidthClassName?: string;
  onClose: () => void;
};

export default function CommunityDetailModal({
  open,
  eyebrow,
  title,
  description,
  leadingSlot,
  actions,
  children,
  loading = false,
  maxWidthClassName = 'max-w-5xl',
  onClose,
}: CommunityDetailModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <section
        className={`my-auto w-full ${maxWidthClassName} overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200/80 erp-detail-enter`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
          <div className="flex min-w-0 items-center gap-4">
            {leadingSlot}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-600 ring-1 ring-accent-100">
                {eyebrow}
              </div>
              <h3 className="mt-1.5 truncate text-lg font-black text-slate-950">
                {title}
              </h3>
              {description && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        <div className="max-h-[72vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 size={22} className="animate-spin text-accent-500" />
            </div>
          ) : (
            children
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
