import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';

type AnioLectivo = {
  id_anio: number;
  id_tenant?: number | null;
  id_colegio?: number | null;
  nombre_anio: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
};

type AnioForm = {
  nombre_anio: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  id_colegio: number | '';
};

const estados = [
  'Planificación',
  'Matrícula abierta',
  'En curso',
  'Cerrado',
  'Archivado',
];

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const formatDateInput = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const estadoBadge = (estado: string) => {
  const normalizado = estado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizado.includes('matricula')) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  }

  if (normalizado.includes('curso') || normalizado === 'activo') {
    return 'bg-sky-50 text-sky-700 ring-sky-100';
  }

  if (normalizado.includes('planificacion')) {
    return 'bg-amber-50 text-amber-700 ring-amber-100';
  }

  if (normalizado.includes('cerrado') || normalizado.includes('archivado')) {
    return 'bg-slate-100 text-slate-500 ring-slate-200';
  }

  return 'bg-slate-50 text-slate-500 ring-slate-100';
};

const defaultForm = (colegioId: number | ''): AnioForm => {
  const nextYear = new Date().getFullYear() + 1;

  return {
    nombre_anio: `Año Escolar ${nextYear}`,
    fecha_inicio: `${nextYear}-03-01`,
    fecha_fin: `${nextYear}-12-20`,
    estado: 'Planificación',
    id_colegio: colegioId,
  };
};

export default function AniosLectivosTab() {
  const { token } = useAuth();
  const { tenant, colegios, activeScope, activeColegio, queryString, scopeLabel } =
    useSchool();

  const colegioDefault =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : colegios[0]?.id_colegio || '';

  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<AnioLectivo | null>(null);
  const [form, setForm] = useState<AnioForm>(() => defaultForm(colegioDefault));

  const [mensaje, setMensaje] = useState<string | null>(null);

  const aniosOrdenados = useMemo(() => {
    return [...anios].sort((a, b) =>
      String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)),
    );
  }, [anios]);

  useEffect(() => {
    fetchAnios();
  }, [token, queryString]);

  const fetchAnios = async () => {
    if (!token) return;

    setLoading(true);
    setMensaje(null);

    try {
      const res = await axios.get(`/api/academicos/anios${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAnios(res.data || []);
    } catch (error: any) {
      setAnios([]);
      setMensaje(error.response?.data?.message || 'No se pudieron cargar los años lectivos.');
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevo = () => {
    setEditing(null);
    setForm(defaultForm(colegioDefault));
    setMensaje(null);
    setOpenForm(true);
  };

  const abrirEditar = (anio: AnioLectivo) => {
    setEditing(anio);
    setForm({
      nombre_anio: anio.nombre_anio,
      fecha_inicio: formatDateInput(anio.fecha_inicio),
      fecha_fin: formatDateInput(anio.fecha_fin),
      estado: anio.estado || 'Planificación',
      id_colegio: anio.id_colegio || colegioDefault,
    });
    setMensaje(null);
    setOpenForm(true);
  };

  const validarForm = () => {
    if (!form.nombre_anio.trim()) return 'Ingresa el nombre del año lectivo.';
    if (!form.fecha_inicio) return 'Ingresa la fecha de inicio.';
    if (!form.fecha_fin) return 'Ingresa la fecha de fin.';
    if (!form.id_colegio) return 'Selecciona el colegio al que pertenece el año lectivo.';

    const inicio = new Date(`${form.fecha_inicio}T00:00:00`);
    const fin = new Date(`${form.fecha_fin}T00:00:00`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return 'Las fechas ingresadas no son válidas.';
    }

    if (fin <= inicio) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio.';
    }

    return null;
  };

  const guardarAnio = async () => {
    if (!token) return;

    const error = validarForm();

    if (error) {
      setMensaje(error);
      return;
    }

    setSaving(true);
    setMensaje(null);

    const payload = {
      nombre_anio: form.nombre_anio.trim(),
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      estado: form.estado,
      id_tenant: tenant?.id_tenant || null,
      id_colegio: Number(form.id_colegio),
    };

    try {
      if (editing) {
        await axios.put(`/api/academicos/anios/${editing.id_anio}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMensaje('Año lectivo actualizado correctamente.');
      } else {
        await axios.post('/api/academicos/anios', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMensaje('Año lectivo creado correctamente.');
      }

      setOpenForm(false);
      setEditing(null);
      await fetchAnios();
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'No se pudo guardar el año lectivo.');
    } finally {
      setSaving(false);
    }
  };

  const crearAnioRapido = async (year: number, estado: string) => {
    if (!token || !colegioDefault) return;

    setSaving(true);
    setMensaje(null);

    try {
      await axios.post(
        '/api/academicos/anios',
        {
          nombre_anio: `Año Escolar ${year}`,
          fecha_inicio: `${year}-03-01`,
          fecha_fin: `${year}-12-20`,
          estado,
          id_tenant: tenant?.id_tenant || null,
          id_colegio: colegioDefault,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setMensaje(`Año Escolar ${year} creado correctamente.`);
      await fetchAnios();
    } catch (error: any) {
      setMensaje(error.response?.data?.message || `No se pudo crear el año ${year}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">Años lectivos</p>
            <p className="mt-1 text-sm font-bold text-slate-400">
              Contexto actual: {scopeLabel}. Configura el periodo que Matrícula podrá usar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => crearAnioRapido(new Date().getFullYear(), 'En curso')}
              disabled={saving || !colegioDefault}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              Crear año actual
            </button>

            <button
              type="button"
              onClick={() => crearAnioRapido(new Date().getFullYear() + 1, 'Planificación')}
              disabled={saving || !colegioDefault}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <CalendarDays size={16} />
              Crear próximo año
            </button>

            <button
              type="button"
              onClick={abrirNuevo}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Nuevo año
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-100">
          {mensaje}
        </div>
      )}

      {openForm && (
        <div className="rounded-[26px] bg-white p-5 ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">
                {editing ? 'Editar año lectivo' : 'Nuevo año lectivo'}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                Usa estados claros: Planificación, Matrícula abierta, En curso, Cerrado o Archivado.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpenForm(false)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <label className="lg:col-span-2">
              <Label>Nombre</Label>
              <input
                value={form.nombre_anio}
                onChange={(e) => setForm({ ...form, nombre_anio: e.target.value })}
                placeholder="Año Escolar 2026"
                className={inputClass}
              />
            </label>

            <label>
              <Label>Inicio</Label>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                className={inputClass}
              />
            </label>

            <label>
              <Label>Fin</Label>
              <input
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                className={inputClass}
              />
            </label>

            <label>
              <Label>Estado</Label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className={inputClass}
              >
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </label>

            <label className="lg:col-span-2">
              <Label>Colegio</Label>
              <select
                value={form.id_colegio}
                onChange={(e) =>
                  setForm({
                    ...form,
                    id_colegio: e.target.value ? Number(e.target.value) : '',
                  })
                }
                className={inputClass}
              >
                <option value="">Seleccionar colegio</option>
                {colegios.map((colegio) => (
                  <option key={colegio.id_colegio} value={colegio.id_colegio}>
                    {colegio.nombre_corto || colegio.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpenForm(false)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardarAnio}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-accent-500 px-5 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-slate-100">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-accent-500" />
          </div>
        ) : aniosOrdenados.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <CalendarDays size={32} className="text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-600">Sin años lectivos</p>
            <p className="mt-1 text-sm font-bold text-slate-400">
              Crea primero el año lectivo para poder matricular correctamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {aniosOrdenados.map((anio) => {
              const colegio = colegios.find((item) => item.id_colegio === anio.id_colegio);

              return (
                <div
                  key={anio.id_anio}
                  className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr_1fr_auto] lg:items-center"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">{anio.nombre_anio}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {colegio?.nombre_corto || colegio?.nombre || 'Colegio no identificado'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-700">
                      {formatDate(anio.fecha_inicio)} - {formatDate(anio.fecha_fin)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      ID año: {anio.id_anio}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${estadoBadge(
                        anio.estado,
                      )}`}
                    >
                      {anio.estado}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirEditar(anio)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    <Edit3 size={16} />
                    Editar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
      {children}
    </span>
  );
}