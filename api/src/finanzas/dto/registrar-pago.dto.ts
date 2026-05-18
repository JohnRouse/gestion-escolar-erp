import { IsInt, IsArray, ValidateNested, IsIn, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class PagoItemDto {
  @IsInt()
  id_cronograma: number;

  @IsInt()
  @IsOptional()
  monto_pagado?: number;
}

export class RegistrarPagoDto {
  @IsInt()
  id_matricula: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoItemDto)
  pagos: PagoItemDto[];

  @IsInt()
  id_apoderado: number;

  @IsString()
  @IsIn(['Efectivo', 'Transferencia', 'Tarjeta', 'Yape', 'Plin'])
  metodo_pago: string;

  @IsOptional()
  @IsString()
  nro_operacion?: string;

  @IsOptional()
  @IsDateString()
  fecha_pago?: string;
}