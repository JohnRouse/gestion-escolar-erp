import { useEffect, useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import { useToast } from '../../contexts/ToastContext';
import { staffApi, staffError, type StaffItem } from './staffApi';
import StaffForm from './StaffForm';

export default function StaffPage() {
  const { token, user } = useAuth();
  const { activeScope, queryParams, scopeLabel } = useSchool();
  // Remount on scope changes to discard stale results and any open draft.
  return <StaffContent key={`${activeScope.id_tenant}:${JSON.stringify(queryParams)}`} token={token} rol={user?.rol ?? ''} scopeLabel={scopeLabel} />;
}
function StaffContent({ token, rol, scopeLabel }: { token: string | null; rol: string; scopeLabel: string }) {
  const { activeScope, tenant, queryParams, colegios } = useSchool();
  const { showToast } = useToast();
  const api = useMemo(() => staffApi(token, { ...queryParams, tenant_id: activeScope.id_tenant ?? tenant?.id_tenant ?? 0 }), [token, queryParams, activeScope.id_tenant, tenant?.id_tenant]);
  const [q, setQ] = useState('');
  const [citas, setCitas] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ data: StaffItem[]; meta: { total: number; totalPages: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ item: StaffItem | null } | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const allowedSchools = colegios.filter(c => c.id_tenant === (activeScope.id_tenant ?? tenant?.id_tenant) && ['Admin', 'Director'].includes(c.rol_colegio ?? '') && (activeScope.tipo === 'todos' || c.id_colegio === activeScope.id_colegio));
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      api.list(q, citas, page, controller.signal).then(data => {
        if (!controller.signal.aborted) setResult(data);
      }).catch(e => {
        if (!controller.signal.aborted) setError(staffError(e));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [api, q, citas, page, reload]);
  async function edit(item: StaffItem) {
    setDetailBusy(true);
    try { setForm({ item: await api.detail(item.id_staff) }); }
    catch (e) { showToast({ type: 'error', message: staffError(e) }); }
    finally { setDetailBusy(false); }
  }
  return <div className="space-y-6">
    <PageHeader eyebrow="Personal" title="Staff institucional" description="Gestiona colaboradores, datos institucionales y acceso interno." icon={Users} meta={[{ label: 'Alcance', value: scopeLabel }]} actions={<button className="btn btn-primary" disabled={!allowedSchools.length} onClick={() => setForm({ item: null })}><Plus size={18} />Nuevo miembro</button>} />
    <section className="card p-4 space-y-4" aria-label="Directorio de Staff">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
        <label className="flex-1">Buscar Staff<input className="input" type="search" placeholder="Nombre, DNI, cargo o área" value={q} maxLength={100} onChange={e => { setQ(e.target.value); setPage(1); setLoading(true); }} /></label>
        <label>Citas<select className="input" value={citas} onChange={e => { setCitas(e.target.value); setPage(1); setLoading(true); }}><option value="">Todos</option><option value="si">Permite citas</option><option value="no">No permite citas</option></select></label>
      </div>
      {loading ? <div role="status" aria-label="Cargando Staff" className="space-y-3 min-h-48"><p>Cargando Staff…</p>{[1, 2, 3].map(n => <div key={n} className="h-12 bg-slate-100 animate-pulse motion-reduce:animate-none" />)}</div>
        : error ? <div role="alert"><p>{error}</p><button className="btn btn-secondary mt-3" onClick={() => setReload(n => n + 1)}>Reintentar</button></div>
        : !result?.data.length ? <p role="status" className="py-8">{q || citas ? 'No hay resultados para estos filtros.' : 'No hay miembros de Staff en este alcance.'}</p>
        : <>
          <ul className="divide-y divide-slate-200">
            {result.data.map(item => <li key={item.id_staff} className="py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1 break-words">
                <h2 className="font-semibold">{item.persona.nombres} {item.persona.apellido_paterno} {item.persona.apellido_materno}</h2>
                <p className="text-sm">DNI {item.persona.dni} · {item.cargo} · {item.area}</p>
                {activeScope.tipo === 'todos' && <p className="text-sm text-slate-600">{item.colegio?.nombre ?? item.seccion?.colegio?.nombre}</p>}
                <p className="text-sm">{item.permite_citas ? 'Permite citas' : 'No permite citas'}{item.es_tutor ? ' · Tutor asignado' : ''}</p>
              </div>
              <button className="btn btn-secondary shrink-0" disabled={detailBusy} aria-label={`Editar ${item.persona.nombres} ${item.persona.apellido_paterno}`} onClick={() => void edit(item)}>Editar</button>
            </li>)}
          </ul>
          <nav aria-label="Paginación Staff" className="flex flex-wrap gap-3 items-center justify-between">
            <span className="text-sm">{result.meta.total} miembros · Página {page} de {Math.max(1, result.meta.totalPages)}</span>
            <div className="flex gap-2"><button className="btn btn-secondary" disabled={page <= 1} onClick={() => { setPage(n => n - 1); setLoading(true); }}>Anterior</button><button className="btn btn-secondary" disabled={page >= result.meta.totalPages} onClick={() => { setPage(n => n + 1); setLoading(true); }}>Siguiente</button></div>
          </nav>
        </>}
    </section>
    {form && <StaffForm item={form.item} api={api} rol={rol} colegios={allowedSchools} defaultColegio={activeScope.tipo === 'colegio' ? activeScope.id_colegio : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); setReload(n => n + 1); setLoading(true); }} />}
  </div>;
}
