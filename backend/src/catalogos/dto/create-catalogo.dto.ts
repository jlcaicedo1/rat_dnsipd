import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCatalogoDto {
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
