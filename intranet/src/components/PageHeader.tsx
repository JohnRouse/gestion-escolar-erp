import type { ElementType, ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: ElementType;
  actions?: ReactNode;
  meta?: {
    label: string;
    value: string | number | null | undefined;
  }[];
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta = [],
}: PageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-white bg-white/90 p-6 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100 backdrop-blur">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-100">
            {Icon && <Icon size={13} className="text-accent-500" />}
            {eyebrow}
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h1>

          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>

        {(meta.length > 0 || actions) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            {meta.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl bg-slate-50 px-5 py-4 ring-1 ring-slate-100"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {item.value || '—'}
                </p>
              </div>
            ))}

            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
