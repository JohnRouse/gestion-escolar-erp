import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  Save,
  School,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useToast } from '../contexts/ToastContext';

type AnioLectivo = {
  id_anio: number;
  nombre_anio: string;
  estado?: string;
};

type Asignacion = {
  id_asignacion: number;
  id_docente: number;
  id_curso: number;
  id_seccion: number;
  id_anio: number;
  curso: string;
  area?: string | null;
  seccion: string;
  docente: string;
  anio?: string | null;
  colegio?: string | null;
};

type Horario = {
  id_horario: number;
  id_seccion: number;
  id_curso: number;
  id_docente: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  curso: string;
  area?: string | null;
  docente: string;
  seccion: string;
  colegio?: string | null;
};

type HorarioForm = {
  id_asignacion: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
};

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const emptyForm: HorarioForm = {
  id_asignacion: '',
  dia_semana: '1',
  hora_inicio: '08:00',
  hora_fin: '08:45',
};

const inputClass =
  'h-11 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100';

function labelDia(dia: number) {
  return DIAS.find((item) => item.value === dia)?.label || `Día ${dia}`;
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string | number) {
  const map = new Map<string | number, T>();
  for (const item of items) map.set(getKey(item), item);
  return Array.from(map.values());
}

export default function CalendarioPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [anioId, setAnioId] = useState('');
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [seccionId, setSeccionId] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<HorarioForm>(emptyForm);
  const [editing, setEditing] = useState<Horario | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Horario | null>(null);

  const baseParams = useMemo(() => {
    return new URLSearchParams(queryString.replace('?', ''));
  }, [queryString]);

  const secciones = useMemo(
    () => uniqueBy(asignaciones, (item) => item.id_seccion),
    [asignaciones],
  );

  const docentes = useMemo(
    () => uniqueBy(asignaciones, (item) => item.id_docente),
    [asignaciones],
  );

  const asignacionesFiltradas = useMemo(() => {
    return asignaciones.filter((item) => {
      if (seccionId && item.id_seccion !== Number(seccionId)) return false;
      if (docenteId && item.id_docente !== Number(docenteId)) return false;
      return true;
    });
  }, [asignaciones, docenteId, seccionId]);

  const resumen = useMemo(() => {
    const docentesUnicos = new Set(horarios.map((item) => item.id_docente));
    const seccionesUnicas = new Set(horarios.map((item) => item.id_seccion));

    return {
      bloques: horarios.length,
      docentes: docentesUnicos.size,
      secciones: seccionesUnicas.size,
    };
  }, [horarios]);

  const fetchAnios = async () => {
    if (!token) return;

    try {
      const params = new URLSearchParams(baseParams);
      const res = await axios.get(`/api/academicos/anios?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setAnios(data);

      if (!anioId && data.length > 0) {
        const activo = data.find((item) => item.estado === 'Activo') || data[0];
        setAnioId(String(activo.id_anio));
      }
    } catch {
      setAnios([]);
    }
  };

  const fetchAsignaciones = async () => {
    if (!token) return;

    const params = new URLSearchParams(baseParams);

    if (anioId) params.set('anio_id', anioId);
    if (seccionId) params.set('seccion_id', seccionId);
    if (docenteId) params.set('docente_id', docenteId);

    try {
      const res = await axios.get(`/api/academicos/asignaciones-docentes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAsignaciones(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudieron cargar las asignaciones docentes.';
      showToast({ type: 'error', title: 'Error al cargar asignaciones', message });
      setAsignaciones([]);
    }
  };

  const fetchHorarios = async () => {
    if (!token) return;

    const params = new URLSearchParams(baseParams);

    if (seccionId) params.set('seccion_id', seccionId);
    if (docenteId) params.set('docente_id', docenteId);

    setLoading(true);

    try {
      const res = await axios.get(`/api/academicos/horarios?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setHorarios(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo cargar el horario.';
      showToast({ type: 'error', title: 'Error al cargar horario', message });
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnios();
  }, [token, baseParams.toString()]);

  useEffect(() => {
    fetchAsignaciones();
  }, [token, baseParams.toString(), anioId, seccionId, docenteId]);

  useEffect(() => {
    fetchHorarios();
  }, [token, baseParams.toString(), seccionId, docenteId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const guardarHorario = async () => {
    if (!token) return;

    if (!form.id_asignacion) {
      showToast({
        type: 'warning',
        title: 'Asignación requerida',
        message: 'Selecciona una asignación docente para crear el bloque horario.',
      });
      return;
    }

    setSaving(true);

    const params = new URLSearchParams(baseParams);
    const payload = {
      id_asignacion: Number(form.id_asignacion),
      dia_semana: Number(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
    };

    try {
      if (editing) {
        await axios.put(`/api/academicos/horarios/${editing.id_horario}?${params.toString()}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`/api/academicos/horarios?${params.toString()}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      showToast({
        type: 'success',
        title: editing ? 'Horario actualizado' : 'Bloque creado',
        message: editing ? 'El bloque horario fue actualizado.' : 'El bloque horario fue agregado correctamente.',
      });

      resetForm();
      await fetchHorarios();
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo guardar el horario.';
      showToast({ type: 'error', title: 'No se pudo guardar', message });
    } finally {
      setSaving(false);
    }
  };

  const editarHorario = (horario: Horario) => {
    const asignacion = asignaciones.find(
      (item) =>
        item.id_docente === horario.id_docente &&
        item.id_curso === horario.id_curso &&
        item.id_seccion === horario.id_seccion,
    );

    setEditing(horario);
    setForm({
      id_asignacion: asignacion ? String(asignacion.id_asignacion) : '',
      dia_semana: String(horario.dia_semana),
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
    });
  };

  const eliminarHorario = async () => {
    if (!token || !deleteTarget) return;

    setSaving(true);

    const params = new URLSearchParams(baseParams);

    try {
      await axios.delete(`/api/academicos/horarios/${deleteTarget.id_horario}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast({
        type: 'success',
        title: 'Bloque eliminado',
        message: 'El bloque horario fue retirado correctamente.',
      });

      setDeleteTarget(null);
      await fetchHorarios();
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo eliminar el bloque horario.';
      showToast({ type: 'error', title: 'No se pudo eliminar', message });
    } finally {
      setSaving(false);
    }
  };

  const horariosPorDia = (dia: number) => {
    return horarios
      .filter((item) => item.dia_semana === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  };

  return (
    <div className="carbon-horario-page w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Calendario académico"
        title="Horario escolar"
        description="Organiza el horario semanal por sección, curso y docente. El sistema evita cruces de horario por docente o sección."
        icon={CalendarDays}
        meta={[
          { label: 'Colegio actual', value: scopeLabel },
          { label: 'Bloques', value: String(resumen.bloques) },
          { label: 'Docentes', value: String(resumen.docentes) },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[20px] border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Año lectivo</p>
          <div className="relative mt-2">
            <select value={anioId} onChange={(event) => setAnioId(event.target.value)} className={inputClass}>
              <option value="">Todos los años</option>
              {anios.map((anio) => (
                <option key={anio.id_anio} value={anio.id_anio}>
                  {anio.nombre_anio}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Sección</p>
          <select value={seccionId} onChange={(event) => setSeccionId(event.target.value)} className={`${inputClass} mt-2`}>
            <option value="">Todas las secciones</option>
            {secciones.map((item) => (
              <option key={item.id_seccion} value={item.id_seccion}>
                {item.seccion}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Docente</p>
          <select value={docenteId} onChange={(event) => setDocenteId(event.target.value)} className={`${inputClass} mt-2`}>
            <option value="">Todos los docentes</option>
            {docentes.map((item) => (
              <option key={item.id_docente} value={item.id_docente}>
                {item.docente}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-slate-950 p-4 text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">Resumen</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Summary label="Bloques" value={resumen.bloques} />
            <Summary label="Secciones" value={resumen.secciones} />
            <Summary label="Docentes" value={resumen.docentes} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                {editing ? <Edit3 size={19} /> : <Plus size={19} />}
              </span>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  {editing ? 'Editar bloque horario' : 'Crear bloque horario'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Selecciona una asignación docente y define día y hora.
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                Asignación docente
              </span>
              <select
                value={form.id_asignacion}
                onChange={(event) => setForm({ ...form, id_asignacion: event.target.value })}
                className={inputClass}
              >
                <option value="">Seleccionar asignación</option>
                {asignacionesFiltradas.map((item) => (
                  <option key={item.id_asignacion} value={item.id_asignacion}>
                    {item.seccion} · {item.curso} · {item.docente}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                  Día
                </span>
                <select
                  value={form.dia_semana}
                  onChange={(event) => setForm({ ...form, dia_semana: event.target.value })}
                  className={inputClass}
                >
                  {DIAS.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                  Inicio
                </span>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })}
                  className={inputClass}
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                  Fin
                </span>
                <input
                  type="time"
                  value={form.hora_fin}
                  onChange={(event) => setForm({ ...form, hora_fin: event.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <X size={16} />
                  Cancelar
                </button>
              )}

              <button
                type="button"
                onClick={guardarHorario}
                disabled={saving}
                className="inline-flex h-11 flex-[1.5] items-center justify-center gap-2 rounded-sm bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editing ? 'Guardar cambios' : 'Crear bloque'}
              </button>
            </div>

            {asignacionesFiltradas.length === 0 && (
              <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                No hay asignaciones docentes para los filtros seleccionados. Primero crea asignaciones desde el módulo de docentes.
              </div>
            )}
          </div>
        </article>

        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <h2 className="text-base font-black text-slate-950">Horario semanal</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Vista por día. Puedes filtrar por sección o docente.
              </p>
            </div>
            {loading && <Loader2 size={20} className="animate-spin text-blue-600" />}
          </header>

          <div className="grid min-h-[520px] gap-0 overflow-x-auto xl:grid-cols-6">
            {DIAS.map((dia) => {
              const items = horariosPorDia(dia.value);

              return (
                <div key={dia.value} className="min-w-[220px] border-r border-slate-200 last:border-r-0">
                  <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-600">
                      {dia.label}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {items.length} bloque(s)
                    </p>
                  </div>

                  <div className="space-y-3 p-3">
                    {items.length === 0 ? (
                      <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">
                        Sin clases
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id_horario}
                          className="rounded-[16px] border border-blue-100 bg-blue-50/70 p-3 ring-1 ring-blue-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-black text-blue-700">
                                {item.hora_inicio} - {item.hora_fin}
                              </p>
                              <h3 className="mt-1 text-sm font-black text-slate-950">
                                {item.curso}
                              </h3>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => editarHorario(item)}
                                className="rounded-sm p-1.5 text-slate-500 hover:bg-white hover:text-blue-700"
                                title="Editar"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="rounded-sm p-1.5 text-slate-500 hover:bg-white hover:text-red-700"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs font-bold text-slate-600">
                            <p className="flex items-center gap-1.5">
                              <School size={13} />
                              {item.seccion}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <UserRound size={13} />
                              {item.docente}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <BookOpen size={13} />
                              {item.area || 'Área no definida'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="¿Eliminar bloque horario?"
        description={
          deleteTarget
            ? `${labelDia(deleteTarget.dia_semana)} · ${deleteTarget.hora_inicio} - ${deleteTarget.hora_fin} · ${deleteTarget.curso}`
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar bloque"
        tone="danger"
        loading={saving}
        onConfirm={eliminarHorario}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-white/10 p-2 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">{label}</p>
    </div>
  );
}
