import { IsString, IsOptional, IsArray, IsInt, IsBoolean } from 'class-validator';

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

  // 👇 Nuevos campos
  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  urgente?: boolean;

  @IsOptional()
  @IsBoolean()
  requiere_autorizacion?: boolean;
}