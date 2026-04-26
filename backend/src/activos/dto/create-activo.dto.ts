import { IsOptional, IsString } from 'class-validator';

export class CreateActivoDto {
  @IsString()
  codigo!: string;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
