import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCatalogoDto {
  @IsOptional()
  @IsString()
  dominio?: string;

  @IsString()
  tipo!: string;

  @IsString()
  codigo!: string;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
