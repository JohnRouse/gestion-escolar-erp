import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import NivelesGradosTab from './NivelesGradosTab';
import SeccionesTab from './SeccionesTab';
import CursosTab from './CursosTab';
import ConceptosPagoTab from './ConceptosPagoTab';
import EscalaTab from './EscalaTab';
import TiposEvalTab from './TiposEvalTab';

const TABS = [
  { key: 'niveles', label: 'Niveles y Grados' },
  { key: 'secciones', label: 'Secciones' },
  { key: 'cursos', label: 'Cursos y Áreas' },
  { key: 'pagos', label: 'Conceptos de Pago' },
  { key: 'escala', label: 'Escala de Calificación' },
  { key: 'tipos', label: 'Tipos de Evaluación' },
];

export default function ConfiguracionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabActivo = searchParams.get('tab') || 'niveles';

  const setTab = (key: string) => {
    setSearchParams({ tab: key });
  };

  return (
    <div className="animate-slide-in-right">
      <h2 className="section-title mb-6">Configuración</h2>

      {/* Pestañas */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tabActivo === t.key
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido de la pestaña */}
      {tabActivo === 'niveles' && <NivelesGradosTab />}
      {tabActivo === 'secciones' && <SeccionesTab />}
      {tabActivo === 'cursos' && <CursosTab />}
      {tabActivo === 'pagos' && <ConceptosPagoTab />}
      {tabActivo === 'escala' && <EscalaTab />}
      {tabActivo === 'tipos' && <TiposEvalTab />}
    </div>
  );
}