import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

// Imágenes institucionales de ejemplo (reemplaza con las del colegio si las tienes)
const IMAGENES = [
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagenActual, setImagenActual] = useState(0);

  // Transición automática de imágenes cada 6 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setImagenActual((prev) => (prev + 1) % IMAGENES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo: Imágenes institucionales (70%) */}
      <div className="hidden lg:flex lg:w-[65%] relative overflow-hidden bg-gray-900">
        {/* Imágenes con transición suave */}
        {IMAGENES.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === imagenActual ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={img}
              alt="Colegio Santa María Victoria"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ))}

        {/* Texto institucional superpuesto */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 text-white">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">Colegios Santa María</h1>
          <p className="text-lg text-white/80 max-w-md leading-relaxed">
            Excelencia educativa, valores y formación integral para el futuro de nuestros estudiantes.
          </p>
          {/* Indicadores de imágenes */}
          <div className="flex gap-2 mt-6">
            {IMAGENES.map((_, index) => (
              <button
                key={index}
                onClick={() => setImagenActual(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === imagenActual ? 'bg-white w-6' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho: Formulario de login (30%) */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white lg:w-[35%]">
        <div className="w-full max-w-sm">
          {/* Texto "Sistema de gestión interna..." encima del formulario */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
            <p className="text-gray-500 text-sm">
              Sistema de gestión interna para personal autorizado.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
                placeholder="usuario@smv.edu.pe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Acceder al sistema'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Olvidaste tu contraseña? Contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  );
}