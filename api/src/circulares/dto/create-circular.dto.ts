import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const COMUNICADO_CATEGORIAS = [
  'General',
  'Académico',
  'Administrativo',
  'Urgente',
  'Actividad',
  'Recordatorio',
] as const;

export const COMUNICADO_AUDIENCIAS = [
  'colegio',
  'niveles',
  'secciones',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const booleanValue = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class CircularAudienciaDto {
  @IsIn(COMUNICADO_AUDIENCIAS)
  tipo!: (typeof COMUNICADO_AUDIENCIAS)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[];
}

export class CreateCircularDto {
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
  @MaxLength(150)
  titulo!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  contenido!: string;

  @IsOptional()
  @IsIn(COMUNICADO_CATEGORIAS)
  categoria: (typeof COMUNICADO_CATEGORIAS)[number] = 'General';

  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  urgente = false;

  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  requiere_autorizacion = false;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CircularAudienciaDto)
  audiencia!: CircularAudienciaDto;
}

export class CircularesScopeDto {
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

export class ListarCircularesDto extends CircularesScopeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(COMUNICADO_CATEGORIAS)
  categoria?: (typeof COMUNICADO_CATEGORIAS)[number];

  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  urgente?: boolean;

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

export class OpcionesCircularesDto {
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
  id_anio?: number;
}
