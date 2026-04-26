import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class QueryActividadDto {
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsInt()
  ratId?: number;

  @IsOptional()
  @IsString()
  estadoGeneral?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
