import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock,
  HeartPulse,
  MessageSquareHeart,
  ShieldCheck,
  Sparkles,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSchool } from '../contexts/SchoolContext';

interface ModuloPendientePageProps {
  modulo: string;
  descripcion: string;
  icon?: LucideIcon;
  acciones?: string[];
  estado?: string;
}

const defaultAcciones = [
  'Diseñar flujo principal del módulo',
  'Conectar datos por institución o sede',
  'Definir permisos por rol',
];

export default function ModuloPendientePage({
  modulo,
  descripcion,
  icon: Icon = Sparkles,
  acciones = defaultAcciones,
  estado = 'Módulo reservado',
}: ModuloPendientePageProps) {
  const { scopeLabel } = useSchool();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Módulo del sistema"
        title={modulo}
        description={descripcion}
        icon={Icon}
        meta={[
          { label: 'Contexto activo', value: scopeLabel },
          { label: 'Estado', value: estado },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
            <Icon size={22} />
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-950">
            Esta pantalla está preparada para la siguiente etapa
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            La ruta ya existe dentro del ERP para que la navegación no se rompa.
            En el siguiente bloque se podrá conectar con su propia lógica, permisos,
            filtros por institución y acciones principales.
          </p>

          <div className="mt-6 grid gap-3">
            {acciones.map((accion, index) => (
              <div key={accion} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-500 ring-1 ring-slate-100">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-black text-slate-800">{accion}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400">
                    Se implementará respetando tenant, institución activa, módulos contratados y rol del usuario.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-100 bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-accent-300">
            <ShieldCheck size={20} />
          </div>

          <h3 className="mt-5 text-lg font-black">Pensado para SaaS multi-institución</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Este módulo se activará por cliente, institución o plan contratado.
            Así el sistema puede adaptarse a colegios, institutos, academias o grupos educativos.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white/75">
            <p className="font-black text-white">Próxima decisión</p>
            <p className="mt-1 leading-6">Definir si este módulo será incluido en el plan base o si funcionará como módulo adicional.</p>
          </div>

          <button type="button" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950">
            Continuar planificación
            <ArrowRight size={16} />
          </button>
        </aside>
      </section>
    </div>
  );
}

export const moduloIcons = {
  calendario: CalendarDays,
  horario: Clock,
  staff: UserCircle,
  citas: MessageSquareHeart,
  enfermeria: HeartPulse,
  notificaciones: Bell,
  comentarios: MessageSquareHeart,
};
