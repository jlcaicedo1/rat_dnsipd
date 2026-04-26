import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateActividadVersionDto {
  @IsOptional()
  @IsString()
  finalidad?: string;

  @IsOptional()
  @IsInt()
  baseLicitudId?: number | null;

  @IsOptional()
  @IsString()
  observacionLicitud?: string;

  @IsOptional()
  @IsString()
  plazoConservacion?: string;

  @IsOptional()
  @IsDateString()
  fechaProximaRevision?: string;

  @IsOptional()
  @IsString()
  motivoActualizacion?: string;

  @IsOptional()
  @IsBoolean()
  requiereEipd?: boolean;

  @IsOptional()
  @IsBoolean()
  esGranEscala?: boolean;

  @IsOptional()
  @IsNumber()
  puntajeMtge?: number;
}
