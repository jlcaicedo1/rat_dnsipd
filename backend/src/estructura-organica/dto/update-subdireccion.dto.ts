import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSubdireccionDto {
  @IsOptional()
  @IsInt()
  dependenciaId?: number;

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
