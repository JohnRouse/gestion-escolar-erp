"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { CheckCircle2, Download, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { PortalState, PortalSkeletonList, portalStateIcons } from "@/components/PortalUI";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import { generarComprobantePDF } from "@/lib/generarComprobante";

interface Pago { monto: string; fecha: string; metodo: string; id_transaccion?: number; }
interface Deuda {
  id_cronograma: number;
  concepto: string;
  fecha_vencimiento: string;
  monto_base: string;
  saldo: number;
  estado: string;
  pagos: Pago[];
}
interface EstadoCuenta { id_matricula: number; estado_matricula: string; deudas: Deuda[]; total_pendiente: number; }

function PagosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedChild, setSelectedChild, hijos, childrenLoading, childrenError } = useSelectedChild();

  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [filtro, setFiltro] = useState("Pendientes");
  const [verTodas, setVerTodas] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Deuda | null>(null);
  const [cronogramaResaltado, setCronogramaResaltado] = useState<number | null>(null);

  const initialMount = useRef(true);
  const detailDialogRef = useRef<HTMLDivElement>(null);

  // Cambiar de hijo según URL (solo primer render)
  useEffect(() => {
    if (!initialMount.current || childrenLoading) return;
    initialMount.current = false;

    const alumnoIdParam = searchParams.get("alumno_id");
    if (alumnoIdParam) {
      const alumnoId = Number(alumnoIdParam);
      if (!isNaN(alumnoId) && selectedChild?.id_estudiante !== alumnoId) {
        const hijo = hijos.find((h) => h.id_estudiante === alumnoId);
        if (hijo) setSelectedChild(hijo);
      }
    }

    const cronogramaIdParam = searchParams.get("cronograma_id");
    if (cronogramaIdParam) {
      const idCron = Number(cronogramaIdParam);
      if (!isNaN(idCron)) {
        queueMicrotask(() => setCronogramaResaltado(idCron));
        window.setTimeout(() => setCronogramaResaltado(null), 4000);
      }
    }

    router.replace("/dashboard/pagos");
  }, [childrenLoading, searchParams, selectedChild, hijos, setSelectedChild, router]);

  useEffect(() => {
    if (!selectedChild) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError("");
      setEstadoCuenta(null);
    });
    axios
      .get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${selectedChild.id_estudiante}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((res) => setEstadoCuenta(res.data))
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return;
        setEstadoCuenta(null);
        setError("No se pudo cargar el estado de cuenta.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [childrenLoading, retryKey, selectedChild]);

  const deudas = useMemo(() => estadoCuenta?.deudas ?? [], [estadoCuenta]);
  const hoy = useMemo(() => new Date(), []);
  const dentroDe10Dias = useMemo(() => {
    const date = new Date(hoy);
    date.setDate(hoy.getDate() + 10);
    return date;
  }, [hoy]);

  const totalCabecera = Number(estadoCuenta?.total_pendiente ?? 0);
  const deudasPendientes = useMemo(() => deudas.filter((deuda) => deuda.estado !== "Pagado"), [deudas]);

  const deudasProximasOVencidas = useMemo(() => deudas.filter(d => {
    if (d.estado === "Pagado") return false;
    const venc = new Date(d.fecha_vencimiento);
    return venc <= hoy || venc <= dentroDe10Dias;
  }), [deudas, dentroDe10Dias, hoy]);

  const filtradas = useMemo(() => {
    if (filtro === "Pendientes") return verTodas ? deudasPendientes : deudasProximasOVencidas;
    if (filtro === "Todos") return deudas;
    return deudas.filter(d => d.estado === filtro);
  }, [deudas, deudasPendientes, filtro, deudasProximasOVencidas, verTodas]);

  const getBadgeStyle = (estado: string) => {
    switch (estado) {
      case "Pagado": return "bg-success-soft text-success";
      case "Pendiente": return "bg-warning-soft text-warning";
      case "Vencido": return "bg-danger-soft text-danger";
      default: return "bg-border text-text-muted";
    }
  };

  const getFechaClase = (deuda: Deuda) => {
    if (deuda.estado === "Pagado") return "text-text-secondary";
    const venc = new Date(deuda.fecha_vencimiento);
    return venc < hoy ? "text-danger font-bold" : "text-text-secondary";
  };

  const getFechaTexto = (deuda: Deuda) => {
    if (deuda.estado === "Pagado") return "";
    const venc = new Date(deuda.fecha_vencimiento);
    return venc < hoy ? "Vencida el " : "Vence el ";
  };

  const abrirDetalle = (deuda: Deuda) => {
    setPagoSeleccionado(deuda);
    setDetalleOpen(true);
  };

  useEffect(() => {
    if (!detalleOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => detailDialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetalleOpen(false);
      if (event.key !== "Tab" || !detailDialogRef.current) return;
      const controls = Array.from(detailDialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); };
  }, [detalleOpen]);

  let user: { nombre?: string } = {};
  if (typeof window !== "undefined") {
    try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { user = {}; }
  }
  const nombreApoderado = user?.nombre || "Apoderado";
  const pageLoading = childrenLoading || (Boolean(selectedChild) && loading);

  return (
    <main className="portal-page">
      <ScreenHeader title="Pagos" subtitle="Estado de cuenta escolar" />
      <PageTransition>
        <div className="px-5 pt-5 md:px-8">
          <div className="portal-balance m-card mb-4 p-5">
            <p className="portal-eyebrow">Saldo pendiente</p>
            <p className="portal-summary-value mt-2 break-words">
              {pageLoading || error || !estadoCuenta ? "—" : `S/ ${totalCabecera.toFixed(2)}`}
            </p>
            <p className="mt-3 text-sm font-semibold text-text-secondary">
              {pageLoading ? "Actualizando…" : error ? "Información no disponible" : !selectedChild ? "Sin estudiante seleccionado" : totalCabecera === 0 ? "Sin deuda pendiente" : "Pendientes y vencidas"}
            </p>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2 mb-4">
            {["Pendientes", "Todos", "Pagado", "Vencido"].map((f) => (
              <button
                key={f}
                onClick={() => { setFiltro(f); setVerTodas(false); }}
                aria-pressed={filtro === f}
                className="portal-filter"
              >
                {f}
              </button>
            ))}
          </div>

          {filtro === "Pendientes" && !verTodas && deudasPendientes.length > deudasProximasOVencidas.length && (
            <button onClick={() => setVerTodas(true)} className="mb-2 inline-flex min-h-11 items-center text-xs font-semibold text-accent hover:underline">
              Ver todas ({deudasPendientes.length - deudasProximasOVencidas.length} ocultas)
            </button>
          )}
          {filtro === "Pendientes" && verTodas && (
            <button onClick={() => setVerTodas(false)} className="mb-2 inline-flex min-h-11 items-center text-xs font-semibold text-accent hover:underline">
              Ocultar lejanas
            </button>
          )}
        </div>

        <div className="portal-content pt-1">
          {childrenError ? (
            <PortalState kind="error" title="No pudimos cargar los estudiantes" description={childrenError} />
          ) : error ? (
            <PortalState kind="error" title="No pudimos mostrar tus pagos" description={error} actionLabel="Reintentar" onAction={() => setRetryKey((key) => key + 1)} />
          ) : !childrenLoading && !selectedChild ? (
            <PortalState title="Selecciona un estudiante" description="Elige un estudiante para consultar su estado de cuenta." />
          ) : pageLoading ? (
            <PortalSkeletonList />
          ) : filtradas.length === 0 ? (
            <PortalState icon={portalStateIcons.payments} title={filtro === "Pendientes" ? "No hay pagos próximos o vencidos" : "No hay conceptos en este filtro"} description={filtro === "Pendientes" && !verTodas && deudasPendientes.length > 0
                ? "No hay pagos próximos o vencidos. Puedes ver todos los pendientes."
                : "Los movimientos que coincidan con este estado aparecerán aquí."} />
          ) : (
            filtradas.map((deuda) => (
              <button
                key={deuda.id_cronograma}
                onClick={() => abrirDetalle(deuda)}
                aria-haspopup="dialog"
                className={`mb-3 w-full text-left m-card p-4 transition-[border-color,background-color,box-shadow] duration-200 press ${
                  cronogramaResaltado === deuda.id_cronograma
                    ? "ring-2 ring-accent bg-accent-soft dark:bg-accent/20"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-text">{deuda.concepto}</p>
                    <p className={`mt-1 text-xs ${getFechaClase(deuda)}`}>
                      {getFechaTexto(deuda)}
                      {new Date(deuda.fecha_vencimiento).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`portal-badge ${getBadgeStyle(deuda.estado)}`}>
                    {deuda.estado}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <p className="text-xl font-bold tabular-nums text-text">
                    S/ {Number(deuda.estado === "Pagado" ? deuda.monto_base : deuda.saldo).toFixed(2)}
                  </p>
                  {deuda.estado !== "Pagado" && (
                    <span className="text-xs text-accent font-bold">Tocar para ver detalle</span>
                  )}
                  {deuda.estado === "Pagado" && deuda.pagos.length > 0 && (
                    <p className="text-xs text-success font-bold flex items-center gap-1">
                      <CheckCircle2 size={15} aria-hidden="true" />
                      Pagado el {new Date(deuda.pagos[0].fecha).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </PageTransition>

      {/* Modal de detalle */}
      {detalleOpen && pagoSeleccionado && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Cerrar detalle" className="portal-sheet-backdrop h-full w-full" onClick={() => setDetalleOpen(false)} />
          <div ref={detailDialogRef} role="dialog" aria-modal="true" aria-labelledby="payment-detail-title" className="portal-sheet absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] max-w-[720px] overflow-y-auto p-5 animate-slide-up">
            <div className="portal-sheet-handle mx-auto mb-4" />
            <div className="flex items-start justify-between gap-3">
              <h3 id="payment-detail-title" className="text-xl font-extrabold text-text">{pagoSeleccionado.concepto}</h3>
              <button type="button" onClick={() => setDetalleOpen(false)} aria-label="Cerrar detalle" className="portal-icon-button"><X size={18} /></button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Estado</span>
                <span className={`portal-badge ${getBadgeStyle(pagoSeleccionado.estado)}`}>
                  {pagoSeleccionado.estado}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Monto</span>
                <span className="font-bold text-text">S/ {Number(pagoSeleccionado.monto_base).toFixed(2)}</span>
              </div>
              {pagoSeleccionado.estado !== "Pagado" && Number(pagoSeleccionado.saldo) !== Number(pagoSeleccionado.monto_base) ? (
                <div className="flex justify-between">
                  <span className="text-text-muted">Saldo pendiente</span>
                  <span className="font-bold text-text">S/ {Number(pagoSeleccionado.saldo).toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-text-muted">Vencimiento</span>
                <span className="text-text">{new Date(pagoSeleccionado.fecha_vencimiento).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}</span>
              </div>
              {pagoSeleccionado.estado === "Pagado" && pagoSeleccionado.pagos.length > 0 && (
                <>
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-xs font-semibold text-text-muted mb-2">Historial de pagos</p>
                    {pagoSeleccionado.pagos.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs mb-1">
                        <span className="text-text-secondary">
                          {new Date(p.fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span className="font-bold text-text">S/ {Number(p.monto).toFixed(2)}</span>
                        <span className="text-text-muted">{p.metodo}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const pago = pagoSeleccionado.pagos[0];
                      generarComprobantePDF({
                        concepto: pagoSeleccionado.concepto,
                        monto: Number(pago.monto),
                        fechaPago: new Date(pago.fecha).toLocaleDateString("es-PE"),
                        metodo: pago.metodo,
                        nombreAlumno: selectedChild?.nombre || "Alumno",
                        nombreApoderado: nombreApoderado,
                        codigoTransaccion: pago.id_transaccion?.toString() || "—",
                        institucion: selectedChild?.colegio,
                      });
                    }}
                    className="portal-button mt-4 w-full"
                  >
                    <Download size={17} aria-hidden="true" /> Descargar comprobante
                  </button>
                </>
              )}
              {pagoSeleccionado.estado !== "Pagado" && (
                <div className="mt-3 rounded-xl bg-surface-alt p-3 text-xs text-text-secondary">
                  El pago en línea no está habilitado en el portal. Consulta con Tesorería los canales disponibles.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

export default function PagosPage() {
  return (
    <Suspense
      fallback={
        <main className="portal-page">
          <ScreenHeader title="Pagos" subtitle="Estado de cuenta escolar" />
          <p className="px-5 pt-8 text-center text-sm text-text-secondary">
            Cargando estado de cuenta...
          </p>
          <BottomNav />
        </main>
      }
    >
      <PagosContent />
    </Suspense>
  );
}
