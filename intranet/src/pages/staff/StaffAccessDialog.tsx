import { useRef, useState, type FormEvent } from 'react';
import { KeyRound, Loader2, ShieldCheck, UserCog } from 'lucide-react';
import AccessibleDialog from '../../components/AccessibleDialog';
import type { StaffAccess, StaffAccessAction } from './staffApi';

type Props = {
  account: StaffAccess;
  active: boolean;
  actorRole: string;
  mode: 'edit' | 'password';
  onClose: () => void;
  onAction: (action: StaffAccessAction) => Promise<void>;
};

const inputClassName =
  'mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 motion-reduce:transition-none';
const labelClassName = 'block text-sm font-medium text-slate-800';
const secondaryButton =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto motion-reduce:transition-none';
const primaryButton =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-blue-300 sm:w-auto motion-reduce:transition-none';

export default function StaffAccessDialog({ account, active, actorRole, mode, onClose, onAction }: Props) {
  const [username, setUsername] = useState(account.username);
  const [role, setRole] = useState(account.rol.nombre_rol);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstInput = useRef<HTMLInputElement>(null);
  const directorBlocked = actorRole === 'Director' && account.rol.nombre_rol === 'Admin';

  async function execute(action: StaffAccessAction) {
    if (reason.trim().length < 3) {
      setError('Ingresa un motivo de al menos 3 caracteres.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onAction(action);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el acceso.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError('La nueva contraseña no puede superar 72 bytes.');
      return;
    }
    await execute({ accion: 'restablecer_password', password, motivo: reason.trim() });
  }

  return (
    <AccessibleDialog
      open
      eyebrow="Acceso al ERP"
      title={mode === 'password' ? 'Restablecer contraseña' : 'Editar acceso'}
      description={
        mode === 'password'
          ? `Define una nueva contraseña para ${account.username}. La contraseña actual no se muestra ni se recupera.`
          : `Administra la cuenta ${account.username}. Cada cambio sensible se registra con su motivo.`
      }
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          {mode === 'password' ? <KeyRound size={21} aria-hidden="true" /> : <UserCog size={21} aria-hidden="true" />}
        </span>
      }
      onClose={onClose}
      preventClose={busy}
      initialFocusRef={firstInput}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          {mode === 'password' && (
            <button type="submit" form="staff-password-form" className={primaryButton} disabled={busy || directorBlocked}>
              {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {busy ? 'Restableciendo…' : 'Restablecer contraseña'}
            </button>
          )}
        </>
      }
    >
      {error && (
        <div role="alert" className="mb-5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
          <span className="font-semibold">No se pudo completar.</span> {error}
        </div>
      )}

      {directorBlocked && (
        <div role="alert" className="mb-5 rounded-md bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          Esta cuenta Admin está fuera de la jerarquía administrable por Director.
        </div>
      )}

      {mode === 'password' ? (
        <form id="staff-password-form" className="space-y-4" onSubmit={resetPassword}>
          <label className={labelClassName}>
            Nueva contraseña *
            <input
              ref={firstInput}
              className={inputClassName}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              disabled={directorBlocked}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className={labelClassName}>
            Confirmar contraseña *
            <input
              className={inputClassName}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmation}
              disabled={directorBlocked}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <ReasonField value={reason} onChange={setReason} disabled={directorBlocked} />
        </form>
      ) : (
        <fieldset disabled={busy || directorBlocked} className="space-y-5">
          <div className="rounded-md border border-slate-200 p-4">
            <label className={labelClassName}>
              Usuario
              <input
                ref={firstInput}
                className={inputClassName}
                autoComplete="off"
                required
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9._@\-]+"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={`${secondaryButton} mt-3`}
              disabled={username.trim().toLowerCase() === account.username}
              onClick={() =>
                void execute({ accion: 'editar_usuario', username, motivo: reason.trim() })
              }
            >
              Guardar usuario
            </button>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <label className={labelClassName}>
              Rol
              <select className={inputClassName} value={role} onChange={(event) => setRole(event.target.value)}>
                {['Secretaria', 'Profesor', 'Director', ...(actorRole === 'Admin' ? ['Admin'] : [])].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`${secondaryButton} mt-3`}
              disabled={role === account.rol.nombre_rol}
              onClick={() => void execute({ accion: 'cambiar_rol', rol: role, motivo: reason.trim() })}
            >
              Cambiar rol
            </button>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-sm font-semibold text-slate-900">Estado en este colegio</span>
                <span className="mt-1 block text-sm text-slate-600">{active ? 'Acceso activo' : 'Acceso inactivo'}</span>
              </span>
              <button
                type="button"
                className={active ? secondaryButton : primaryButton}
                onClick={() => void execute({ accion: 'cambiar_estado', estado: !active, motivo: reason.trim() })}
              >
                {active ? 'Desactivar acceso' : 'Activar acceso'}
              </button>
            </div>
          </div>

          <ReasonField value={reason} onChange={setReason} />
          <div className="flex gap-2 rounded-md bg-blue-50 px-3.5 py-3 text-sm leading-5 text-blue-900 ring-1 ring-blue-100">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />
            <p>El motivo se aplica a la acción que ejecutes. Los demás datos permanecen sin cambios.</p>
          </div>
        </fieldset>
      )}
    </AccessibleDialog>
  );
}

function ReasonField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className={labelClassName}>
      Motivo *
      <textarea
        className={`${inputClassName} min-h-24 resize-y`}
        required
        minLength={3}
        maxLength={300}
        value={value}
        disabled={disabled}
        placeholder="Explica por qué se realiza esta operación sensible."
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
