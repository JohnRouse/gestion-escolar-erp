import {
  IsInt,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AsistenciaItemDto {
  @IsInt()
  id_matricula: number;

  @IsString()
  @IsIn(['Presente', 'Ausente', 'Tardanza', 'Justificado'])
  estado: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  justificacion_motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  justificacion_observacion?: string;
}

export class SaveAsistenciaDto {
  @IsInt()
  id_seccion: number;

  @IsDateString()
  fecha: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsistenciaItemDto)
  asistencias: AsistenciaItemDto[];
}