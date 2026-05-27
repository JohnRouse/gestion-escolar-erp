import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpenCheck,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  Layers3,
  ReceiptText,
  Settings,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import NivelesGradosTab from './NivelesGradosTab';
import SeccionesTab from './SeccionesTab';
import CursosTab from './CursosTab';
import ConceptosPagoTab from './ConceptosPagoTab';
import EscalaTab from './EscalaTab';
import TiposEvalTab from './TiposEvalTab';
import PlantillasTab from './PlantillasTab';
import { ClipboardList, FileText } from 'lucide-react';

const TABS = [
  {
    key: 'niveles',
    label: 'Niveles y Grados',
    shortLabel: 'Niveles',
    description: 'Estructura académica base del colegio.',
    icon: GraduationCap,
  },
  {
    key: 'secciones',
    label: 'Secciones',
    shortLabel: 'Secciones',
    description: 'Aulas, capacidad y grupos por grado.',
    icon: UsersRound,
  },
  {
    key: 'cursos',
    label: 'Cursos y Áreas',
    shortLabel: 'Cursos',
    description: 'Áreas curriculares y cursos asociados.',
    icon: BookOpenCheck,
  },
  {
    key: 'pagos',
    label: 'Conceptos de Pago',
    shortLabel: 'Pagos',
    description: 'Pensiones, matrículas y cobros recurrentes.',
    icon: ReceiptText,
  },
  {
    key: 'escala',
    label: 'Escala de Calificación',
    shortLabel: 'Escala',
    description: 'Rangos de notas y nota aprobatoria.',
    icon: Gauge,
  },
  {
    key: 'tipos',
    label: 'Tipos de Evaluación',
    shortLabel: 'Evaluaciones',
    description: 'Categorías usadas en el registro de notas.',
    icon: ClipboardCheck,
  },
  { key: 'plantillas', label: 'Plantillas de Evaluación', shortLabel: 'Plantillas', icon: ClipboardList },
];

export default function ConfiguracionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabActivo = searchParams.get('tab') || 'niveles';

  const activeTab = useMemo(
    () => TABS.find((tab) => tab.key === tabActivo) || TABS[0],
    [tabActivo]
  );
  const ActiveTabIcon = activeTab.icon;

  const setTab = (key: string) => {
    setSearchParams({ tab: key });
  };

  return (
    <div className="animate-slide-in-right space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-gray-200/70 bg-white/85 p-5 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-accent-100/50 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-100 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-600">
              <Settings size={14} /> Centro de configuración
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-3xl">
              Configuración
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Administra la estructura académica, las reglas de calificación y los conceptos de pago desde un panel más ordenado y fácil de mantener.
            </p>
          </div>

          <div className="hidden rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm lg:block">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Módulo activo</p>
                <p className="text-sm font-semibold text-gray-900">{activeTab.label}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="rounded-[1.75rem] border border-gray-200/70 bg-white/80 p-2 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tabActivo === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTab(tab.key)}
                className={`group flex min-w-max items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-accent-500 text-white shadow-[0_14px_35px_-20px_rgba(76,110,245,0.95)]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon
                  size={17}
                  className={active ? 'text-white' : 'text-gray-400 group-hover:text-accent-500'}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <section className="rounded-[2rem] border border-gray-200/70 bg-white/75 p-4 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.48)] backdrop-blur-xl sm:p-6">
        <div className="mb-6 flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-accent-600 ring-1 ring-gray-200/70">
              <ActiveTabIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-gray-950">{activeTab.label}</h2>
              <p className="mt-1 text-sm text-gray-500">{activeTab.description}</p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm">
            Configuración institucional
          </span>
        </div>

        {tabActivo === 'niveles' && <NivelesGradosTab />}
        {tabActivo === 'secciones' && <SeccionesTab />}
        {tabActivo === 'cursos' && <CursosTab />}
        {tabActivo === 'pagos' && <ConceptosPagoTab />}
        {tabActivo === 'escala' && <EscalaTab />}
        {tabActivo === 'tipos' && <TiposEvalTab />}
        {tabActivo === 'plantillas' && <PlantillasTab />}
      </section>
    </div>
  );
}
