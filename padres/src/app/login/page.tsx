"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    // Usamos la ruta relativa que el proxy redirige al backend
    const response = await axios.post("/api/auth/login", {
      username,
      password,
    });

    const { access_token, user } = response.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));
    window.location.href = "/dashboard";
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      setError(err.response.data.message || "Credenciales inválidas");
    } else {
      setError("Error de conexión con el servidor");
    }
  } finally {
    setLoading(false);
  }
};;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm p-8">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-purple-lt flex items-center justify-center text-3xl mb-4">
            🏫
          </div>
          <h1 className="text-xl font-semibold text-navy">Colegio XYZ</h1>
          <p className="text-sm text-gray-400 mt-1">Portal para apoderados</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="label">
              Email o usuario
            </label>
            <input
              id="username"
              type="text"
              className="input"
              placeholder="usuario@email.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Contraseña
            </label>
            <input
              id="password"
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

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-2"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        {/* Enlaces secundarios */}
        <div className="mt-6 text-center text-sm">
          <a href="#" className="text-indigo hover:underline">
            Olvidé mi contraseña
          </a>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            ¿Primera vez?{" "}
            <a href="#" className="text-indigo hover:underline">
              Solicitar cuenta
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}