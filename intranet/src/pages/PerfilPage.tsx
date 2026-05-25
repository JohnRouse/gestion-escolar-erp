import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Pencil, Camera, X, Save } from 'lucide-react';

interface PerfilData {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correo: string;
  telefono: string;
  cargo: string;
  avatar_url: string | null;
}

function generarAvatar(nombre: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nombre)}&backgroundColor=4c6ef5,748ffc,91a7ff,bac8ff,dbe4ff&textColor=ffffff&radius=50`;
}

export default function PerfilPage() {
  const { token, user, updateUser } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Campos editables (modal)
  const [editNombres, setEditNombres] = useState('');
  const [editApPaterno, setEditApPaterno] = useState('');
  const [editApMaterno, setEditApMaterno] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('/api/auth/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = res.data;
        setPerfil({
          nombres: data.nombres || '',
          apellidoPaterno: data.apellido_paterno || '',
          apellidoMaterno: data.apellido_materno || '',
          correo: data.correo || '',
          telefono: data.telefono || '',
          cargo: data.rol || '',
          avatar_url: data.avatar_url || null,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const openModal = () => {
    if (!perfil) return;
    setEditNombres(perfil.nombres);
    setEditApPaterno(perfil.apellidoPaterno);
    setEditApMaterno(perfil.apellidoMaterno);
    setEditCorreo(perfil.correo);
    setEditTelefono(perfil.telefono);
    setEditAvatarUrl(perfil.avatar_url || '');
    setMessage('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await axios.put('/api/auth/perfil', {
        nombres: editNombres,
        apellido_paterno: editApPaterno,
        apellido_materno: editApMaterno,
        correo: editCorreo,
        telefono: editTelefono,
        avatar_url: editAvatarUrl,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setPerfil({
        nombres: editNombres,
        apellidoPaterno: editApPaterno,
        apellidoMaterno: editApMaterno,
        correo: editCorreo,
        telefono: editTelefono,
        cargo: perfil?.cargo || '',
        avatar_url: editAvatarUrl || null,
      });

      updateUser({
        nombre: `${editNombres} ${editApPaterno} ${editApMaterno}`.trim(),
        avatar_url: editAvatarUrl || null,
      });

      setModalOpen(false);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setEditAvatarUrl(url);
  };

  const handleChangePassword = async () => {
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.put('/api/auth/cambiar-password', {
        password_actual: currentPassword,
        password_nueva: newPassword,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPasswordMessage('Contraseña actualizada con éxito');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage(err.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-in-right">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Perfil</h1>
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="skeleton w-16 h-16 rounded-full" />
            <div>
              <div className="skeleton h-5 w-40 mb-1" />
              <div className="skeleton h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="skeleton h-3 w-16 mb-2" />
                <div className="skeleton h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="animate-slide-in-right">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Perfil</h1>
        <p className="text-gray-500">No se pudo cargar la información del perfil.</p>
      </div>
    );
  }

  const avatarSrc = perfil.avatar_url || generarAvatar(`${perfil.nombres} ${perfil.apellidoPaterno}`);

  return (
    <div className="animate-slide-in-right">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarjeta de información personal */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <img src={avatarSrc} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {perfil.nombres} {perfil.apellidoPaterno} {perfil.apellidoMaterno}
                </h2>
                <p className="text-sm text-gray-500">{perfil.cargo}</p>
              </div>
            </div>
            <button onClick={openModal} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors duration-150">
              <Pencil size={15} /> Editar
            </button>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-6">Información Personal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">NOMBRES</p>
              <p className="text-sm font-medium text-gray-800">{perfil.nombres || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">APELLIDOS</p>
              <p className="text-sm font-medium text-gray-800">
                {perfil.apellidoPaterno ? `${perfil.apellidoPaterno} ${perfil.apellidoMaterno}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">CORREO ELECTRÓNICO</p>
              <p className="text-sm font-medium text-gray-800">
                {perfil.correo || <span className="text-gray-400 italic">No registrado</span>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">TELÉFONO</p>
              <p className="text-sm font-medium text-gray-800">
                {perfil.telefono || <span className="text-gray-400 italic">No registrado</span>}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-gray-500 mb-1">CARGO / PUESTO</p>
              <p className="text-sm font-medium text-gray-800">{perfil.cargo}</p>
            </div>
          </div>
        </div>

        {/* Tarjeta de Seguridad */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-6">Seguridad</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Contraseña actual</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Nueva contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Confirmar nueva contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.includes('éxito') ? 'text-emerald-600' : 'text-red-500'}`}>
                {passwordMessage}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="btn btn-secondary w-full"
            >
              {changingPassword ? 'Cambiando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto slide-up">
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Editar Información Personal</h2>
                  <p className="text-sm text-gray-500 mt-1">Actualiza tus datos para mantener tu perfil al día.</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="mb-8">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Cambiar Foto de Perfil</h3>
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <img src={editAvatarUrl || avatarSrc} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                    <label className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                      <Camera size={14} className="text-gray-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">Sube una imagen cuadrada (200×200 px)<br />en formato JPEG o PNG.</p>
                </div>
              </div>

              <h3 className="text-base font-semibold text-gray-900 mb-6">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Nombres</label>
                  <input type="text" className="input" value={editNombres} onChange={e => setEditNombres(e.target.value)} />
                </div>
                <div>
                  <label className="label">Apellido Paterno</label>
                  <input type="text" className="input" value={editApPaterno} onChange={e => setEditApPaterno(e.target.value)} />
                </div>
                <div>
                  <label className="label">Apellido Materno</label>
                  <input type="text" className="input" value={editApMaterno} onChange={e => setEditApMaterno(e.target.value)} />
                </div>
                <div>
                  <label className="label">Correo Electrónico</label>
                  <input type="email" className="input" value={editCorreo} onChange={e => setEditCorreo(e.target.value)} />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input type="text" className="input" value={editTelefono} onChange={e => setEditTelefono(e.target.value)} />
                </div>
              </div>

              {message && <p className="mt-4 text-sm text-red-500">{message}</p>}

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button onClick={() => setModalOpen(false)} className="btn btn-secondary">Cerrar</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}