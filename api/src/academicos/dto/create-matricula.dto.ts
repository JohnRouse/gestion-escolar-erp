import { IsInt, IsString, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ApoderadoMatriculaDto {
  @IsInt()
  id_apoderado: number;

  @IsString()
  parentesco: string;
}

export class CreateMatriculaDto {
  @IsInt()
  id_estudiante: number;

  @IsInt()
  id_seccion: number;

  @IsInt()
  id_anio: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debes vincular al menos un apoderado para matricular al alumno.' })
  @ValidateNested({ each: true })
  @Type(() => ApoderadoMatriculaDto)
  apoderados: ApoderadoMatriculaDto[];

  @IsOptional()
  @IsInt()
  id_colegio?: number;
}
