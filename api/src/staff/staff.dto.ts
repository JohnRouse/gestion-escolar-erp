import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  IsEmail,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class StaffScopeDto {
  @Type(() => Number) @IsInt() @Min(1) tenant_id!: number;
  @IsOptional() @IsIn(['all']) scope?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) colegio_id?: number;
}
export class StaffListDto extends StaffScopeDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @IsIn(['si', 'no']) citas?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class StaffPersonaDto {
  @Matches(/^\d{8}$/) dni!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) nombres!: string;
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellido_paterno!: string;
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellido_materno!: string;
  @IsDateString({ strict: true }) fecha_nacimiento!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(20) telefono?: string;
  @IsOptional() @Transform(trim) @IsEmail() @MaxLength(150) correo?: string;
}
export class StaffAccesoDto {
  @Transform(trim) @Matches(/^[a-zA-Z0-9._@-]{3,50}$/) username!: string;
  @IsIn(['Admin', 'Director', 'Secretaria', 'Profesor']) rol!: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(72) password?: string;
}
export class StaffWriteDto {
  @IsInt() @Min(1) id_colegio!: number;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) cargo!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(50) area!: string;
  @IsBoolean() permite_citas!: boolean;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(300) motivo!: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffPersonaDto)
  persona?: StaffPersonaDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffAccesoDto)
  acceso?: StaffAccesoDto;
}
