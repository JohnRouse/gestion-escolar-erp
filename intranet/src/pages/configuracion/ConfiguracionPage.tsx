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
  ClipboardCheck,
  ClipboardList,
  UserRoundCheck,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useSchool } from '../../contexts/SchoolContext';
import NivelesGradosTab from './NivelesGradosTab';
import SeccionesTab from './SeccionesTab';
import CursosTab from './CursosTab';
import ConceptosPagoTab from './ConceptosPagoTab';
import EscalaTab from './EscalaTab';
import TiposEvalTab from './TiposEvalTab';
import AniosLectivosTab from './AniosLectivosTab';
import PeriodosUnidadesTab from './PeriodosUnidadesTab';
import PlantillasEvaluacionTab from './PlantillasEvaluacionTab';
import AsignacionesDocentesTab from './AsignacionesDocentesTab';
import CriteriosTutoriaTab from './CriteriosTutoriaTab';
import CabeceraLibretaTab from './CabeceraLibretaTab';
import PreparacionAnioTab from './PreparacionAnioTab';

const CONFIG_GROUPS = [
  { key: 'tiempo', label: 'Tiempo académico' },
  { key: 'estructura', label: 'Estructura académica' },
  { key: 'evaluacion', label: 'Evaluación y notas' },
  { key: 'finanzas', label: 'Finanzas' },
] as const;

const TABS = [
  { key: 'anios', label: 'Años lectivos', icon: CalendarDays, group: 'tiempo' },
  { key: 'periodos', label: 'Periodos y unidades', icon: CalendarDays, group: 'tiempo' },
  { key: 'preparacion', label: 'Preparación del año', icon: ClipboardCheck, group: 'tiempo' },
  { key: 'niveles', label: 'Niveles y Grados', icon: GraduationCap, group: 'estructura' },
  { key: 'secciones', label: 'Secciones', icon: Building2, group: 'estructura' },
  { key: 'cursos', label: 'Cursos y Áreas', icon: BookOpenCheck, group: 'estructura' },
  { key: 'asignaciones', label: 'Asignaciones docentes', icon: UserRoundCheck, group: 'estructura' },
  { key: 'escala', label: 'Escala de Calificación', icon: Layers3, group: 'evaluacion' },
  { key: 'tipos', label: 'Tipos de Evaluación', icon: ListChecks, group: 'evaluacion' },
  { key: 'plantillas', label: 'Plantillas de Evaluación', icon: ClipboardList, group: 'evaluacion' },
  { key: 'criterios-tutoria', label: 'Criterios de Tutoría', icon: ShieldCheck, group: 'evaluacion' },
  { key: 'cabecera-libreta', label: 'Cabecera de Libreta', icon: FileText, group: 'evaluacion' },
  { key: 'pagos', label: 'Conceptos de Pago', icon: CreditCard, group: 'finanzas' },
];

export default function ConfiguracionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeScope, scopeLabel } = useSchool();

  const tabActivo = searchParams.get('tab') || 'anios';

  const contextKey =
    activeScope.tipo === 'colegio'
      ? `colegio-${activeScope.id_colegio}`
      : 'todos';

  const setTab = (key: string) => {
    setSearchParams({ tab: key });
  };

  const tabActual = TABS.find((tab) => tab.key === tabActivo) || TABS[0];
  const grupoActivo = tabActual.group;

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
          {
            label: 'Contexto',
            value: scopeLabel,
          },
        ]}
      />

      <section className="overflow-hidden rounded-[30px] border border-white bg-white/90 shadow-sm shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 pt-4">
          {/* Categorías principales */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CONFIG_GROUPS.map((group) => {
              const active = grupoActivo === group.key;
              const firstTab = TABS.find((tab) => tab.group === group.key);

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => firstTab && setTab(firstTab.key)}
                  className={`inline-flex h-9 shrink-0 items-center rounded-2xl px-3 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 ${
                    active
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-400 ring-1 ring-slate-100 hover:bg-white hover:text-slate-700'
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>

          {/* Pestañas del grupo activo */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {TABS.filter((tab) => tab.group === grupoActivo).map((tab) => {
              const Icon = tab.icon;
              const active = tabActivo === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition-all duration-200 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'bg-slate-50 text-slate-500 ring-1 ring-slate-100 hover:-translate-y-0.5 hover:bg-white hover:text-slate-800 hover:shadow-sm'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div key={`${contextKey}-${tabActivo}`} className="config-tab-content p-5">
          {tabActivo === 'anios' && <AniosLectivosTab />}
          {tabActivo === 'periodos' && <PeriodosUnidadesTab />}
          {tabActivo === 'preparacion' && <PreparacionAnioTab />}
          {tabActivo === 'niveles' && <NivelesGradosTab />}
          {tabActivo === 'secciones' && <SeccionesTab />}
          {tabActivo === 'cursos' && <CursosTab />}
          {tabActivo === 'asignaciones' && <AsignacionesDocentesTab />}
          {tabActivo === 'pagos' && <ConceptosPagoTab />}
          {tabActivo === 'escala' && <EscalaTab />}
          {tabActivo === 'tipos' && <TiposEvalTab />}
          {tabActivo === 'plantillas' && <PlantillasEvaluacionTab />}
          {tabActivo === 'criterios-tutoria' && <CriteriosTutoriaTab />}
          {tabActivo === 'cabecera-libreta' && <CabeceraLibretaTab />}
        </div>
      </section>
    </div>
  );
}