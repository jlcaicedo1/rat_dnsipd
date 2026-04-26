import { IsOptional, IsString } from 'class-validator';

export class CreateActividadVersionDto {
  @IsOptional()
  @IsString()
  motivoActualizacion?: string;
}
