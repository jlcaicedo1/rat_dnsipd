import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CalculateMtgeDto {
  @IsInt()
  @Min(1)
  @Max(5)
  volumenTitulares!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  variedadCategorias!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  duracionTratamiento!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  alcanceGeografico!: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
