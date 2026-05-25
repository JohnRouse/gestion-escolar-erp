import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  School,
  GraduationCap,
  Calendar,
  Banknote,
  Users,
  Sparkles,
} from 'lucide-react';

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
}

interface Seccion {
  id_seccion: number;
  letra: string;
  grado: { id_grado: number; nombre_grado: string; nivel: { id_nivel: number; nombre_nivel: string } };
  aula: { capacidad: number };
  matriculas: any[];
}

const inputClass =
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10';

const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500';

const cardClass = 'rounded-2xl border border-gray-200/70 bg-white shadow-sm';

const formatCurrency = (value: string) => {
  const parsedValue = Number.parseFloat(value);
  if (!Number.isFinite(parsedValue)) return 'S/ 0.00';

  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(parsedValue);
};

const formatDate = (value: string) => {
  if (!value) return 'Automática (+7 días)';

  return new Date(`${value}T00:00:00`).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function PagosExtraordinariosPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [nombreConcepto, setNombreConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [nivelesSeleccionados, setNivelesSeleccionados] = useState<number[]>([]);
  const [seccionesSeleccionadas, setSeccionesSeleccionadas] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // 🆕 Filtro visual por nivel
  const [nivelFiltro, setNivelFiltro] = useState<number | null>(null);

  const totalDestinatarios = nivelesSeleccionados.length + seccionesSeleccionadas.length;

  const seccionesPorNivel = useMemo(() => {
    const grupos: Record<string, Seccion[]> = {};

    // Aplicar filtro visual por nivel si está activo
    const seccionesFiltradas = nivelFiltro
      ? secciones.filter((sec) => sec.grado?.nivel?.id_nivel === nivelFiltro)
      : secciones;

    seccionesFiltradas.forEach((seccion) => {
      const nivel = seccion.grado?.nivel?.nombre_nivel || 'Sin nivel';
      grupos[nivel] = [...(grupos[nivel] || []), seccion];
    });

    return Object.entries(grupos);
  }, [secciones, nivelFiltro]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setMensaje(null);

    Promise.all([
      axios.get('/api/academicos/niveles', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/academicos/secciones?anio_id=1', { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([nivelesRes, seccionesRes]) => {
        setNiveles(nivelesRes.data);
        setSecciones(seccionesRes.data);
      })
      .catch(() => {
        setMensaje({
          tipo: 'error',
          texto: 'No se pudieron cargar los niveles y secciones. Inténtalo nuevamente.',
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const toggleNivel = (id: number) => {
    // Selección de destinatarios
    setNivelesSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((nivelId) => nivelId !== id) : [...prev, id]
    );
    // Filtro visual: activar/desactivar el filtro de secciones
    setNivelFiltro((prev) => (prev === id ? null : id));
  };

  const toggleSeccion = (id: number) => {
    setSeccionesSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((seccionId) => seccionId !== id) : [...prev, id]
    );
  };

  const limpiarDestinatarios = () => {
    setNivelesSeleccionados([]);
    setSeccionesSeleccionadas([]);
    setNivelFiltro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!nombreConcepto.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un nombre para el concepto.' });
      return;
    }

    if (!monto || parseFloat(monto) <= 0) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un monto válido mayor a 0.' });
      return;
    }

    if (nivelesSeleccionados.length === 0 && seccionesSeleccionadas.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Selecciona al menos un nivel o una sección.' });
      return;
    }

    setEnviando(true);

    try {
      await axios.post(
        '/api/tesoreria/pagos-extraordinarios',
        {
          nombre_concepto: nombreConcepto.trim(),
          monto: parseFloat(monto),
          fecha_vencimiento: fechaVencimiento || undefined,
          niveles: nivelesSeleccionados,
          secciones: seccionesSeleccionadas,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMensaje({ tipo: 'exito', texto: 'Pago extraordinario creado correctamente.' });
      setNombreConcepto('');
      setMonto('');
      setFechaVencimiento('');
      setNivelesSeleccionados([]);
      setSeccionesSeleccionadas([]);
      setNivelFiltro(null);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al crear el pago extraordinario.',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl animate-slide-in-right">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/tesoreria')}
            className="mt-1 grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white text-gray-400 transition hover:border-gray-300 hover:text-gray-700"
            aria-label="Volver a Tesorería"
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-700">
                Tesorería
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                Cobro puntual
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Pagos extraordinarios</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Crea cobros para paseos, materiales, eventos o actividades especiales y asígnalos por nivel o sección.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`${cardClass} p-6`}>
          <div className="mb-6 flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-2xl" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-3 w-72" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="skeleton h-11 w-full rounded-xl" />
            <div className="skeleton h-11 w-full rounded-xl" />
            <div className="skeleton h-11 w-full rounded-xl" />
            <div className="skeleton h-32 w-full rounded-xl md:col-span-2" />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-500/10 text-accent-600">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-950">Datos del concepto</h2>
                    <p className="text-sm text-gray-500">Define el nombre, monto y fecha límite del cobro.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nombre del concepto *</label>
                  <div className="relative">
                    <FileTextIcon />
                    <input
                      type="text"
                      className={`${inputClass} pl-10`}
                      placeholder="Ej. Paseo a la Granja"
                      value={nombreConcepto}
                      onChange={(e) => setNombreConcepto(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Monto (S/) *</label>
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Fecha de vencimiento</label>
                  <div className="relative">
                    <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      className={`${inputClass} pl-10`}
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    Si lo dejas vacío, el sistema usará 7 días desde hoy.
                  </p>
                </div>
              </div>
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gray-100 text-gray-600">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-950">Destinatarios</h2>
                    <p className="text-sm text-gray-500">Elige niveles completos o secciones puntuales.</p>
                  </div>
                </div>

                {totalDestinatarios > 0 && (
                  <button
                    type="button"
                    onClick={limpiarDestinatarios}
                    className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>

              <div className="space-y-7 p-6">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <School size={16} className="text-gray-400" />
                      Niveles
                    </h3>
                    <span className="text-xs text-gray-400">{nivelesSeleccionados.length} seleccionados</span>
                  </div>

                  {niveles.length === 0 ? (
                    <EmptyState text="No hay niveles disponibles." />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {niveles.map((nivel) => {
                        const selected = nivelesSeleccionados.includes(nivel.id_nivel);

                        return (
                          <button
                            key={nivel.id_nivel}
                            type="button"
                            onClick={() => toggleNivel(nivel.id_nivel)}
                            aria-pressed={selected}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                              selected
                                ? 'border-accent-200 bg-accent-500/10 text-accent-700 ring-2 ring-accent-500/10'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {nivel.nombre_nivel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <GraduationCap size={16} className="text-gray-400" />
                      Secciones específicas
                      {nivelFiltro && (
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs text-accent-600">
                          filtradas
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-gray-400">{seccionesSeleccionadas.length} seleccionadas</span>
                  </div>

                  {secciones.length === 0 ? (
                    <EmptyState text="No hay secciones disponibles." />
                  ) : (
                    <div className="max-h-[340px] space-y-5 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                      {seccionesPorNivel.map(([nivel, seccionesDelNivel]) => (
                        <div key={nivel}>
                          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-gray-400">
                            {nivel}
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {seccionesDelNivel.map((seccion) => {
                              const selected = seccionesSeleccionadas.includes(seccion.id_seccion);
                              const alumnos = seccion.matriculas?.length ?? 0;

                              return (
                                <button
                                  key={seccion.id_seccion}
                                  type="button"
                                  onClick={() => toggleSeccion(seccion.id_seccion)}
                                  aria-pressed={selected}
                                  className={`rounded-xl border p-3 text-left transition ${
                                    selected
                                      ? 'border-accent-200 bg-white text-accent-700 shadow-sm ring-2 ring-accent-500/10'
                                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm'
                                  }`}
                                >
                                  <span className="block text-sm font-semibold">
                                    {seccion.grado.nombre_grado} “{seccion.letra}”
                                  </span>
                                  <span className="mt-1 block text-xs text-gray-400">
                                    {alumnos} alumnos · Cap. {seccion.aula?.capacidad ?? '-'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {mensaje && (
              <FeedbackMessage tipo={mensaje.tipo} texto={mensaje.texto} />
            )}
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className={`${cardClass} overflow-hidden`}>
              <div className="bg-gradient-to-br from-gray-50 to-white px-6 py-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Sparkles size={16} className="text-accent-500" />
                  Resumen del cobro
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Concepto</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-950">
                    {nombreConcepto.trim() || 'Sin nombre todavía'}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <SummaryItem label="Monto" value={formatCurrency(monto)} />
                    <SummaryItem label="Vence" value={formatDate(fechaVencimiento)} />
                    <SummaryItem label="Niveles" value={String(nivelesSeleccionados.length)} />
                    <SummaryItem label="Secciones" value={String(seccionesSeleccionadas.length)} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 p-6">
                <p className="text-xs leading-5 text-gray-500">
                  Revisa que el monto y los destinatarios sean correctos antes de generar el cobro.
                </p>

                <button
                  type="submit"
                  disabled={enviando}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {enviando ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Send size={17} />
                      Crear pago extraordinario
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}

function FeedbackMessage({ tipo, texto }: { tipo: 'exito' | 'error'; texto: string }) {
  const isSuccess = tipo === 'exito';

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{texto}</span>
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}