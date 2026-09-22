export type PortalNotificationOrigin =
  | "citas"
  | "pagos"
  | "matricula"
  | "academico"
  | "eventos"
  | "enfermeria"
  | "sistema"
  | string;

export interface PortalNotificationAction {
  id_notif: number;
  leida: boolean;
  origen?: PortalNotificationOrigin | null;
  url?: string | null;
}

const PORTAL_FALLBACKS: Record<string, string> = {
  eventos: "/dashboard/calendario",
  citas: "/dashboard/citas",
  pagos: "/dashboard/pagos",
  academico: "/dashboard/calificaciones",
};

export function safePortalTarget(
  url?: string | null,
  origin = "http://portal.local",
) {
  if (
    !url ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.includes("\\")
  ) {
    return null;
  }

  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== origin) return null;
    if (
      parsed.pathname !== "/dashboard" &&
      !parsed.pathname.startsWith("/dashboard/")
    ) {
      return null;
    }
    const pathname =
      parsed.pathname === "/dashboard/circulares"
        ? "/dashboard/comunicados"
        : parsed.pathname;
    return `${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function portalNotificationTarget(
  notification: Pick<PortalNotificationAction, "origen" | "url">,
  origin?: string,
) {
  return (
    safePortalTarget(notification.url, origin) ??
    PORTAL_FALLBACKS[notification.origen ?? ""] ??
    "/dashboard/actividad"
  );
}

interface ActivatePortalNotificationOptions {
  notification: PortalNotificationAction;
  markRead: () => Promise<unknown>;
  onOptimisticRead: () => void;
  onReadError: (error: unknown) => void;
  close: () => void;
  navigate: (target: string) => void;
  origin?: string;
}

export function activatePortalNotification({
  notification,
  markRead,
  onOptimisticRead,
  onReadError,
  close,
  navigate,
  origin,
}: ActivatePortalNotificationOptions) {
  if (!notification.leida) {
    onOptimisticRead();
    try {
      void markRead().catch(onReadError);
    } catch (error) {
      onReadError(error);
    }
  }

  close();
  navigate(portalNotificationTarget(notification, origin));
}
