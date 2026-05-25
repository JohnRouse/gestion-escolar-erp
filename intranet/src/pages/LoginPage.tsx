import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';

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
      <div className="hidden lg:flex lg:w-[70%] relative overflow-hidden bg-gray-900">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>
        ))}

        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 text-white">
          <h1 className="text-3xl font-light tracking-tight mb-2">Santa María Victoria</h1>
          <p className="text-sm text-white/60 max-w-sm leading-relaxed">
            Sistema de gestión interna para personal autorizado.
          </p>
          <div className="flex gap-2 mt-8">
            {IMAGENES.map((_, index) => (
              <button
                key={index}
                onClick={() => setImagenActual(index)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === imagenActual ? 'bg-white w-6' : 'bg-white/30 w-1.5'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho: Formulario de login (30%) */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-gray-50 lg:w-[30%]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center mx-auto mb-5">
              <span className="text-xl font-semibold text-white">SMV</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Iniciar Sesión</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-accent-400 focus:ring-3 focus:ring-accent-50 outline-none transition-all duration-150"
                placeholder="usuario@smv.edu.pe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-2.5 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-accent-400 focus:ring-3 focus:ring-accent-50 outline-none transition-all duration-150"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              {loading ? 'Ingresando...' : 'Acceder al sistema'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            ¿Olvidaste tu contraseña? Contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  );
}