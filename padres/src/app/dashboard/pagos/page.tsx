"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { LogOut } from "lucide-react";

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
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [loading, setLoading] = useState(true);
  const [alumnoId] = useState(2);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchEstadoCuenta(token, alumnoId);
  }, [router, alumnoId]);

  const fetchEstadoCuenta = async (token: string, alumnoId: number) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/tesoreria/padres/estado-cuenta?alumno_id=${alumnoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEstadoCuenta(response.data);
    } catch (err) {
      console.error("Error al cargar estado de cuenta:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case "Pagado": return "badge-success";
      case "Pendiente": return "badge-warning";
      case "Vencido": return "badge-danger";
      default: return "";
    }
  };

  const deudasPendientes = estadoCuenta?.deudas.filter((d) => d.estado !== "Pagado") || [];
  const deudasPagadas = estadoCuenta?.deudas.filter((d) => d.estado === "Pagado") || [];

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
            {user?.nombre?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-xs font-semibold text-text">{user?.nombre}</p>
            <p className="text-[10px] text-text-secondary">Estado de Cuenta</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-text-muted hover:text-danger transition-colors p-2"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 gap-3">
              <div className="card h-24 bg-gray-200" />
              <div className="card h-24 bg-gray-200" />
            </div>
            <div className="card h-40 bg-gray-200" />
          </div>
        ) : !estadoCuenta ? (
          <div className="card p-8 text-center">
            <p className="text-text-secondary">No se pudo cargar la información.</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="card p-5 bg-danger-light/30 border-l-4 border-l-danger">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  Total pendiente
                </p>
                <p className="text-2xl font-bold text-danger">
                  S/ {estadoCuenta.total_pendiente.toFixed(2)}
                </p>
              </div>
              <div className="card p-5 bg-success-light/30 border-l-4 border-l-success">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
                  Pagados
                </p>
                <p className="text-2xl font-bold text-success">{deudasPagadas.length}</p>
              </div>
            </div>

            {/* Pendientes */}
            {deudasPendientes.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                  Pendientes de pago
                </h2>
                <div className="space-y-2 mb-4">
                  {deudasPendientes.map((deuda) => (
                    <div key={deuda.id_cronograma} className="card p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-text">{deuda.concepto}</p>
                          <p className="text-xs text-text-muted mt-1">
                            Vence {new Date(deuda.fecha_vencimiento).toLocaleDateString("es-PE")}
                          </p>
                        </div>
                        <span className={`badge text-xs font-bold ${getBadgeClass(deuda.estado)}`}>
                          {deuda.estado}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-text mt-2">
                        S/ {Number(deuda.monto_base).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagados */}
            {deudasPagadas.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
                  Pagados
                </h2>
                <div className="space-y-2">
                  {deudasPagadas.map((deuda) => (
                    <div key={deuda.id_cronograma} className="card p-4 opacity-75">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-text">{deuda.concepto}</p>
                          <p className="text-xs text-text-muted mt-1">
                            {deuda.pagos[0] && `Pagado el ${new Date(deuda.pagos[0].fecha).toLocaleDateString("es-PE")}`}
                          </p>
                        </div>
                        <span className="badge badge-success text-xs font-bold">Pagado</span>
                      </div>
                      <p className="text-lg font-bold text-text mt-2">
                        S/ {Number(deuda.monto_base).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}