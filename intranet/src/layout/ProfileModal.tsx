import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { X, Camera, Save, Lock, Edit, Check, Loader2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Campos de perfil
  const [nombres, setNombres] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cargo, setCargo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoading(true);
    setEditMode(false);
    setMessage('');
    axios.get('/api/auth/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = res.data;
        const nombreCompleto = data.nombre.split(' ');
        setNombres(nombreCompleto[0] || '');
        setApellidoPaterno(nombreCompleto[1] || '');
        setApellidoMaterno(nombreCompleto[2] || '');
        setCorreo(data.correo || '');
        setTelefono(data.telefono || '');
        setAvatarUrl(data.avatar_url || '');
        setCargo(data.rol || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, token]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await axios.put('/api/auth/perfil', {
        nombres,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        correo,
        telefono,
        avatar_url: avatarUrl,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Profile updated successfully');
      setEditMode(false);
    } catch {
      setMessage('Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Restaurar valores originales
    const nombreCompleto = (user?.nombre || '').split(' ');
    setNombres(nombreCompleto[0] || '');
    setApellidoPaterno(nombreCompleto[1] || '');
    setApellidoMaterno(nombreCompleto[2] || '');
    setCorreo(user?.correo || '');
    setTelefono(user?.telefono || '');
    setEditMode(false);
    setMessage('');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  };

  const handleChangePassword = async () => {
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.put('/api/auth/cambiar-password', {
        password_actual: currentPassword,
        password_nueva: newPassword,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPasswordMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage(err.response?.data?.message || 'Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Cabecera con foto de portada y avatar */}
        <div className="relative">
          {/* Imagen de portada simulada */}
          <div className="h-32 bg-gradient-to-r from-brand-400 to-brand-600 rounded-t-2xl" />
          
          {/* Avatar superpuesto */}
          <div className="absolute -bottom-10 left-6">
            <div className="relative w-20 h-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
              <img
                src={avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user?.nombre || 'user')}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`}
                alt=""
                className="w-full h-full object-cover"
              />
              {editMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <Camera size={18} />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Botón cerrar */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Información del usuario */}
        <div className="pt-12 px-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {nombres} {apellidoPaterno} {apellidoMaterno}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{cargo}</p>
            </div>
            {!editMode && activeTab === 'personal' && (
              <button
                onClick={() => setEditMode(true)}
                className="btn btn-sm bg-brand-500 hover:bg-brand-600 text-white"
              >
                <Edit size={14} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Pestañas */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('personal')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'personal' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Personal Information
            </button>
            <button
              onClick={() => { setActiveTab('security'); setEditMode(false); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'security' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Security
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
            </div>
          ) : activeTab === 'personal' ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    First Name
                  </label>
                  {editMode ? (
                    <input
                      className="input"
                      value={nombres}
                      onChange={e => setNombres(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-800 py-2">{nombres || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Last Name (Paternal)
                  </label>
                  {editMode ? (
                    <input
                      className="input"
                      value={apellidoPaterno}
                      onChange={e => setApellidoPaterno(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-800 py-2">{apellidoPaterno || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Last Name (Maternal)
                  </label>
                  {editMode ? (
                    <input
                      className="input"
                      value={apellidoMaterno}
                      onChange={e => setApellidoMaterno(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-800 py-2">{apellidoMaterno || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      className="input"
                      value={correo}
                      onChange={e => setCorreo(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-800 py-2">{correo || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Phone
                  </label>
                  {editMode ? (
                    <input
                      className="input"
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-800 py-2">{telefono || '—'}</p>
                  )}
                </div>
              </div>

              {message && (
                <p className={`mt-4 text-sm ${message.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>
                  {message}
                </p>
              )}

              {editMode && (
                <div className="flex gap-3 mt-6">
                  <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button onClick={handleCancel} className="btn btn-secondary">
                    <X size={16} /> Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Security tab */
            <div className="max-w-md">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>

                {passwordMessage && (
                  <p className={`text-sm ${passwordMessage.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {passwordMessage}
                  </p>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="btn btn-secondary w-full"
                >
                  {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {changingPassword ? 'Changing...' : 'Change password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}