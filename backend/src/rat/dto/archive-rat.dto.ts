import { IsString } from 'class-validator';

export class ArchiveRatDto {
  @IsString()
  motivo!: string;
}
