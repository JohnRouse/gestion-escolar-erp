import { X, Printer, ReceiptText } from 'lucide-react';

const formatMoney = (value: number | string | null | undefined) =>
  `S/ ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fullName = (persona?: {
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
} | null) =>
  persona
    ? `${persona.nombres || ''} ${persona.apellido_paterno || ''} ${
        persona.apellido_materno || ''
      }`.trim()
    : '—';

export default function ComprobantePagoModal({
  comprobante,
  onClose,
}: {
  comprobante: any;
  onClose: () => void;
}) {
  if (!comprobante) return null;

  const alumno = fullName(comprobante.alumno);
  const apoderado = fullName(comprobante.apoderado);
  const cajero =
    comprobante.cajero?.persona
      ? fullName(comprobante.cajero.persona)
      : comprobante.cajero?.username || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm print:static print:block print:bg-white print:px-0">
      <div className="w-full max-w-2xl animate-modal-pop rounded-[30px] bg-white p-6 shadow-2xl shadow-slate-950/20 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-5 flex items-start justify-between gap-4 print:hidden">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <ReceiptText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Comprobante de pago</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Puedes imprimirlo o guardarlo como PDF desde el navegador.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div id="comprobante-pago" className="rounded-[26px] border border-slate-200 p-6 print:rounded-none print:border-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {comprobante.colegio?.nombre || comprobante.colegio?.nombre_corto || 'Colegio'}
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">
                Comprobante de pago
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {comprobante.codigo_comprobante}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right text-emerald-700 ring-1 ring-emerald-100">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
                Pagado
              </p>
              <p className="mt-1 text-xl font-black">
                {formatMoney(comprobante.pago?.monto_pagado)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info label="Alumno" value={alumno} />
            <Info label="Apoderado" value={apoderado} />
            <Info label="Concepto" value={comprobante.deuda?.concepto?.nombre_concepto || '—'} />
            <Info label="Código de pago" value={comprobante.deuda?.referencia_pago || '—'} />
            <Info label="Matrícula" value={comprobante.matricula?.codigo_matricula || '—'} />
            <Info label="Fecha de pago" value={formatDateTime(comprobante.pago?.fecha_pago)} />
            <Info label="Medio de pago" value={comprobante.pago?.metodo_pago || '—'} />
            <Info label="N.º operación" value={comprobante.pago?.nro_operacion || '—'} />
            <Info label="Recibido por" value={cajero} />
            <Info label="Estado deuda" value={comprobante.deuda?.estado_pago || '—'} />
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div className="grid gap-3 sm:grid-cols-3">
              <Mini label="Total deuda" value={formatMoney(comprobante.deuda?.monto_total)} />
              <Mini label="Total pagado" value={formatMoney(comprobante.deuda?.total_pagado)} />
              <Mini label="Saldo" value={formatMoney(comprobante.deuda?.saldo)} />
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-semibold leading-5 text-slate-400">
            Este comprobante fue generado por el sistema de gestión escolar.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Printer size={16} />
            Imprimir / guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-slate-900">{value}</p>
    </div>
  );
}
