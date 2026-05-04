import { IsInt, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApoderadoMatriculaDto)
  apoderados?: ApoderadoMatriculaDto[];
}