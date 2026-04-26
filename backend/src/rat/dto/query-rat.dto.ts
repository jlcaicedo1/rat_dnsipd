import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class QueryRatDto {
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsInt()
  tipoProcesoId?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsInt()
  dependenciaId?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsInt()
  subdireccionId?: number;

  @IsOptional()
  @IsString()
  estadoGeneral?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
