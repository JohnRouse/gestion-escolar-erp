"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface Pago {
  monto: string;
  fecha: string;
  metodo: string;
}

interface Deuda {
  id_cronograma: number;
  concepto: string;
  fecha_vencimiento: string;
  monto_base: string;
  estado: string;
  pagos: Pago[];
}

interface EstadoCuenta {
  id_matricula: number;
  estado_matricula: string;
  deudas: Deuda[];
  total_pendiente: number;
}

export default function PagosPage() {
  const router = useRouter();
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedChild } = useSelectedChild();
  const alumnoId = selectedChild?.id_estudiante ?? 2;
  const [filtro, setFiltro] = useState("Todos");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [mostrarPagados, setMostrarPagados] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchEstadoCuenta(token, alumnoId);
  }, [router, alumnoId]);

  const fetchEstadoCuenta = async (token: string, id: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/tesoreria/padres/estado-cuenta?alumno_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setEstadoCuenta(res.data);
    } catch { setEstadoCuenta(null); } finally { setLoading(false); }
  };

  const deudas = estadoCuenta?.deudas ?? [];
  const pendientesOVencidas = deudas.filter(d => d.estado === "Pendiente" || d.estado === "Vencido");

  // Filtrar según el chip activo
  const filtradas = useMemo(() => {
    if (filtro === "Todos") return deudas;
    return deudas.filter(d => d.estado === filtro);
  }, [deudas, filtro]);

  // Calcular total seleccionado
  const totalSeleccionado = useMemo(() => {
    return seleccionados.reduce((total, id) => {
      const deuda = deudas.find(d => d.id_cronograma === id);
      if (deuda) {
        return total + Number(deuda.monto_base);
      }
      return total;
    }, 0);
  }, [seleccionados, deudas]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const seleccionarTodoPendiente = () => {
    if (seleccionados.length === pendientesOVencidas.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(pendientesOVencidas.map(d => d.id_cronograma));
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "Pagado": return "bg-green-500";
      case "Pendiente": return "bg-amber-500";
      case "Vencido": return "bg-red-500";
      default: return "bg-gray-300";
    }
  };

  const getFechaColor = (deuda: Deuda) => {
    if (deuda.estado === "Pagado") return "text-gray-400";
    const vence = new Date(deuda.fecha_vencimiento);
    return vence < new Date() ? "text-red-600 font-medium" : "text-blue-600";
  };

  const getFechaTexto = (deuda: Deuda) => {
    if (deuda.estado === "Pagado") return "";
    const vence = new Date(deuda.fecha_vencimiento);
    return vence < new Date() ? "Vencida: " : "Vence: ";
  };

  const esPension = (concepto: string) => !concepto.toLowerCase().includes("matrícula");

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* Header con tarjeta superior */}
      <div className="bg-white border-b border-gray-100 px-5 pt-5 pb-4">
        <h1 className="text-lg font-bold text-gray-900 mb-4">Estado de Cuenta</h1>
        <div className="bg-gradient-to-r from-red-500 to-red-400 rounded-2xl p-5 text-white shadow-sm">
          <p className="text-sm font-medium opacity-90">Total pendiente</p>
          <p className="text-4xl font-extrabold mt-1">
            S/ {estadoCuenta?.total_pendiente?.toFixed(2) ?? "0.00"}
          </p>
          {estadoCuenta && estadoCuenta.total_pendiente === 0 && (
            <p className="text-sm text-white/80 mt-2">¡Sin deudas pendientes!</p>
          )}
        </div>
      </div>

      {/* Filtros con chips (primera fila) */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
        {["Todos", "Pendiente", "Pagado", "Vencido"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filtro === f
                ? "bg-red-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
            {f !== "Todos" && (
              <span className="ml-1 text-[10px] opacity-80">
                ({deudas.filter(d => d.estado === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Opción "Seleccionar todo" (segunda fila, solo visible si hay pendientes y el filtro no es Pagado) */}
      {pendientesOVencidas.length > 0 && (filtro === "Todos" || filtro === "Pendiente" || filtro === "Vencido") && (
        <div className="px-4 pt-2 flex items-center justify-end">
          <button
            onClick={seleccionarTodoPendiente}
            className="text-xs text-gray-500 hover:text-red-500 font-medium flex items-center gap-1"
          >
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              seleccionados.length === pendientesOVencidas.length && pendientesOVencidas.length > 0
                ? "bg-red-500 border-red-500"
                : "border-gray-300"
            }`}>
              {seleccionados.length === pendientesOVencidas.length && pendientesOVencidas.length > 0 && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              )}
            </span>
            {seleccionados.length === pendientesOVencidas.length ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
        </div>
      )}

      {/* Listado de deudas */}
      <div className="px-4 pt-3 flex flex-col gap-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-16 animate-pulse" />
          ))
        ) : filtradas.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No hay conceptos</p>
        ) : (
          filtradas.map((deuda) => {
            const seleccionable = deuda.estado === "Pendiente" || deuda.estado === "Vencido";
            const isSelected = seleccionados.includes(deuda.id_cronograma);
            const isPension = esPension(deuda.concepto);
            const mes = isPension ? deuda.concepto.replace("Pensión ", "") : deuda.concepto;

            return (
              <div
                key={deuda.id_cronograma}
                className={`bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 shadow-sm transition-all ${
                  isSelected ? "border-red-300 bg-red-50/30" : "border-gray-100"
                } ${seleccionable ? "cursor-pointer" : ""}`}
                onClick={() => seleccionable && toggleSeleccion(deuda.id_cronograma)}
              >
                {/* Checkbox o indicador de estado */}
                {seleccionable ? (
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-red-500 border-red-500"
                      : "border-gray-300 hover:border-red-400"
                  }`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </div>
                ) : (
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${getEstadoColor(deuda.estado)}`} />
                )}

                {/* Información de la deuda */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-gray-900 truncate">
                      {isPension ? mes : deuda.concepto}
                    </span>
                    <span className="text-base font-bold text-gray-900 ml-2">
                      S/ {Number(deuda.monto_base).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${getFechaColor(deuda)}`}>
                      {getFechaTexto(deuda)}
                      {new Date(deuda.fecha_vencimiento).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                    </p>
                    {deuda.estado === "Pagado" && deuda.pagos.length > 0 && (
                      <p className="text-xs text-green-600">
                        Pagado {new Date(deuda.pagos[0].fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Sección de pagadas (colapsable) */}
        {deudas.filter(d => d.estado === "Pagado").length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setMostrarPagados(!mostrarPagados)}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <span>Pagadas ({deudas.filter(d => d.estado === "Pagado").length})</span>
              <svg className={`w-4 h-4 transition-transform ${mostrarPagados ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {mostrarPagados && (
              <div className="space-y-2 mt-2">
                {deudas.filter(d => d.estado === "Pagado").map((deuda) => (
                  <div key={deuda.id_cronograma} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 opacity-75">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-semibold text-gray-500">
                          {esPension(deuda.concepto) ? deuda.concepto.replace("Pensión ", "") : deuda.concepto}
                        </span>
                        <span className="text-sm font-bold text-gray-500">S/ {Number(deuda.monto_base).toFixed(2)}</span>
                      </div>
                      {deuda.pagos.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Pagado {new Date(deuda.pagos[0].fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botón flotante "Pagar seleccionados" */}
      {seleccionados.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="max-w-[430px] mx-auto">
            <button
              className="w-full py-3 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl shadow-xl shadow-red-500/30 transition-all active:scale-[0.98] flex items-center justify-between"
              onClick={() => {
                alert(`Procesando pago por S/ ${totalSeleccionado.toFixed(2)} de ${seleccionados.length} conceptos`);
                setSeleccionados([]);
              }}
            >
              <span>Pagar seleccionados ({seleccionados.length})</span>
              <span className="text-lg font-bold">S/ {totalSeleccionado.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}