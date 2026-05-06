import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="card p-8 w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-purple-lt flex items-center justify-center text-3xl mb-4">
            🏫
          </div>
          <h1 className="text-2xl font-semibold text-navy">Colegio XYZ</h1>
          <p className="text-sm text-gray-400 mt-1">Sistema de gestión interna</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Usuario</label>
            <input
              type="text"
              className="input"
              placeholder="usuario@colegio.edu.pe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-lt border border-red-200 text-red text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
            {loading ? 'Ingresando...' : 'Acceder al sistema'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            🔒 Acceso restringido al personal autorizado.
          </p>
        </div>
      </div>
    </div>
  );
}