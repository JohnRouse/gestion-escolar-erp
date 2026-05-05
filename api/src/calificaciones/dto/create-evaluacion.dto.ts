import { IsInt, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEvaluacionDto {
  @IsInt()
  id_asignacion: number;

  @IsInt()
  id_unidad: number;

  @IsInt()
  id_tipo_eval: number;

  @IsOptional()
  @IsString()
  descripcion_actividad?: string;

  @IsOptional()
  @IsDateString()
  fecha_evaluacion?: string;
}