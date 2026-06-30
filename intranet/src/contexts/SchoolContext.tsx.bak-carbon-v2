import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth, type ColegioSaas, type TenantSaas } from './AuthContext';

export type SchoolScope = {
  tipo: 'todos' | 'colegio';
  id_tenant?: number | null;
  id_colegio?: number | null;
};

interface SchoolContextType {
  tenant: TenantSaas | null;
  colegios: ColegioSaas[];
  puedeVerConsolidado: boolean;
  activeScope: SchoolScope;
  activeColegio: ColegioSaas | null;
  setActiveScope: (scope: SchoolScope) => void;
  setColegioActivo: (idColegio: number) => void;
  setTodosLosColegios: () => void;
  queryParams: Record<string, string | number>;
  queryString: string;
  scopeLabel: string;
}

const SchoolContext = createContext<SchoolContextType | null>(null);

const STORAGE_KEY = 'school_context_intranet';

function readStoredScope(): SchoolScope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (parsed?.tipo === 'todos' || parsed?.tipo === 'colegio') {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function buildDefaultScope(
  tenant: TenantSaas | null,
  colegios: ColegioSaas[],
  puedeVerConsolidado: boolean,
  contextoDefault?: SchoolScope,
): SchoolScope {
  if (contextoDefault?.tipo) {
    return {
      tipo: contextoDefault.tipo,
      id_tenant: contextoDefault.id_tenant ?? tenant?.id_tenant ?? null,
      id_colegio: contextoDefault.id_colegio ?? null,
    };
  }

  if (puedeVerConsolidado && colegios.length > 1) {
    return {
      tipo: 'todos',
      id_tenant: tenant?.id_tenant ?? colegios[0]?.id_tenant ?? null,
      id_colegio: null,
    };
  }

  return {
    tipo: 'colegio',
    id_tenant: tenant?.id_tenant ?? colegios[0]?.id_tenant ?? null,
    id_colegio: colegios[0]?.id_colegio ?? null,
  };
}

function isScopeValid(
  scope: SchoolScope,
  colegios: ColegioSaas[],
  puedeVerConsolidado: boolean,
) {
  if (scope.tipo === 'todos') {
    return puedeVerConsolidado && colegios.length > 1;
  }

  if (scope.tipo === 'colegio') {
    return colegios.some((colegio) => colegio.id_colegio === scope.id_colegio);
  }

  return false;
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const saas = user?.contexto?.saas;
  const tenant = saas?.tenant ?? null;
  const colegios = saas?.colegios ?? [];
  const puedeVerConsolidado = Boolean(saas?.puedeVerConsolidado);

  const defaultScope = useMemo(
    () =>
      buildDefaultScope(
        tenant,
        colegios,
        puedeVerConsolidado,
        saas?.contexto_default as SchoolScope | undefined,
      ),
    [tenant, colegios, puedeVerConsolidado, saas?.contexto_default],
  );

  const [activeScope, setActiveScopeState] = useState<SchoolScope>(() => {
    const stored = readStoredScope();
    return stored || defaultScope;
  });

  useEffect(() => {
    const stored = readStoredScope();

    if (stored && isScopeValid(stored, colegios, puedeVerConsolidado)) {
      setActiveScopeState(stored);
      return;
    }

    setActiveScopeState(defaultScope);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultScope));
  }, [defaultScope, colegios, puedeVerConsolidado]);

  const setActiveScope = (scope: SchoolScope) => {
    if (!isScopeValid(scope, colegios, puedeVerConsolidado)) {
      setActiveScopeState(defaultScope);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultScope));
      return;
    }

    const normalized: SchoolScope =
      scope.tipo === 'todos'
        ? {
            tipo: 'todos',
            id_tenant: tenant?.id_tenant ?? scope.id_tenant ?? null,
            id_colegio: null,
          }
        : {
            tipo: 'colegio',
            id_tenant: tenant?.id_tenant ?? scope.id_tenant ?? null,
            id_colegio: scope.id_colegio ?? null,
          };

    setActiveScopeState(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  };

  const setColegioActivo = (idColegio: number) => {
    const colegio = colegios.find((item) => item.id_colegio === idColegio);
    if (!colegio) return;

    setActiveScope({
      tipo: 'colegio',
      id_tenant: colegio.id_tenant,
      id_colegio: colegio.id_colegio,
    });
  };

  const setTodosLosColegios = () => {
    if (!puedeVerConsolidado) return;

    setActiveScope({
      tipo: 'todos',
      id_tenant: tenant?.id_tenant ?? colegios[0]?.id_tenant ?? null,
      id_colegio: null,
    });
  };

  const activeColegio = useMemo(() => {
    if (activeScope.tipo !== 'colegio') return null;

    return (
      colegios.find((colegio) => colegio.id_colegio === activeScope.id_colegio) ||
      null
    );
  }, [activeScope, colegios]);

  const queryParams = useMemo(() => {
    if (activeScope.tipo === 'todos') {
      return {
        scope: 'all',
      };
    }

    if (activeScope.id_colegio) {
      return {
        colegio_id: activeScope.id_colegio,
      };
    }

    return {};
  }, [activeScope]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      params.set(key, String(value));
    });

    const value = params.toString();
    return value ? `?${value}` : '';
  }, [queryParams]);

  const scopeLabel =
    activeScope.tipo === 'todos'
      ? 'Todos los colegios'
      : activeColegio?.nombre_corto || activeColegio?.nombre || 'Colegio';

  return (
    <SchoolContext.Provider
      value={{
        tenant,
        colegios,
        puedeVerConsolidado,
        activeScope,
        activeColegio,
        setActiveScope,
        setColegioActivo,
        setTodosLosColegios,
        queryParams,
        queryString,
        scopeLabel,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (!context) throw new Error('useSchool debe usarse dentro de SchoolProvider');
  return context;
}