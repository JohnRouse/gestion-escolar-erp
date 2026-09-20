export interface PortalCalendarDeepLink {
  anioId: number | null;
  mes: number | null;
  dia: number | null;
  eventoId: number | null;
}

interface AuthorizedCalendarEvent {
  id_evento: number;
  fecha: string;
  estado?: string;
}

function positiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parsePortalCalendarDeepLink(
  params: Pick<URLSearchParams, "get">,
): PortalCalendarDeepLink {
  const mes = positiveInteger(params.get("mes"));
  const dia = positiveInteger(params.get("dia"));
  return {
    anioId: positiveInteger(params.get("anio_id")),
    mes: mes && mes <= 12 ? mes : null,
    dia: dia && dia <= 31 ? dia : null,
    eventoId: positiveInteger(params.get("evento_id")),
  };
}

function eventDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

export function authorizedDeepLinkDay(
  deepLink: PortalCalendarDeepLink,
  events: AuthorizedCalendarEvent[],
) {
  if (!deepLink.eventoId) return deepLink.dia;

  const target = events.find(
    (event) => event.id_evento === deepLink.eventoId,
  );
  if (!target || target.estado === "cancelado") return null;

  const date = eventDateParts(target.fecha);
  if (!date || (deepLink.mes && date.month !== deepLink.mes)) return null;
  return date.day;
}
