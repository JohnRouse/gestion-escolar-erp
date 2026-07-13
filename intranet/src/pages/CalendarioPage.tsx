import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Edit3,
  Loader2,
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

function uniqueBy<T>(items: T[], getKey: (item: T) => string | number) {
  const map = new Map<string | number, T>();

  for (const item of items) {
    map.set(getKey(item), item);
  }

  return Array.from(map.values());
}

function normalizeScheduleLabel(value?: string | null) {
  return String(value || '').trim().toLocaleLowerCase('es-PE');
}

function shouldShowHorarioArea(item: Horario) {
  return Boolean(
    item.area &&
      normalizeScheduleLabel(item.area) !== normalizeScheduleLabel(item.curso),
  );
}

function labelDia(dia: number) {
  return DIAS.find((item) => item.value === dia)?.label || `Día ${dia}`;
}

export default function CalendarioPage() {
  const { token, user } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const normalizedRole = String(user?.rol || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const isProfesorHorario = [
    'profesor',
    'docente',
  ].includes(normalizedRole);

  const canManageHorario = [
    'admin',
    'administrador',
    'director',
    'direccion',
  ].includes(normalizedRole);

  const [anios, setAnios] = useState<AnioLectivo[]>([]);
  const [anioId, setAnioId] = useState('');
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);

  const [seccionId, setSeccionId] = useState('');
  const [docenteId, setDocenteId] = useState('');

  const [form, setForm] = useState<HorarioForm>(emptyForm);
  const [editing, setEditing] = useState<Horario | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Horario | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const scopeParams = useMemo(() => {
    return new URLSearchParams(queryString.replace('?', ''));
  }, [queryString]);

  const secciones = useMemo(() => {
    if (isProfesorHorario) {
      return uniqueBy(
        horarios.map((item) => ({
          id_asignacion: 0,
          id_docente: item.id_docente,
          id_curso: item.id_curso,
          id_seccion: item.id_seccion,
          id_anio: Number(anioId || 0),
          curso: item.curso,
          area: item.area,
          seccion: item.seccion,
          docente: item.docente,
          colegio: item.colegio,
        })),
        (item) => item.id_seccion,
      );
    }

    return uniqueBy(asignaciones, (item) => item.id_seccion);
  }, [anioId, asignaciones, horarios, isProfesorHorario]);

  const docentes = useMemo(() => {
    if (isProfesorHorario) return [];
    return uniqueBy(asignaciones, (item) => item.id_docente);
  }, [asignaciones, isProfesorHorario]);

  const asignacionesParaFormulario = useMemo(() => {
    return asignaciones.filter((item) => {
      if (seccionId && item.id_seccion !== Number(seccionId)) return false;
      if (docenteId && item.id_docente !== Number(docenteId)) return false;
      return true;
    });
  }, [asignaciones, docenteId, seccionId]);

  const resumen = useMemo(() => {
    return {
      bloques: horarios.length,
      secciones: new Set(horarios.map((item) => item.id_seccion)).size,
      docentes: new Set(horarios.map((item) => item.id_docente)).size,
    };
  }, [horarios]);

  const fetchAnios = async () => {
    if (!token) return;

    const params = new URLSearchParams(scopeParams);

    try {
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

    if (isProfesorHorario) {
      setAsignaciones([]);
      return;
    }

    const params = new URLSearchParams(scopeParams);

    if (anioId) {
      params.set('anio_id', anioId);
    }

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

    const params = new URLSearchParams(scopeParams);

    if (seccionId) params.set('seccion_id', seccionId);
    if (!isProfesorHorario && docenteId) params.set('docente_id', docenteId);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString]);

  useEffect(() => {
    fetchAsignaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString, anioId, isProfesorHorario]);

  useEffect(() => {
    fetchHorarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString, seccionId, docenteId, isProfesorHorario]);

  useEffect(() => {
    if (isProfesorHorario && docenteId) {
      setDocenteId('');
    }
  }, [docenteId, isProfesorHorario]);

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

    const payload = {
      id_asignacion: Number(form.id_asignacion),
      dia_semana: Number(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
    };

    const params = new URLSearchParams(scopeParams);

    setSaving(true);

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

    const params = new URLSearchParams(scopeParams);

    setSaving(true);

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
        description={
          isProfesorHorario
            ? 'Consulta tu horario semanal de clases asignadas.'
            : canManageHorario
              ? 'Organiza el horario semanal por sección, curso y docente. El sistema evita cruces de horario por docente.'
              : 'Consulta el horario semanal por sección, curso y docente.'
        }
        icon={CalendarDays}
        meta={[
          { label: 'Colegio actual', value: scopeLabel },
          { label: 'Bloques', value: String(resumen.bloques) },
          { label: 'Docentes', value: String(resumen.docentes) },
        ]}
      />

      <section className="erp-horario-filters">
        <FilterCard label="Año lectivo">
          <select
            value={anioId}
            onChange={(event) => {
              setAnioId(event.target.value);
              resetForm();
            }}
            className={inputClass}
          >
            <option value="">Todos los años</option>
            {anios.map((anio) => (
              <option key={anio.id_anio} value={anio.id_anio}>
                {anio.nombre_anio}
              </option>
            ))}
          </select>
        </FilterCard>

        <FilterCard label="Sección">
          <select
            value={seccionId}
            onChange={(event) => {
              setSeccionId(event.target.value);
              resetForm();
            }}
            className={inputClass}
          >
            <option value="">Todas las secciones</option>
            {secciones.map((item) => (
              <option key={item.id_seccion} value={item.id_seccion}>
                {item.seccion}
              </option>
            ))}
          </select>
        </FilterCard>

        {!isProfesorHorario && (
          <FilterCard label="Docente">
            <select
              value={docenteId}
              onChange={(event) => {
                setDocenteId(event.target.value);
                resetForm();
              }}
              className={inputClass}
            >
              <option value="">Todos los docentes</option>
              {docentes.map((item) => (
                <option key={item.id_docente} value={item.id_docente}>
                  {item.docente}
                </option>
              ))}
            </select>
          </FilterCard>
        )}

        <section className="erp-horario-summary-card">
          <p className="erp-horario-card-label">Resumen</p>
          <div className="erp-horario-summary-grid">
            <Summary label="Bloques" value={resumen.bloques} />
            <Summary label="Secciones" value={resumen.secciones} />
            <Summary label="Docentes" value={resumen.docentes} />
          </div>
        </section>
      </section>

      <section className={`erp-horario-main-grid ${!canManageHorario ? 'erp-horario-main-grid--readonly' : ''}`}>
        {canManageHorario ? (
          <article className="erp-horario-clean-form-card erp-horario-form-card">
            <header className="erp-horario-clean-form-header">
              <h2>{editing ? 'Editar bloque horario' : 'Crear bloque horario'}</h2>
              <p>Selecciona una asignación docente y define el día, inicio y fin de la clase.</p>
            </header>

            <div className="erp-horario-form-body">
              <label className="erp-horario-field">
                <span>Asignación docente</span>
                <select
                  value={form.id_asignacion}
                  onChange={(event) => setForm({ ...form, id_asignacion: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Seleccionar asignación</option>
                  {asignacionesParaFormulario.map((item) => (
                    <option key={item.id_asignacion} value={item.id_asignacion}>
                      {item.seccion} · {item.curso} · {item.docente}
                    </option>
                  ))}
                </select>
              </label>

              <div className="erp-horario-time-grid">
                <label className="erp-horario-field">
                  <span>Día</span>
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

                <label className="erp-horario-field">
                  <span>Inicio</span>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })}
                    className={inputClass}
                  />
                </label>

                <label className="erp-horario-field">
                  <span>Fin</span>
                  <input
                    type="time"
                    value={form.hora_fin}
                    onChange={(event) => setForm({ ...form, hora_fin: event.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="erp-horario-actions">
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="erp-horario-secondary-button"
                  >
                    <X size={16} />
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  onClick={guardarHorario}
                  disabled={saving || asignacionesParaFormulario.length === 0}
                  className="erp-horario-primary-button"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editing ? 'Guardar cambios' : 'Crear bloque'}
                </button>
              </div>

              {asignacionesParaFormulario.length === 0 && (
                <div className="erp-horario-empty-note">
                  No hay asignaciones docentes para los filtros seleccionados. Primero crea asignaciones desde el módulo de docentes.
                </div>
              )}
            </div>
          </article>
        ) : null}

        <article className="erp-horario-clean-week-card erp-horario-board-card">
          <header className="erp-horario-clean-week-header">
            <div>
              <h2>Horario semanal</h2>
              <p>
                {isProfesorHorario
                  ? 'Consulta tus bloques de clase asignados.'
                  : canManageHorario
                    ? 'Vista por día. Puedes filtrar por sección o docente.'
                    : 'Vista de consulta por día, sección y docente.'}
              </p>
            </div>

            {loading && (
              <span className="erp-horario-loading">
                <Loader2 size={16} className="animate-spin" />
                Actualizando
              </span>
            )}
          </header>

          <div className="erp-horario-board-scroll">
            <div className="erp-horario-clean-grid erp-horario-board-grid">
              {DIAS.map((dia) => {
                const items = horariosPorDia(dia.value);

                return (
                  <section key={dia.value} className="erp-horario-day-column">
                    <header className="erp-horario-day-header">
                      <p>{dia.label}</p>
                      <span>{items.length} bloque(s)</span>
                    </header>

                    <div className="erp-horario-day-body">
                      {items.length === 0 ? (
                        <div className="erp-horario-empty-day">Sin clases</div>
                      ) : (
                        items.map((item) => (
                          <div key={item.id_horario} className="erp-horario-class-card">
                            <div className="erp-horario-class-top">
                              <span className="erp-horario-class-time">
                                <Clock3 size={13} />
                                {item.hora_inicio} - {item.hora_fin}
                              </span>

                              {canManageHorario && (
                                <div className="erp-horario-class-actions">
                                  <button type="button" onClick={() => editarHorario(item)} title="Editar">
                                    <Edit3 size={13} />
                                  </button>
                                  <button type="button" onClick={() => setDeleteTarget(item)} title="Eliminar">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <h3>{item.curso}</h3>

                            <div className="erp-horario-class-meta">
                              <p>
                                <School size={13} />
                                {item.seccion}
                              </p>
                              <p>
                                <UserRound size={13} />
                                {item.docente}
                              </p>
                              {shouldShowHorarioArea(item) && (
                                <p>
                                  <BookOpen size={13} />
                                  {item.area}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
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

function FilterCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="erp-horario-filter-card">
      <p className="erp-horario-card-label">{label}</p>
      {children}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="erp-horario-summary-tile">
      <p>{value}</p>
      <span>{label}</span>
    </div>
  );
}
