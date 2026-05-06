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
  const [alumnoId] = useState(2); // Lucas García

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
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

  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case "Pagado": return "badge-green";
      case "Pendiente": return "badge-amber";
      case "Vencido": return "badge-red";
      default: return "";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Título */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <h1 className="text-sm font-semibold text-navy">Estado de Cuenta</h1>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Cargando...</p>
        ) : !estadoCuenta ? (
          <p className="text-center text-gray-400 text-sm">No se pudo cargar la información.</p>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="card p-4">
                <p className="text-[10px] text-gray-400 mb-1">Total pendiente</p>
                <p className="text-xl font-semibold text-red">
                  S/ {estadoCuenta.total_pendiente.toFixed(2)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-gray-400 mb-1">Al día hasta</p>
                <p className="text-lg font-semibold text-green">Abril 2025</p>
              </div>
            </div>

            {/* Listado de deudas */}
            <h2 className="text-xs font-medium text-gray-500 mb-3">Conceptos</h2>
            <div className="flex flex-col gap-2">
              {estadoCuenta.deudas.map((deuda) => (
                <div key={deuda.id_cronograma} className="card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{deuda.concepto}</p>
                      <p className="text-[10px] text-gray-400">
                        Vence {new Date(deuda.fecha_vencimiento).toLocaleDateString("es-PE")}
                      </p>
                    </div>
                    <span className={`badge ${getBadgeClass(deuda.estado)}`}>
                      {deuda.estado}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-navy">
                      S/ {Number(deuda.monto_base).toFixed(2)}
                    </span>
                    {deuda.pagos.length > 0 && (
                      <span className="text-[10px] text-green">
                        Pagado el {new Date(deuda.pagos[0].fecha).toLocaleDateString("es-PE")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}