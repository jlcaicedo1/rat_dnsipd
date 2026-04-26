import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateRatDto {
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
  @IsInt()
  dependenciaId?: number;

  @IsOptional()
  @IsInt()
  subdireccionId?: number | null;

  @IsOptional()
  @IsString()
  estadoGeneral?: string;

  @IsOptional()
  @IsDateString()
  fechaProximaRevision?: string;
}
