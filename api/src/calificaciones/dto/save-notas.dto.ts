import { IsInt, IsArray, ValidateNested, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NotaItemDto {
  @IsInt()
  id_matricula: number;

  @IsNumber()
  valor_nota: number;

  @IsOptional()
  @IsString()
  comentario?: string;
}

export class SaveNotasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotaItemDto)
  notas: NotaItemDto[];
}