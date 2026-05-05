"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-navy mb-4">
            Bienvenido/a, {user.nombre}
          </h1>
          <p className="text-gray-500 mb-2">Rol: {user.rol}</p>
          <p className="text-gray-400 text-sm mb-6">
            Has iniciado sesión correctamente. El dashboard completo estará disponible pronto.
          </p>
          <button onClick={handleLogout} className="btn btn-primary w-full">
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}