import {
  IsInt,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AsistenciaItemDto {
  @IsInt()
  id_matricula: number;

  @IsString()
  @IsIn(['Presente', 'Ausente', 'Tardanza', 'Justificado'])
  estado: string;
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