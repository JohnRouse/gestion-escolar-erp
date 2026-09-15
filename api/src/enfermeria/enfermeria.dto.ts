import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const ENFERMERIA_ESTADOS = ['abierta', 'cerrada'] as const;
export const ENFERMERIA_DESTINOS = [
  'regresa_aula',
  'retiro_apoderado',
  'derivacion_externa',
  'observacion',
] as const;
export const ENFERMERIA_MEDIOS_CONTACTO = [
  'telefono',
  'presencial',
  'otro',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const booleanValue = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class EnfermeriaScopeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenant_id!: number;

  @IsOptional()
  @IsIn(['all'])
  scope?: 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colegio_id?: number;
}

export class EnfermeriaListDto extends EnfermeriaScopeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(ENFERMERIA_ESTADOS)
  estado?: (typeof ENFERMERIA_ESTADOS)[number];

  @IsOptional()
  @IsDateString({ strict: true })
  fecha?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seccion_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colegio_filtro_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class EnfermeriaBuscarAlumnoDto extends EnfermeriaScopeDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string;
}

export class FichaScopeDto extends EnfermeriaScopeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colegio_ficha_id?: number;
}

export class CrearAtencionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_matricula!: number;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha_hora_ingreso?: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacion_reportada?: string;
}

export class ActualizarAtencionDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observacion_reportada?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  acciones_realizadas?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  motivo_correccion?: string;
}

export class ContactoEnfermeriaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_apoderado!: number;

  @IsIn(ENFERMERIA_MEDIOS_CONTACTO)
  medio!: (typeof ENFERMERIA_MEDIOS_CONTACTO)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  observacion?: string;

  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  notificar = false;
}

export class AdministrarMedicacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_autorizacion!: number;
}

export class CerrarAtencionDto {
  @IsIn(ENFERMERIA_DESTINOS)
  destino!: (typeof ENFERMERIA_DESTINOS)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  acciones_realizadas?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha_hora_cierre?: string;

  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  notificar_apoderado = false;

  @ValidateIf((value: CerrarAtencionDto) => value.notificar_apoderado)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_apoderado?: number;

  @ValidateIf((value: CerrarAtencionDto) => value.notificar_apoderado)
  @IsIn(ENFERMERIA_MEDIOS_CONTACTO)
  medio_contacto?: (typeof ENFERMERIA_MEDIOS_CONTACTO)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  observacion_contacto?: string;
}

export class GuardarFichaSaludDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  grupo_sanguineo?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  alergias_declaradas?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  condiciones_declaradas?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  medicacion_habitual_declarada?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  seguro_centro_atencion?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  contacto_emergencia?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  telefono_emergencia?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observaciones_relevantes?: string;
}

export class CrearAutorizacionMedicacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_apoderado!: number;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  medicamento!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  dosis_instruccion!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  via?: string;

  @IsDateString({ strict: true })
  fecha_inicio!: string;

  @IsDateString({ strict: true })
  fecha_fin!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  observaciones?: string;
}

export class RevocarAutorizacionDto extends EnfermeriaScopeDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo!: string;
}
