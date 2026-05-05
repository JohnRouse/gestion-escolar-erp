import { IsInt, IsArray, ValidateNested, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NotaMasivaItemDto {
  @IsInt()
  id_matricula: number;

  @IsInt()
  id_evaluacion_det: number;

  @IsNumber()
  valor_nota: number;

  @IsOptional()
  @IsString()
  comentario?: string;
}

export class SaveNotasMasivoDto {
  @IsInt()
  id_unidad: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotaMasivaItemDto)
  notas: NotaMasivaItemDto[];
}