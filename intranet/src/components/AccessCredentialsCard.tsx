import { useEffect, useState } from 'react';
import axios from 'axios';
import { KeyRound, Loader2, Save, ShieldCheck, ShieldOff } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

type TipoCredencial = 'docente' | 'apoderado';

type Credencial = {
  existe: boolean;
  id_usuario: number | null;
  username: string;
  estado: boolean;
  rol: string | null;
  ultima_conexion?: string | null;
  colegios?: {
    id_colegio: number;
    nombre: string;
    estado: string;
    rol_colegio: string;
  }[];
};

type AccessCredentialsCardProps = {
  personaId: number;
  tipo: TipoCredencial;
  token: string | null;
  queryString?: string;
  className?: string;
};

export default function AccessCredentialsCard({
  personaId,
  tipo,
  token,
  queryString = '',
  className = '',
}: AccessCredentialsCardProps) {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [credencial, setCredencial] = useState<Credencial | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [estado, setEstado] = useState(true);

  const params = (() => {
    const search = new URLSearchParams(queryString.replace('?', ''));

    search.set('tipo', tipo);

    const value = search.toString();

    return value ? `?${value}` : '';
  })();

  const cargarCredencial = async () => {
    if (!token || !personaId) return;

    setLoading(true);

    try {
      const res = await axios.get(`/api/academicos/personas/${personaId}/credencial${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data as Credencial;

      setCredencial(data);
      setUsername(data.username || '');
      setEstado(Boolean(data.estado));
      setPassword('');
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo cargar la credencial.';
      showToast({ type: 'error', title: 'Error de credencial', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCredencial();
  }, [personaId, tipo, token, queryString]);

  const guardar = async () => {
    if (!token) return;

    if (!username.trim()) {
      showToast({
        type: 'warning',
        title: 'Usuario requerido',
        message: 'Ingresa el usuario de acceso.',
      });
      return;
    }

    if (!credencial?.existe && !password.trim()) {
      showToast({
        type: 'warning',
        title: 'Contraseña requerida',
        message: 'Para crear una credencial nueva debes ingresar una contraseña temporal.',
      });
      return;
    }

    setSaving(true);

    try {
      const res = await axios.put(
        `/api/academicos/personas/${personaId}/credencial${params}`,
        {
          tipo,
          username: username.trim(),
          password: password.trim() || undefined,
          estado,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const next = res.data?.credencial as Credencial;

      setCredencial(next);
      setUsername(next.username || username.trim());
      setEstado(Boolean(next.estado));
      setPassword('');

      showToast({
        type: 'success',
        title: credencial?.existe ? 'Credencial actualizada' : 'Credencial creada',
        message: res.data?.message || 'La credencial fue guardada correctamente.',
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'No se pudo guardar la credencial.';
      showToast({ type: 'error', title: 'No se pudo guardar', message });
    } finally {
      setSaving(false);
    }
  };

  const titulo = tipo === 'docente' ? 'Acceso del docente' : 'Acceso del apoderado';

  return (
    <section className={`rounded-[18px] border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <KeyRound size={19} />
          </span>

          <div>
            <h4 className="text-sm font-black text-slate-950">{titulo}</h4>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
              Administra usuario, contraseña temporal y estado de acceso.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
            credencial?.existe
              ? credencial.estado
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-slate-100 text-slate-600 ring-slate-200'
              : 'bg-amber-50 text-amber-700 ring-amber-200'
          }`}
        >
          {credencial?.existe ? (
            credencial.estado ? (
              <>
                <ShieldCheck size={12} />
                Activo
              </>
            ) : (
              <>
                <ShieldOff size={12} />
                Desactivado
              </>
            )
          ) : (
            'Sin credencial'
          )}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 flex h-20 items-center justify-center rounded-sm bg-slate-50">
          <Loader2 size={18} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
          <label className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
              Usuario
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={tipo === 'docente' ? 'docente.dni' : 'apoderado.dni'}
              className="h-11 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
              Nueva contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={credencial?.existe ? 'Dejar vacío si no cambia' : 'Contraseña temporal'}
              className="h-11 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
              Estado
            </span>
            <select
              value={estado ? 'activo' : 'inactivo'}
              onChange={(event) => setEstado(event.target.value === 'activo')}
              className="h-11 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Desactivado</option>
            </select>
          </label>

          <button
            type="button"
            onClick={guardar}
            disabled={saving}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:mt-[22px]"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar
          </button>
        </div>
      )}

      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        La contraseña actual no se muestra por seguridad. Para cambiarla, ingresa una nueva contraseña temporal y guarda.
      </p>
    </section>
  );
}
