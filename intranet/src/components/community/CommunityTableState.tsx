import { ChevronLeft, ChevronRight, Loader2, type LucideIcon } from 'lucide-react';

export function CommunityInlineLoading({
  label = 'Actualizando resultados...',
}: {
  label?: string;
}) {
  return (
    <div className="erp-inline-loading">
      <Loader2 size={14} className="animate-spin" />
      {label}
    </div>
  );
}

export function CommunityTableLoading() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <Loader2 size={24} className="animate-spin text-accent-500" />
    </div>
  );
}

export function CommunityEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Icon size={24} className="text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function CommunityPagination({
  page,
  totalPages,
  total,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const safeTotalPages = totalPages || 1;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
      <button
        type="button"
        onClick={onPrevious}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={14} />
        Anterior
      </button>

      <div className="text-center">
        <p className="text-xs font-semibold text-slate-500">
          Página <span className="font-black text-slate-800">{page}</span> de{' '}
          <span className="font-black text-slate-800">{safeTotalPages}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {total} registros en total
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={page >= safeTotalPages}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Siguiente
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
