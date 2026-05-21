"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface LibretaData {
  alumno: string;
  grado: string;
  nivel: string;
  bimestre: number;
  promedioGeneral: number | null;
  comentarioTutor: { docente: string; comentario: string } | null;
  cursos: {
    nombre: string;
    promedioBimestre: number | null;
    docente: string;
    unidades: {
      numero: number;
      promedio: number | null;
      evaluaciones: { tipo: string; descripcion: string; valor: number }[];
    }[];
  }[];
}

export default function LibretaPage() {
  const router = useRouter();
  const { selectedChild } = useSelectedChild();
  const [libreta, setLibreta] = useState<LibretaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState(1);

  useEffect(() => {
    if (!selectedChild) return;
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    setLoading(true);
    axios
      .get(`/api/calificaciones/padres/libreta?alumno_id=${selectedChild.id_estudiante}&bimestre_id=${bimestre}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setLibreta(res.data))
      .catch(() => setLibreta(null))
      .finally(() => setLoading(false));
  }, [selectedChild, bimestre]);

  const descargarPDF = async () => {
  if (!libreta) return;

  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Encabezado
  doc.setFontSize(16);
  doc.text("Colegio Santa María Victoria", 105, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text(`Libreta Bimestral - Bimestre ${libreta.bimestre}`, 105, 23, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Alumno: ${libreta.alumno}`, 14, 30);
  doc.text(`Grado: ${libreta.grado} · ${libreta.nivel}`, 14, 35);
  if (libreta.promedioGeneral !== null) {
    doc.text(`Promedio General: ${Math.round(libreta.promedioGeneral)}`, 14, 40);
  }

  // Tabla de cursos (solo Curso y Promedio)
  const rows = libreta.cursos.map((curso) => [
    curso.nombre,
    curso.promedioBimestre !== null ? Math.round(curso.promedioBimestre).toString() : "—",
  ]);

  autoTable(doc, {
    startY: 45,
    head: [["Curso", "Promedio"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [217, 119, 6], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30, halign: "center" },
    },
  });

  // Comentario del tutor (al final de la tabla)
  if (libreta.comentarioTutor) {
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Comentario del Tutor:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(`${libreta.comentarioTutor.docente}`, 14, finalY + 5);
    doc.setFont("helvetica", "italic");
    doc.text(`"${libreta.comentarioTutor.comentario}"`, 14, finalY + 10);
  }

  doc.save(`Libreta_B${libreta.bimestre}_${libreta.alumno}.pdf`);
};

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Libreta Virtual" />
        <div className="px-5 pt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skel h-20 rounded-xl" />
          ))}
        </div>
        <BottomNav />
      </main>
    );
  }

  if (!libreta) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Libreta Virtual" />
        <p className="text-center text-text-secondary py-10">No hay datos disponibles para este bimestre.</p>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Libreta Virtual" />
      <PageTransition>
        <div className="px-5 pt-4 pb-28">
          <button onClick={() => router.push("/dashboard?open=servicios")} className="text-accent text-sm font-bold hover:underline mb-4 flex items-center gap-1">
            <span className="material-symbols-rounded text-lg">arrow_back</span> Servicios
          </button>

          {/* Selector de bimestre */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-extrabold text-text">Bimestre {libreta.bimestre}</h2>
            <select
              className="bg-white border border-border rounded-full px-4 py-2 text-sm font-bold text-text"
              value={bimestre}
              onChange={(e) => setBimestre(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((b) => (
                <option key={b} value={b}>Bimestre {b}</option>
              ))}
            </select>
          </div>

          <p className="text-sm text-text-muted mb-2">{libreta.alumno} · {libreta.grado} · {libreta.nivel}</p>
          {libreta.promedioGeneral !== null && (
            <p className="text-xl font-extrabold text-text mb-4">Promedio General: {Math.round(libreta.promedioGeneral)}</p>
          )}

          {/* Cursos */}
          {libreta.cursos.map((curso) => (
            <div key={curso.nombre} className="m-card p-4 mb-3">
              <div className="flex justify-between items-center">
                <p className="font-extrabold text-text">{curso.nombre}</p>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  (curso.promedioBimestre ?? 0) >= 11 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}>
                  {curso.promedioBimestre !== null ? Math.round(curso.promedioBimestre) : "—"}
                </span>
              </div>
              {curso.unidades.map((unidad) => (
                <div key={unidad.numero} className="mt-2 ml-2">
                  <p className="text-xs font-bold text-text-secondary">
                    Unidad {unidad.numero}
                    {unidad.promedio !== null && (
                      <span className="ml-1 font-normal">· Promedio: {Math.round(unidad.promedio)}</span>
                    )}
                  </p>
                  {unidad.evaluaciones.map((eva, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-0.5">
                      <span className="text-text-muted">{eva.descripcion}</span>
                      <span className="font-bold">{Math.round(eva.valor)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Comentario del Tutor */}
          {libreta.comentarioTutor && (
            <div className="m-card p-4 mt-4 bg-accent-soft border border-accent/20 rounded-xl">
              <p className="text-xs font-bold text-accent mb-1">{libreta.comentarioTutor.docente} – Tutor</p>
              <p className="text-xs text-text italic leading-relaxed">“{libreta.comentarioTutor.comentario}”</p>
            </div>
          )}

          {/* Botón descargar PDF */}
          <button onClick={descargarPDF} className="mt-4 w-full py-3 rounded-xl bg-accent text-white font-bold text-sm">
            Descargar PDF
          </button>
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}