import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Pencil, Camera, X } from 'lucide-react';

interface PerfilData {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correo: string;
  telefono: string;
  cargo: string;
  avatar_url: string | null;
}

export default function PerfilPage() {
  const { token, user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Campos editables (para el modal)
  const [editNombres, setEditNombres] = useState('');
  const [editApPaterno, setEditApPaterno] = useState('');
  const [editApMaterno, setEditApMaterno] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    axios.get('/api/auth/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = res.data;
        const nombreCompleto = data.nombre.split(' ');
        setPerfil({
          nombres: nombreCompleto[0] || '',
          apellidoPaterno: nombreCompleto[1] || '',
          apellidoMaterno: nombreCompleto[2] || '',
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

      // Actualizar datos locales
      setPerfil({
        nombres: editNombres,
        apellidoPaterno: editApPaterno,
        apellidoMaterno: editApMaterno,
        correo: editCorreo,
        telefono: editTelefono,
        cargo: perfil?.cargo || '',
        avatar_url: editAvatarUrl || null,
      });
      setModalOpen(false);
    } catch {
      setMessage('Error saving changes');
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

  if (loading) {
    return (
      <div className="animate-slide-in-right">
        <h1 className="text-xl font-bold text-[#1B2559] mb-6">Profile</h1>
        <div className="bg-white rounded-xl border border-[#e2e5ef] p-6">
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
        <h1 className="text-xl font-bold text-[#1B2559] mb-6">Profile</h1>
        <p className="text-[#6a728b]">No se pudo cargar la información del perfil.</p>
      </div>
    );
  }

  const avatarSrc = perfil.avatar_url ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(`${perfil.nombres} ${perfil.apellidoPaterno}`)}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;

  return (
    <div className="animate-slide-in-right">
      <h1 className="text-xl font-bold text-[#1B2559] mb-6">Profile</h1>

      {/* Personal Information Card */}
      <div className="bg-white rounded-xl border border-[#e2e5ef] p-6 mb-6">
        {/* Cabecera con avatar y botones */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <img src={avatarSrc} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
            <div>
              <h2 className="text-lg font-bold text-[#1B2559]">
                {perfil.nombres} {perfil.apellidoPaterno} {perfil.apellidoMaterno}
              </h2>
              <p className="text-sm text-[#6a728b]">{perfil.cargo}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e2e5ef] text-sm font-medium text-[#1B2559] hover:bg-[#f9fafb] transition-colors ml-2"
            >
              <Pencil size={16} />
              Edit
            </button>
          </div>
        </div>

        {/* Datos personales */}
        <div>
          <h3 className="text-lg font-bold text-[#1B2559] mb-6">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-[#6a728b] mb-1">First Name</p>
              <p className="text-sm font-semibold text-[#1B2559]">{perfil.nombres || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#6a728b] mb-1">Last Name</p>
              <p className="text-sm font-semibold text-[#1B2559]">
                {perfil.apellidoPaterno} {perfil.apellidoMaterno}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#6a728b] mb-1">Email address</p>
              <p className="text-sm font-semibold text-[#1B2559]">{perfil.correo || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#6a728b] mb-1">Phone</p>
              <p className="text-sm font-semibold text-[#1B2559]">{perfil.telefono || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-[#6a728b] mb-1">Role / Position</p>
              <p className="text-sm font-semibold text-[#1B2559]">{perfil.cargo}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Edit Personal Information */}
      {modalOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#1B2559] bg-opacity-50 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#1B2559]">Edit Personal Information</h2>
                  <p className="text-sm text-[#6a728b] mt-1">Update your details to keep your profile up-to-date.</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F0F2F9] text-[#6a728b] hover:bg-[#e2e5ef] transition-colors shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Picture Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#1B2559] mb-4">Change Profile Picture</h3>
                <div className="flex items-center gap-6">
                  <div className="relative group shrink-0">
                    <img
                      src={editAvatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(`${editNombres} ${editApPaterno}`)}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                    <label className="absolute bottom-0 right-0 bg-white border border-[#e2e5ef] rounded-full p-1.5 shadow-sm cursor-pointer hover:bg-gray-50">
                      <Camera size={16} className="text-[#6a728b]" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm text-[#6a728b]">
                      Upload a square image (200×200 px)<br />in JPEG or PNG format.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <h3 className="text-lg font-semibold text-[#1B2559] mb-6">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#1B2559] mb-2">First Name</label>
                  <input
                    type="text"
                    value={editNombres}
                    onChange={e => setEditNombres(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[#e2e5ef] text-sm text-[#1B2559] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B2559] mb-2">Last Name (Paternal)</label>
                  <input
                    type="text"
                    value={editApPaterno}
                    onChange={e => setEditApPaterno(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[#e2e5ef] text-sm text-[#1B2559] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B2559] mb-2">Last Name (Maternal)</label>
                  <input
                    type="text"
                    value={editApMaterno}
                    onChange={e => setEditApMaterno(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[#e2e5ef] text-sm text-[#1B2559] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B2559] mb-2">Email Address</label>
                  <input
                    type="email"
                    value={editCorreo}
                    onChange={e => setEditCorreo(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[#e2e5ef] text-sm text-[#1B2559] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B2559] mb-2">Phone</label>
                  <input
                    type="text"
                    value={editTelefono}
                    onChange={e => setEditTelefono(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[#e2e5ef] text-sm text-[#1B2559] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {message && (
                <p className="mt-4 text-sm text-red-500">{message}</p>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#e2e5ef]">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg border border-[#e2e5ef] text-sm font-medium text-[#1B2559] hover:bg-[#f9fafb] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg bg-[#3652AD] text-white text-sm font-medium hover:bg-[#2b428b] transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}