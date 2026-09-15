import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const NOTIFICACION_ORIGENES = [
  'citas',
  'pagos',
  'matricula',
  'academico',
  'eventos',
  'sistema',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const booleanValue = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class NotificacionesScopeDto {
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

export class NotificacionesListDto extends NotificacionesScopeDto {
  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  leida?: boolean;

  @IsOptional()
  @IsIn(NOTIFICACION_ORIGENES)
  origen?: (typeof NOTIFICACION_ORIGENES)[number];

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

export class NotificacionLecturaDto {
  @IsOptional()
  @Transform(booleanValue)
  @IsBoolean()
  leida = true;
}

export class NotificacionTokenDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;
}
