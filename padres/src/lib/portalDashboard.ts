export function attendancePercentage(records: Array<{ estado: string }>) {
  if (records.length === 0) return null;
  const present = records.filter((record) => record.estado === "Presente").length;
  return Math.round((present / records.length) * 100);
}

export function averageAvailableScores(values: Array<number | null | undefined>) {
  const available = values.filter((value): value is number => typeof value === "number");
  if (available.length === 0) return null;
  return Math.round((available.reduce((sum, value) => sum + value, 0) / available.length) * 10) / 10;
}

export function paymentSummary(
  status: "fulfilled" | "rejected",
  total?: number | string | null,
) {
  if (status === "rejected") {
    return { total: null, label: "No disponible", tone: "neutral" as const };
  }
  const parsed = typeof total === "string" ? Number(total) : total;
  const amount = typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
  return amount > 0
    ? { total: amount, label: "Por pagar", tone: "warning" as const }
    : { total: 0, label: "Sin deuda pendiente", tone: "success" as const };
}

export function formatPortalScore(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
