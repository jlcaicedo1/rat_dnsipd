import { RoleCode } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(RoleCode)
  role?: RoleCode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dependenciaId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subdireccionId?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
