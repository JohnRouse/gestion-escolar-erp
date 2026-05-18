import jsPDF from "jspdf";

interface DatosComprobante {
  concepto: string;
  monto: number;
  fechaPago: string;
  metodo: string;
  nombreAlumno: string;
  nombreApoderado: string;
  codigoTransaccion?: string;
}

export function generarComprobantePDF(datos: DatosComprobante) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Encabezado
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Colegio Santa María Victoria", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Comprobante de Pago", pageWidth / 2, y, { align: "center" });
  y += 10;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(10, y, pageWidth - 10, y);
  y += 6;

  // Datos del alumno y apoderado
  doc.setFontSize(9);
  doc.text(`Alumno: ${datos.nombreAlumno}`, 12, y);
  y += 5;
  doc.text(`Apoderado: ${datos.nombreApoderado}`, 12, y);
  y += 5;
  if (datos.codigoTransaccion) {
    doc.text(`Código de transacción: ${datos.codigoTransaccion}`, 12, y);
    y += 5;
  }
  y += 3;

  // Detalle del pago
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle del pago", 12, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Concepto: ${datos.concepto}`, 14, y);
  y += 5;
  doc.text(`Monto: S/ ${datos.monto.toFixed(2)}`, 14, y);
  y += 5;
  doc.text(`Fecha de pago: ${datos.fechaPago}`, 14, y);
  y += 5;
  doc.text(`Método de pago: ${datos.metodo}`, 14, y);
  y += 10;

  // Pie
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("Este comprobante es generado automáticamente por el sistema.", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.text(`Generado el ${new Date().toLocaleDateString("es-PE")}`, pageWidth / 2, y, { align: "center" });

  // Descargar
  doc.save(`comprobante_${datos.concepto.replace(/\s+/g, "_")}.pdf`);
}