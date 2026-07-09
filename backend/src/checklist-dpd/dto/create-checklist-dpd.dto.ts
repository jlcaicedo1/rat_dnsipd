import { IsOptional, IsString } from 'class-validator';

export class CreateChecklistDpdDto {
  @IsOptional()
  @IsString()
  titulo?: string;
}
