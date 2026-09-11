import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { BadgeCheck, BriefcaseBusiness, Check, CircleUserRound, KeyRound, Loader2, MapPin, Search } from 'lucide-react';
import AccessibleDialog from '../../components/AccessibleDialog';
import LocationSelects from '../../components/LocationSelects';
import { useToast } from '../../contexts/ToastContext';
import { staffError, type staffApi, type StaffItem, type StaffPersona } from './staffApi';

type Props = {
  item: StaffItem | null;
  api: ReturnType<typeof staffApi>;
  rol: string;
  colegios: { id_colegio: number; nombre: string }[];
  defaultColegio?: number | null;
  onClose: () => void;
  onSaved: () => void;
};

const blankPersona: StaffPersona = {
  dni: '',
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  direccion: '',
  departamento: '',
  provincia: '',
  distrito: '',
  telefono: '',
  correo: '',
};

const inputClassName =
  'mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 read-only:cursor-default read-only:border-slate-200 read-only:bg-slate-100 read-only:text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 motion-reduce:transition-none';

const labelClassName = 'block text-sm font-medium text-slate-800';

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
  const hasExistingAccess = Boolean(item?.accesos?.length);
  const documentReady = !item && Boolean(persona.dni) && checkedDni === persona.dni;
  const field = (key: keyof StaffPersona, value: string) => setPersona((current) => ({ ...current, [key]: value }));

  async function lookup() {
    if (!/^\d{8}$/.test(persona.dni)) {
      setError('Ingresa un DNI de 8 dígitos.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const found = await api.lookup(persona.dni);
      setReused(Boolean(found));
      setPersona(found ?? { ...blankPersona, dni: persona.dni });
      setCheckedDni(persona.dni);
    } catch (requestError) {
      setError(staffError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!item && checkedDni !== persona.dni) {
      setError('Comprueba el documento antes de guardar.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api.save(
        {
          id_colegio: Number(colegio),
          cargo,
          area,
          permite_citas: citas,
          ...(!item
            ? {
                persona: {
                  dni: persona.dni,
                  nombres: persona.nombres,
                  apellido_paterno: persona.apellido_paterno,
                  apellido_materno: persona.apellido_materno,
                  fecha_nacimiento: persona.fecha_nacimiento.slice(0, 10),
                  ...(persona.direccion ? { direccion: persona.direccion } : {}),
                  ...(persona.departamento ? { departamento: persona.departamento } : {}),
                  ...(persona.provincia ? { provincia: persona.provincia } : {}),
                  ...(persona.distrito ? { distrito: persona.distrito } : {}),
                  ...(persona.telefono ? { telefono: persona.telefono } : {}),
                  ...(persona.correo ? { correo: persona.correo } : {}),
                },
              }
            : {}),
          ...(access
            ? {
                motivo,
                acceso: {
                  username,
                  rol: accessRole,
                  ...(password ? { password } : {}),
                },
              }
            : {}),
        },
        item?.id_staff,
      );
      setPassword('');
      showToast({
        type: 'success',
        message: item ? 'Staff actualizado correctamente.' : 'Miembro de Staff registrado correctamente.',
      });
      onSaved();
    } catch (requestError) {
      const message = staffError(requestError);
      setError(message);
      showToast({ type: 'error', message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessibleDialog
      open
      eyebrow="Gestión de personal"
      title={item ? 'Editar miembro de Staff' : 'Nuevo miembro de Staff'}
      description={
        item
          ? 'Actualiza su función institucional y las opciones disponibles.'
          : 'Registra identidad, asignación institucional y una cuenta ERP opcional.'
      }
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <CircleUserRound size={22} aria-hidden="true" />
        </span>
      }
      onClose={onClose}
      preventClose={busy}
      initialFocusRef={firstInput}
      maxWidthClassName="max-w-3xl"
      bodyClassName="px-4 py-0 sm:px-6"
      footerClassName="px-4 sm:px-6"
      footer={
        <>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto motion-reduce:transition-none"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-blue-300 sm:w-auto motion-reduce:transition-none"
            type="submit"
            form="staff-form"
            disabled={busy}
          >
            {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <form id="staff-form" onSubmit={submit} className="divide-y divide-slate-200">
        {error && (
          <div
            role="alert"
            className="my-5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          >
            <span className="font-semibold">Revisa la información.</span> {error}
          </div>
        )}

        <fieldset disabled={busy} className="py-6 first:pt-5">
          <SectionHeading
            icon={<CircleUserRound size={18} aria-hidden="true" />}
            title="Identidad personal"
            description={
              item
                ? 'Los datos compartidos de la persona se muestran en modo de consulta.'
                : 'Primero comprueba el DNI para evitar registros duplicados.'
            }
          />

          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className={labelClassName}>
                DNI *
                <input
                  ref={!item ? firstInput : undefined}
                  className={inputClassName}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="8 dígitos"
                  value={persona.dni}
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                  readOnly={Boolean(item)}
                  onChange={(event) => {
                    field('dni', event.target.value.replace(/\D/g, ''));
                    setCheckedDni('');
                    setReused(false);
                  }}
                />
              </label>
              {!item && (
                <button
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors duration-150 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto motion-reduce:transition-none"
                  type="button"
                  onClick={lookup}
                >
                  <Search size={16} aria-hidden="true" />
                  Comprobar documento
                </button>
              )}
            </div>

            {reused && (
              <div className="flex gap-3 rounded-md bg-blue-50 px-3.5 py-3 text-sm leading-5 text-blue-900 ring-1 ring-blue-100">
                <BadgeCheck size={18} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />
                <p>Persona existente. Sus datos se conservan porque también pueden utilizarse en otros módulos.</p>
              </div>
            )}
            {documentReady && !reused && (
              <div
                role="status"
                className="flex gap-3 rounded-md bg-emerald-50 px-3.5 py-3 text-sm leading-5 text-emerald-900 ring-1 ring-emerald-200"
              >
                <Check size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                <p>Documento disponible. Completa los datos personales.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={labelClassName}>
                Nombres *
                <input
                  className={inputClassName}
                  required
                  maxLength={100}
                  value={persona.nombres}
                  readOnly={personalLocked}
                  onChange={(event) => field('nombres', event.target.value)}
                />
              </label>
              <label className={labelClassName}>
                Apellido paterno *
                <input
                  className={inputClassName}
                  required
                  maxLength={100}
                  value={persona.apellido_paterno}
                  readOnly={personalLocked}
                  onChange={(event) => field('apellido_paterno', event.target.value)}
                />
              </label>
              <label className={labelClassName}>
                Apellido materno *
                <input
                  className={inputClassName}
                  required
                  maxLength={100}
                  value={persona.apellido_materno}
                  readOnly={personalLocked}
                  onChange={(event) => field('apellido_materno', event.target.value)}
                />
              </label>
              <label className={labelClassName}>
                Fecha de nacimiento *
                <input
                  className={inputClassName}
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  value={persona.fecha_nacimiento.slice(0, 10)}
                  readOnly={personalLocked}
                  onChange={(event) => field('fecha_nacimiento', event.target.value)}
                />
              </label>
              <label className={labelClassName}>
                Teléfono
                <input
                  className={inputClassName}
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  value={persona.telefono ?? ''}
                  readOnly={personalLocked}
                  onChange={(event) => field('telefono', event.target.value)}
                />
              </label>
              <label className={labelClassName}>
                Correo
                <input
                  className={inputClassName}
                  type="email"
                  autoComplete="email"
                  maxLength={150}
                  value={persona.correo ?? ''}
                  readOnly={personalLocked}
                  onChange={(event) => field('correo', event.target.value)}
                />
              </label>
            </div>

            <div className="pt-2">
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <MapPin size={17} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Domicilio</span>
                  <span className="mt-0.5 block text-sm leading-5 text-slate-600">
                    Ubicación y dirección de la Persona. Estos datos son independientes de su cargo.
                  </span>
                </span>
              </div>
              <LocationSelects
                value={{
                  pais: 'Perú',
                  departamento: persona.departamento ?? '',
                  provincia: persona.provincia ?? '',
                  distrito: persona.distrito ?? '',
                }}
                onChange={(location) =>
                  setPersona((current) => ({
                    ...current,
                    departamento: location.departamento ?? '',
                    provincia: location.provincia ?? '',
                    distrito: location.distrito ?? '',
                  }))
                }
                disabled={personalLocked}
                labelClass={labelClassName}
                selectClass={inputClassName}
                wrapperClassName="grid grid-cols-1 gap-4 sm:grid-cols-3"
              />
              <label className={`${labelClassName} mt-4`}>
                Dirección
                <input
                  className={inputClassName}
                  autoComplete="street-address"
                  maxLength={255}
                  value={persona.direccion ?? ''}
                  readOnly={personalLocked}
                  onChange={(event) => field('direccion', event.target.value)}
                />
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset disabled={busy} className="py-6">
          <SectionHeading
            icon={<BriefcaseBusiness size={18} aria-hidden="true" />}
            title="Asignación institucional"
            description="Define su cargo institucional, separado de cualquier función académica registrada en Docentes."
          />

          <div className="mt-5 space-y-4">
            <label className={labelClassName}>
              Colegio destino *
              <select
                className={inputClassName}
                required
                value={colegio}
                disabled={Boolean(item)}
                onChange={(event) => setColegio(event.target.value)}
              >
                <option value="">Selecciona un colegio</option>
                {colegios.map((school) => (
                  <option key={school.id_colegio} value={school.id_colegio}>
                    {school.nombre}
                  </option>
                ))}
              </select>
              {item && (
                <span className="mt-1.5 block text-xs leading-5 text-slate-600">
                  El colegio se conserva durante la edición para proteger su historial institucional.
                </span>
              )}
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={labelClassName}>
                Cargo *
                <input
                  ref={item ? firstInput : undefined}
                  className={inputClassName}
                  value={cargo}
                  onChange={(event) => setCargo(event.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <label className={labelClassName}>
                Área *
                <input
                  className={inputClassName}
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  required
                  maxLength={50}
                />
              </label>
            </div>

            <ToggleRow
              checked={citas}
              onChange={setCitas}
              label="Permite citas"
              description="Este miembro podrá aparecer como disponible en los flujos de citas."
            />
          </div>
        </fieldset>

        <fieldset disabled={busy} className="py-6">
          <SectionHeading
            icon={<KeyRound size={18} aria-hidden="true" />}
            title="Acceso al ERP"
            description="La ficha Staff registra el cargo laboral. La cuenta de usuario es independiente y solo se necesita para iniciar sesión."
          />

          <div className="mt-5 space-y-4">
            {item?.accesos?.length ? (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.045em] text-slate-600">
                  {item.accesos.length === 1 ? 'Cuenta de usuario vinculada' : 'Cuentas de usuario vinculadas'}
                </p>
                <ul className="divide-y divide-slate-200">
                  {item.accesos.map((account) => {
                    const active =
                      account.estado &&
                      account.tenants[0]?.estado === 'Activo' &&
                      account.colegios[0]?.estado === 'Activo';
                    return (
                      <li key={account.username} className="grid gap-3 px-3.5 py-3 text-sm sm:grid-cols-3">
                        <AccessValue label="Usuario" value={account.username} breakAll />
                        <AccessValue label="Rol" value={account.rol.nombre_rol} />
                        <AccessValue
                          label="Estado"
                          value={active ? 'Acceso activo' : 'Acceso incompleto o inactivo'}
                          status={active ? 'active' : 'inactive'}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {!hasExistingAccess && (
              <ToggleRow
                checked={access}
                onChange={(checked) => {
                  setAccess(checked);
                  setPassword('');
                  setMotivo('');
                }}
                label="Dar acceso al ERP"
                description="Crea o vincula una cuenta de usuario para esta Persona sin cambiar su condición de Staff."
              />
            )}

            {access && (
              <div className="space-y-4 border-l-2 border-blue-200 pl-4 sm:pl-5">
                <p className="text-sm leading-6 text-slate-600">
                  Para asociar una cuenta existente, usa su usuario y rol y deja vacía la contraseña. No se cambian
                  contraseñas ni se reactivan membresías inactivas.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClassName}>
                    Usuario *
                    <input
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
                  <label className={labelClassName}>
                    Rol *
                    <select
                      className={inputClassName}
                      value={accessRole}
                      onChange={(event) => setAccessRole(event.target.value)}
                    >
                      {['Secretaria', 'Profesor', 'Director', ...(rol === 'Admin' ? ['Admin'] : [])].map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={labelClassName}>
                  Contraseña inicial (solo cuenta nueva)
                  <input
                    className={inputClassName}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <span className="mt-1.5 block text-xs leading-5 text-slate-600">
                    Usa al menos 8 caracteres y un máximo de 72 bytes. Déjala vacía para asociar una cuenta existente.
                  </span>
                </label>
                <label className={labelClassName}>
                  Motivo para otorgar acceso *
                  <textarea
                    className={`${inputClassName} min-h-24 resize-y`}
                    required
                    minLength={3}
                    maxLength={300}
                    value={motivo}
                    placeholder="Explica por qué necesita ingresar al ERP o asumir este rol."
                    onChange={(event) => setMotivo(event.target.value)}
                  />
                  <span className="mt-1.5 block text-xs leading-5 text-slate-600">
                    Se exige por tratarse de una operación sensible de acceso y rol.
                  </span>
                </label>
              </div>
            )}
          </div>
        </fieldset>
      </form>
    </AccessibleDialog>
  );
}

function AccessValue({
  label,
  value,
  breakAll = false,
  status,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
  status?: 'active' | 'inactive';
}) {
  return (
    <span className="min-w-0">
      <span className="block text-xs font-semibold uppercase tracking-[0.045em] text-slate-500">{label}</span>
      <span
        className={`mt-1 inline-flex text-sm font-semibold ${
          status === 'active'
            ? 'rounded-md bg-emerald-50 px-2 py-1 text-emerald-800 ring-1 ring-emerald-200'
            : status === 'inactive'
              ? 'rounded-md bg-slate-100 px-2 py-1 text-slate-700 ring-1 ring-slate-200'
              : `text-slate-900 ${breakAll ? 'break-all' : ''}`
        }`}
      >
        {value}
      </span>
    </span>
  );
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <legend className="w-full">
      <span className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          {icon}
        </span>
        <span>
          <span className="block text-base font-semibold text-slate-950">{title}</span>
          <span className="mt-0.5 block text-sm font-normal leading-5 text-slate-600">{description}</span>
        </span>
      </span>
    </legend>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 transition-colors duration-150 hover:border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 motion-reduce:transition-none">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-sm leading-5 text-slate-600">{description}</span>
      </span>
    </label>
  );
}
