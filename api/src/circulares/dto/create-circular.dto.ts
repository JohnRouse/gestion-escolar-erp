import { IsString, IsOptional, IsArray, IsInt } from 'class-validator';

export class CreateCircularDto {
  @IsString()
  titulo: string;

  @IsString()
  contenido: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  niveles?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  secciones?: number[];
}