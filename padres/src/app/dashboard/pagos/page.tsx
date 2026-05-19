"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import { generarComprobantePDF } from "@/lib/generarComprobante";

interface Pago { monto: string; fecha: string; metodo: string; id_transaccion?: number; }
interface Deuda {
  id_cronograma: number;
  concepto: string;
  fecha_vencimiento: string;
  monto_base: string;
  estado: string;
  pagos: Pago[];
}
interface EstadoCuenta { id_matricula: number; estado_matricula: string; deudas: Deuda[]; total_pendiente: number; }

export default function PagosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedChild, setSelectedChild, hijos } = useSelectedChild();

  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [filtro, setFiltro] = useState("Pendientes");
  const [verTodas, setVerTodas] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Deuda | null>(null);
  const [cronogramaResaltado, setCronogramaResaltado] = useState<number | null>(null);

  const initialMount = useRef(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cambiar de hijo según URL (solo primer render)
  useEffect(() => {
    if (!initialMount.current) return;
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
        setCronogramaResaltado(idCron);
        setTimeout(() => setCronogramaResaltado(null), 4000);
      }
    }

    router.replace("/dashboard/pagos");
  }, [searchParams, selectedChild, hijos, setSelectedChild, router]);

  useEffect(() => {
    if (!selectedChild) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    axios
      .get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${selectedChild.id_estudiante}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEstadoCuenta(res.data))
      .catch(() => setEstadoCuenta(null))
      .finally(() => setLoading(false));
  }, [selectedChild]);

  const deudas = estadoCuenta?.deudas ?? [];
  const hoy = new Date();
  const dentroDe10Dias = new Date(); dentroDe10Dias.setDate(hoy.getDate() + 10);

  const totalCabecera = useMemo(() => {
    return deudas
      .filter((d) => d.estado !== "Pagado")
      .reduce((sum, d) => sum + Number(d.monto_base), 0);
  }, [deudas]);

  const deudasProximasOVencidas = useMemo(() => deudas.filter(d => {
    if (d.estado === "Pagado") return false;
    const venc = new Date(d.fecha_vencimiento);
    return venc <= hoy || venc <= dentroDe10Dias;
  }), [deudas]);

  const filtradas = useMemo(() => {
    if (filtro === "Pendientes") return verTodas ? deudas : deudasProximasOVencidas;
    if (filtro === "Todos") return deudas;
    return deudas.filter(d => d.estado === filtro);
  }, [deudas, filtro, deudasProximasOVencidas, verTodas]);

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

  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const nombreApoderado = user?.nombre || "Apoderado";

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Estado de Cuenta" />
        <div className="px-5 pt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 space-y-3">
              <div className="flex justify-between">
                <div className="skel h-4 w-32" />
                <div className="skel h-6 w-20 rounded-full" />
              </div>
              <div className="skel h-6 w-24" />
            </div>
          ))}
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Estado de Cuenta" />
      <PageTransition>
        <div className="px-5 pt-4">
          <div className="bg-primary border border-accent/30 rounded-2xl p-5 mb-4 shadow-lg shadow-primary/20">
            <p className="text-[10px] tracking-[.22em] font-bold text-accent uppercase">Deuda total</p>
            <p className="text-4xl font-extrabold text-white mt-1">S/ {totalCabecera.toFixed(2)}</p>
            <p className="text-white/70 text-sm mt-1">
              {totalCabecera === 0 ? "¡Sin deudas!" : "Pendientes y vencidas"}
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {["Pendientes", "Todos", "Pagado", "Vencido"].map((f) => (
              <button
                key={f}
                onClick={() => { setFiltro(f); setVerTodas(false); }}
                className={`press px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  filtro === f
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "bg-white text-text-secondary border border-border hover:bg-surface-alt"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filtro === "Pendientes" && !verTodas && deudas.length > deudasProximasOVencidas.length && (
            <button onClick={() => setVerTodas(true)} className="text-xs text-accent font-semibold hover:underline mb-2">
              Ver todas ({deudas.length - deudasProximasOVencidas.length} ocultas)
            </button>
          )}
          {filtro === "Pendientes" && verTodas && (
            <button onClick={() => setVerTodas(false)} className="text-xs text-accent font-semibold hover:underline mb-2">
              Ocultar lejanas
            </button>
          )}
        </div>

        <div className="px-5 pb-28 space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="m-card p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="skel h-4 w-32" />
                  <div className="skel h-6 w-20 rounded-full" />
                </div>
                <div className="skel h-6 w-24" />
              </div>
            ))
          ) : filtradas.length === 0 ? (
            <p className="text-center text-text-secondary py-10">No hay conceptos</p>
          ) : (
            filtradas.map((deuda) => (
              <button
                key={deuda.id_cronograma}
                onClick={() => abrirDetalle(deuda)}
                className={`w-full text-left m-card p-4 transition-all duration-300 press ${
                  cronogramaResaltado === deuda.id_cronograma
                    ? "ring-2 ring-accent bg-accent-soft dark:bg-accent/20"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-extrabold text-text">{deuda.concepto}</p>
                    <p className={`text-xs ${getFechaClase(deuda)}`}>
                      {getFechaTexto(deuda)}
                      {new Date(deuda.fecha_vencimiento).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getBadgeStyle(deuda.estado)}`}>
                    {deuda.estado}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-mono text-lg font-bold text-text">
                    S/ {Number(deuda.monto_base).toFixed(2)}
                  </p>
                  {deuda.estado !== "Pagado" && (
                    <span className="text-xs text-accent font-bold">Tocar para ver detalle</span>
                  )}
                  {deuda.estado === "Pagado" && deuda.pagos.length > 0 && (
                    <p className="text-xs text-success font-bold flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm">check_circle</span>
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
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setDetalleOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[28px] p-6 animate-slide-up max-w-[420px] mx-auto overflow-y-auto max-h-[80vh]">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-border mb-4" />
            <h3 className="text-xl font-extrabold text-text">{pagoSeleccionado.concepto}</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Estado</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getBadgeStyle(pagoSeleccionado.estado)}`}>
                  {pagoSeleccionado.estado}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Monto</span>
                <span className="font-bold text-text">S/ {Number(pagoSeleccionado.monto_base).toFixed(2)}</span>
              </div>
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
                      });
                    }}
                    className="mt-3 w-full py-2.5 rounded-xl bg-accent text-white font-bold text-sm"
                  >
                    Descargar comprobante
                  </button>
                </>
              )}
              {pagoSeleccionado.estado !== "Pagado" && (
                <button
                  onClick={() => {
                    setDetalleOpen(false);
                    setSheetOpen(true);
                  }}
                  className="mt-3 w-full py-2.5 rounded-xl bg-accent text-white font-bold text-sm"
                >
                  Pagar ahora
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet de pago rápido */}
      {sheetOpen && pagoSeleccionado && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-[28px] p-6 animate-slide-up max-w-[420px] mx-auto">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-border mb-4" />
            <h3 className="text-xl font-extrabold text-text">Confirmar pago</h3>
            <p className="text-sm text-text-secondary">
              {pagoSeleccionado.concepto} · S/ {Number(pagoSeleccionado.monto_base).toFixed(2)}
            </p>
            <button
              onClick={() => { setSheetOpen(false); alert("Pago procesado (simulación)"); }}
              className="press mt-5 w-full py-4 rounded-2xl bg-accent text-white font-extrabold shadow-md"
            >
              Pagar S/ {Number(pagoSeleccionado.monto_base).toFixed(2)}
            </button>
            <button
              onClick={() => setSheetOpen(false)}
              className="w-full py-3 mt-2 rounded-2xl text-text-secondary font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}