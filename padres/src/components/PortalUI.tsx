import type { ReactNode } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CalendarX2,
  CreditCard,
  FileText,
  Inbox,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

type PortalStateKind = "empty" | "error";

interface PortalStateProps {
  kind?: PortalStateKind;
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function PortalState({
  kind = "empty",
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = "",
}: PortalStateProps) {
  const defaultIcon = kind === "error" ? <AlertCircle size={21} /> : <Inbox size={21} />;

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`portal-state ${kind === "error" ? "portal-state-error" : ""} ${className}`}
    >
      <span className="portal-state-icon" aria-hidden="true">{icon ?? defaultIcon}</span>
      <p className="portal-state-title">{title}</p>
      {description ? <p className="portal-state-description">{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="portal-button portal-button-secondary mt-2" onClick={onAction}>
          <RefreshCw size={16} aria-hidden="true" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

interface PortalSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PortalSection({ title, action, children, className = "" }: PortalSectionProps) {
  return (
    <section className={`portal-section ${className}`}>
      <div className="portal-section-heading">
        <h2 className="portal-section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PortalSkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="portal-stack" role="status" aria-label="Cargando contenido">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="m-card flex items-center gap-3 p-4">
          <div className="skel h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skel h-3.5 w-2/3" />
            <div className="skel h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PortalNotificationIcon({ origin, size = 18 }: { origin?: string; size?: number }) {
  const value = (origin || "").toLowerCase();
  if (value === "pagos") return <CreditCard size={size} />;
  if (value === "eventos") return <CalendarDays size={size} />;
  if (value === "comunicados" || value === "circulares") return <FileText size={size} />;
  if (value === "citas") return <UsersRound size={size} />;
  if (value === "academico") return <MessageSquareText size={size} />;
  if (value === "matricula") return <UserRound size={size} />;
  if (value === "sistema") return <ShieldCheck size={size} />;
  return <Bell size={size} />;
}

export const portalStateIcons = {
  calendar: <CalendarX2 size={21} />,
  file: <FileText size={21} />,
  payments: <CreditCard size={21} />,
};
