import { IsOptional, IsString } from 'class-validator';

export class UpdateActividadDto {
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
  @IsString()
  estadoGeneral?: string;
}
