import { StrictMode, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import ConfirmDialog from '../../src/components/ConfirmDialog';
import CenteredFormModal from '../../src/components/CenteredFormModal';
import AccessibleDialog from '../../src/components/AccessibleDialog';
import '../../src/index.css';

export default function Fixture() {
  const [form, setForm] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [parent, setParent] = useState(false);
  const [child, setChild] = useState(false);
  const [third, setThird] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [escape, setEscape] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const record = (name: string) => setEvents((previous) => [...previous, name]);
  return <main>
    <button id="launch" onClick={() => setParent(true)}>Abrir padre</button>
    <button id="outside">Control externo</button>
    <button id="open-form" onClick={() => setForm(true)}>Abrir formulario</button>
    <output id="events">{events.join(',')}</output>
    <AccessibleDialog open={parent} title="Padre" onClose={() => { record('padre'); setParent(false); }}>
      <button id="open-child" onClick={() => setChild(true)}>Abrir hijo</button>
      <button id="parent-last">Último del padre</button>
    </AccessibleDialog>
    <AccessibleDialog open={child} title="Hijo" preventClose={blocked} closeOnEscape={escape} showCloseButton={!empty}
      onClose={() => { record('hijo'); flushSync(() => setChild(false)); }}>
      {!empty && <div className="flex flex-wrap gap-3 [&>button]:rounded-lg [&>button]:border [&>button]:border-slate-300 [&>button]:px-3 [&>button]:py-2">
        <button id="child-first" onClick={() => setBlocked(!blocked)}>Alternar bloqueo</button>
        <button onClick={() => setEscape(!escape)}>Alternar Escape</button>
        <button onClick={() => setEmpty(true)}>Sin controles</button>
        <button onClick={() => setThird(true)}>Abrir tercero</button>
        <button onClick={() => setParent(false)}>Desmontar padre</button>
        <button onClick={() => setParent(true)}>Reabrir padre</button>
        <button onClick={() => { setChild(false); setParent(false); }}>Cerrar todos</button>
        <button disabled>No disponible</button>
        <button hidden>Oculto</button>
        <button id="child-last" onClick={() => setChild(false)}>Cancelar hijo</button>
      </div>}
    </AccessibleDialog>
    {third && <AccessibleDialog open={third} title="Tercero" onClose={() => { record('tercero'); setThird(false); }}>
      <input aria-label="Campo tercero" autoFocus />
      <button>Último del tercero</button>
    </AccessibleDialog>}
    <CenteredFormModal open={form} title="Formulario" onClose={() => setForm(false)} onSubmit={() => setConfirmation(true)}>
      <input aria-label="Campo formulario" autoFocus />
    </CenteredFormModal>
    <ConfirmDialog open={confirmation} title="Confirmación hija" onCancel={() => setConfirmation(false)} onConfirm={() => setConfirmation(false)} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);
