import {
  useEffect,
  useState,
} from 'react';
import axios from 'axios';
import {
  ChevronDown,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import {
  useToast,
} from '../contexts/ToastContext';

type TipoCredencial =
  | 'docente'
  | 'apoderado';

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
  defaultOpen?: boolean;
  onLoaded?: (
    credencial: Credencial,
  ) => void;
  onSaved?: (
    credencial: Credencial,
  ) => void;
};

export default function AccessCredentialsCard({
  personaId,
  tipo,
  token,
  queryString = '',
  className = '',
  defaultOpen = false,
  onLoaded,
  onSaved,
}: AccessCredentialsCardProps) {
  const {
    showToast,
  } = useToast();

  const [
    expanded,
    setExpanded,
  ] = useState(defaultOpen);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    credencial,
    setCredencial,
  ] = useState<Credencial | null>(
    null,
  );

  const [
    username,
    setUsername,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    estado,
    setEstado,
  ] = useState(true);

  const params = (() => {
    const search =
      new URLSearchParams(
        queryString.replace(
          '?',
          '',
        ),
      );

    search.set(
      'tipo',
      tipo,
    );

    const value =
      search.toString();

    return value
      ? `?${value}`
      : '';
  })();

  const cargarCredencial =
    async () => {
      if (
        !token
        || !personaId
      ) {
        return;
      }

      setLoading(true);

      try {
        const response =
          await axios.get(
            `/api/academicos/personas/${personaId}/credencial${params}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const data =
          response.data as Credencial;

        setCredencial(data);
        setUsername(
          data.username || '',
        );
        setEstado(
          Boolean(data.estado),
        );
        setPassword('');
        onLoaded?.(data);
      } catch (error: any) {
        const message =
          error.response
            ?.data
            ?.message
          || 'No se pudo cargar la credencial.';

        showToast({
          type: 'error',
          title:
            'Error de credencial',
          message,
        });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void cargarCredencial();
  }, [
    personaId,
    tipo,
    token,
    queryString,
  ]);

  const guardar = async () => {
    if (!token) return;

    if (!username.trim()) {
      showToast({
        type: 'warning',
        title:
          'Usuario requerido',
        message:
          'Ingresa el usuario de acceso.',
      });

      return;
    }

    if (
      !credencial?.existe
      && !password.trim()
    ) {
      showToast({
        type: 'warning',
        title:
          'Contraseña requerida',
        message:
          'Para crear una credencial nueva debes ingresar una contraseña temporal.',
      });

      return;
    }

    setSaving(true);

    try {
      const response =
        await axios.put(
          `/api/academicos/personas/${personaId}/credencial${params}`,
          {
            tipo,
            username:
              username.trim(),
            password:
              password.trim()
              || undefined,
            estado,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const next =
        response.data
          ?.credencial as Credencial;

      setCredencial(next);

      setUsername(
        next.username
        || username.trim(),
      );

      setEstado(
        Boolean(next.estado),
      );

      setPassword('');
      onSaved?.(next);

      showToast({
        type: 'success',
        title:
          credencial?.existe
            ? 'Credencial actualizada'
            : 'Credencial creada',
        message:
          response.data?.message
          || 'La credencial fue guardada correctamente.',
      });
    } catch (error: any) {
      const message =
        error.response
          ?.data
          ?.message
        || 'No se pudo guardar la credencial.';

      showToast({
        type: 'error',
        title:
          'No se pudo guardar',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const titulo =
    tipo === 'docente'
      ? 'Credenciales del docente'
      : 'Credenciales del apoderado';

  const estadoBadge =
    credencial?.existe
      ? credencial.estado
        ? {
            className:
              'community-credentials-status--active',
            icon:
              <ShieldCheck size={12} />,
            label:
              'Activo',
          }
        : {
            className:
              'community-credentials-status--inactive',
            icon:
              <ShieldOff size={12} />,
            label:
              'Inactivo',
          }
      : {
          className:
            'community-credentials-status--missing',
          icon: null,
          label:
            'Sin credencial',
        };

  const buttonLabel =
    credencial?.existe
      ? 'Guardar cambios'
      : 'Crear credencial';

  return (
    <section
      className={`community-credentials-card ${className}`}
    >
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (value) => !value,
          )
        }
        className="community-credentials-header"
      >
        <span className="community-credentials-title-group">
          <span className="community-credentials-icon">
            <KeyRound size={19} />
          </span>

          <span className="min-w-0">
            <span className="community-credentials-title">
              {titulo}
            </span>

            <span className="community-credentials-description">
              Administra el usuario, la contraseña temporal y el estado de acceso.
            </span>
          </span>
        </span>

        <span className="community-credentials-header-actions">
          <span
            className={`community-credentials-status ${estadoBadge.className}`}
          >
            {estadoBadge.icon}
            {estadoBadge.label}
          </span>

          <ChevronDown
            size={17}
            className={`community-credentials-chevron ${
              expanded
                ? 'community-credentials-chevron--open'
                : ''
            }`}
          />
        </span>
      </button>

      {expanded && (
        <div className="community-credentials-body">
          {loading ? (
            <div className="community-credentials-loading">
              <Loader2
                size={20}
                className="animate-spin"
              />

              Cargando credenciales…
            </div>
          ) : (
            <>
              <div className="community-credentials-fields">
                <label className="community-credentials-field">
                  <span>
                    Usuario
                  </span>

                  <input
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value,
                      )
                    }
                    placeholder={
                      tipo === 'docente'
                        ? 'docente.dni'
                        : 'apoderado.dni'
                    }
                  />
                </label>

                <label className="community-credentials-field">
                  <span>
                    Nueva contraseña
                  </span>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder={
                      credencial?.existe
                        ? 'Dejar vacío si no cambia'
                        : 'Contraseña temporal'
                    }
                  />
                </label>

                <label className="community-credentials-field">
                  <span>
                    Estado de acceso
                  </span>

                  <select
                    value={
                      estado
                        ? 'activo'
                        : 'inactivo'
                    }
                    onChange={(event) =>
                      setEstado(
                        event.target.value
                        === 'activo',
                      )
                    }
                  >
                    <option value="activo">
                      Activo
                    </option>

                    <option value="inactivo">
                      Desactivado
                    </option>
                  </select>
                </label>
              </div>

              <div className="community-credentials-footer">
                <p className="community-credentials-help">
                  La contraseña actual no se muestra por seguridad. Déjala vacía cuando no necesites cambiarla.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void guardar()
                  }
                  disabled={saving}
                  className="community-credentials-save"
                >
                  {saving ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  {saving
                    ? 'Guardando…'
                    : buttonLabel}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
