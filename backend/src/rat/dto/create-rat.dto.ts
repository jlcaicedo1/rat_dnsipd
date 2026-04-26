import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateRatDto {
  @IsString()
  codigo!: string;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  dependenciaId!: number;

  @IsOptional()
  @IsInt()
  subdireccionId?: number;

  @IsOptional()
  @IsDateString()
  fechaProximaRevision?: string;
}
