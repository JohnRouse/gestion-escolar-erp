"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Download, MessageSquareQuote } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";
import { PortalState, PortalSkeletonList } from "@/components/PortalUI";
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
    evaluaciones: { tipo: string; descripcion: string; valor: number | null }[];
    }[];
  }[];
}

export default function LibretaPage() {
  const router = useRouter();
  const { selectedChild, childrenLoading, childrenError } = useSelectedChild();
  const [libreta, setLibreta] = useState<LibretaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bimestre, setBimestre] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!selectedChild) {
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setLibreta(null);
      setError("");
    });
    const numero = bimestre ?? selectedChild.bimestre_actual;
    const bimestreQuery = numero ? `&bimestre_id=${numero}` : "";
    axios
      .get(
        `/api/calificaciones/padres/libreta?alumno_id=${selectedChild.id_estudiante}${bimestreQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      )
      .then((res) => setLibreta(res.data))
      .catch((error) => {
        if (!axios.isCancel(error)) {
          setLibreta(null);
          setError("No se pudo cargar la libreta.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [bimestre, childrenLoading, retryKey, router, selectedChild]);

  const descargarPDF = async () => {
  if (!libreta) return;

  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Encabezado
  doc.setFontSize(16);
  doc.text(selectedChild?.colegio || "Institución educativa", 105, 15, { align: "center" });
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
    headStyles: { fillColor: [76, 110, 245], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30, halign: "center" },
    },
  });

  // Comentario del tutor (al final de la tabla)
  if (libreta.comentarioTutor) {
    const finalY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
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

  if (childrenLoading || (selectedChild && loading)) {
    return (
      <main className="portal-page">
        <ScreenHeader title="Libreta virtual" subtitle="Resumen académico oficial" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
        <div className="portal-content">
          <PortalSkeletonList />
        </div>
        <BottomNav />
      </main>
    );
  }

  if (childrenError || error) {
    return (
      <main className="portal-page">
        <ScreenHeader title="Libreta virtual" subtitle="Resumen académico oficial" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
        <div className="portal-content">
          <PortalState kind="error" title="No pudimos cargar la libreta" description={childrenError || error} actionLabel={error ? "Reintentar" : undefined} onAction={error ? () => setRetryKey((key) => key + 1) : undefined} />
        </div>
        <BottomNav />
      </main>
    );
  }

  if (!libreta) {
    return (
      <main className="portal-page">
        <ScreenHeader title="Libreta virtual" subtitle="Resumen académico oficial" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
        <div className="portal-content"><PortalState title={selectedChild ? "No hay libreta disponible" : "Selecciona un estudiante"} description={selectedChild ? "La libreta de este bimestre aún no ha sido publicada." : "Elige un estudiante para consultar su libreta."} /></div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="portal-page">
      <ScreenHeader title="Libreta virtual" subtitle="Resumen académico oficial" backHref="/dashboard?open=servicios" backLabel="Volver a servicios" />
      <PageTransition>
        <div className="portal-content">
          {/* Selector de bimestre */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="portal-eyebrow">Documento académico</p><h2 className="text-lg font-semibold text-text">Bimestre {libreta.bimestre}</h2></div>
            <select
              className="portal-field w-auto min-w-[150px] font-medium"
              value={bimestre ?? selectedChild?.bimestre_actual ?? ""}
              onChange={(e) => setBimestre(Number(e.target.value))}
            >
              {!bimestre && !selectedChild?.bimestre_actual ? (
                <option value="">Bimestre disponible</option>
              ) : null}
              {[1, 2, 3, 4].map((b) => (
                <option key={b} value={b}>Bimestre {b}</option>
              ))}
            </select>
          </div>

          <section className="m-card mt-4 border-t-[3px] border-t-accent p-4">
            <p className="text-lg font-semibold text-text">{libreta.alumno}</p>
            <p className="mt-0.5 text-sm text-text-muted">{libreta.grado} · {libreta.nivel}</p>
            <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3 pr-3 sm:pr-4">
              <span className="text-sm font-medium text-text-secondary">Promedio general</span>
              <span className="portal-summary-value shrink-0">{libreta.promedioGeneral === null ? "—" : Math.round(libreta.promedioGeneral)}</span>
            </div>
          </section>

          <h3 className="portal-section-title mb-2 mt-6">Cursos</h3>

          {/* Cursos */}
          {libreta.cursos.map((curso) => (
            <div key={curso.nombre} className="m-card mb-3 overflow-hidden">
              <div className="flex justify-between items-center">
                <p className="p-4 font-semibold text-text">{curso.nombre}</p>
                <span className="portal-badge mr-4 bg-accent text-white">
                  {curso.promedioBimestre !== null ? Math.round(curso.promedioBimestre) : "—"}
                </span>
              </div>
              {curso.unidades.map((unidad) => (
                <div key={unidad.numero} className="border-t border-border bg-surface-alt px-4 py-3">
                  <p className="text-xs font-semibold text-text-secondary">
                    Unidad {unidad.numero}
                    {unidad.promedio !== null && (
                      <span className="ml-1 font-normal">· Promedio: {Math.round(unidad.promedio)}</span>
                    )}
                  </p>
                  {unidad.evaluaciones.map((eva, idx) => (
                    <div key={idx} className="mt-1 flex justify-between gap-4 text-xs">
                      <span className="text-text-muted">{eva.descripcion}</span>
                      <span className="font-bold">{eva.valor === null ? "—" : Math.round(eva.valor)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Comentario del Tutor */}
          {libreta.comentarioTutor && (
            <div className="mt-4 flex gap-3 rounded-xl border border-accent/20 bg-accent-soft p-4">
              <MessageSquareQuote size={20} className="shrink-0 text-accent" aria-hidden="true" />
              <div><p className="text-xs font-semibold text-accent-dark">{libreta.comentarioTutor.docente} · Tutor</p><p className="mt-1 text-sm leading-relaxed text-text">{libreta.comentarioTutor.comentario}</p></div>
            </div>
          )}

          {/* Botón descargar PDF */}
          <button onClick={descargarPDF} className="portal-button mt-5 w-full">
            <Download size={17} aria-hidden="true" /> Descargar PDF
          </button>
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}
