import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateDependenciaDto {
  @IsOptional()
  @IsInt()
  tipoProcesoId?: number;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  sigla?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
