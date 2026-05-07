"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";

interface Deuda {
  id_cronograma: number;
  concepto: string;
  fecha_vencimiento: string;
  monto_base: string;
  estado: string;
  pagos: { monto: string; fecha: string; metodo: string }[];
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
  const [alumnoId] = useState(2);
  const [filtro, setFiltro] = useState("Todos");

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

  const estadoCfg: Record<string, { bg: string; color: string }> = {
    Pagado:   { bg: "#D1FAE5", color: "#059669" },
    Pendiente:{ bg: "#FEF3C7", color: "#92400E" },
    Vencido:  { bg: "#FEE2E2", color: "#DC2626" },
  };

  const deudas = estadoCuenta?.deudas ?? [];
  const filtradas = filtro === "Todos" ? deudas : deudas.filter(d => d.estado === filtro);
  const totalPagado = deudas.filter(d => d.estado === "Pagado").reduce((s, d) => s + Number(d.monto_base), 0);
  const pendiente = estadoCuenta?.total_pendiente ?? 0;

  return (
    <main className="min-h-screen" style={{ background: "#F6F7FF" }}>
      {/* Header */}
      <header className="px-5 pt-10 pb-6 relative overflow-hidden"
        style={{ background: pendiente > 0 ? "linear-gradient(145deg, #92400E 0%, #D97706 60%, #F59E0B 100%)" : "linear-gradient(145deg, #059669 0%, #10B981 60%, #34D399 100%)" }}>
        <div className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)" }} />
        <button onClick={() => router.back()} className="relative z-10 flex items-center gap-2 text-white/60 text-sm mb-5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver
        </button>
        <div className="relative z-10">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Estado de cuenta</p>
          <p className="text-white text-3xl font-extrabold">S/ {pendiente.toFixed(2)}</p>
          <p className="text-white/60 text-xs mt-0.5">{pendiente === 0 ? "¡Sin deudas pendientes!" : "Total pendiente de pago"}</p>
        </div>
        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-2 gap-2 mt-5">
          <div className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-white font-extrabold text-base">S/ {totalPagado.toFixed(2)}</p>
            <p className="text-white/60 text-[10px] font-medium">Pagado este año</p>
          </div>
          <div className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-white font-extrabold text-base">{deudas.filter(d => d.estado === "Pagado").length}/{deudas.length}</p>
            <p className="text-white/60 text-[10px] font-medium">Cuotas pagadas</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 pb-28">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
          {["Todos", "Pendiente", "Pagado", "Vencido"].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`chip flex-shrink-0 ${filtro === f ? "chip-active" : "chip-inactive"}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 mb-3" />)
        ) : !estadoCuenta ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-gray-500 font-semibold text-sm">Sin información disponible</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtradas.map((deuda) => {
              const cfg = estadoCfg[deuda.estado] || { bg: "#F6F7FF", color: "#4A5080" };
              const vence = new Date(deuda.fecha_vencimiento);
              const vencida = deuda.estado !== "Pagado" && vence < new Date();
              return (
                <div key={deuda.id_cronograma} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-bold" style={{ color: "#0A0F2E" }}>{deuda.concepto}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: vencida ? "#DC2626" : "#9499C0" }}>
                        {vencida ? "⚠ Vencida el " : "Vence el "}
                        {vence.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      {deuda.estado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-lg font-extrabold font-mono" style={{ color: "#0A0F2E" }}>
                      S/ {Number(deuda.monto_base).toFixed(2)}
                    </span>
                    {deuda.pagos.length > 0 && (
                      <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: "#059669" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        Pagado el {new Date(deuda.pagos[0].fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    {deuda.estado === "Pendiente" && (
                      <button className="btn btn-primary btn-sm">Pagar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
