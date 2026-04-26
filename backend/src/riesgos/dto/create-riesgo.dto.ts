import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRiesgoDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  probabilidad!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  impacto!: number;

  @IsOptional()
  @IsString()
  controlesExistentes?: string;

  @IsOptional()
  @IsString()
  tratamiento?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  probabilidadResidual?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  impactoResidual?: number;

  @IsOptional()
  @IsString()
  estado?: string;
}
