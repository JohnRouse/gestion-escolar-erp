import { useSearchParams } from 'react-router-dom';
import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  CreditCard,
  GraduationCap,
  Layers3,
  ListChecks,
  Settings,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import NivelesGradosTab from './NivelesGradosTab';
import SeccionesTab from './SeccionesTab';
import CursosTab from './CursosTab';
import ConceptosPagoTab from './ConceptosPagoTab';
import EscalaTab from './EscalaTab';
import TiposEvalTab from './TiposEvalTab';
import AniosLectivosTab from './AniosLectivosTab';

const TABS = [
  { key: 'anios', label: 'Años lectivos', icon: CalendarDays },
  { key: 'niveles', label: 'Niveles y Grados', icon: GraduationCap },
  { key: 'secciones', label: 'Secciones', icon: Building2 },
  { key: 'cursos', label: 'Cursos y Áreas', icon: BookOpenCheck },
  { key: 'pagos', label: 'Conceptos de Pago', icon: CreditCard },
  { key: 'escala', label: 'Escala de Calificación', icon: Layers3 },
  { key: 'tipos', label: 'Tipos de Evaluación', icon: ListChecks },
];

export default function ConfiguracionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabActivo = searchParams.get('tab') || 'anios';

  const setTab = (key: string) => {
    setSearchParams({ tab: key });
  };

  const tabActual = TABS.find((tab) => tab.key === tabActivo) || TABS[0];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Centro de configuración"
        title="Configuración"
        description="Administra la estructura académica, reglas de calificación y conceptos de pago del sistema."
        icon={Settings}
        meta={[
          {
            label: 'Módulo activo',
            value: tabActual.label,
          },
        ]}
      />

      <section className="overflow-hidden rounded-[30px] border border-white bg-white/90 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tabActivo === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition-all ${
                    active
                      ? 'bg-accent-500 text-white shadow-sm shadow-accent-500/25'
                      : 'bg-slate-50 text-slate-500 ring-1 ring-slate-100 hover:bg-white hover:text-slate-800 hover:shadow-sm'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          {tabActivo === 'anios' && <AniosLectivosTab />}
          {tabActivo === 'niveles' && <NivelesGradosTab />}
          {tabActivo === 'secciones' && <SeccionesTab />}
          {tabActivo === 'cursos' && <CursosTab />}
          {tabActivo === 'pagos' && <ConceptosPagoTab />}
          {tabActivo === 'escala' && <EscalaTab />}
          {tabActivo === 'tipos' && <TiposEvalTab />}
        </div>
      </section>
    </div>
  );
}