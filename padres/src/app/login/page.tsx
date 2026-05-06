"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LogIn, Eye, EyeOff, School } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
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
        setError("Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-primary/5 to-surface">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-primary shadow-lg shadow-primary/25 flex items-center justify-center mb-5">
          <School size={36} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-text">Portal de Padres</h1>
        <p className="text-sm text-text-secondary mt-1">Ingresa con tu cuenta</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="label">Usuario o email</label>
          <div className="relative">
            <input
              type="text"
              className="input pl-10"
              placeholder="usuario@email.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoCapitalize="none"
            />
            <LogIn size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        <div>
          <label className="label">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="input pl-10 pr-12"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <LogIn size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-danger-light border border-danger/20 text-danger text-sm rounded-2xl p-4 flex items-center gap-2">
            <span className="text-lg">⚠️</span> {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <div className="mt-8 text-center space-y-3">
        <button className="text-sm text-primary font-medium hover:underline">¿Olvidaste tu contraseña?</button>
        <p className="text-sm text-text-secondary">
          ¿No tienes cuenta?{" "}
          <button className="text-primary font-medium hover:underline">Solicitar acceso</button>
        </p>
      </div>
    </main>
  );
}