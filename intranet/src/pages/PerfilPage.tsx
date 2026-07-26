import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import CenteredFormModal from '../components/CenteredFormModal';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { assetUrl, initialsFromName } from '../utils/assets';

interface PerfilData {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correo: string;
  telefono: string;
  cargo: string;
  avatar_url: string | null;
}

type PerfilApiData = {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  correo?: string | null;
  email?: string | null;
  telefono?: string | null;
  rol?: string | null;
  cargo?: string | null;
  avatar_url?: string | null;
};

function toPerfilData(data?: PerfilApiData | null): PerfilData {
  return {
    nombres: data?.nombres || '',
    apellidoPaterno: data?.apellido_paterno || '',
    apellidoMaterno: data?.apellido_materno || '',
    correo: data?.correo || data?.email || '',
    telefono: data?.telefono || '',
    cargo: data?.rol || data?.cargo || 'Usuario',
    avatar_url: data?.avatar_url || null,
  };
}

function fullName(perfil: PerfilData | null) {
  if (!perfil) return 'Usuario';

  return (
    `${perfil.nombres} ${perfil.apellidoPaterno} ${perfil.apellidoMaterno}`
      .replace(/\s+/g, ' ')
      .trim() || 'Usuario'
  );
}

const inputClass =
  'h-11 w-full border border-transparent border-b-2 border-b-neutral-500 bg-neutral-100 px-4 text-sm font-semibold text-neutral-950 outline-none transition-colors placeholder:text-neutral-500 focus:border-b-blue-600 focus:bg-white';

const labelClass =
  'mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-neutral-700';

export default function PerfilPage() {
  const { token, user, updateUser, refreshUser } = useAuth();

  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [editNombres, setEditNombres] = useState('');
  const [editApPaterno, setEditApPaterno] = useState('');
  const [editApMaterno, setEditApMaterno] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const nombreCompleto = fullName(perfil);
  const avatarDisplayUrl = assetUrl(perfil?.avatar_url);
  const initials = initialsFromName(nombreCompleto);

  const headerMeta = useMemo(
    () => [
      {
        label: 'Rol del sistema',
        value: perfil?.cargo || user?.rol || 'Usuario',
      },
      {
        label: 'Correo',
        value: perfil?.correo || user?.email || user?.correo || 'No registrado',
      },
    ],
    [perfil, user],
  );

  const fetchPerfil = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const res = await axios.get<PerfilApiData>('/api/auth/perfil', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPerfil(toPerfilData(res.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPerfil().catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    return () => {
      if (previewAvatarUrl) {
        URL.revokeObjectURL(previewAvatarUrl);
      }
    };
  }, [previewAvatarUrl]);

  const openModal = () => {
    if (!perfil) return;

    setEditNombres(perfil.nombres);
    setEditApPaterno(perfil.apellidoPaterno);
    setEditApMaterno(perfil.apellidoMaterno);
    setEditCorreo(perfil.correo);
    setEditTelefono(perfil.telefono);
    setPendingAvatarFile(null);

    if (previewAvatarUrl) {
      URL.revokeObjectURL(previewAvatarUrl);
    }

    setPreviewAvatarUrl('');
    setMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setMessage(null);
    setPendingAvatarFile(null);

    if (previewAvatarUrl) {
      URL.revokeObjectURL(previewAvatarUrl);
    }

    setPreviewAvatarUrl('');
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'Solo se permiten imágenes JPG, PNG o WEBP.',
      });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: 'La imagen no debe superar los 3 MB.',
      });
      return;
    }

    if (previewAvatarUrl) {
      URL.revokeObjectURL(previewAvatarUrl);
    }

    setPendingAvatarFile(file);
    setPreviewAvatarUrl(URL.createObjectURL(file));
    setMessage(null);
  };

  const uploadAvatarIfNeeded = async () => {
    if (!pendingAvatarFile || !token) {
      return perfil?.avatar_url || null;
    }

    const formData = new FormData();
    formData.append('avatar', pendingAvatarFile);

    const res = await axios.post<{ avatar_url?: string | null }>(
      '/api/auth/perfil/avatar',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return res.data?.avatar_url || null;
  };

  const handleSave = async () => {
    if (!token || !perfil) return;

    setSaving(true);
    setMessage(null);

    try {
      const avatarUrl = await uploadAvatarIfNeeded();

      const res = await axios.put<PerfilApiData>(
        '/api/auth/perfil',
        {
          nombres: editNombres,
          apellido_paterno: editApPaterno,
          apellido_materno: editApMaterno,
          correo: editCorreo,
          telefono: editTelefono,
          avatar_url: avatarUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const nextPerfil = toPerfilData(res.data);
      setPerfil(nextPerfil);

      updateUser({
        nombre: fullName(nextPerfil),
        nombres: nextPerfil.nombres,
        apellido_paterno: nextPerfil.apellidoPaterno,
        apellido_materno: nextPerfil.apellidoMaterno,
        email: nextPerfil.correo,
        correo: nextPerfil.correo,
        avatar_url: nextPerfil.avatar_url,
      });

      await refreshUser().catch(() => undefined);

      setSaving(false);
      closeModal();
    } catch (error: unknown) {
      const fallback = 'No se pudieron guardar los cambios.';
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;

      setMessage({
        type: 'error',
        text: typeof responseMessage === 'string' ? responseMessage : fallback,
      });
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;

    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'Las contraseñas no coinciden.',
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: 'error',
        text: 'La nueva contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }

    setChangingPassword(true);

    try {
      await axios.put(
        '/api/auth/cambiar-password',
        {
          password_actual: currentPassword,
          password_nueva: newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setPasswordMessage({
        type: 'success',
        text: 'Contraseña actualizada correctamente.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const fallback = 'No se pudo cambiar la contraseña.';
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;

      setPasswordMessage({
        type: 'error',
        text: typeof responseMessage === 'string' ? responseMessage : fallback,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="carbon-perfil-page w-full space-y-6">
        <div className="h-36 animate-pulse rounded-[32px] bg-white ring-1 ring-neutral-200" />
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="h-72 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200 xl:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200" />
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="carbon-perfil-page w-full space-y-6">
        <PageHeader
          eyebrow="Perfil"
          title="No se pudo cargar el perfil"
          description="Vuelve a iniciar sesión o comunícate con el administrador."
          icon={AlertCircle}
        />
      </div>
    );
  }

  return (
    <div className="carbon-perfil-page w-full space-y-6">
      <PageHeader
        eyebrow="Perfil del usuario"
        title="Perfil"
        description="Gestiona tu información personal, foto de perfil y seguridad de acceso."
        icon={User}
        meta={headerMeta}
      />

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white">
          <div className="flex flex-col gap-5 border-b border-neutral-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                {avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt={nombreCompleto}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-neutral-950">
                    {initials}
                  </span>
                )}

                <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-sm bg-blue-600 text-white ring-2 ring-white">
                  <CheckCircle2 size={15} aria-hidden="true" />
                </span>
              </div>

              <div className="min-w-0">
                <p className="mb-2 inline-flex rounded-sm bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700 ring-1 ring-blue-100">
                  {perfil.cargo || 'Usuario'}
                </p>
                <h2 className="truncate text-2xl font-black tracking-tight text-neutral-950">
                  {nombreCompleto}
                </h2>
                <p className="mt-1 text-sm font-semibold text-neutral-700">
                  {perfil.correo || 'Correo no registrado'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-700"
            >
              <Pencil size={16} aria-hidden="true" />
              Editar perfil
            </button>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3">
            <ProfileInfoCard icon={User} label="Nombre completo" value={nombreCompleto} />
            <ProfileInfoCard
              icon={Mail}
              label="Correo electrónico"
              value={perfil.correo || 'No registrado'}
            />
            <ProfileInfoCard
              icon={Phone}
              label="Teléfono"
              value={perfil.telefono || 'No registrado'}
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <ShieldCheck size={19} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-950">Seguridad</h3>
                <p className="text-sm font-medium text-neutral-700">
                  Actualiza tu contraseña de acceso.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <PasswordField
              label="Contraseña actual"
              placeholder="Ingresa tu contraseña actual"
              value={currentPassword}
              visible={showCurrent}
              onChange={setCurrentPassword}
              onToggle={() => setShowCurrent((value) => !value)}
            />

            <PasswordField
              label="Nueva contraseña"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              visible={showNew}
              onChange={setNewPassword}
              onToggle={() => setShowNew((value) => !value)}
            />

            <PasswordField
              label="Confirmar nueva contraseña"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              visible={showConfirm}
              onChange={setConfirmPassword}
              onToggle={() => setShowConfirm((value) => !value)}
            />

            {passwordMessage && (
              <div
                role={passwordMessage.type === 'error' ? 'alert' : 'status'}
                className={`rounded-sm border px-4 py-3 text-sm font-bold ${
                  passwordMessage.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleChangePassword()}
              disabled={changingPassword}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-neutral-950 px-5 text-sm font-black text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {changingPassword ? (
                <Loader2 size={17} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Lock size={17} aria-hidden="true" />
              )}
              {changingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </section>
      </div>

      <CenteredFormModal
        open={modalOpen}
        eyebrow="Editar perfil"
        title="Información personal"
        description="Actualiza tus datos y foto de perfil."
        saving={saving}
        submitLabel={saving ? 'Guardando...' : 'Guardar cambios'}
        cancelLabel="Cancelar"
        maxWidthClassName="max-w-3xl"
        message={message?.text}
        messageTone={message?.type || 'info'}
        onClose={closeModal}
        onSubmit={() => void handleSave()}
      >
        <div className="mb-6 flex flex-col gap-4 rounded-sm border border-neutral-200 bg-neutral-50 p-5 sm:flex-row sm:items-center">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-neutral-300 bg-white">
            {previewAvatarUrl || avatarDisplayUrl ? (
              <img
                src={previewAvatarUrl || avatarDisplayUrl}
                alt={nombreCompleto}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-black text-neutral-950">
                {initials}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-neutral-950">Foto de perfil</p>
            <p className="mt-1 text-sm font-semibold text-neutral-700">
              Usa una imagen JPG, PNG o WEBP. Tamaño máximo: 3 MB.
            </p>

            <label className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-sm bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">
              <Camera size={16} aria-hidden="true" />
              Seleccionar foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <ProfileField label="Nombres" value={editNombres} onChange={setEditNombres} />
          <ProfileField
            label="Apellido paterno"
            value={editApPaterno}
            onChange={setEditApPaterno}
          />
          <ProfileField
            label="Apellido materno"
            value={editApMaterno}
            onChange={setEditApMaterno}
          />
          <ProfileField
            label="Correo electrónico"
            value={editCorreo}
            type="email"
            onChange={setEditCorreo}
          />
          <div className="md:col-span-2">
            <ProfileField
              label="Teléfono"
              value={editTelefono}
              onChange={setEditTelefono}
            />
          </div>
        </div>
      </CenteredFormModal>
    </div>
  );
}

function ProfileInfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-neutral-200 bg-neutral-50 p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm bg-white text-blue-600 ring-1 ring-neutral-200">
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className={labelClass}>{label}</p>
      <p className="break-words text-base font-black text-neutral-950">{value}</p>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  visible,
  onChange,
  onToggle,
}: {
  label: string;
  placeholder: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        <input
          type={visible ? 'text' : 'password'}
          className={`${inputClass} pr-11`}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-700"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}
