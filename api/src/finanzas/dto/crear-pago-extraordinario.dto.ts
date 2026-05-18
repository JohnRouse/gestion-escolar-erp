import { IsString, IsNumber, IsArray, IsOptional, IsInt, Min } from 'class-validator';

export class CrearPagoExtraordinarioDto {
  @IsString()
  nombre_concepto: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @IsOptional()
  fecha_vencimiento?: string;  // 'YYYY-MM-DD', por defecto +7 días

  @IsArray()
  @IsInt({ each: true })
  niveles?: number[];          // IDs de niveles (opcional si se envían secciones)

  @IsArray()
  @IsInt({ each: true })
  secciones?: number[];        // IDs de secciones específicas

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  estudiantes?: number[];      // IDs de estudiantes concretos (opcional)
}