import { IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreateAlumnoDto {
  @IsString()
  @MaxLength(8)
  dni: string;

  @IsString()
  nombres: string;

  @IsString()
  apellido_paterno: string;

  @IsString()
  apellido_materno: string;

  @IsDateString()
  fecha_nacimiento: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  correo?: string;
}