import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
