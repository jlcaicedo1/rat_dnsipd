import { IsOptional, IsString } from 'class-validator';

export class TransitionCommentDto {
  @IsString()
  comentario!: string;

  @IsOptional()
  @IsString()
  autor?: string;

  @IsOptional()
  @IsString()
  campo?: string;
}
