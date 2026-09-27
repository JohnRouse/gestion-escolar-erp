"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}

export default function ScreenHeader({ title, subtitle, backHref, backLabel = "Volver" }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <header className="portal-screen-header sticky top-0 z-20 border-b border-border border-t-accent px-5 md:px-8">
      <div className="flex min-h-[68px] items-center gap-3 py-2">
        {backHref ? (
          <button type="button" className="portal-icon-button -ml-1" onClick={() => router.push(backHref)} aria-label={backLabel}>
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-[21px] font-semibold tracking-[-0.02em] text-text">{title}</h1>
          {subtitle ? <p className="text-sm leading-5 text-text-secondary">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}
