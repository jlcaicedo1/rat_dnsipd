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

export class CreateUserDto {
  @IsString()
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsString()
  username!: string;

  @MinLength(8)
  password!: string;

  @IsEnum(RoleCode)
  role!: RoleCode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dependenciaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subdireccionId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
