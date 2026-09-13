import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const CITA_ESTADOS = [
  'pendiente',
  'confirmada',
  'rechazada',
  'cancelada',
  'realizada',
] as const;

export const CITA_CONTEXTOS = ['staff', 'docente', 'tutor'] as const;
export const CITA_TIPOS_DESTINATARIO = ['staff', 'docente'] as const;
export const CITA_TIPOS = ['individual', 'seccion'] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CitasScopeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenant_id!: number;

  @IsOptional()
  @IsIn(['all'])
  scope?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colegio_id?: number;
}

export class CitasListDto extends CitasScopeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(CITA_ESTADOS)
  estado?: (typeof CITA_ESTADOS)[number];

  @IsOptional()
  @IsDateString({ strict: true })
  desde?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  hasta?: string;

  @IsOptional()
  @Matches(/^(staff|docente):[1-9]\d*$/)
  destinatario?: string;

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

export class CitasParticipantesDto extends CitasScopeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q?: string;
}

export class CitasResponsablesDto extends CitasScopeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seccion_id!: number;
}

export class CitasDestinatariosDto extends CitasScopeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  matricula_id!: number;
}

export class CitaCreateDto {
  @IsIn(CITA_TIPOS)
  tipo!: (typeof CITA_TIPOS)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_colegio!: number;

  @ValidateIf((input: CitaCreateDto) => input.tipo === 'individual')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_matricula?: number;

  @ValidateIf((input: CitaCreateDto) => input.tipo === 'individual')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_apoderado?: number;

  @ValidateIf((input: CitaCreateDto) => input.tipo === 'seccion')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_seccion?: number;

  @IsIn(CITA_TIPOS_DESTINATARIO)
  tipo_destinatario!: (typeof CITA_TIPOS_DESTINATARIO)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_destinatario!: number;

  @IsIn(CITA_CONTEXTOS)
  contexto_destinatario!: (typeof CITA_CONTEXTOS)[number];

  @IsDateString({ strict: true })
  fecha!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_inicio!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_fin!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  motivo!: string;
}

export class CitaApoderadoCreateDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_matricula!: number;

  @IsIn(CITA_TIPOS_DESTINATARIO)
  tipo_destinatario!: (typeof CITA_TIPOS_DESTINATARIO)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_destinatario!: number;

  @IsIn(CITA_CONTEXTOS)
  contexto_destinatario!: (typeof CITA_CONTEXTOS)[number];

  @IsDateString({ strict: true })
  fecha!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_inicio!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_fin!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  motivo!: string;
}

export class CitaEstadoDto {
  @IsIn(['confirmada', 'rechazada', 'cancelada', 'realizada'])
  estado!: 'confirmada' | 'rechazada' | 'cancelada' | 'realizada';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario?: string;
}

export class CitaReprogramarDto {
  @IsDateString({ strict: true })
  fecha!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_inicio!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_fin!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario!: string;
}

export class CitaAcuerdoDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  acuerdos!: string;
}

export class CitaCancelarDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario!: string;
}

export class CitaApoderadoDestinatariosDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  matricula_id!: number;
}
