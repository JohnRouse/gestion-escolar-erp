import { useRef, useState, type FormEvent } from 'react';
import AccessibleDialog from '../../components/AccessibleDialog';
import { useToast } from '../../contexts/ToastContext';
import { staffError, type staffApi, type StaffItem, type StaffPersona } from './staffApi';

type Props = {
  item: StaffItem | null; api: ReturnType<typeof staffApi>; rol: string;
  colegios: { id_colegio: number; nombre: string }[]; defaultColegio?: number | null;
  onClose: () => void; onSaved: () => void;
};
const blankPersona: StaffPersona = { dni: '', nombres: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', telefono: '', correo: '' };
export default function StaffForm({ item, api, rol, colegios, defaultColegio, onClose, onSaved }: Props) {
  const [persona, setPersona] = useState<StaffPersona>(item?.persona ?? blankPersona);
  const [checkedDni, setCheckedDni] = useState('');
  const [reused, setReused] = useState(Boolean(item));
  const [colegio, setColegio] = useState(String(item?.id_colegio ?? item?.seccion?.id_colegio ?? defaultColegio ?? ''));
  const [cargo, setCargo] = useState(item?.cargo ?? '');
  const [area, setArea] = useState(item?.area ?? '');
  const [citas, setCitas] = useState(item?.permite_citas ?? true);
  const [access, setAccess] = useState(false);
  const [username, setUsername] = useState('');
  const [accessRole, setAccessRole] = useState('Secretaria');
  const [password, setPassword] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstInput = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const personalLocked = reused || (!item && checkedDni !== persona.dni);
  const field = (key: keyof StaffPersona, value: string) => setPersona(current => ({ ...current, [key]: value }));
  async function lookup() {
    if (!/^\d{8}$/.test(persona.dni)) { setError('Ingresa un DNI de 8 dígitos.'); return; }
    setBusy(true); setError('');
    try {
      const found = await api.lookup(persona.dni);
      setReused(Boolean(found));
      setPersona(found ?? { ...blankPersona, dni: persona.dni });
      setCheckedDni(persona.dni);
    } catch (e) { setError(staffError(e)); } finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!item && checkedDni !== persona.dni) { setError('Comprueba el documento antes de guardar.'); return; }
    setBusy(true); setError('');
    try {
      await api.save({ id_colegio: Number(colegio), cargo, area, permite_citas: citas, motivo,
        ...(!item ? { persona: { dni: persona.dni, nombres: persona.nombres, apellido_paterno: persona.apellido_paterno, apellido_materno: persona.apellido_materno, fecha_nacimiento: persona.fecha_nacimiento.slice(0, 10), ...(persona.telefono ? { telefono: persona.telefono } : {}), ...(persona.correo ? { correo: persona.correo } : {}) } } : {}),
        ...(access ? { acceso: { username, rol: accessRole, ...(password ? { password } : {}) } } : {}),
      }, item?.id_staff);
      setPassword('');
      showToast({ type: 'success', message: item ? 'Staff actualizado correctamente.' : 'Miembro de Staff registrado correctamente.' });
      onSaved();
    } catch (e) {
      const message = staffError(e); setError(message); showToast({ type: 'error', message });
    } finally { setBusy(false); }
  }
  return <AccessibleDialog open title={item ? 'Editar miembro de Staff' : 'Nuevo miembro de Staff'} description="Datos institucionales y acceso interno" onClose={onClose} preventClose={busy} initialFocusRef={firstInput}
    footer={<><button className="btn btn-secondary" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="btn btn-primary" type="submit" form="staff-form" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></>}>
    <form id="staff-form" onSubmit={submit} className="space-y-5">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <fieldset disabled={busy} className="space-y-4">
        <legend className="font-semibold mb-3">Persona</legend>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-0">DNI *<input ref={!item ? firstInput : undefined} className="input" value={persona.dni} required pattern="[0-9]{8}" maxLength={8} readOnly={Boolean(item)} onChange={e => { field('dni', e.target.value); setCheckedDni(''); setReused(false); }} /></label>
          {!item && <button className="btn btn-secondary" type="button" onClick={lookup}>Comprobar documento</button>}
        </div>
        {reused && <p className="text-sm text-slate-600">Persona existente. Se conservan sus datos compartidos con otros módulos.</p>}
        {!item && checkedDni === persona.dni && !reused && <p role="status">Documento disponible. Completa los datos personales.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>Nombres *<input className="input" required maxLength={100} value={persona.nombres} readOnly={personalLocked} onChange={e => field('nombres', e.target.value)} /></label>
          <label>Apellido paterno *<input className="input" required maxLength={100} value={persona.apellido_paterno} readOnly={personalLocked} onChange={e => field('apellido_paterno', e.target.value)} /></label>
          <label>Apellido materno *<input className="input" required maxLength={100} value={persona.apellido_materno} readOnly={personalLocked} onChange={e => field('apellido_materno', e.target.value)} /></label>
          <label>Fecha de nacimiento *<input className="input" type="date" required max={new Date().toISOString().slice(0, 10)} value={persona.fecha_nacimiento.slice(0, 10)} readOnly={personalLocked} onChange={e => field('fecha_nacimiento', e.target.value)} /></label>
          <label>Teléfono<input className="input" type="tel" maxLength={20} value={persona.telefono ?? ''} readOnly={personalLocked} onChange={e => field('telefono', e.target.value)} /></label>
          <label>Correo<input className="input" type="email" maxLength={150} value={persona.correo ?? ''} readOnly={personalLocked} onChange={e => field('correo', e.target.value)} /></label>
        </div>
      </fieldset>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="font-semibold mb-3">Información institucional</legend>
        <label className="block">Colegio destino *<select className="input" required value={colegio} disabled={Boolean(item)} onChange={e => setColegio(e.target.value)}><option value="">Selecciona un colegio</option>{colegios.map(c => <option key={c.id_colegio} value={c.id_colegio}>{c.nombre}</option>)}</select></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>Cargo *<input ref={item ? firstInput : undefined} className="input" value={cargo} onChange={e => setCargo(e.target.value)} required maxLength={100} /></label>
          <label>Área *<input className="input" value={area} onChange={e => setArea(e.target.value)} required maxLength={50} /></label>
        </div>
        <label className="flex gap-3 items-center min-h-11"><input type="checkbox" checked={citas} onChange={e => setCitas(e.target.checked)} />Permite citas</label>
        {item?.es_tutor && <p className="text-sm">Tutoría y sección asignada se conservan. Su gestión se realiza en el módulo académico.</p>}
      </fieldset>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="font-semibold mb-3">Credenciales internas</legend>
        {item?.accesos?.map(a => <p key={a.username} className="text-sm break-words">{a.username} · {a.rol.nombre_rol} · {a.estado && a.tenants[0]?.estado === 'Activo' && a.colegios[0]?.estado === 'Activo' ? 'Acceso activo' : 'Acceso incompleto o inactivo'}</p>)}
        <label className="flex gap-3 items-center min-h-11"><input type="checkbox" checked={access} onChange={e => { setAccess(e.target.checked); setPassword(''); }} />Crear o asociar acceso interno</label>
        {access && <div className="space-y-4">
          <p className="text-sm text-slate-600">Para asociar una cuenta existente, usa su usuario y rol y deja vacía la contraseña. No se cambian contraseñas ni se reactivan membresías inactivas.</p>
          <label className="block">Usuario *<input className="input" autoComplete="off" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._@\-]+" value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label className="block">Rol *<select className="input" value={accessRole} onChange={e => setAccessRole(e.target.value)}>{['Secretaria', 'Profesor', 'Director', ...(rol === 'Admin' ? ['Admin'] : [])].map(r => <option key={r}>{r}</option>)}</select></label>
          <label className="block">Contraseña inicial (solo cuenta nueva)<input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} /></label>
        </div>}
      </fieldset>
      <label className="block">Motivo del registro o cambio *<textarea className="input" required minLength={3} maxLength={300} value={motivo} disabled={busy} onChange={e => setMotivo(e.target.value)} /></label>
    </form>
  </AccessibleDialog>;
}
