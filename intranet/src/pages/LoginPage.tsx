import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader } from 'lucide-react';

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
      {/* Panel izquierdo: Imágenes institucionales (65%) */}
      <div className="hidden lg:flex lg:w-[65%] relative overflow-hidden bg-gray-900">
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

        <div className="relative z-10 flex flex-col justify-end p-12 pb-16 text-white">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-3">Santa María Victoria</h1>
            <p className="text-base text-white/75 max-w-md leading-relaxed font-light">
              Sistema integral de gestión educativa para personal autorizado.
            </p>
          </div>
          
          <div className="flex gap-2 mt-auto">
            {IMAGENES.map((_, index) => (
              <button
                key={index}
                onClick={() => setImagenActual(index)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === imagenActual ? 'bg-white w-8' : 'bg-white/30 w-2'
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho: Formulario de login (35%) */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-gradient-to-b from-gray-50 to-gray-100 lg:w-[35%] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-50 rounded-full -mr-48 -mt-48 opacity-30" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-50 rounded-full -ml-36 -mb-36 opacity-20" />

        <div className="w-full max-w-sm relative z-10">
          {/* Logo y encabezado */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-2xl font-bold text-white">SMV</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
            <p className="text-sm text-gray-600">
              Accede al sistema de gestión escolar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Usuario */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Usuario
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none shadow-sm hover:border-gray-400"
                placeholder="usuario@smv.edu.pe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none shadow-sm hover:border-gray-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-3 animate-pulse">
                <div className="w-1 h-1 rounded-full bg-red-700 mt-1.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Acceder al sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              ¿Olvidaste tu contraseña?{' '}
              <a href="#" className="text-accent-600 hover:text-accent-700 font-semibold transition-colors duration-200">
                Contacta al administrador
              </a>
            </p>
            <p className="text-center text-xs text-gray-400 mt-3">
              © 2024 Colegio Santa María Victoria. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
