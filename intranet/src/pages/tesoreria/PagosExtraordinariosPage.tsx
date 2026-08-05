import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  GraduationCap,
  Loader2,
  School,
  Send,
  Sparkles,
} from 'lucide-react';

interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
}

interface ColegioOption {
  id_colegio: number;
  nombre: string;
  nombre_corto?: string | null;
  codigo?: string | null;
}

interface Seccion {
  id_seccion: number;
  id_colegio?: number | null;
  colegio?: ColegioOption | null;
  letra: string;
  grado: {
    id_grado: number;
    nombre_grado: string;
    nivel: { id_nivel: number; nombre_nivel: string };
  };
  aula: { capacidad: number };
  matriculas: any[];
  matriculados?: number;
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400';

const currency = (value: string) => {
  const parsedValue = Number.parseFloat(value);
  if (!Number.isFinite(parsedValue)) return 'S/ 0.00';
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(parsedValue);
};

export default function PagosExtraordinariosPage() {
  const { token } = useAuth();
  const { activeScope, activeColegio, colegios, scopeLabel, queryString } = useSchool();
  const navigate = useNavigate();

  const [colegioDestino, setColegioDestino] = useState<number | 'todos' | ''>(
    activeScope.tipo === 'colegio' ? activeScope.id_colegio || '' : '',
  );
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
  const [nivelFiltro, setNivelFiltro] = useState<number | null>(null);

  const destinoQuery = useMemo(() => {
    if (activeScope.tipo === 'colegio') return queryString;
    if (colegioDestino && colegioDestino !== 'todos') return `?colegio_id=${colegioDestino}`;
    return '?scope=all';
  }, [activeScope.tipo, colegioDestino, queryString]);

  const colegioDestinoLabel = useMemo(() => {
    if (activeScope.tipo === 'colegio') return activeColegio?.nombre || scopeLabel;
    if (colegioDestino === 'todos') return 'Todos los colegios del grupo';
    if (colegioDestino) return colegios.find((item) => item.id_colegio === colegioDestino)?.nombre || 'Colegio';
    return 'Selecciona destino';
  }, [activeScope.tipo, activeColegio, scopeLabel, colegioDestino, colegios]);

  const seccionesFiltradasPorDestino = useMemo(() => {
    let base = secciones;

    if (activeScope.tipo === 'colegio') {
      base = base.filter((sec) => sec.id_colegio === activeScope.id_colegio);
    } else if (colegioDestino && colegioDestino !== 'todos') {
      base = base.filter((sec) => sec.id_colegio === colegioDestino);
    }

    if (nivelFiltro) {
      base = base.filter((sec) => sec.grado?.nivel?.id_nivel === nivelFiltro);
    }

    return base;
  }, [secciones, activeScope, colegioDestino, nivelFiltro]);

  const seccionesPorNivel = useMemo(() => {
    const grupos: Record<string, Seccion[]> = {};
    seccionesFiltradasPorDestino.forEach((seccion) => {
      const nivel = seccion.grado?.nivel?.nombre_nivel || 'Sin nivel';
      grupos[nivel] = [...(grupos[nivel] || []), seccion];
    });
    return Object.entries(grupos);
  }, [seccionesFiltradasPorDestino]);

  const totalDestinatarios = nivelesSeleccionados.length + seccionesSeleccionadas.length;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setMensaje(null);

    axios
      .get(`/api/tesoreria/pagos-extraordinarios/destinatarios${destinoQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setNiveles(res.data.niveles || []);
        setSecciones(res.data.secciones || []);
      })
      .catch(() => {
        setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los destinatarios.' });
      })
      .finally(() => setLoading(false));
  }, [token, destinoQuery]);

  useEffect(() => {
    setNivelesSeleccionados([]);
    setSeccionesSeleccionadas([]);
    setNivelFiltro(null);
  }, [colegioDestino, activeScope.tipo, activeScope.id_colegio]);

  const toggleNivel = (id: number) => {
    setNivelesSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((nivelId) => nivelId !== id) : [...prev, id],
    );
    setNivelFiltro((prev) => (prev === id ? null : id));
  };

  const toggleSeccion = (id: number) => {
    setSeccionesSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((seccionId) => seccionId !== id) : [...prev, id],
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

    if (activeScope.tipo === 'todos' && !colegioDestino) {
      setMensaje({ tipo: 'error', texto: 'Selecciona el colegio destino o aplica a todos.' });
      return;
    }

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
          scope: colegioDestino === 'todos' ? 'all' : undefined,
          aplicar_todos: colegioDestino === 'todos',
          id_colegio:
            activeScope.tipo === 'colegio'
              ? activeScope.id_colegio
              : colegioDestino && colegioDestino !== 'todos'
                ? colegioDestino
                : undefined,
          nombre_concepto: nombreConcepto.trim(),
          monto: parseFloat(monto),
          fecha_vencimiento: fechaVencimiento || undefined,
          niveles: nivelesSeleccionados,
          secciones: seccionesSeleccionadas,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMensaje({ tipo: 'exito', texto: 'Pago extraordinario creado correctamente.' });
      setNombreConcepto('');
      setMonto('');
      setFechaVencimiento('');
      limpiarDestinatarios();
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
    <div className="carbon-tesoreria-page w-full space-y-6">
      <PageHeader
        eyebrow="Tesorería · Cobro puntual"
        title="Pagos extraordinarios"
        description="Crea cobros para paseos, materiales, eventos o actividades especiales y asígnalos por colegio, nivel o sección."
        icon={Banknote}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Destino', value: colegioDestinoLabel },
        ]}
        actions={
          <button
            type="button"
            onClick={() => navigate('/tesoreria')}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
        }
      />

      {mensaje && (
        <div
          className={`flex items-start gap-3 rounded-3xl border p-4 text-sm font-bold shadow-sm ${
            mensaje.tipo === 'exito'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {activeScope.tipo === 'todos' && (
            <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <School size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-950">Colegio destino</h2>
                  <p className="text-sm text-slate-500">Define dónde se generará el cobro.</p>
                </div>
              </div>
              <select
                value={colegioDestino}
                onChange={(e) => setColegioDestino(e.target.value === 'todos' ? 'todos' : e.target.value ? Number(e.target.value) : '')}
                className={inputClass}
              >
                <option value="">Seleccionar colegio</option>
                <option value="todos">Todos los colegios del grupo</option>
                {colegios.map((colegio) => (
                  <option key={colegio.id_colegio} value={colegio.id_colegio}>
                    {colegio.nombre}
                  </option>
                ))}
              </select>
            </section>
          )}

          <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                <Banknote size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">Datos del concepto</h2>
                <p className="text-sm text-slate-500">Define el nombre, monto y fecha límite del cobro.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className={labelClass}>Nombre del concepto *</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ej. Paseo escolar, materiales, actividad institucional..."
                  value={nombreConcepto}
                  onChange={(e) => setNombreConcepto(e.target.value)}
                />
              </label>
              <label>
                <span className={labelClass}>Monto *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </label>
              <label>
                <span className={labelClass}>Fecha de vencimiento</span>
                <input
                  type="date"
                  className={inputClass}
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-950">Destinatarios</h2>
                  <p className="text-sm text-slate-500">Puedes seleccionar niveles completos o secciones específicas.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={limpiarDestinatarios}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-500 transition hover:bg-slate-50"
              >
                Limpiar selección
              </button>
            </div>

            {loading ? (
              <div className="grid gap-3 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="skeleton h-24 rounded-3xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Niveles</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {niveles.map((nivel) => {
                      const selected = nivelesSeleccionados.includes(nivel.id_nivel);
                      return (
                        <button
                          key={nivel.id_nivel}
                          type="button"
                          onClick={() => toggleNivel(nivel.id_nivel)}
                          className={`extraordinary-target-card rounded-3xl border p-4 text-left transition-all ${
                            selected
                              ? 'extraordinary-target-card--selected'
                              : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <p className="text-sm font-black">{nivel.nombre_nivel}</p>
                          <p className="mt-1 text-xs opacity-70">Seleccionar nivel completo</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Secciones</p>
                  {seccionesPorNivel.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-400">
                      No hay secciones para el destino seleccionado.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {seccionesPorNivel.map(([nivel, items]) => (
                        <div key={nivel}>
                          <h3 className="mb-3 text-sm font-black text-slate-800">{nivel}</h3>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {items.map((seccion) => {
                              const selected = seccionesSeleccionadas.includes(seccion.id_seccion);
                              return (
                                <button
                                  key={seccion.id_seccion}
                                  type="button"
                                  onClick={() => toggleSeccion(seccion.id_seccion)}
                                  className={`extraordinary-target-card rounded-3xl border p-4 text-left transition-all ${
                                    selected
                                      ? 'extraordinary-target-card--selected'
                                      : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black">
                                        {seccion.grado?.nombre_grado} "{seccion.letra}"
                                      </p>
                                      <p className="mt-1 text-xs opacity-70">
                                        {seccion.colegio?.nombre || colegioDestinoLabel}
                                      </p>
                                    </div>
                                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black shadow-sm">
                                      {seccion.matriculados ?? seccion.matriculas?.length ?? 0}
                                    </span>
                                  </div>
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
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="sticky top-4 rounded-[30px] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">Resumen</h2>
                <p className="text-sm text-slate-500">Verifica antes de generar.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Concepto</p>
                <p className="mt-1 text-sm font-black text-slate-800">{nombreConcepto || 'Sin nombre'}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Monto</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{currency(monto)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Destino</p>
                <p className="mt-1 text-sm font-black text-slate-800">{colegioDestinoLabel}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Selección</p>
                <p className="mt-1 text-sm font-black text-slate-800">{totalDestinatarios} destinatarios configurados</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white shadow-lg shadow-accent-500/20 transition hover:-translate-y-0.5 hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              {enviando ? 'Generando...' : 'Crear cobro'}
            </button>
          </section>
        </aside>
      </form>
    </div>
  );
}
