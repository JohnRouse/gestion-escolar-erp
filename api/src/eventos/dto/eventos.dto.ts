import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const EVENTO_ESTADOS = ['programado', 'cancelado', 'realizado'] as const;

export const EVENTO_TIPOS_AUDIENCIA = [
  'colegio',
  'niveles',
  'grados',
  'secciones',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EventoAudienciaDto {
  @IsIn(EVENTO_TIPOS_AUDIENCIA)
  tipo!: (typeof EVENTO_TIPOS_AUDIENCIA)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[];
}

export class CrearEventoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_tenant!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_colegio!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_anio!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_inicio?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_fin?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  ubicacion?: string;

  @ValidateNested()
  @Type(() => EventoAudienciaDto)
  audiencia!: EventoAudienciaDto;
}

export class ActualizarEventoDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_inicio?: string | null;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_fin?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  ubicacion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventoAudienciaDto)
  audiencia?: EventoAudienciaDto;
}

export class CancelarEventoDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo!: string;
}

export class EventosScopeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenant_id?: number;

  @IsOptional()
  @IsIn(['all'])
  scope?: 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colegio_id?: number;
}

export class ListarEventosDto extends EventosScopeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anio_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @IsOptional()
  @IsIn(EVENTO_ESTADOS)
  estado?: (typeof EVENTO_ESTADOS)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  q?: string;

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
  limit = 20;
}

export class OpcionesEventosDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenant_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  colegio_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anio_id?: number;
}

export class ListarEventosPadresDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anio_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;
}
