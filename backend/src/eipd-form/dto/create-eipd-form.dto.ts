import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateEipdFormDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  actividadVersionId?: number;
}
