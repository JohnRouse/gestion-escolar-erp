import type { InputHTMLAttributes, ReactNode } from 'react';

export const communityInputClass =
  'h-11 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100';

export function CommunityInfo({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:ring-slate-200 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-bold text-slate-900">
        {value === null || value === undefined || value === '' ? '—' : value}
      </p>
    </div>
  );
}

export function CommunitySection({
  title,
  children,
  className = '',
  contentClassName = 'mt-3',
}: {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={`rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100 ${className}`}>
      <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
        {title}
      </h4>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function CommunityField({
  label,
  value,
  type = 'text',
  onChange,
  inputClassName = communityInputClass,
  labelClassName = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400',
  ...props
}: {
  label: string;
  value: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  onChange: (value: string) => void;
  inputClassName?: string;
  labelClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'type' | 'onChange'>) {
  return (
    <label>
      <span className={labelClassName}>{label}</span>
      <input
        {...props}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </label>
  );
}

export function CommunityStatusChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : tone === 'danger'
          ? 'bg-red-50 text-red-600 ring-red-200'
          : tone === 'info'
            ? 'bg-sky-50 text-sky-700 ring-sky-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${toneClass}`}>
      {label}
    </span>
  );
}
