import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryActivoDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dependenciaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoActivoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  impactoId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  activo?: boolean;
}
