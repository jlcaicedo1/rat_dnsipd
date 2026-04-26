import { IsOptional, IsString } from 'class-validator';

export class CreateActividadDto {
  @IsString()
  codigo!: string;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
