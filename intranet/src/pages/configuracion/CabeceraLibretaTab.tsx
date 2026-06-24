import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Image,
  Loader2,
  Palette,
  Save,
  School,
  ShieldCheck,
  UserSquare2,
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

interface ColegioCabecera {
  id_colegio: number;
  nombre: string;
  nombre_corto?: string | null;
  codigo?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logo_url?: string | null;
  color_principal?: string | null;
}

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';

const emptyColegio: ColegioCabecera = {
  id_colegio: 0,
  nombre: '',
  nombre_corto: '',
  codigo: '',
  direccion: '',
  telefono: '',
  logo_url: '',
  color_principal: '#2563eb',
};

export default function CabeceraLibretaTab() {
  const { token } = useAuth();
  const { colegios, activeScope, activeColegio, queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const colegioConfigId =
    activeScope.tipo === 'colegio' && activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : null;

  const mostrarSelectorInstitucion = activeScope.tipo === 'todos' && colegios.length > 1;
  const [colegioGestionId, setColegioGestionId] = useState('');

  const colegioGestionActualId = Number(
    mostrarSelectorInstitucion
      ? colegioGestionId
      : colegioConfigId || colegios[0]?.id_colegio || 0,
  );

  const scopedQuery = useMemo(() => {
    const params = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : '');

    if (colegioGestionActualId) {
      params.delete('scope');
      params.set('colegio_id', String(colegioGestionActualId));
    }

    return `?${params.toString()}`;
  }, [queryString, colegioGestionActualId]);

  const nombreColegioGestion = useMemo(() => {
    const colegio = colegios.find((item) => item.id_colegio === colegioGestionActualId);
    return colegio?.nombre || colegio?.nombre_corto || scopeLabel;
  }, [colegios, colegioGestionActualId, scopeLabel]);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const [form, setForm] = useState<ColegioCabecera>(emptyColegio);
  const [original, setOriginal] = useState<ColegioCabecera>(emptyColegio);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (mostrarSelectorInstitucion && !colegioGestionId && colegios[0]?.id_colegio) {
      setColegioGestionId(String(colegios[0].id_colegio));
    }
  }, [mostrarSelectorInstitucion, colegioGestionId, colegios]);

  const loadData = async () => {
    if (!token || !colegioGestionActualId) return;

    setLoading(true);
    setMensaje(null);

    try {
      const res = await axios.get(`/api/tutoria/libreta/config${scopedQuery}`, authHeader);
      const data = {
        ...emptyColegio,
        ...(res.data?.colegio || {}),
        color_principal: res.data?.colegio?.color_principal || '#2563eb',
      };

      setForm(data);
      setOriginal(data);
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo cargar la cabecera de libreta.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopedQuery, colegioGestionActualId]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(original);
  }, [form, original]);

  const updateField = (field: keyof ColegioCabecera, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setMensaje(null);
  };

  const guardar = async () => {
    if (!token) return;

    if (!form.nombre.trim()) {
      setMensaje({
        type: 'error',
        text: 'El nombre oficial del colegio es obligatorio.',
      });
      return;
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(form.color_principal || '')) {
      setMensaje({
        type: 'error',
        text: 'El color institucional debe tener formato hexadecimal. Ejemplo: #2563eb',
      });
      return;
    }

    setSaving(true);
    setMensaje(null);

    try {
      const res = await axios.patch(
        `/api/tutoria/libreta/config${scopedQuery}`,
        {
          nombre: form.nombre,
          nombre_corto: form.nombre_corto || null,
          codigo: form.codigo || null,
          logo_url: form.logo_url || null,
          color_principal: form.color_principal || '#2563eb',
          direccion: form.direccion || null,
          telefono: form.telefono || null,
        },
        authHeader,
      );

      const data = {
        ...emptyColegio,
        ...(res.data?.colegio || {}),
        color_principal: res.data?.colegio?.color_principal || '#2563eb',
      };

      setForm(data);
      setOriginal(data);
      setConfirmSave(false);

      setMensaje({
        type: 'success',
        text: 'Cabecera de libreta guardada correctamente.',
      });

      showToast({
        type: 'success',
        title: 'Cabecera actualizada',
        message: `La libreta usará la cabecera de ${nombreColegioGestion}.`,
      });
    } catch (err: any) {
      setMensaje({
        type: 'error',
        text: err.response?.data?.message || 'No se pudo guardar la cabecera de libreta.',
      });
    } finally {
      setSaving(false);
    }
  };

  const color = form.color_principal || '#2563eb';
  const titulo = (form.nombre || 'I.E.P. SAN GABRIEL DEMO')
    .replace(/^Colegio\s+Privado\s+/i, '')
    .toUpperCase();

  if (loading) {
    return (
      <div className="space-y-4 erp-page-enter">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="skeleton h-96 rounded-3xl" />
          <div className="skeleton h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 erp-page-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Cabecera de libreta</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configura el escudo, color institucional y datos que aparecerán en el PDF impreso.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConfirmSave(true)}
          disabled={!hasChanges || saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar cabecera
        </button>
      </div>

      {mostrarSelectorInstitucion && (
        <section className={`${panelClass} p-4 erp-section-enter`}>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Institución para gestionar
            </span>
            <select
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              value={colegioGestionId}
              onChange={(event) => {
                setColegioGestionId(event.target.value);
                setMensaje(null);
              }}
            >
              {colegios.map((colegio) => (
                <option key={colegio.id_colegio} value={colegio.id_colegio}>
                  {colegio.nombre || colegio.nombre_corto}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-semibold text-gray-500">
              En vista consolidada, primero elige la institución para configurar su cabecera propia.
            </p>
          </label>
        </section>
      )}

      {mensaje && (
        <div
          className={`flex items-start gap-3 rounded-3xl border px-4 py-3 text-sm font-semibold ${
            mensaje.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{mensaje.text}</span>
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className={`${panelClass} p-5 erp-section-enter`}>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-2 text-blue-600">
              <School size={19} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-950">Datos institucionales</h4>
              <p className="text-sm font-semibold text-slate-500">Estos datos se usarán en la cabecera del PDF.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Nombre oficial del colegio
              </span>
              <input
                value={form.nombre || ''}
                onChange={(event) => updateField('nombre', event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="I.E.P. San Gabriel Demo"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Nombre corto
              </span>
              <input
                value={form.nombre_corto || ''}
                onChange={(event) => updateField('nombre_corto', event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="SGD"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Código modular / código interno
              </span>
              <input
                value={form.codigo || ''}
                onChange={(event) => updateField('codigo', event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="SGD"
              />
            </label>

            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                URL del escudo / logo
              </span>
              <div className="flex gap-2">
                <input
                  value={form.logo_url || ''}
                  onChange={(event) => updateField('logo_url', event.target.value)}
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  placeholder="https://i.ibb.co/DfvXnNKY/logo-sm-victoria.jpg"
                />
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                  <Image size={18} />
                </div>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-slate-400">
                Puedes usar una URL https, data:image o una ruta /uploads/.
              </p>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Color institucional
              </span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.color_principal || '#2563eb'}
                  onChange={(event) => updateField('color_principal', event.target.value)}
                  className="h-12 w-16 rounded-2xl border border-slate-200 bg-white p-1"
                />
                <input
                  value={form.color_principal || '#2563eb'}
                  onChange={(event) => updateField('color_principal', event.target.value)}
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  placeholder="#2563eb"
                />
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Teléfono
              </span>
              <input
                value={form.telefono || ''}
                onChange={(event) => updateField('telefono', event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="01 000 0000"
              />
            </label>

            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Dirección
              </span>
              <input
                value={form.direccion || ''}
                onChange={(event) => updateField('direccion', event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                placeholder="Dirección institucional"
              />
            </label>
          </div>
        </div>

        <aside className={`${panelClass} overflow-hidden erp-detail-enter`}>
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-2 text-blue-600">
                <Palette size={18} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-950">Vista previa</h4>
                <p className="text-sm font-semibold text-slate-500">Cabecera aproximada de la libreta A4.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-start gap-3">
                <div className="flex h-16 w-14 items-center justify-center overflow-hidden rounded bg-white">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Escudo"
                      className="h-full w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[9px] font-black text-slate-400">ESCUDO</span>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-lg font-black text-slate-700">Colegio Privado</p>
                  <p className="mt-1 text-2xl font-black leading-tight" style={{ color }}>
                    {titulo || 'INSTITUCIÓN EDUCATIVA'}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">
                    {form.codigo ? form.codigo : 'R.D. / UGEL / Código institucional'}
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-900">BOLETA DE NOTAS - 2027</p>
                  <p className="text-xs font-black text-slate-700">NIVEL INICIAL - BIMESTRE 1</p>
                </div>

                <div className="flex h-20 w-14 items-center justify-center rounded border border-slate-300 bg-white">
                  <UserSquare2 size={21} className="text-slate-300" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-1 text-center text-[10px] font-black text-slate-600">
                <div className="rounded border border-slate-300 py-1">Código</div>
                <div className="col-span-2 rounded border border-slate-300 py-1">Apellidos y Nombres</div>
                <div className="rounded border border-slate-300 py-1">Salón</div>
              </div>

              <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                <ShieldCheck size={15} className="mb-1 inline-block" /> La foto del recuadro derecho se tomará desde la foto/avatar del alumno.
              </div>
            </div>
          </div>
        </aside>
      </section>

      <ConfirmDialog
        open={confirmSave}
        eyebrow="Cabecera de libreta"
        title="Confirmar guardado"
        description={`Se actualizará la cabecera de libreta para ${nombreColegioGestion}. Los próximos PDF exportados usarán estos datos.`}
        tone="neutral"
        confirmLabel="Sí, guardar"
        cancelLabel="Cancelar"
        loading={saving}
        onCancel={() => setConfirmSave(false)}
        onConfirm={() => {
          void guardar();
        }}
      />
    </div>
  );
}
