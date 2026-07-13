//ESCALATAB

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import { AlertCircle, CheckCircle2, Gauge, Loader2, Save, ShieldCheck } from 'lucide-react';

const panelClass =
  'rounded-[1.5rem] border border-gray-200/70 bg-white/90 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.5)]';

function toInt(value: string | number) {
  const parsed = parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function EscalaTab() {
  const { token } = useAuth();
  const {
    tenant,
    colegios,
    activeScope,
    activeColegio,
    queryString,
    scopeLabel,
  } = useSchool();
  const { showToast } = useToast();

  const [colegioGestionId, setColegioGestionId] =
    useState('');

  const colegioConfigId =
    activeScope.tipo === 'colegio' &&
    activeColegio?.id_colegio
      ? activeColegio.id_colegio
      : Number(
          colegioGestionId ||
            colegios[0]?.id_colegio ||
            0,
        ) || null;

  const colegioGestion = colegios.find(
    (colegio) =>
      colegio.id_colegio === colegioConfigId,
  );

  const escalaQueryString = colegioConfigId
    ? `?colegio_id=${colegioConfigId}`
    : queryString;

  const escalaScopeLabel =
    colegioGestion?.nombre ||
    colegioGestion?.nombre_corto ||
    scopeLabel;

  const [minima, setMinima] = useState(0);
  const [maxima, setMaxima] = useState(20);
  const [aprobatoria, setAprobatoria] = useState(11);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const range = Math.max(1, maxima - minima);
  const approvalPosition = Math.min(100, Math.max(0, ((aprobatoria - minima) / range) * 100));
  const desaprobadas = Math.max(0, aprobatoria - minima);
  const aprobadas = Math.max(0, maxima - aprobatoria + 1);

  useEffect(() => {
    if (!token) return;

    if (!colegioConfigId) {
      setLoading(false);
      setMensaje({
        type: 'error',
        text: 'Selecciona una institución para consultar su escala.',
      });
      return;
    }

    setLoading(true);
    setMensaje(null);

    axios
      .get(
        `/api/calificaciones/escala${escalaQueryString}`,
        authHeader,
      )
      .then((res) => {
        if (res.data) {
          setMinima(Number(res.data.nota_minima));
          setMaxima(Number(res.data.nota_maxima));
          setAprobatoria(
            Number(res.data.nota_aprobatoria),
          );
        }
      })
      .catch((error) => {
        const status = error?.response?.status;

        setMensaje({
          type: 'error',
          text:
            status === 403
              ? 'Tu perfil no tiene permiso para consultar esta escala.'
              : 'No se pudo cargar la escala de calificación.',
        });
      })
      .finally(() => setLoading(false));
  }, [
    token,
    authHeader,
    escalaQueryString,
    colegioConfigId,
  ]);

  const handleSave = async () => {
    setMensaje(null);

    if (minima >= maxima) {
      setMensaje({ type: 'error', text: 'La nota mínima debe ser menor que la máxima.' });
      return;
    }

    if (aprobatoria < minima || aprobatoria > maxima) {
      setMensaje({ type: 'error', text: 'La nota aprobatoria debe estar dentro del rango de la escala.' });
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `/api/calificaciones/escala${queryString}`,
        {
          nota_minima: Number(minima),
          nota_maxima: Number(maxima),
          nota_aprobatoria: Number(aprobatoria),
          id_tenant: tenant?.id_tenant || undefined,
          id_colegio: colegioConfigId || undefined,
        },
        authHeader
      );
      setMensaje({ type: 'success', text: 'Escala actualizada correctamente.' });
      showToast({
        type: 'success',
        title: 'Escala guardada',
        message: `Escala actualizada para ${escalaScopeLabel}.`,
      });
    } catch {
      setMensaje({ type: 'error', text: 'No se pudo guardar la escala.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-24 rounded-3xl" />
        </div>
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">Escala de calificación</h3>
        <p className="mt-1 text-sm text-gray-500">Configura el rango de notas que usará el registro académico.</p>
      </div>

      {activeScope.tipo === 'todos' &&
        colegios.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.04em] text-slate-600">
                Institución para configurar
              </span>

              <select
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={String(colegioConfigId || '')}
                onChange={(event) => {
                  setColegioGestionId(
                    event.target.value,
                  );
                  setMensaje(null);
                }}
              >
                {colegios.map((colegio) => (
                  <option
                    key={colegio.id_colegio}
                    value={colegio.id_colegio}
                  >
                    {colegio.nombre ||
                      colegio.nombre_corto}
                  </option>
                ))}
              </select>
            </label>

            <p className="mt-2 text-xs font-normal text-slate-600">
              Cada institución conserva su propia
              escala de calificación.
            </p>
          </section>
        )}

      {mensaje && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
            mensaje.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {mensaje.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          {mensaje.text}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className={`${panelClass} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Nota mínima</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{String(minima).padStart(2, '0')}</p>
          <p className="mt-1 text-sm text-gray-500">Punto inicial</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Nota aprobatoria</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{String(aprobatoria).padStart(2, '0')}</p>
          <p className="mt-1 text-sm text-gray-500">Desde aquí aprueba</p>
        </div>
        <div className={`${panelClass} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Nota máxima</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">{String(maxima).padStart(2, '0')}</p>
          <p className="mt-1 text-sm text-gray-500">Límite superior</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className={`${panelClass} p-5`}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
              <Gauge size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-950">Valores de la escala</h4>
              <p className="text-xs text-gray-500">Usa números enteros para mantener consistencia.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">Nota mínima</label>
              <input
                className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                value={minima}
                inputMode="numeric"
                onChange={(event) => setMinima(toInt(event.target.value))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">Nota máxima</label>
              <input
                className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                value={maxima}
                inputMode="numeric"
                onChange={(event) => setMaxima(toInt(event.target.value))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">Nota aprobatoria</label>
              <input
                className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-800 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-500/10"
                value={aprobatoria}
                inputMode="numeric"
                onChange={(event) => setAprobatoria(toInt(event.target.value))}
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(76,110,245,0.95)] transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        <div className={`${panelClass} overflow-hidden p-5`}>
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-950">Vista previa de interpretación</h4>
              <p className="mt-1 text-sm text-gray-500">Así se leerán las notas dentro del sistema.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-gray-200 bg-gray-50/70 p-5">
            <div className="relative pb-9 pt-3">
              <div className="h-3 overflow-hidden rounded-full bg-red-100">
                <div className="h-full bg-emerald-200" style={{ marginLeft: `${approvalPosition}%` }} />
              </div>
              <div className="absolute top-0 h-9 w-px bg-gray-900" style={{ left: `${approvalPosition}%` }} />
              <span
                className="absolute top-9 -translate-x-1/2 rounded-full bg-gray-950 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                style={{ left: `${approvalPosition}%` }}
              >
                Aprueba: {aprobatoria}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>{minima}</span>
              <span>{maxima}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400">Desaprobado</p>
              <p className="mt-2 text-sm font-semibold text-red-700">
                {minima} a {Math.max(minima, aprobatoria - 1)}
              </p>
              <p className="mt-1 text-xs text-red-500">{desaprobadas} valores posibles</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">Aprobado</p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                {aprobatoria} a {maxima}
              </p>
              <p className="mt-1 text-xs text-emerald-600">{aprobadas} valores posibles</p>
            </div>
          </div>

          <p className="mt-5 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-500">
            Recomendación: conserva la escala 0–20 con aprobatoria 11 para que la grilla de notas, promedios y reportes mantengan un comportamiento familiar para el colegio.
          </p>
        </div>
      </div>
    </div>
  );
}