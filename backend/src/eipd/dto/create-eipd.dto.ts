import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateEipdDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  resumen?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsOptional()
  @IsString()
  medidasMitigacion?: string;

  @IsOptional()
  @IsBoolean()
  requiereConsultaPrevia?: boolean;

  @IsOptional()
  @IsDateString()
  fechaEvaluacion?: string;
}
