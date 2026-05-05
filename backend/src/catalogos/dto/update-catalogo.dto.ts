import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCatalogoDto {
  @IsOptional()
  @IsString()
  dominio?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
