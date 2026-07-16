import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Edit3,
  Eye,
  Loader2,
  Search,
  UserRound,
  X,
  GraduationCap,
  SlidersHorizontal,
  Camera,
  UploadCloud,
  PlayCircle,
  ArchiveX,
  Power,
  RotateCcw,
  School,
  History,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import PersonAvatar from '../../components/PersonAvatar';
import LocationSelects from '../../components/LocationSelects';
import CommunityEditModal from '../../components/community/CommunityEditModal';
import CommunityDetailModal from '../../components/community/CommunityDetailModal';
import {
  CommunityEmptyState,
  CommunityInlineLoading,
  CommunityPagination,
  CommunityTableHeader,
  CommunityTableLoading,
} from '../../components/community/CommunityTableState';
import { LinkedGuardianCards } from '../../components/community/CommunityLinkedPeople';
import { StudentTableRow } from '../../components/community/CommunityTableRows';
import {
  CommunityField as Field,
  CommunityInfo as Info,
  CommunitySection as Section,
  CommunityTextarea as Textarea,
  communityInputClass,
} from '../../components/community/CommunityUI';

type CodigoColegio = {
  id_colegio: number;
  codigo: string;
  estado_institucional?: string | null;
  fecha_estado?: string | null;
  motivo_estado?: string | null;
  id_usuario_estado?: number | null;
  colegio?: {
    nombre?: string | null;
    nombre_corto?: string | null;
  } | null;
};
type HistorialEstadoInstitucional = {
  id_historial: number;
  id_estudiante: number;
  id_colegio: number;
  estado_anterior?: string | null;
  estado_nuevo: string;
  accion: string;
  motivo?: string | null;
  fecha_evento: string;
  colegio?: {
    nombre?: string | null;
    nombre_corto?: string | null;
  } | null;
  usuario?: {
    id_usuario: number;
    username: string;
    persona?: {
      nombres?: string | null;
      apellido_paterno?: string | null;
      apellido_materno?: string | null;
    } | null;
  } | null;
};

type Meta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type NivelOption = {
  id_nivel: number;
  nombre_nivel: string;
};

type GradoOption = {
  id_grado: number;
  id_nivel: number;
  nombre_grado: string;
};

type SeccionOption = {
  id_seccion: number;
  letra: string;
  Label?: string;
  grado?: {
    nombre_grado?: string;
    nivel?: {
      nombre_nivel?: string;
    };
  };
  colegio?: {
    nombre?: string;
  };
};

type AlumnoItem = {
  id_persona: number;
  codigo_estudiante: string;
  avatar_url?: string | null;
  codigos_colegio?: CodigoColegio[];
  persona: {
    dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
    fecha_nacimiento: string; telefono?: string | null; correo?: string | null;
    direccion?: string | null; pais?: string | null; departamento?: string | null;
    provincia?: string | null; distrito?: string | null;
  };
  apoderados?: {
    parentesco: string;
    apoderado: { id_persona: number; persona: { dni: string; nombres: string; apellido_paterno: string; apellido_materno: string; telefono?: string | null; correo?: string | null } };
  }[];
  matriculas?: any[];
  historial_estados?: HistorialEstadoInstitucional[];
};

type AlumnoForm = {
  dni: string; nombres: string; apellido_paterno: string; apellido_materno: string;
  fecha_nacimiento: string; telefono: string; correo: string; direccion: string;
  pais: string; departamento: string; provincia: string; distrito: string;
};

type EstadoInstitucionalModo =
  | 'baja'
  | 'descarte'
  | 'reactivar';

type EstadoInstitucionalAction = {
  registro: CodigoColegio;
  modo: EstadoInstitucionalModo;
};

const inputClass = communityInputClass;

const fullName = (p: AlumnoItem['persona']) =>
  `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.trim();

const fecha = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('es-PE') : '—';

const fechaHora = (
  value?: string | null,
) => {
  if (!value) return '—';

  const parsed = new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return '—';
  }

  return parsed.toLocaleString(
    'es-PE',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  );
};

const estadoInstitucionalLabel = (
  estado?: string | null,
) => {
  if (!estado) return 'Inicio';

  return estado === 'Borrador'
    ? 'Registro incompleto'
    : estado;
};

const nombreUsuarioHistorial = (
  item: HistorialEstadoInstitucional,
) => {
  const persona =
    item.usuario?.persona;

  const nombreCompleto = [
    persona?.nombres,
    persona?.apellido_paterno,
    persona?.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return nombreCompleto
    || item.usuario?.username
    || 'Sistema';
};

const getCodigo = (alumno: AlumnoItem) =>
  alumno.codigos_colegio?.[0]?.codigo || alumno.codigo_estudiante || 'Sin código';

const assetUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url;
  if (url.startsWith('/uploads/')) return `/api${url}`;
  if (url.startsWith('uploads/')) return `/api/${url}`;
  return url;
};

const estadoBadge: Record<string, string> = {
  Activo: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Matriculado: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Reserva: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Anulado: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  'Pre-matriculado': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  Inactivo: 'bg-slate-100 text-slate-600 ring-1 ring-slate-300',
  'Registro incompleto': 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  Borrador: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  Retirado: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  'No continúa': 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  Finalizado: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  Promocionado: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  Egresado: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
};

const getEstadoBadge = (estado?: string) =>
  estadoBadge[estado || ''] || 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';

const toForm = (detalle: AlumnoItem): AlumnoForm => ({
  dni: detalle.persona.dni || '',
  nombres: detalle.persona.nombres || '',
  apellido_paterno: detalle.persona.apellido_paterno || '',
  apellido_materno: detalle.persona.apellido_materno || '',
  fecha_nacimiento: detalle.persona.fecha_nacimiento
    ? detalle.persona.fecha_nacimiento.slice(0, 10)
    : '',
  telefono: detalle.persona.telefono || '',
  correo: detalle.persona.correo || '',
  direccion: detalle.persona.direccion || '',
  pais: detalle.persona.pais || 'Perú',
  departamento: detalle.persona.departamento || '',
  provincia: detalle.persona.provincia || '',
  distrito: detalle.persona.distrito || '',
});

export default function AlumnosPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState<AlumnoItem[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [estado, setEstado] = useState('Todos');

  const [niveles, setNiveles] =
    useState<NivelOption[]>([]);

  const [grados, setGrados] =
    useState<GradoOption[]>([]);

  const [secciones, setSecciones] =
    useState<SeccionOption[]>([]);

  const [nivelId, setNivelId] =
    useState('');

  const [gradoId, setGradoId] =
    useState('');

  const [seccionId, setSeccionId] =
    useState('');

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalle, setDetalle] = useState<AlumnoItem | null>(null);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false); // Nuevo estado para el visor de fotos

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<AlumnoForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<{ file: File; previewUrl: string } | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [confirmEditAlumno, setConfirmEditAlumno] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmApoderadoDestino, setConfirmApoderadoDestino] = useState<{ id: number; nombre: string } | null>(null);

  const [
    estadoInstitucionalAction,
    setEstadoInstitucionalAction,
  ] = useState<EstadoInstitucionalAction | null>(
    null,
  );

  const [
    estadoInstitucionalMotivo,
    setEstadoInstitucionalMotivo,
  ] = useState('');

  const [
    changingEstadoInstitucional,
    setChangingEstadoInstitucional,
  ] = useState(false);

  useEffect(() => {
    const search =
      new URLSearchParams(
        location.search,
      );

    const queryParam =
      (search.get('q') || '').trim();

    setQ((current) =>
      current === queryParam
        ? current
        : queryParam,
    );

    setPage(1);
  }, [location.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setNivelId('');
    setGradoId('');
    setSeccionId('');
    setGrados([]);
    setSecciones([]);
  }, [queryString]);

  useEffect(() => {
    if (
      ![
        'Registro incompleto',
        'Inactivo',
      ].includes(estado)
    ) {
      return;
    }

    setNivelId('');
    setGradoId('');
    setSeccionId('');
    setGrados([]);
    setSecciones([]);
  }, [estado]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const cargarNiveles = async () => {
      try {
        const response = await axios.get(
          `/api/academicos/niveles${queryString}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) return;

        setNiveles(
          Array.isArray(response.data)
            ? response.data
            : response.data?.data || [],
        );
      } catch {
        if (!cancelled) {
          setNiveles([]);
        }
      }
    };

    void cargarNiveles();

    return () => {
      cancelled = true;
    };
  }, [queryString, token]);

  useEffect(() => {
    if (!token || !nivelId) {
      setGrados([]);
      setSecciones([]);
      return;
    }

    let cancelled = false;

    const cargarGrados = async () => {
      const search =
        new URLSearchParams(
          queryString.replace('?', ''),
        );

      search.set(
        'nivel_id',
        nivelId,
      );

      try {
        const response = await axios.get(
          `/api/academicos/grados?${search.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) return;

        setGrados(
          Array.isArray(response.data)
            ? response.data
            : response.data?.data || [],
        );
      } catch {
        if (!cancelled) {
          setGrados([]);
        }
      }
    };

    void cargarGrados();

    return () => {
      cancelled = true;
    };
  }, [nivelId, queryString, token]);

  useEffect(() => {
    if (!token || !gradoId) {
      setSecciones([]);
      return;
    }

    let cancelled = false;

    const cargarSecciones = async () => {
      const search =
        new URLSearchParams(
          queryString.replace('?', ''),
        );

      search.set(
        'grado_id',
        gradoId,
      );

      try {
        const response = await axios.get(
          `/api/academicos/secciones?${search.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) return;

        setSecciones(
          Array.isArray(response.data)
            ? response.data
            : response.data?.data || [],
        );
      } catch {
        if (!cancelled) {
          setSecciones([]);
        }
      }
    };

    void cargarSecciones();

    return () => {
      cancelled = true;
    };
  }, [gradoId, queryString, token]);

  const params = useMemo(() => {
    const search =
      new URLSearchParams(
        queryString.replace('?', ''),
      );

    if (debouncedQ) {
      search.set(
        'q',
        debouncedQ,
      );
    }

    if (estado !== 'Todos') {
      search.set(
        'estado',
        estado,
      );
    }

    if (nivelId) {
      search.set(
        'nivel_id',
        nivelId,
      );
    }

    if (gradoId) {
      search.set(
        'grado_id',
        gradoId,
      );
    }

    if (seccionId) {
      search.set(
        'seccion_id',
        seccionId,
      );
    }

    search.set(
      'page',
      String(page),
    );

    search.set(
      'limit',
      '10',
    );

    const query =
      search.toString();

    return query
      ? `?${query}`
      : '';
  }, [
    debouncedQ,
    estado,
    gradoId,
    nivelId,
    page,
    queryString,
    seccionId,
  ]);

  useEffect(() => {
    fetchAlumnos();
  }, [params, token]);

  const fetchAlumnos = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/academicos/alumnos/listado${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = async (id: number) => {
    if (!token) return;
    setDetalleOpen(true);
    setDetalleLoading(true);
    setMensaje(null);
    try {
      const res = await axios.get(
        `/api/academicos/alumnos/${id}/detalle${queryString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDetalle(res.data);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'No se pudo cargar el alumno.');
      setDetalleOpen(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const alumnoParamId = Number(search.get('alumno') || 0);

    if (!alumnoParamId || !token) return;

    void abrirDetalle(alumnoParamId);

    search.delete('alumno');
    const nextSearch = search.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [location.search, navigate, token]);

  const abrirEdicion = () => {
    if (!detalle) return;
    setForm(toForm(detalle));
    setEditOpen(true);
    setMensaje(null);
  };

  const prepararFotoAlumno = (file?: File | null) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      const errorMessage = 'Selecciona una imagen JPG o PNG.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Formato no permitido', message: errorMessage });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      const errorMessage = 'La imagen no debe superar los 3 MB.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Imagen muy pesada', message: errorMessage });
      return;
    }

    if (avatarDraft?.previewUrl) {
      URL.revokeObjectURL(avatarDraft.previewUrl);
    }

    setAvatarZoom(1);
    setAvatarOffsetY(0);
    setAvatarDraft({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const crearFotoAjustada = async (file: File, zoom: number, offsetY: number) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    const width = 420;
    const height = 560;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx) return file;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const baseScale = Math.max(width / image.width, height / image.height);
    const scale = baseScale * zoom;
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2 + offsetY;

    ctx.drawImage(image, drawX, drawY, drawW, drawH);

    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          resolve(
            new File(
              [blob],
              file.name.replace(/\.(png|jpg|jpeg)$/i, '') + '-libreta.jpg',
              { type: 'image/jpeg' },
            ),
          );
        },
        'image/jpeg',
        0.92,
      );
    });
  };

  const confirmarSubidaFoto = async () => {
    if (!avatarDraft) return;

    const adjustedFile = await crearFotoAjustada(
      avatarDraft.file,
      avatarZoom,
      avatarOffsetY,
    );

    await subirFotoAlumno(adjustedFile);

    URL.revokeObjectURL(avatarDraft.previewUrl);
    setAvatarDraft(null);
  };

  const subirFotoAlumno = async (file?: File | null) => {
    if (!token || !detalle || !file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      const errorMessage = 'Selecciona una imagen JPG o PNG.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Formato no permitido', message: errorMessage });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      const errorMessage = 'La imagen no debe superar los 3 MB.';
      setMensaje(errorMessage);
      showToast({ type: 'error', title: 'Imagen muy pesada', message: errorMessage });
      return;
    }

    const formData = new FormData();
    formData.append('foto', file);

    setUploadingAvatar(true);
    setMensaje(null);

    try {
      const res = await axios.post(
        `/api/academicos/alumnos/${detalle.id_persona}/avatar${queryString}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const avatarUrl = res.data?.avatar_url || '';

      setDetalle((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: avatarUrl,
            }
          : prev,
      );

      await fetchAlumnos();

      setMensaje('Foto del alumno actualizada correctamente.');
      showToast({
        type: 'success',
        title: 'Foto actualizada',
        message: 'La foto se usará en la libreta del alumno.',
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'No se pudo subir la foto del alumno.';

      setMensaje(errorMessage);
      showToast({
        type: 'error',
        title: 'No se pudo subir',
        message: errorMessage,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const guardarEdicion = async () => {
    if (!token || !detalle || !form) return;
    setSaving(true);
    setMensaje(null);
    try {
      await axios.put(`/api/academicos/alumnos/${detalle.id_persona}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditOpen(false);
      await abrirDetalle(detalle.id_persona);
      await fetchAlumnos();
      setMensaje('Datos del alumno actualizados correctamente.');
      showToast({
        type: 'success',
        title: 'Alumno actualizado',
        message: 'Los datos del alumno se actualizaron correctamente.',
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'No se pudo actualizar el alumno.';
      setMensaje(errorMessage);
      showToast({
        type: 'error',
        title: 'No se pudo actualizar',
        message: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const continuarMatricula = (
    registro: CodigoColegio,
  ) => {
    if (!detalle) return;

    const params =
      new URLSearchParams();

    params.set(
      'dni',
      detalle.persona.dni,
    );

    params.set(
      'colegio_id',
      String(
        registro.id_colegio,
      ),
    );

    setDetalleOpen(false);

    navigate(
      `/matricula?${params.toString()}`,
    );
  };

  const abrirEstadoInstitucional = (
    registro: CodigoColegio,
    modo: EstadoInstitucionalModo,
  ) => {
    setEstadoInstitucionalAction({
      registro,
      modo,
    });

    setEstadoInstitucionalMotivo('');
    setMensaje(null);
  };

  const cerrarEstadoInstitucional = () => {
    if (
      changingEstadoInstitucional
    ) {
      return;
    }

    setEstadoInstitucionalAction(null);
    setEstadoInstitucionalMotivo('');
    setMensaje(null);
  };

  const cambiarEstadoInstitucional =
    async () => {
      if (
        !token
        || !detalle
        || !estadoInstitucionalAction
      ) {
        return;
      }

      const {
        registro,
        modo,
      } = estadoInstitucionalAction;

      const esReactivacion =
        modo === 'reactivar';

      const nuevoEstado =
        esReactivacion
          ? 'Activo'
          : 'Inactivo';

      const motivo =
        estadoInstitucionalMotivo.trim();

      if (
        !esReactivacion
        && !motivo
      ) {
        const errorMessage =
          modo === 'descarte'
            ? 'Indica por qué se descartará el registro incompleto.'
            : 'Indica el motivo de la baja institucional.';

        setMensaje(errorMessage);

        showToast({
          type: 'error',
          title: 'Motivo obligatorio',
          message: errorMessage,
        });

        return;
      }

      setChangingEstadoInstitucional(true);
      setMensaje(null);

      try {
        const response =
          await axios.patch(
            `/api/academicos/alumnos/${detalle.id_persona}/estado-institucional${queryString}`,
            {
              id_colegio:
                registro.id_colegio,

              estado:
                nuevoEstado,

              motivo:
                motivo || undefined,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const message =
          response.data?.message
          || (
            esReactivacion
              ? 'Ficha institucional reactivada.'
              : 'Ficha institucional inactivada.'
          );

        const idEstudiante =
          detalle.id_persona;

        setEstadoInstitucionalAction(null);
        setEstadoInstitucionalMotivo('');

        await abrirDetalle(
          idEstudiante,
        );

        await fetchAlumnos();

        setMensaje(message);

        showToast({
          type: 'success',

          title:
            esReactivacion
              ? 'Alumno reactivado'
              : modo === 'descarte'
                ? 'Registro descartado'
                : 'Alumno dado de baja',

          message,
        });
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.message
          || 'No se pudo cambiar el estado institucional.';

        setMensaje(errorMessage);

        showToast({
          type: 'error',
          title: 'No se pudo completar',
          message: errorMessage,
        });
      } finally {
        setChangingEstadoInstitucional(false);
      }
    };

  const hasFilters =
    q.trim() !== ''



    || estado !== 'Todos'
    || Boolean(nivelId)
    || Boolean(gradoId)
    || Boolean(seccionId);

  return (
    <div className="carbon-community-page w-full space-y-5 erp-page-enter">
      <PageHeader
        eyebrow="Comunidad escolar"
        title="Alumnos"
        description="Consulta, revisa y edita la información general de los alumnos vinculados al colegio activo."
        icon={UserRound}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Resultados', value: String(meta.total) },
        ]}
      />

      {/* ── Barra de búsqueda y filtros ── */}
      <div className="community-toolbar community-student-toolbar rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="community-student-search relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            value={q}
            onChange={(event) => {
              setPage(1);
              setQ(event.target.value);
            }}
            placeholder="Buscar por código, DNI, alumno, apoderado o distrito…"
            className="community-search-input h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Limpiar búsqueda"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <label className="community-filter-field">
          <span>Nivel</span>

          <select
            value={nivelId}
            disabled={
              ['Registro incompleto', 'Inactivo'].includes(estado)
            }
            onChange={(event) => {
              setPage(1);
              setNivelId(
                event.target.value,
              );
              setGradoId('');
              setSeccionId('');
              setSecciones([]);
            }}
          >
            <option value="">
              Todos los niveles
            </option>

            {niveles.map((nivel) => (
              <option
                key={nivel.id_nivel}
                value={nivel.id_nivel}
              >
                {nivel.nombre_nivel}
              </option>
            ))}
          </select>
        </label>

        <label className="community-filter-field">
          <span>Grado</span>

          <select
            value={gradoId}
            disabled={
              !nivelId
              || ['Registro incompleto', 'Inactivo'].includes(estado)
            }
            onChange={(event) => {
              setPage(1);
              setGradoId(
                event.target.value,
              );
              setSeccionId('');
            }}
          >
            <option value="">
              Todos los grados
            </option>

            {grados.map((grado) => (
              <option
                key={grado.id_grado}
                value={grado.id_grado}
              >
                {grado.nombre_grado}
              </option>
            ))}
          </select>
        </label>

        <label className="community-filter-field">
          <span>Sección</span>

          <select
            value={seccionId}
            disabled={
              !gradoId
              || ['Registro incompleto', 'Inactivo'].includes(estado)
            }
            onChange={(event) => {
              setPage(1);
              setSeccionId(
                event.target.value,
              );
            }}
          >
            <option value="">
              Todas las secciones
            </option>

            {secciones.map((seccion) => (
              <option
                key={seccion.id_seccion}
                value={seccion.id_seccion}
              >
                {seccion.Label
                  || `${seccion.grado?.nombre_grado || 'Grado'} "${seccion.letra}"`}
              </option>
            ))}
          </select>
        </label>

        <label className="community-filter-field">
          <span>Estado</span>

          <span className="relative">
            <SlidersHorizontal
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <select
              value={estado}
              onChange={(event) => {
                setPage(1);
                setEstado(
                  event.target.value,
                );
              }}
              className="pl-9"
            >
              <option value="Todos">
                Todos los estados
              </option>

              <optgroup label="Matrícula">
                <option value="Matriculado">
                  Matriculado
                </option>

                <option value="Pre-matriculado">
                  Pre-matriculado
                </option>

                <option value="Reserva">
                  Reserva
                </option>

                <option value="Retirado">
                  Retirado
                </option>

                <option value="No continúa">
                  No continúa
                </option>

                <option value="Anulado">
                  Anulado
                </option>

                <option value="Finalizado">
                  Finalizado
                </option>

                <option value="Promocionado">
                  Promocionado
                </option>

                <option value="Egresado">
                  Egresado
                </option>
              </optgroup>

              <optgroup label="Administración">
                <option value="Registro incompleto">
                  Registros incompletos
                </option>

                <option value="Inactivo">
                  Alumnos inactivos
                </option>
              </optgroup>
            </select>
          </span>
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              setEstado('Todos');
              setNivelId('');
              setGradoId('');
              setSeccionId('');
              setGrados([]);
              setSecciones([]);
              setPage(1);
            }}
            className="community-clear-filters"
          >
            Limpiar
          </button>
        )}
      </div>

      {loading && data.length > 0 && (
        <CommunityInlineLoading />
      )}

      {/* ── Tabla de alumnos ── */}
      <div className="carbon-list-panel community-student-list-panel overflow-hidden border border-slate-200 bg-white">
        
<CommunityTableHeader
  columns={[
    'Código',
    'Alumno',
    'Distrito',
    'Grado y sección',
    'Institución',
    'Estado',
  ]}
  gridClassName="community-student-table-grid community-student-table-header"
  actionSpacerClassName="w-full"
/>

        {loading && data.length === 0 ? (
          <CommunityTableLoading />
        ) : data.length === 0 ? (
          <CommunityEmptyState
            icon={UserRound}
            title="Sin resultados"
            description="Ajusta los filtros para encontrar un registro."
          />
        ) : (
          <div className={`divide-y divide-slate-100/80 ${loading ? "erp-table-refreshing" : ""}`}>
            {data.map((alumno) => (
              <StudentTableRow
                key={alumno.id_persona}
                alumno={alumno}
                onOpen={abrirDetalle}
                getCodigo={getCodigo}
                getEstadoBadge={getEstadoBadge}
                assetUrl={assetUrl}
              />
            ))}
          </div>
        )}

        <CommunityPagination
          page={page}
          totalPages={meta.totalPages || 1}
          total={meta.total}
          onPrevious={() => setPage((current) => Math.max(current - 1, 1))}
          onNext={() => setPage((current) => Math.min(current + 1, meta.totalPages || 1))}
        />
      </div>

      {/* ── Modal de detalle ── */}
      <CommunityDetailModal
        open={detalleOpen}
        loading={detalleLoading}
        eyebrow={
          <>
            <GraduationCap size={11} />
            Ficha del alumno
          </>
        }
        title={detalle ? `${getCodigo(detalle)} · ${fullName(detalle.persona)}` : 'Cargando…'}
        description="Datos personales, apoderados y matrículas."
        leadingSlot={
          detalle ? (
            detalle.avatar_url ? (
              <button
                type="button"
                onClick={() => setAvatarViewOpen(true)}
                className="group relative h-14 w-14 shrink-0 rounded-2xl outline-none transition focus:ring-4 focus:ring-accent-100"
              >
                <img
                  src={assetUrl(detalle.avatar_url)}
                  alt={fullName(detalle.persona)}
                  className="h-14 w-14 rounded-2xl bg-white object-contain p-0.5 ring-1 ring-slate-200 transition group-hover:opacity-80 group-hover:ring-accent-300"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/0 opacity-0 transition group-hover:bg-slate-950/30 group-hover:opacity-100">
                  <Eye size={18} className="text-white" />
                </div>
              </button>
            ) : (
              <PersonAvatar persona={detalle.persona} size="lg" rounded="2xl" />
            )
          ) : null
        }
        actions={
          detalle ? (
            <>
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                {uploadingAvatar ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : detalle.avatar_url ? (
                  <Camera size={13} />
                ) : (
                  <UploadCloud size={13} />
                )}
                {uploadingAvatar ? 'Subiendo...' : detalle.avatar_url ? 'Cambiar foto' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    prepararFotoAlumno(file);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={abrirEdicion}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-accent-300 bg-accent-50 px-3 text-xs font-bold text-accent-600 transition hover:bg-accent-100"
              >
                <Edit3 size={13} />
                Editar
              </button>
            </>
          ) : null
        }
        onClose={() => setDetalleOpen(false)}
      >
        {detalle ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <Info label="DNI" value={detalle.persona.dni} />
              <Info label="Nacimiento" value={fecha(detalle.persona.fecha_nacimiento)} />
              <Info label="Teléfono" value={detalle.persona.telefono || '—'} />
              <Info label="Correo" value={detalle.persona.correo || '—'} />
              <Info label="Departamento" value={detalle.persona.departamento || '—'} />
              <Info label="Provincia" value={detalle.persona.provincia || '—'} />
              <Info label="Distrito" value={detalle.persona.distrito || '—'} />
              <Info label="Dirección" value={detalle.persona.direccion || '—'} />
            </div>

            <Section title="Estado institucional">
              {detalle.codigos_colegio?.length ? (
                <div className="space-y-3">
                  {detalle.codigos_colegio.map(
                    (registro) => {
                      const tieneMatriculaInstitucion =
                        Boolean(
                          detalle.matriculas?.some(
                            (matricula) =>
                              matricula.id_colegio
                              === registro.id_colegio,
                          ),
                        );

                      const estadoRegistroBase =
                        registro.estado_institucional
                        || 'Activo';

                      /*
                       * También corrige visualmente
                       * registros antiguos que fueron
                       * reactivados como Activo aunque
                       * nunca tuvieron matrícula.
                       */
                      const estadoRegistro =
                        estadoRegistroBase === 'Activo'
                        && !tieneMatriculaInstitucion
                          ? 'Borrador'
                          : estadoRegistroBase;

                      const nombreColegio =
                        registro.colegio?.nombre
                        || registro.colegio?.nombre_corto
                        || `Institución ${registro.id_colegio}`;

                      return (
                        <div
                          key={registro.id_colegio}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                  <School size={15} />
                                </span>

                                <div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {nombreColegio}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Código institucional:{' '}
                                    {registro.codigo}
                                  </p>
                                </div>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getEstadoBadge(
                                    estadoRegistro,
                                  )}`}
                                >
                                  {estadoRegistro === 'Borrador'
                                    ? 'Registro incompleto'
                                    : estadoRegistro}
                                </span>
                              </div>

                              <div className="mt-3 space-y-1 text-xs text-slate-500">
                                <p>
                                  Último cambio:{' '}
                                  {registro.fecha_estado
                                    ? fecha(registro.fecha_estado)
                                    : 'Sin fecha registrada'}
                                </p>

                                {registro.motivo_estado && (
                                  <p>
                                    Motivo:{' '}
                                    <span className="font-semibold text-slate-700">
                                      {registro.motivo_estado}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {estadoRegistro === 'Borrador' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      continuarMatricula(
                                        registro,
                                      )
                                    }
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700"
                                  >
                                    <PlayCircle size={14} />
                                    Continuar matrícula
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      abrirEstadoInstitucional(
                                        registro,
                                        'descarte',
                                      )
                                    }
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                                  >
                                    <ArchiveX size={14} />
                                    Descartar registro
                                  </button>
                                </>
                              )}

                              {estadoRegistro === 'Activo' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirEstadoInstitucional(
                                      registro,
                                      'baja',
                                    )
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100"
                                >
                                  <Power size={14} />
                                  Dar de baja
                                </button>
                              )}

                              {estadoRegistro === 'Inactivo' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirEstadoInstitucional(
                                      registro,
                                      'reactivar',
                                    )
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  <RotateCcw size={14} />
                                  Reactivar ficha
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No existe información institucional visible.
                </p>
              )}
            </Section>

            <Section title="Historial institucional">
              {detalle.historial_estados?.length ? (
                <div className="relative">
                  <div
                    className="absolute bottom-4 left-[17px] top-4 w-px bg-slate-200"
                    aria-hidden="true"
                  />

                  <div className="space-y-4">
                    {detalle.historial_estados.map(
                      (item) => {
                        const estadoAnterior =
                          estadoInstitucionalLabel(
                            item.estado_anterior,
                          );

                        const estadoNuevo =
                          estadoInstitucionalLabel(
                            item.estado_nuevo,
                          );

                        const nombreColegio =
                          item.colegio?.nombre
                          || item.colegio?.nombre_corto
                          || `Institución ${item.id_colegio}`;

                        return (
                          <article
                            key={item.id_historial}
                            className="relative flex gap-3"
                          >
                            <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 shadow-sm">
                              <History size={15} />
                            </span>

                            <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900">
                                    {item.accion}
                                  </p>

                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {nombreColegio}
                                  </p>
                                </div>

                                <time className="shrink-0 text-[11px] font-semibold text-slate-400">
                                  {fechaHora(
                                    item.fecha_evento,
                                  )}
                                </time>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {item.estado_anterior ? (
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getEstadoBadge(
                                      item.estado_anterior,
                                    )}`}
                                  >
                                    {estadoAnterior}
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                                    Inicio
                                  </span>
                                )}

                                <ArrowRight
                                  size={14}
                                  className="text-slate-400"
                                />

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getEstadoBadge(
                                    item.estado_nuevo,
                                  )}`}
                                >
                                  {estadoNuevo}
                                </span>
                              </div>

                              {item.motivo && (
                                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                                    Motivo
                                  </p>

                                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">
                                    {item.motivo}
                                  </p>
                                </div>
                              )}

                              <p className="mt-3 text-[11px] text-slate-400">
                                Registrado por{' '}
                                <span className="font-bold text-slate-600">
                                  {nombreUsuarioHistorial(
                                    item,
                                  )}
                                </span>
                              </p>
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <History size={16} />
                  </span>

                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      Sin movimientos registrados
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Los próximos cambios institucionales aparecerán aquí.
                    </p>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Apoderados vinculados">
              <LinkedGuardianCards
                items={detalle.apoderados || []}
                onSelect={(target) => setConfirmApoderadoDestino(target)}
              />
            </Section>

            <Section title="Matrículas">
              {detalle.matriculas?.length ? (
                <div className="space-y-2">
                  {detalle.matriculas.map((m) => (
                    <div
                      key={m.id_matricula}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {m.colegio?.nombre || 'Colegio'} ·{' '}
                          {m.seccion?.grado?.nombre_grado || 'Grado'} &quot;
                          {m.seccion?.letra || '-'}&quot;
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {m.anio?.nombre_anio || 'Año'} · {fecha(m.fecha_matricula)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getEstadoBadge(m.estado_matricula)}`}
                      >
                        {m.estado_matricula}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin matrículas visibles.</p>
              )}
            </Section>
          </div>
        ) : null}
      </CommunityDetailModal>

      <CommunityEditModal
        open={Boolean(
          estadoInstitucionalAction,
        )}
        eyebrow="Estado institucional"
        title={
          estadoInstitucionalAction?.modo
            === 'reactivar'
            ? 'Reactivar ficha del alumno'
            : estadoInstitucionalAction?.modo
                === 'descarte'
              ? 'Descartar registro incompleto'
              : 'Dar de baja al alumno'
        }
        description={
          estadoInstitucionalAction?.modo
            === 'reactivar'
            ? 'La ficha volverá a estar disponible. Las matrículas cerradas no se reabrirán.'
            : estadoInstitucionalAction?.modo
                === 'descarte'
              ? 'El borrador dejará de aparecer como registro pendiente, pero se conservará para auditoría.'
              : 'La baja se aplicará únicamente a la institución seleccionada y conservará todo el historial.'
        }
        message={mensaje}
        saving={
          changingEstadoInstitucional
        }
        onClose={
          cerrarEstadoInstitucional
        }
        onSubmit={
          cambiarEstadoInstitucional
        }
      >
        {estadoInstitucionalAction && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                Institución
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {estadoInstitucionalAction
                  .registro
                  .colegio
                  ?.nombre
                  || estadoInstitucionalAction
                    .registro
                    .colegio
                    ?.nombre_corto
                  || `Institución ${estadoInstitucionalAction.registro.id_colegio}`}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Código:{' '}
                {estadoInstitucionalAction
                  .registro
                  .codigo}
              </p>
            </div>

            {estadoInstitucionalAction.modo
              !== 'reactivar' && (
                <Textarea
                  label={
                    estadoInstitucionalAction
                      .modo === 'descarte'
                      ? 'Motivo del descarte'
                      : 'Motivo de la baja'
                  }
                  value={
                    estadoInstitucionalMotivo
                  }
                  rows={4}
                  placeholder={
                    estadoInstitucionalAction
                      .modo === 'descarte'
                      ? 'Ejemplo: registro duplicado o proceso abandonado.'
                      : 'Ejemplo: retiro del alumno, traslado o decisión familiar.'
                  }
                  onChange={
                    setEstadoInstitucionalMotivo
                  }
                />
              )}

            {estadoInstitucionalAction.modo
              === 'reactivar' && (
                <Textarea
                  label="Observación de reactivación"
                  value={
                    estadoInstitucionalMotivo
                  }
                  rows={3}
                  placeholder="Observación opcional"
                  onChange={
                    setEstadoInstitucionalMotivo
                  }
                />
              )}
          </div>
        )}
      </CommunityEditModal>

      {/* ── Modal de visualización de foto (Visor) ── */}
      {avatarViewOpen && detalle?.avatar_url && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setAvatarViewOpen(false)}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl items-center justify-center">
            <button
              type="button"
              onClick={() => setAvatarViewOpen(false)}
              className="absolute -top-2 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 sm:top-2 sm:right-2"
            >
              <X size={20} />
            </button>
            <img 
              src={assetUrl(detalle.avatar_url)} 
              alt={fullName(detalle.persona)} 
              className="max-h-[85vh] w-full max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal de edición ── */}
      <CommunityEditModal
        open={editOpen && Boolean(form)}
        eyebrow="Editar alumno"
        title={detalle ? fullName(detalle.persona) : 'Editar alumno'}
        description="Completa los datos generales del alumno."
        message={mensaje}
        saving={saving}
        onClose={() => setEditOpen(false)}
        onSubmit={() => setConfirmEditAlumno(true)}
      >
        {form && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="DNI" value={form.dni} onChange={(v) => setForm({ ...form, dni: v })} />
            <Field label="Nombres" value={form.nombres} onChange={(v) => setForm({ ...form, nombres: v })} />
            <Field label="Apellido paterno" value={form.apellido_paterno} onChange={(v) => setForm({ ...form, apellido_paterno: v })} />
            <Field label="Apellido materno" value={form.apellido_materno} onChange={(v) => setForm({ ...form, apellido_materno: v })} />
            <Field label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(v) => setForm({ ...form, fecha_nacimiento: v })} />
            <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
            <Field label="Correo" value={form.correo} onChange={(v) => setForm({ ...form, correo: v })} />

            <div className="md:col-span-2">
              <LocationSelects
                value={{
                  pais: form.pais || 'Perú',
                  departamento: form.departamento,
                  provincia: form.provincia,
                  distrito: form.distrito,
                }}
                onChange={(location) =>
                  setForm({
                    ...form,
                    pais: location.pais || 'Perú',
                    departamento: location.departamento || '',
                    provincia: location.provincia || '',
                    distrito: location.distrito || '',
                  })
                }
                wrapperClassName="grid gap-4 md:grid-cols-3"
                selectClass={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Dirección"
                value={form.direccion}
                rows={3}
                placeholder="Ingresa la dirección completa del alumno"
                onChange={(value) =>
                  setForm({
                    ...form,
                    direccion: value,
                  })
                }
              />
            </div>
          </div>
        )}
      </CommunityEditModal>

      {avatarDraft && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm overflow-y-auto">
          <section className="w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-200 erp-detail-enter my-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-500">
                  Foto del alumno
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Ajustar foto del alumno
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Ajusta el encuadre antes de guardar. Esta imagen aparecerá en la libreta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(avatarDraft.previewUrl);
                  setAvatarDraft(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="flex justify-center">
                <div className="h-[280px] w-[210px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner">
                  <img
                    src={avatarDraft.previewUrl}
                    alt="Vista previa"
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${avatarZoom}) translateY(${avatarOffsetY}px)`,
                      transformOrigin: 'center',
                    }}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl bg-blue-50 p-4 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                  Usa el zoom para acercar el rostro y el ajuste vertical para centrarlo mejor.
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Zoom
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="1.8"
                    step="0.02"
                    value={avatarZoom}
                    onChange={(event) => setAvatarZoom(Number(event.target.value))}
                    className="w-full"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Ajuste vertical
                  </span>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="2"
                    value={avatarOffsetY}
                    onChange={(event) => setAvatarOffsetY(Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(avatarDraft.previewUrl);
                  setAvatarDraft(null);
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarSubidaFoto()}
                disabled={uploadingAvatar}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                {uploadingAvatar && <Loader2 size={15} className="animate-spin" />}
                Confirmar y subir
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={confirmEditAlumno}
        eyebrow="Alumno"
        title="Confirmar edición"
        description="Se actualizarán los datos generales del alumno. Esta información puede usarse en matrícula, reportes y libreta."
        tone="neutral"
        confirmLabel="Sí, guardar"
        cancelLabel="Cancelar"
        loading={saving}
        onCancel={() => setConfirmEditAlumno(false)}
        onConfirm={() => {
          setConfirmEditAlumno(false);
          void guardarEdicion();
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmApoderadoDestino)}
        eyebrow="Apoderado vinculado"
        title="Ver ficha del apoderado"
        description={`Se abrirá la ficha de ${confirmApoderadoDestino?.nombre || 'este apoderado'} en la página de Apoderados.`}
        tone="neutral"
        confirmLabel="Sí, ver apoderado"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmApoderadoDestino(null)}
        onConfirm={() => {
          const targetId = confirmApoderadoDestino?.id;
          setConfirmApoderadoDestino(null);
          setDetalleOpen(false);

          if (targetId) {
            navigate(`/comunidad/apoderados?apoderado=${targetId}`);
          }
        }}
      />
    </div>
  );
}
