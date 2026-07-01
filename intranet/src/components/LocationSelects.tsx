import {
  getDepartamentosPeru,
  getDistritosPeru,
  getProvinciasPeru,
} from '../data/ubigeoPeru';

type LocationValue = {
  pais?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
};

type LocationSelectsProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  labelClass?: string;
  selectClass?: string;
  wrapperClassName?: string;
  disabled?: boolean;
};

const defaultLabelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600';
const defaultSelectClass =
  'h-11 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100';

function normalizeLocationKey(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveOption(options: string[], raw?: string | null) {
  const key = normalizeLocationKey(raw);
  if (!key) return '';

  return options.find((item) => normalizeLocationKey(item) === key) || '';
}

export default function LocationSelects({
  value,
  onChange,
  labelClass = defaultLabelClass,
  selectClass = defaultSelectClass,
  wrapperClassName = 'grid gap-4 md:grid-cols-3',
  disabled = false,
}: LocationSelectsProps) {
  const pais = value.pais || 'Perú';

  const departamentos = getDepartamentosPeru();
  const departamento = resolveOption(departamentos, value.departamento);

  const provincias = getProvinciasPeru(departamento);
  const provincia = resolveOption(provincias, value.provincia);

  const distritos = getDistritosPeru(departamento, provincia);
  const distrito = resolveOption(distritos, value.distrito);

  return (
    <div className={wrapperClassName}>
      <label>
        <span className={labelClass}>Departamento</span>
        <select
          value={departamento}
          disabled={disabled}
          onChange={(event) => {
            onChange({
              pais,
              departamento: event.target.value,
              provincia: '',
              distrito: '',
            });
          }}
          className={selectClass}
        >
          <option value="">Seleccionar departamento</option>
          {departamentos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Provincia</span>
        <select
          value={provincia}
          disabled={disabled || !departamento}
          onChange={(event) => {
            onChange({
              pais,
              departamento,
              provincia: event.target.value,
              distrito: '',
            });
          }}
          className={selectClass}
        >
          <option value="">Seleccionar provincia</option>
          {provincias.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClass}>Distrito</span>
        <select
          value={distrito}
          disabled={disabled || !departamento || !provincia}
          onChange={(event) => {
            onChange({
              pais,
              departamento,
              provincia,
              distrito: event.target.value,
            });
          }}
          className={selectClass}
        >
          <option value="">Seleccionar distrito</option>
          {distritos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
