import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Banknote,
  CheckCircle2,
  ExternalLink,
  Loader2,
  QrCode,
  Save,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';

const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const textAreaClass =
  'min-h-[96px] w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-accent-300 focus:bg-white focus:ring-4 focus:ring-accent-100';

const emptyForm = {
  nombre_destinatario: '',
  numero_yape: '',
  numero_plin: '',
  banco_1: '',
  cuenta_1: '',
  cci_1: '',
  banco_2: '',
  cuenta_2: '',
  cci_2: '',
  qr_yape_url: '',
  qr_plin_url: '',
  instrucciones: 'Coloca el código de pago en la descripción del Yape, Plin o transferencia.',
  activo: true,
};

export default function DatosCobroPage() {
  const { token } = useAuth();
  const { queryString, scopeLabel } = useSchool();
  const { showToast } = useToast();

  const [form, setForm] = useState<any>(emptyForm);
  const [colegio, setColegio] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const update = (field: string, value: string | boolean) => {
    setForm((current: any) => ({ ...current, [field]: value }));
  };

  const fetchDatos = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const res = await axios.get(`/api/tesoreria/datos-cobro${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setColegio(res.data?.colegio || null);
      setForm({ ...emptyForm, ...(res.data?.datos_cobro || {}) });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se cargaron datos',
        message: error.response?.data?.message || 'No se pudieron cargar los datos de cobro.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryString]);

  const save = async () => {
    if (!token) return;

    if (!form.nombre_destinatario?.trim()) {
      showToast({
        type: 'warning',
        title: 'Falta destinatario',
        message: 'Ingresa el nombre de la persona o institución que recibirá el pago.',
      });
      return;
    }

    setSaving(true);

    try {
      const res = await axios.put(`/api/tesoreria/datos-cobro${queryString}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast({
        type: 'success',
        title: 'Datos guardados',
        message: res.data?.message || 'Los datos de cobro fueron actualizados.',
      });

      await fetchDatos();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'No se guardó',
        message: error.response?.data?.message || 'No se pudieron guardar los datos.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-500" size={34} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-page-soft">
      <PageHeader
        eyebrow="Tesorería"
        title="Datos para cobrar"
        description="Configura el destinatario, números, QR y cuentas que verán los padres al consultar sus pagos."
        icon={WalletCards}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Visible para padres', value: form.activo ? 'Sí' : 'No' },
        ]}
      />

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
        <div className="grid gap-3 md:grid-cols-3">
          <Guide icon={Smartphone} title="Yape / Plin" text="Coloca el número y el nombre exacto del destinatario." />
          <Guide icon={QrCode} title="QR de pago" text="Pega una URL pública de imagen del QR. Luego podemos agregar subida directa." />
          <Guide icon={Banknote} title="Cuentas bancarias" text="Agrega cuenta y CCI para transferencias." />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card title="Destinatario" icon={WalletCards}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del destinatario" value={form.nombre_destinatario || ''} onChange={(value) => update('nombre_destinatario', value)} placeholder="Ej. Juan Pérez Ramírez" />

              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Estado
                </p>
                <button
                  type="button"
                  onClick={() => update('activo', !form.activo)}
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black ring-1 transition ${
                    form.activo
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-slate-50 text-slate-600 ring-slate-100'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  {form.activo ? 'Visible para padres' : 'Oculto para padres'}
                </button>
              </div>
            </div>
          </Card>

          <Card title="Yape y Plin" icon={Smartphone}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Número Yape" value={form.numero_yape || ''} onChange={(value) => update('numero_yape', value)} placeholder="999888777" />
              <Field label="Número Plin" value={form.numero_plin || ''} onChange={(value) => update('numero_plin', value)} placeholder="999888777" />
              <Field label="URL QR Yape" value={form.qr_yape_url || ''} onChange={(value) => update('qr_yape_url', value)} placeholder="https://..." />
              <Field label="URL QR Plin" value={form.qr_plin_url || ''} onChange={(value) => update('qr_plin_url', value)} placeholder="https://..." />
            </div>
          </Card>

          <Card title="Cuenta bancaria 1" icon={Banknote}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Banco" value={form.banco_1 || ''} onChange={(value) => update('banco_1', value)} placeholder="BCP" />
              <Field label="Cuenta" value={form.cuenta_1 || ''} onChange={(value) => update('cuenta_1', value)} placeholder="123456789" />
              <Field label="CCI" value={form.cci_1 || ''} onChange={(value) => update('cci_1', value)} placeholder="002..." />
            </div>
          </Card>

          <Card title="Cuenta bancaria 2" icon={Banknote}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Banco" value={form.banco_2 || ''} onChange={(value) => update('banco_2', value)} placeholder="Interbank" />
              <Field label="Cuenta" value={form.cuenta_2 || ''} onChange={(value) => update('cuenta_2', value)} placeholder="123456789" />
              <Field label="CCI" value={form.cci_2 || ''} onChange={(value) => update('cci_2', value)} placeholder="003..." />
            </div>
          </Card>

          <Card title="Instrucciones para padres" icon={QrCode}>
            <textarea
              className={textAreaClass}
              value={form.instrucciones || ''}
              onChange={(event) => update('instrucciones', event.target.value)}
              placeholder="Coloca el código de pago en la descripción..."
            />
          </Card>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar datos de cobro
            </button>
          </div>
        </div>

        <aside>
          <div className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Vista para padres
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950">
              {colegio?.nombre_corto || colegio?.nombre || 'Colegio'}
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Así se mostrarán los datos en la página pública de pago.
            </p>

            <Preview label="Destinatario" value={form.nombre_destinatario || 'Sin destinatario'} />

            {(form.numero_yape || form.numero_plin) && (
              <div className="mt-3 rounded-3xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">
                  Yape / Plin
                </p>
                {form.numero_yape && <p className="mt-2 text-sm font-black">Yape: {form.numero_yape}</p>}
                {form.numero_plin && <p className="mt-1 text-sm font-black">Plin: {form.numero_plin}</p>}
              </div>
            )}

            {form.qr_yape_url && (
              <div className="mt-3 rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  QR Yape
                </p>
                <img src={form.qr_yape_url} alt="QR Yape" className="mx-auto max-h-56 rounded-2xl object-contain" />
              </div>
            )}

            {(form.banco_1 || form.cuenta_1 || form.cci_1) && (
              <div className="mt-3 rounded-3xl bg-sky-50 p-4 text-sky-800 ring-1 ring-sky-100">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">
                  Transferencia
                </p>
                <p className="mt-2 text-sm font-black">{form.banco_1 || 'Banco'}</p>
                {form.cuenta_1 && <p className="mt-1 text-sm font-bold">Cuenta: {form.cuenta_1}</p>}
                {form.cci_1 && <p className="mt-1 text-sm font-bold">CCI: {form.cci_1}</p>}
              </div>
            )}

            {(form.banco_2 || form.cuenta_2 || form.cci_2) && (
              <div className="mt-3 rounded-3xl bg-indigo-50 p-4 text-indigo-800 ring-1 ring-indigo-100">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-70">
                  Segunda cuenta
                </p>
                <p className="mt-2 text-sm font-black">{form.banco_2 || 'Banco'}</p>
                {form.cuenta_2 && <p className="mt-1 text-sm font-bold">Cuenta: {form.cuenta_2}</p>}
                {form.cci_2 && <p className="mt-1 text-sm font-bold">CCI: {form.cci_2}</p>}
              </div>
            )}

            <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-100">
              <p className="text-sm font-black">Instrucción</p>
              <p className="mt-1 text-sm font-bold leading-6">
                {form.instrucciones || 'Coloca el código de pago en la descripción.'}
              </p>
            </div>

            <a
              href="/pago/SMV-PG-2025-000003"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <ExternalLink size={16} />
              Abrir ejemplo público
            </a>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Guide({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-accent-600 ring-1 ring-slate-100">
        <Icon size={16} />
      </div>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/80">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
          <Icon size={17} />
        </div>
        <h2 className="text-base font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-slate-900">{value}</p>
    </div>
  );
}