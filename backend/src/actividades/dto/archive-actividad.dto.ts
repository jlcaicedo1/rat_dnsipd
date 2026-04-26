import { IsString } from 'class-validator';

export class ArchiveActividadDto {
  @IsString()
  motivo!: string;
}
