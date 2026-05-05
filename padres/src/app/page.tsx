"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Si ya hay token, podríamos redirigir al dashboard;
    // pero por ahora, siempre redirigimos al login
    router.push("/login");
  }, [router]);

  return null; // No se renderiza nada, solo redirige
}